import { TEAM_ABBR, isLive, isFinal, isFuture, fmtDate, fmtDateFull } from './config.js';

// schedule → array of games (newest first), Flyers perspective
export function adaptSchedule(raw) {
  if (!raw?.games) return { games: [], nextGame: null, liveGame: null, upcoming: [], team: null };
  const finished = [];
  const upcoming = [];
  let liveGame = null;

  for (const g of raw.games) {
    // Skip preseason (gameType 1) — only regular season (2) and playoffs (3) count.
    if (g.gameType === 1) continue;
    const isHome = g.homeTeam.abbrev === TEAM_ABBR;
    const us = isHome ? g.homeTeam : g.awayTeam;
    const them = isHome ? g.awayTeam : g.homeTeam;

    const common = {
      id: g.id,
      date: g.gameDate,
      startUTC: g.startTimeUTC,
      state: g.gameState,
      gameType: g.gameType, // 2 = reg, 3 = playoffs
      home: isHome,
      opp: them.abbrev,
      oppName: them.placeName?.default ? `${them.placeName.default} ${them.commonName?.default || ''}`.trim() : them.abbrev,
      venue: g.venue?.default,
      neutralSite: !!g.neutralSite,
      periodType: g.periodDescriptor?.periodType,
      lastPeriodType: g.gameOutcome?.lastPeriodType,
      // Broadcast networks for the game. Each entry has { network, market,
      // countryCode } where market is H (home), A (away), or N (national).
      tvBroadcasts: (g.tvBroadcasts || []).map((b) => ({
        network: b.network,
        market: b.market,
        country: b.countryCode,
      })),
    };

    if (isLive(g.gameState)) {
      liveGame = { ...common, us: us.score ?? 0, them: them.score ?? 0 };
    } else if (isFinal(g.gameState)) {
      const usScore = us.score ?? 0;
      const themScore = them.score ?? 0;
      finished.push({
        ...common,
        us: usScore,
        them: themScore,
        w: usScore > themScore,
        label: fmtDate(g.gameDate),
      });
    } else if (isFuture(g.gameState)) {
      upcoming.push({ ...common, us: null, them: null });
    }
  }

  // Newest first for finished, soonest first for upcoming.
  finished.sort((a, b) => b.date.localeCompare(a.date));
  upcoming.sort((a, b) => a.date.localeCompare(b.date));

  return {
    games: finished,
    nextGame: upcoming[0] || null,
    upcoming: upcoming.slice(0, 8),
    liveGame,
    team: {
      gp: finished.length,
      wins: finished.filter((g) => g.w).length,
      losses: finished.filter((g) => !g.w).length,
    },
  };
}

// standings → { metro, east, league, us }
export function adaptStandings(raw) {
  if (!raw?.standings) return { metro: [], east: [], us: null };
  const all = raw.standings.map((t) => {
    const place = t.placeName?.default || '';
    const common = t.teamCommonName?.default || '';
    const fallback = t.teamName?.default || '';
    const teamStr = `${place} ${common}`.trim() || fallback || t.teamAbbrev?.default || '—';
    return {
    team: teamStr,
    abbr: t.teamAbbrev?.default,
    w: t.wins,
    l: t.losses,
    ot: t.otLosses,
    gp: t.gamesPlayed,
    pts: t.points,
    pct: t.pointPctg,
    gf: t.goalFor,
    ga: t.goalAgainst,
    diff: t.goalDifferential,
    l10W: t.l10Wins,
    l10L: t.l10Losses,
    streak: t.streakCode && t.streakCount ? `${t.streakCode}${t.streakCount}` : null,
    division: t.divisionName,
    conference: t.conferenceName,
    clinched: t.clinchIndicator, // 'x', 'p', 'y', 'z', 'e'
    divRank: t.divisionSequence,
    confRank: t.conferenceSequence,
    leagueRank: t.leagueSequence,
    us: t.teamAbbrev?.default === TEAM_ABBR,
    };
  });
  const metro = all.filter((t) => t.division === 'Metropolitan').sort((a, b) => a.divRank - b.divRank);
  const east  = all.filter((t) => t.conference === 'Eastern').sort((a, b) => a.confRank - b.confRank);
  const us = all.find((t) => t.us);
  return { metro, east, all, us };
}

