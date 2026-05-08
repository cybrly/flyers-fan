// Statistical utilities — per-60 normalization, league rankings, rolling
// windows, percentile ranks. No React, no fetch — pure functions.

import { summarizeGames, pct } from './hockey.js';

/* ═══════════════════════════════════════════════════════════════
   PER-60 NORMALIZATION
   ═══════════════════════════════════════════════════════════════ */

/**
 * Convert "MM:SS" TOI string to total seconds.
 * @param {string} toi - time on ice string like "18:42"
 * @returns {number} total seconds
 */
export function parseTOI(toi) {
  if (!toi || typeof toi !== 'string') return 0;
  const [m, s] = toi.split(':').map(Number);
  return (m || 0) * 60 + (s || 0);
}

/**
 * Normalize a raw stat to a per-60-minutes rate.
 * @param {number} rawStat - the raw count (goals, assists, etc.)
 * @param {number} toiSeconds - time on ice in seconds
 * @returns {number|null} per-60 rate, or null if TOI is insufficient
 */
export function per60(rawStat, toiSeconds) {
  if (!toiSeconds || toiSeconds < 60) return null;
  return (rawStat / toiSeconds) * 3600;
}

/**
 * Format a per-60 value for display.
 * @param {number|null} value - per-60 rate
 * @param {number} [digits=2] - decimal places
 * @returns {string} formatted string or '—'
 */
export function fmtPer60(value, digits = 2) {
  if (value == null) return '—';
  return value.toFixed(digits);
}

/**
 * Apply per-60 normalization to a stat if mode is 'per60', otherwise return raw.
 * @param {number} rawStat
 * @param {number} toiSeconds
 * @param {'raw'|'per60'} mode
 * @returns {number|null}
 */
export function statByMode(rawStat, toiSeconds, mode) {
  return mode === 'per60' ? per60(rawStat, toiSeconds) : rawStat;
}

/* ═══════════════════════════════════════════════════════════════
   LEAGUE RANKINGS
   ═══════════════════════════════════════════════════════════════ */

/**
 * Compute league-wide rankings for a set of categories.
 * Returns a Map of team abbreviation → { [category]: rank }.
 *
 * @param {object[]} standingsAll - full league standings array
 * @param {object} categories - { categoryKey: { field, higherIsBetter } }
 * @returns {Map<string, object>} ranks per team
 *
 * Example:
 *   leagueRanks(standings.all, {
 *     gfRank: { field: 'gf', higherIsBetter: true },
 *     gaRank: { field: 'ga', higherIsBetter: false },
 *   })
 */
export function leagueRanks(standingsAll, categories) {
  if (!standingsAll?.length) return new Map();

  const result = new Map();
  for (const team of standingsAll) {
    result.set(team.abbr, {});
  }

  for (const [key, { field, higherIsBetter }] of Object.entries(categories)) {
    const sorted = [...standingsAll]
      .filter((t) => t[field] != null)
      .sort((a, b) => higherIsBetter ? b[field] - a[field] : a[field] - b[field]);

    let rank = 0;
    let prevVal = null;
    let skip = 0;

    for (const team of sorted) {
      if (team[field] !== prevVal) {
        rank += 1 + skip;
        skip = 0;
        prevVal = team[field];
      } else {
        skip++;
      }
      const entry = result.get(team.abbr);
      if (entry) entry[key] = rank;
    }
  }

  return result;
}

/**
 * Standard ranking categories for NHL team stats.
 */
export const TEAM_RANK_CATEGORIES = {
  gfRank:   { field: 'gf',   higherIsBetter: true },
  gaRank:   { field: 'ga',   higherIsBetter: false },
  diffRank: { field: 'diff', higherIsBetter: true },
  ptsRank:  { field: 'pts',  higherIsBetter: true },
  pctRank:  { field: 'pct',  higherIsBetter: true },
};

