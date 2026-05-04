import { TEAM_ABBR, isLive, isFinal, isFuture, fmtDate, fmtDateFull } from './config.js';

// schedule → array of games (newest first), Flyers perspective
export function adaptSchedule(raw) {
  if (!raw?.games) return { games: [], nextGame: null, liveGame: null, team: null };
  const finished = [];
  let nextGame = null;
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
      periodType: g.periodDescriptor?.periodType,
      lastPeriodType: g.gameOutcome?.lastPeriodType,
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
    } else if (isFuture(g.gameState) && !nextGame) {
      nextGame = { ...common, us: null, them: null };
    }
  }

  // Newest first
  finished.sort((a, b) => b.date.localeCompare(a.date));

  return {
    games: finished,
    nextGame,
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
    },
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

// playoff bracket → array of series annotated with our team
export function adaptBracket(raw) {
  if (!raw?.series) return null;
  const series = raw.series.map((s) => {
    const top = s.topSeedTeam || {};
    const bot = s.bottomSeedTeam || {};
    const usTeam = [top, bot].find((t) => t.abbrev === TEAM_ABBR) || null;
    return {
      letter: s.seriesLetter,
      title: s.seriesTitle,
      round: s.playoffRound,
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
  });
  const byRound = [1, 2, 3, 4].map((r) => series.filter((s) => s.round === r));
  return { rounds: byRound, title: raw.bracketTitle, subtitle: raw.bracketSubTitle };
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
    birthCity: p.birthCity?.default,
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
    headshot: p.headshot,
  }));
  const goalies = (raw.goalies || []).map((p) => ({
    id: p.playerId,
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