// boxscore + right-rail + landing → shape for Game Tape page
export function adaptGame(boxscore, rightRail, landing) {
  if (!boxscore) return null;
  const isHome = boxscore.homeTeam.abbrev === TEAM_ABBR;
  const us = isHome ? boxscore.homeTeam : boxscore.awayTeam;
  const them = isHome ? boxscore.awayTeam : boxscore.homeTeam;
  const usSide = isHome ? 'home' : 'away';
  const themSide = isHome ? 'away' : 'home';

  // Team stat comparison from right-rail
  const ts = {};
  if (rightRail?.teamGameStats) {
    for (const s of rightRail.teamGameStats) {
      ts[s.category] = { away: s.awayValue, home: s.homeValue };
    }
  }
  const stat = (cat) => {
    if (!ts[cat]) return { us: null, them: null };
    return { us: ts[cat][usSide], them: ts[cat][themSide] };
  };

  // Skater stats
  const skaters = [];
  if (boxscore.playerByGameStats?.[`${usSide}Team`]) {
    const t = boxscore.playerByGameStats[`${usSide}Team`];
    [...(t.forwards || []), ...(t.defense || [])].forEach((p) => {
      skaters.push({
        id: p.playerId,
        name: p.name?.default,
        num: p.sweaterNumber,
        pos: p.position,
        g: p.goals || 0,
        a: p.assists || 0,
        pts: p.points || 0,
        sog: p.sog || 0,
        hits: p.hits || 0,
        blk: p.blockedShots || 0,
        pm: p.plusMinus || 0,
        toi: p.toi || '—',
      });
    });
  }
  skaters.sort((a, b) => (b.pts - a.pts) || (b.sog - a.sog));

  // Goalies for both teams (saves, save%, decision)
  const goalies = { us: [], them: [] };
  for (const sideKey of ['us', 'them']) {
    const apiSide = sideKey === 'us' ? usSide : themSide;
    const team = boxscore.playerByGameStats?.[`${apiSide}Team`];
    (team?.goalies || []).forEach((g) => {
      goalies[sideKey].push({
        id: g.playerId,
        name: g.name?.default || '—',
        num: g.sweaterNumber,
        toi: g.toi || '—',
        sa: g.shotsAgainst ?? null,
        saves: g.saves ?? null,
        ga: g.goalsAgainst ?? null,
        savePct: g.savePctg != null ? +(g.savePctg * 100).toFixed(1) : null,
        decision: g.decision || '',
        starter: !!g.starter,
      });
    });
  }

  // Scoring by period (counts) + flat timeline of every goal with assists
  const periods = {};
  const timeline = [];
  if (landing?.summary?.scoring) {
    landing.summary.scoring.forEach((p) => {
      const num = p.periodDescriptor?.number;
      const ptype = p.periodDescriptor?.periodType;
      if (!num) return;
      let uGoals = 0, tGoals = 0;
      (p.goals || []).forEach((g) => {
        const isUs = g.teamAbbrev?.default === TEAM_ABBR;
        if (isUs) uGoals++; else tGoals++;
        timeline.push({
          period: num,
          periodType: ptype,
          time: g.timeInPeriod,
          us: isUs,
          team: g.teamAbbrev?.default,
          scorerId: g.playerId,
          scorer: g.name?.default || '—',
          scorerTotal: g.goalsToDate,
          shotType: g.shotType,
          strength: g.strength,
          modifier: g.goalModifier,
          assists: (g.assists || []).map((a) => ({ id: a.playerId, name: a.name?.default })).filter((a) => a.name),
          score: { us: isUs ? g.homeScore : g.awayScore, them: isUs ? g.awayScore : g.homeScore },
          awayScore: g.awayScore,
          homeScore: g.homeScore,
        });
      });
      periods[num] = [uGoals, tGoals];
    });
  }

  // Three stars — flatten { name: { default } } shapes into plain strings
  const stars = (landing?.summary?.threeStars || []).map((s) => ({
    star: s.star,
    id: s.playerId,
    name: s.name?.default || s.name || '—',
    teamAbbrev: s.teamAbbrev || s.teamAbbrev?.default || '',
    position: s.position || '',
    goals: s.goals || 0,
    assists: s.assists || 0,
    points: s.points || 0,
  }));

  return {
    id: boxscore.id,
    state: boxscore.gameState,
    gameType: boxscore.gameType, // 2 = reg, 3 = playoffs
    date: boxscore.gameDate,
    dateLabel: fmtDateFull(boxscore.gameDate),
    home: isHome,
    oppAbbr: them.abbrev,
    oppName: them.placeName?.default ? `${them.placeName.default} ${them.commonName?.default || ''}`.trim() : them.abbrev,
    usAbbr: us.abbrev,
    score: { us: us.score ?? 0, them: them.score ?? 0 },
    sog: { us: us.sog ?? null, them: them.sog ?? null },
    periods,
    clock: boxscore.clock,
    periodDescriptor: boxscore.periodDescriptor,
    stats: {
      shots: stat('sog'),
      faceoffPct: (() => {
        const s = stat('faceoffWinningPctg');
        return { us: s.us != null ? +(s.us * 100).toFixed(1) : null, them: s.them != null ? +(s.them * 100).toFixed(1) : null };
      })(),
      hits: stat('hits'),
      blocks: stat('blockedShots'),
      pim: stat('pim'),
      giveaways: stat('giveaways'),
      takeaways: stat('takeaways'),
      powerPlay: stat('powerPlay'),                    // e.g. "1/4"
      powerPlayPctg: (() => {
        const s = stat('powerPlayPctg');
        return { us: s.us != null ? +(s.us * 100).toFixed(1) : null, them: s.them != null ? +(s.them * 100).toFixed(1) : null };
      })(),
    },
    shotsByPeriod: rightRail?.shotsByPeriod || [],
    skaters,
    goalies,
    timeline,
    stars,
  };
}