/**
 * Compute ranks for PHI specifically — returns a flat object with all ranks.
 * @param {object[]} standingsAll
 * @param {string} [teamAbbr='PHI']
 * @returns {object|null} { gfRank, gaRank, diffRank, ptsRank, pctRank } or null
 */
export function teamRanks(standingsAll, teamAbbr = 'PHI') {
  const all = leagueRanks(standingsAll, TEAM_RANK_CATEGORIES);
  return all.get(teamAbbr) || null;
}

/* ═══════════════════════════════════════════════════════════════
   PERCENTILE RANKS (for player stats)
   ═══════════════════════════════════════════════════════════════ */

/**
 * Compute percentile rank (0–100) of a value within a population.
 * @param {number} value
 * @param {number[]} allValues - full population
 * @param {boolean} [higherIsBetter=true]
 * @returns {number} percentile (0–100)
 */
export function percentileRank(value, allValues, higherIsBetter = true) {
  if (!allValues?.length || value == null) return 0;
  const sorted = [...allValues].sort((a, b) => a - b);
  const below = sorted.filter((v) => (higherIsBetter ? v < value : v > value)).length;
  return Math.round((below / sorted.length) * 100);
}

/**
 * Compute percentile ranks for a player across multiple stats.
 * @param {object} playerStats - the player's stat object
 * @param {object[]} allPlayers - all players at same position for comparison
 * @param {object} statDefs - { statKey: { higherIsBetter } }
 * @returns {object} { statKey: percentile }
 */
export function playerPercentiles(playerStats, allPlayers, statDefs) {
  const result = {};
  for (const [key, { higherIsBetter }] of Object.entries(statDefs)) {
    const values = allPlayers.map((p) => p[key]).filter((v) => v != null);
    result[key] = percentileRank(playerStats[key], values, higherIsBetter);
  }
  return result;
}

/**
 * Standard stat definitions for skater percentile rankings.
 */
export const SKATER_PERCENTILE_STATS = {
  goals:      { higherIsBetter: true },
  assists:    { higherIsBetter: true },
  points:     { higherIsBetter: true },
  plusMinus:   { higherIsBetter: true },
  shots:      { higherIsBetter: true },
  shootingPct: { higherIsBetter: true },
  hits:       { higherIsBetter: true },
  blocks:     { higherIsBetter: true },
  pim:        { higherIsBetter: false },
  ppGoals:    { higherIsBetter: true },
  gwg:        { higherIsBetter: true },
  faceoffPct: { higherIsBetter: true },
};

/* ═══════════════════════════════════════════════════════════════
   ROLLING WINDOWS
   ═══════════════════════════════════════════════════════════════ */

/**
 * Compute rolling-window summaries over a list of games.
 * Games should be in chronological order (oldest first).
 *
 * @param {object[]} games - game objects with { us, them, w, lastPeriodType, ... }
 * @param {number} windowSize - number of games in each window
 * @returns {object[]} array of { index, games, ...summarizeGames(window) }
 */
export function rollingWindow(games, windowSize) {
  if (!games?.length || windowSize < 1) return [];
  const results = [];
  for (let i = windowSize - 1; i < games.length; i++) {
    const window = games.slice(i - windowSize + 1, i + 1);
    results.push({
      index: i,
      endGame: games[i],
      ...summarizeGames(window),
    });
  }
  return results;
}

/**
 * Generic rolling average of numeric values.
 * @param {number[]} values - chronological values
 * @param {number} windowSize
 * @returns {number[]} rolling averages (first windowSize-1 entries use available data)
 */
export function rollingAvg(values, windowSize) {
  if (!values?.length) return [];
  return values.map((_, i) => {
    const start = Math.max(0, i - windowSize + 1);
    const window = values.slice(start, i + 1);
    return window.reduce((s, v) => s + v, 0) / window.length;
  });
}

/**
 * Rolling points percentage as an array suitable for sparkline charting.
 * @param {object[]} games - chronological (oldest first)
 * @param {number} windowSize
 * @returns {number[]} rolling points% (0–100)
 */
