// Auto-generated narrative text engine. Produces human-readable summaries
// for the Dashboard hero, GameTape post-game recap, and weekly digests.
// Template-based — no LLM calls, just data-driven sentence construction.

import { TEAM_ABBR, OPP_FULL, fmtDate } from '../config.js';
import { pct } from './hockey.js';

const teamShort = () => { const full = OPP_FULL[TEAM_ABBR] || TEAM_ABBR; return full.split(' ').pop() || TEAM_ABBR; };

/* ═══════════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════════ */

const oppName = (abbr) => OPP_FULL[abbr] || abbr;
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
const streakText = (type, count) => {
  if (count >= 5) return type === 'W' ? 'on a scorching' : 'in a brutal';
  if (count >= 3) return type === 'W' ? 'riding a' : 'stuck in a';
  return type === 'W' ? 'on a' : 'in a';
};

/* ═══════════════════════════════════════════════════════════════
   DASHBOARD HERO NARRATIVE
   ═══════════════════════════════════════════════════════════════ */

/**
 * Generate a 1-2 sentence hero narrative for the Dashboard.
 *
 * @param {object} opts
 * @param {object} opts.standings - standings.us object
 * @param {object} opts.schedule - adaptSchedule result
 * @param {object} opts.streak - { type, count }
 * @param {object} [opts.series] - current playoff series
 * @returns {string} narrative text
 */
export function dashboardNarrative({ standings, schedule, streak, series }) {
  const parts = [];
  const us = standings;
  const liveGame = schedule?.liveGame;
  const nextGame = schedule?.nextGame;
  const lastGame = schedule?.games?.[0];

  if (!us) return `Connecting to NHL feeds for the latest ${teamShort()} data.`;

  // Current state
  if (series) {
    const ahead = series.usWins > series.oppWins;
    const tied = series.usWins === series.oppWins;
    const down = series.usWins < series.oppWins;
    if (ahead) parts.push(`${teamShort()} lead the ${oppName(series.opponentAbbr)} ${series.usWins}–${series.oppWins} in the ${series.round}.`);
    else if (tied) parts.push(`The series against ${oppName(series.opponentAbbr)} is tied ${series.usWins}–${series.oppWins}.`);
    else if (down) parts.push(`${teamShort()} trail ${oppName(series.opponentAbbr)} ${series.usWins}–${series.oppWins} in the ${series.round}.`);
  } else if (liveGame) {
    const leading = liveGame.us > liveGame.them;
    const tied = liveGame.us === liveGame.them;
    if (leading) parts.push(`The ${teamShort()} lead ${oppName(liveGame.opp)} ${liveGame.us}–${liveGame.them} right now.`);
    else if (tied) parts.push(`Tied ${liveGame.us}–${liveGame.them} against ${oppName(liveGame.opp)}.`);
    else parts.push(`Trailing ${oppName(liveGame.opp)} ${liveGame.them}–${liveGame.us}.`);
  } else {
    parts.push(`${teamShort()} are ${us.w}–${us.l}–${us.ot || 0}, sitting ${ordinal(us.divRank)} in the division with ${us.pts} points.`);
  }

  // Streak context
  if (streak && streak.count >= 2 && !liveGame) {
    parts.push(`They're ${streakText(streak.type, streak.count)} ${streak.count}-game ${streak.type === 'W' ? 'win' : 'losing'} streak.`);
  }

  // Next game teaser
  if (nextGame && !liveGame) {
    const home = nextGame.home ? 'host' : 'visit';
    parts.push(`Next up: ${home} the ${oppName(nextGame.opp)}.`);
  }

  return parts.join(' ');
}

/* ═══════════════════════════════════════════════════════════════
   POST-GAME RECAP
   ═══════════════════════════════════════════════════════════════ */

/**
 * Generate a 2-3 sentence post-game recap.
 *
 * @param {object} opts
 * @param {object} opts.game - adaptGame result
 * @param {object} [opts.topScorer] - { name, goals, assists, points }
 * @param {object} [opts.xg] - { totalUs, totalThem }
 * @returns {string} recap text
 */