// play-by-play → recent events with player names resolved via rosterSpots
export function adaptPlayByPlay(raw) {
  if (!raw?.plays) return null;

  const players = {};
  (raw.rosterSpots || []).forEach((p) => {
    players[p.playerId] = {
      name: p.name?.default || `${p.firstName?.default?.[0] || ''}. ${p.lastName?.default || ''}`.trim(),
      teamId: p.teamId,
    };
  });
  const teamAbbr = {
    [raw.homeTeam?.id]: raw.homeTeam?.abbrev,
    [raw.awayTeam?.id]: raw.awayTeam?.abbrev,
  };
  const usTeamId = raw.homeTeam?.abbrev === TEAM_ABBR ? raw.homeTeam.id : raw.awayTeam?.id;

  const KEEP = new Set([
    'goal', 'shot-on-goal', 'missed-shot', 'blocked-shot',
    'penalty', 'hit', 'giveaway', 'takeaway',
    'period-start', 'period-end', 'game-end',
  ]);

  const playerName = (id) => players[id]?.name || '—';

  const events = [];
  for (const p of raw.plays) {
    if (!KEEP.has(p.typeDescKey)) continue;
    const det = p.details || {};
    const teamId = det.eventOwnerTeamId;
    const team = teamAbbr[teamId] || '';
    const us = teamId === usTeamId;

    let summary = '';
    switch (p.typeDescKey) {
      case 'goal': {
        const scorer = playerName(det.scoringPlayerId);
        const a1 = det.assist1PlayerId ? playerName(det.assist1PlayerId) : '';
        const a2 = det.assist2PlayerId ? playerName(det.assist2PlayerId) : '';
        const assists = [a1, a2].filter(Boolean).join(', ');
        summary = `${scorer} scores${assists ? ` (${assists})` : ' (unassisted)'}`;
        break;
      }
      case 'shot-on-goal':
        summary = `${playerName(det.shootingPlayerId)} · shot ${det.shotType || ''}`.trim();
        break;
      case 'missed-shot':
        summary = `${playerName(det.shootingPlayerId)} · shot missed`;
        break;
      case 'blocked-shot':
        summary = `${playerName(det.blockingPlayerId)} blocks ${playerName(det.shootingPlayerId)}`;
        break;
      case 'penalty':
        summary = `${playerName(det.committedByPlayerId)} · ${(det.descKey || '').replace(/-/g, ' ')} (${det.duration || 2} min)`;
        break;
      case 'hit':
        summary = `${playerName(det.hittingPlayerId)} hits ${playerName(det.hitteePlayerId)}`;
        break;
      case 'giveaway':
        summary = `${playerName(det.playerId)} · giveaway`;
        break;
      case 'takeaway':
        summary = `${playerName(det.playerId)} · takeaway`;
        break;
      case 'period-start':
        summary = `Period ${p.periodDescriptor?.number} start`;
        break;
      case 'period-end':
        summary = `Period ${p.periodDescriptor?.number} end`;
        break;
      case 'game-end':
        summary = 'Game end';
        break;
      default:
        summary = p.typeDescKey;
    }

    events.push({
      id: p.eventId,
      kind: p.typeDescKey,
      period: p.periodDescriptor?.number,
      time: p.timeInPeriod,
      timeRemaining: p.timeRemaining,
      team,
      us,
      summary,
      sortOrder: p.sortOrder,
    });
  }
  events.sort((a, b) => (b.period - a.period) || (b.sortOrder - a.sortOrder));
  return {
    state: raw.gameState,
    clock: raw.clock,
    period: raw.periodDescriptor,
    events,
  };
}