export function rollingPointsPct(games, windowSize) {
  return rollingWindow(games, windowSize).map((w) => w.pointsPct * 100);
}

/* ═══════════════════════════════════════════════════════════════
   TIEBREAKER LOGIC
   ═══════════════════════════════════════════════════════════════ */

/**
 * NHL tiebreaker comparison between two teams in the standings.
 * Returns negative if teamA ranks higher, positive if teamB ranks higher.
 *
 * NHL tiebreaker order (2024–25 rules):
 * 1. Points (higher is better)
 * 2. Fewer games played (more efficient point accumulation)
 * 3. Regulation + OT wins (ROW) (higher is better)
 * 4. Regulation wins (RW) (higher is better)
 * 5. Total wins (higher is better)
 * 6. Points earned in head-to-head (not available without H2H schedule data)
 * 7. Goal differential (higher is better)
 *
 * @param {object} a - standings entry
 * @param {object} b - standings entry
 * @returns {number} comparison value (negative = a ranks higher)
 */
export function tiebreaker(a, b) {
  // 1. Points (descending)
  if (a.pts !== b.pts) return b.pts - a.pts;
  // 2. Fewer GP (ascending — more points in fewer games is better)
  if (a.gp !== b.gp) return a.gp - b.gp;
  // 3. ROW (descending)
  if ((a.row ?? 0) !== (b.row ?? 0)) return (b.row ?? 0) - (a.row ?? 0);
  // 4. Regulation wins (descending)
  if ((a.rw ?? 0) !== (b.rw ?? 0)) return (b.rw ?? 0) - (a.rw ?? 0);
  // 5. Total wins (descending)
  if (a.w !== b.w) return b.w - a.w;
  // 6. Goal differential (descending)
  return (b.diff ?? 0) - (a.diff ?? 0);
}

/**
 * Determine which tiebreaker applies between two teams.
 * Returns a human-readable string like "ROW (34 vs 31)" or null if no tie.
 * @param {object} a - standings entry
 * @param {object} b - standings entry
 * @returns {string|null}
 */
export function tiebreakReason(a, b) {
  if (a.pts !== b.pts) return null; // not tied
  if (a.gp !== b.gp) return `Fewer GP (${Math.min(a.gp, b.gp)} vs ${Math.max(a.gp, b.gp)})`;
  if ((a.row ?? 0) !== (b.row ?? 0)) return `ROW (${a.row ?? 0} vs ${b.row ?? 0})`;
  if ((a.rw ?? 0) !== (b.rw ?? 0)) return `Regulation wins (${a.rw ?? 0} vs ${b.rw ?? 0})`;
  if (a.w !== b.w) return `Total wins (${a.w} vs ${b.w})`;
  if ((a.diff ?? 0) !== (b.diff ?? 0)) return `Goal diff (${a.diff > 0 ? '+' : ''}${a.diff} vs ${b.diff > 0 ? '+' : ''}${b.diff})`;
  return 'Identical record';
}

/* ═══════════════════════════════════════════════════════════════
   STRENGTH-STATE PARSING
   ═══════════════════════════════════════════════════════════════ */

/**
 * Parse NHL situationCode into a strength state.
 * situationCode is a 4-digit string: awayEN, awaySkaters, homeSkaters, homeEN
 * (EN = 1 if goalie pulled, 0 if in net; skaters = number of skaters)
 *
 * @param {string} code - e.g. "1551" = 5v5 with both goalies in
 * @param {boolean} isHome - whether PHI is the home team
 * @returns {'5v5'|'pp'|'pk'|'4v4'|'3v3'|'en'|'other'} strength state
 */