export function postGameRecap({ game, topScorer, xg }) {
  if (!game) return '';
  const parts = [];
  const won = game.score.us > game.score.them;
  const verb = won ? 'defeated' : 'fell to';
  const opp = oppName(game.oppAbbr);
  const venue = game.home ? 'at home' : 'on the road';

  parts.push(`The ${teamShort()} ${verb} the ${opp} ${game.score.us}–${game.score.them} ${venue}.`);

  // Top performer
  if (topScorer && topScorer.points > 0) {
    const statLine = [];
    if (topScorer.goals) statLine.push(plural(topScorer.goals, 'goal'));
    if (topScorer.assists) statLine.push(plural(topScorer.assists, 'assist'));
    parts.push(`${topScorer.name} led the way with ${statLine.join(' and ')}.`);
  }

  // xG context
  if (xg) {
    const xgDiff = xg.totalUs - xg.totalThem;
    if (won && xgDiff < -0.5) {
      parts.push(`The xG model gave the edge to ${opp} (${xg.totalThem.toFixed(1)}–${xg.totalUs.toFixed(1)}) — the ${teamShort()} stole one.`);
    } else if (!won && xgDiff > 0.5) {
      parts.push(`Expected goals favored the ${teamShort()} ${xg.totalUs.toFixed(1)}–${xg.totalThem.toFixed(1)} — an unlucky result.`);
    } else if (Math.abs(xgDiff) > 1.0) {
      const dominant = xgDiff > 0 ? teamShort() : opp;
      parts.push(`${dominant} dominated expected goals ${Math.max(xg.totalUs, xg.totalThem).toFixed(1)}–${Math.min(xg.totalUs, xg.totalThem).toFixed(1)}.`);
    }
  }

  // Shot differential
  if (game.stats?.shots?.us != null) {
    const shotDiff = game.stats.shots.us - game.stats.shots.them;
    if (Math.abs(shotDiff) >= 10) {
      const who = shotDiff > 0 ? teamShort() : opp;
      parts.push(`The ${who} held a ${Math.abs(shotDiff)}-shot advantage (${Math.max(game.stats.shots.us, game.stats.shots.them)}–${Math.min(game.stats.shots.us, game.stats.shots.them)}).`);
    }
  }

  return parts.slice(0, 3).join(' ');
}

/* ═══════════════════════════════════════════════════════════════
   PLAYOFF RACE NARRATIVE
   ═══════════════════════════════════════════════════════════════ */

/**
 * Generate a playoff race summary sentence.
 *
 * @param {object} us - active team standings entry
 * @param {object[]} east - Eastern Conference standings
 * @returns {string}
 */
export function playoffRaceNarrative(us, east) {
  if (!us || !east?.length) return '';

  const playoffLine = east.filter((t) => t.confRank <= 8);
  const lastIn = playoffLine[playoffLine.length - 1];
  const firstOut = east.find((t) => t.confRank === 9);

  if (us.confRank <= 8) {
    const cushion = firstOut ? us.pts - firstOut.pts : 0;
    if (cushion > 6) return `${TEAM_ABBR} has a comfortable ${plural(cushion, 'point')} cushion over the playoff cutline.`;
    if (cushion > 0) return `${TEAM_ABBR} sits ${plural(cushion, 'point')} above the cutline — not safe yet.`;
    return `${TEAM_ABBR} is on the bubble, level with the cutline team on points.`;
  } else {
    const deficit = lastIn ? lastIn.pts - us.pts : 0;
    if (deficit <= 3) return `${TEAM_ABBR} is ${plural(deficit, 'point')} out — still very much alive.`;
    if (deficit <= 8) return `${TEAM_ABBR} trails by ${deficit} points — a tough climb, but not impossible with games in hand.`;
    return `${TEAM_ABBR} is ${deficit} points out of a playoff spot. The math is getting grim.`;
  }
}

/* ═══════════════════════════════════════════════════════════════
   SCORING LEADER NARRATIVE
   ═══════════════════════════════════════════════════════════════ */

/**
 * One-liner about a player's current production.
 * @param {object} player - { fullName, goals, assists, points, gp }
 * @param {string} [context] - 'season' | 'playoffs'
 * @returns {string}
 */
export function playerNarrative(player, context = 'season') {
  if (!player) return '';
  const ppg = player.gp > 0 ? (player.points / player.gp).toFixed(2) : '0.00';
  const pace = context === 'season' && player.gp > 20
    ? ` On pace for ${Math.round((player.points / player.gp) * 82)} points over 82 games.`
    : '';
  return `${player.fullName}: ${player.goals}G, ${player.assists}A (${player.points}P in ${player.gp} GP, ${ppg} P/G).${pace}`;
}

/* ═══════════════════════════════════════════════════════════════
   UTILITY
   ═══════════════════════════════════════════════════════════════ */

function ordinal(n) {
  if (!n) return '—';
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