// playoff bracket → series annotated with our team + conference key.
//
// The NHL bracket uses a stable lettering scheme that encodes both round and
// conference (since 2014):
//   A–D  = East R1     E–H  = West R1
//   I, J = East R2     K, L = West R2
//   M    = East CF     N    = West CF
//   O    = Stanley Cup Final (cross-conference)
//
// We trust the letter over the API's `playoffRound` field — when future series
// don't have teams set yet, the API has been observed returning them with
// playoffRound=2 (incorrect) and empty topSeedTeam/bottomSeedTeam objects.
// Letter-based derivation gives us the correct round in every case.
const BRACKET_INFO = {
  A: { round: 1, conf: 'E' }, B: { round: 1, conf: 'E' }, C: { round: 1, conf: 'E' }, D: { round: 1, conf: 'E' },
  E: { round: 1, conf: 'W' }, F: { round: 1, conf: 'W' }, G: { round: 1, conf: 'W' }, H: { round: 1, conf: 'W' },
  I: { round: 2, conf: 'E' }, J: { round: 2, conf: 'E' },
  K: { round: 2, conf: 'W' }, L: { round: 2, conf: 'W' },
  M: { round: 3, conf: 'E' }, N: { round: 3, conf: 'W' },
  O: { round: 4, conf: 'F' },
};

export function adaptBracket(raw) {
  if (!raw?.series) return null;
  const series = raw.series.map((s) => {
    const top = s.topSeedTeam || {};
    const bot = s.bottomSeedTeam || {};
    const info = BRACKET_INFO[s.seriesLetter] || { round: s.playoffRound, conf: null };
    const usTeam = [top, bot].find((t) => t.abbrev === TEAM_ABBR) || null;
    return {
      letter: s.seriesLetter,
      title: s.seriesTitle,
      round: info.round,
      conf: info.conf,
      top: {
        abbr: top.abbrev,
        name: top.commonName?.default || top.abbrev,
        rank: s.topSeedRankAbbrev,
        wins: s.topSeedWins ?? 0,
      },
      bottom: {
        abbr: bot.abbrev,
        name: bot.commonName?.default || bot.abbrev,
        rank: s.bottomSeedRankAbbrev,
        wins: s.bottomSeedWins ?? 0,
      },
      winningTeamId: s.winningTeamId,
      losingTeamId: s.losingTeamId,
      complete: s.winningTeamId != null,
      hasUs: !!usTeam,
    };
  })
  // Drop placeholder series with no teams set — round 3/4 series often come
  // back from the API before the matchups are known. We render them as TBD
  // slots in the UI via column padding instead.
  .filter((s) => s.top.abbr || s.bottom.abbr);

  const byRound = [1, 2, 3, 4].map((r) => series.filter((s) => s.round === r));
  // bracketTitle/SubTitle come back as localized {default} objects from the
  // API — extract the string so callers can render them directly. Guard
  // explicitly against the object-with-empty-string case (`{default: ''}`)
  // because `'' || obj` would fall through to the object and React error #31.
  const localStr = (v) => (typeof v === 'string' ? v : (v && typeof v === 'object' ? (v.default || '') : ''));
  return {
    rounds: byRound,
    title: localStr(raw.bracketTitle),
    subtitle: localStr(raw.bracketSubTitle),
  };
}