export function parseStrengthState(code, isHome) {
  if (!code || code.length !== 4) return 'other';
  const awayEN = code[0] === '1'; // goalie in net
  const awaySk = parseInt(code[1], 10);
  const homeSk = parseInt(code[2], 10);
  const homeEN = code[3] === '1';

  // Empty-net situations
  const usEN = isHome ? homeEN : awayEN;
  const themEN = isHome ? awayEN : homeEN;
  if (!usEN || !themEN) return 'en'; // someone pulled their goalie

  const usSk = isHome ? homeSk : awaySk;
  const themSk = isHome ? awaySk : homeSk;

  if (usSk === themSk) {
    if (usSk === 5) return '5v5';
    if (usSk === 4) return '4v4';
    if (usSk === 3) return '3v3';
    return 'other';
  }

  return usSk > themSk ? 'pp' : 'pk';
}

/**
 * Aggregate play-by-play events by strength state.
 * @param {object[]} events - PBP events with situationCode, us, kind
 * @param {boolean} isHome - whether PHI is home
 * @returns {object} { '5v5': { cf, ca, sf, sa, gf, ga }, 'pp': {...}, ... }
 */
export function strengthStateSplits(events, isHome) {
  const SHOT_KINDS = new Set(['shot-on-goal', 'goal', 'missed-shot']);
  const CORSI_KINDS = new Set(['shot-on-goal', 'goal', 'missed-shot', 'blocked-shot']);

  const states = {};
  const ensure = (s) => { if (!states[s]) states[s] = { cf: 0, ca: 0, sf: 0, sa: 0, gf: 0, ga: 0, xgf: 0, xga: 0 }; };

  for (const e of events) {
    const state = parseStrengthState(e.situationCode, isHome);
    ensure(state);
    const bucket = states[state];

    if (CORSI_KINDS.has(e.kind)) {
      if (e.us) bucket.cf++; else bucket.ca++;
    }
    if (SHOT_KINDS.has(e.kind)) {
      if (e.us) bucket.sf++; else bucket.sa++;
    }
    if (e.kind === 'goal') {
      if (e.us) bucket.gf++; else bucket.ga++;
    }
  }

  return states;
}

/* ═══════════════════════════════════════════════════════════════
   STREAK DETECTION
   ═══════════════════════════════════════════════════════════════ */

/**
 * Detect point streaks for a player from their game log.
 * @param {object[]} gameLogs - chronological game entries with { points }
 * @returns {{ current: number, longest: number }}
 */
export function pointStreak(gameLogs) {
  let current = 0;
  let longest = 0;
  let streak = 0;

  for (let i = gameLogs.length - 1; i >= 0; i--) {
    if ((gameLogs[i].points ?? 0) > 0) {
      streak++;
    } else {
      if (i === gameLogs.length - 1) current = 0;
      break;
    }
    if (i === gameLogs.length - 1) current = streak;
  }

  // Find longest
  streak = 0;
  for (const g of gameLogs) {
    if ((g.points ?? 0) > 0) {
      streak++;
      longest = Math.max(longest, streak);
    } else {
      streak = 0;
    }
  }

  return { current, longest };
}

/**
 * Detect team win/loss streaks from game results.
 * @param {object[]} games - newest-first game array with { w }
 * @returns {{ type: 'W'|'L', count: number, longestW: number, longestL: number }}
 */
export function teamStreaks(games) {
  if (!games.length) return { type: 'W', count: 0, longestW: 0, longestL: 0 };

  // Current streak (games are newest-first)
  const type = games[0].w ? 'W' : 'L';
  let count = 0;
  for (const g of games) {
    if (g.w === games[0].w) count++;
    else break;
  }

  // Longest streaks (walk chronologically)
  const chron = [...games].reverse();
  let longestW = 0, longestL = 0, wRun = 0, lRun = 0;
  for (const g of chron) {
    if (g.w) { wRun++; lRun = 0; longestW = Math.max(longestW, wRun); }
    else { lRun++; wRun = 0; longestL = Math.max(longestL, lRun); }
  }

  return { type, count, longestW, longestL };
}