// playoff series detail (single series) → game-by-game with adapted Flyers
// perspective fields when relevant.
export function adaptSeries(raw) {
  if (!raw) return null;
  const games = (raw.games || []).map((g) => {
    const a = g.awayTeam, h = g.homeTeam;
    const final = ['OFF', 'FINAL'].includes(g.gameState);
    return {
      id: g.id,
      number: g.gameNumber,
      date: g.startTimeUTC,
      venue: g.venue?.default,
      state: g.gameState,
      final,
      home: { abbr: h?.abbrev, score: h?.score, name: h?.commonName?.default },
      away: { abbr: a?.abbrev, score: a?.score, name: a?.commonName?.default },
      lastPeriodType: g.gameOutcome?.lastPeriodType,
      ifNecessary: g.ifNecessary,
    };
  });
  return {
    round: raw.round,
    label: raw.roundLabel,
    letter: raw.seriesLetter,
    neededToWin: raw.neededToWin,
    length: raw.length,
    top: {
      abbr: raw.topSeedTeam?.abbrev,
      name: raw.topSeedTeam?.commonName?.default,
      wins: raw.topSeedWins ?? 0,
    },
    bottom: {
      abbr: raw.bottomSeedTeam?.abbrev,
      name: raw.bottomSeedTeam?.commonName?.default,
      wins: raw.bottomSeedWins ?? 0,
    },
    games,
  };
}

// score/now → tonight's NHL games (across all teams). Used for the
// Around-the-League widget on the Dashboard.
export function adaptScoreboard(raw) {
  if (!raw?.games) return null;
  const games = raw.games.map((g) => ({
    id: g.id,
    state: g.gameState, // PRE / FUT / LIVE / CRIT / OFF / FINAL
    startUTC: g.startTimeUTC,
    away: { abbr: g.awayTeam?.abbrev, score: g.awayTeam?.score, sog: g.awayTeam?.sog },
    home: { abbr: g.homeTeam?.abbrev, score: g.homeTeam?.score, sog: g.homeTeam?.sog },
    clock: g.clock,
    period: g.periodDescriptor,
    gameType: g.gameType, // 2 = reg, 3 = playoffs
    series: g.seriesStatus
      ? {
          round: g.seriesStatus.round,
          letter: g.seriesStatus.seriesLetter,
          gameNum: g.seriesStatus.gameNumberOfSeries,
          neededToWin: g.seriesStatus.neededToWin,
          top: { abbr: g.seriesStatus.topSeedTeamAbbrev, wins: g.seriesStatus.topSeedWins },
          bottom: { abbr: g.seriesStatus.bottomSeedTeamAbbrev, wins: g.seriesStatus.bottomSeedWins },
        }
      : null,
  }));
  return { date: raw.currentDate, games };
}

// roster → forwards / defensemen / goalies, normalized
export function adaptRoster(raw) {
  if (!raw) return null;
  const norm = (p) => ({
    id: p.id,
    name: `${p.firstName?.default || ''} ${p.lastName?.default || ''}`.trim(),
    num: p.sweaterNumber,
    pos: p.positionCode,
    shoots: p.shootsCatches,
    heightIn: p.heightInInches,
    weightLb: p.weightInPounds,
    age: p.birthDate ? Math.floor((Date.now() - new Date(p.birthDate).getTime()) / 31557600000) : null,
    birthDate: p.birthDate,
    birthCity: p.birthCity?.default,
    birthStateProvince: p.birthStateProvince?.default,
    birthCountry: p.birthCountry,
    headshot: p.headshot,
  });
  return {
    forwards: (raw.forwards || []).map(norm).sort((a, b) => (a.num || 99) - (b.num || 99)),
    defense:  (raw.defensemen || []).map(norm).sort((a, b) => (a.num || 99) - (b.num || 99)),
    goalies:  (raw.goalies || []).map(norm).sort((a, b) => (a.num || 99) - (b.num || 99)),
  };
}

// club-stats → leaderboards (top scorers / goalies)
export function adaptClubStats(raw) {
  if (!raw) return null;
  const skaters = (raw.skaters || []).map((p) => ({
    id: p.playerId,
    num: p.sweaterNumber,
    name: `${p.firstName?.default?.[0] || ''}. ${p.lastName?.default || ''}`.trim(),
    pos: p.positionCode,
    gp: p.gamesPlayed,
    g: p.goals,
    a: p.assists,
    pts: p.points,
    pm: p.plusMinus,
    pim: p.penaltyMinutes,
    sog: p.shots,
    shootingPct: p.shootingPctg != null ? +(p.shootingPctg * 100).toFixed(1) : null,
    avgToi: p.avgTimeOnIcePerGame != null ? p.avgTimeOnIcePerGame : null, // seconds
    avgEvToi: p.avgEvenStrengthTimeOnIcePerGame ?? null,                  // seconds
    avgPpToi: p.avgPowerPlayTimeOnIcePerGame ?? null,                     // seconds
    avgShToi: p.avgShorthandedTimeOnIcePerGame ?? null,                   // seconds
    avgShifts: p.avgShiftsPerGame ?? null,
    hits: p.hits,
    blocks: p.blockedShots,
    faceoffPct: p.faceoffWinPctg != null ? +(p.faceoffWinPctg * 100).toFixed(1) : null,
    headshot: p.headshot,
  }));
  const goalies = (raw.goalies || []).map((p) => ({
    id: p.playerId,
    num: p.sweaterNumber,
    name: `${p.firstName?.default?.[0] || ''}. ${p.lastName?.default || ''}`.trim(),
    gp: p.gamesPlayed,
    w: p.wins,
    l: p.losses,
    otl: p.overtimeLosses ?? p.otLosses ?? 0,
    saves: p.saves,
    sa: p.shotsAgainst,
    savePct: p.savePercentage != null ? +(p.savePercentage * 100).toFixed(1) : null,
    gaa: p.goalsAgainstAverage != null ? +p.goalsAgainstAverage.toFixed(2) : null,
    so: p.shutouts,
    headshot: p.headshot,
  }));
  return { skaters, goalies };
}

// League leaders — /v1/skater-stats-leaders/current and /goalie-stats-leaders/current.
// We make multiple calls (one per category) and stitch them together; the
// returned shape is { goals: [...], assists: [...], etc. } so we just merge
// each fetch into a single object.
export function adaptLeagueLeaders(payloads) {
  if (!payloads || !payloads.length) return null;
  const merged = {};
  for (const p of payloads) {
    if (!p) continue;
    for (const [k, v] of Object.entries(p)) {
      merged[k] = (v || []).map((x) => ({
        id: x.id,
        name: `${x.firstName?.default || ''} ${x.lastName?.default || ''}`.trim(),
        num: x.sweaterNumber,
        team: x.teamAbbrev,
        pos: x.position,
        headshot: x.headshot,
        value: x.value,
      }));
    }
  }
  return merged;
}

// Prospects roster — /v1/prospects/{TEAM}. Same shape as the regular roster
// adapter but for non-NHL prospects (juniors / NCAA / European leagues).
export function adaptProspects(raw) {
  if (!raw) return null;
  const norm = (p) => ({
    id: p.id,
    name: `${p.firstName?.default || ''} ${p.lastName?.default || ''}`.trim(),
    num: p.sweaterNumber,
    pos: p.positionCode,
    shoots: p.shootsCatches,
    heightIn: p.heightInInches,
    weightLb: p.weightInPounds,
    age: p.birthDate ? Math.floor((Date.now() - new Date(p.birthDate).getTime()) / 31557600000) : null,
    birthDate: p.birthDate,
    birthCity: p.birthCity?.default,
    birthCountry: p.birthCountry,
    headshot: p.headshot,
  });
  return {
    forwards: (raw.forwards || []).map(norm),
    defense: (raw.defensemen || []).map(norm),
    goalies: (raw.goalies || []).map(norm),
  };
}

// Draft picks — /v1/draft/picks/{year}/{round}. Returns { picks: [...] }
// with each pick's overall pick number, team, and selected player.
export function adaptDraftPicks(raw, teamAbbr) {
  if (!raw?.picks?.length) return null;
  return raw.picks
    .filter((p) => !teamAbbr || p.teamAbbrev === teamAbbr)
    .map((p) => ({
      year: raw.draftYear,
      round: p.round,
      pickInRound: p.pickInRound,
      overall: p.overallPick,
      team: p.teamAbbrev,
      teamLogo: p.teamLogo,
      playerId: p.playerId || null,
      name: `${p.firstName?.default || ''} ${p.lastName?.default || ''}`.trim(),
      pos: p.positionCode,
      heightIn: p.heightInInches,
      weightLb: p.weightInPounds,
      birthCountry: p.birthCountry,
      headshot: p.headshot,
      amateurClub: p.amateurClubName?.default,
      amateurLeague: p.amateurLeague?.default,
    }));
}
