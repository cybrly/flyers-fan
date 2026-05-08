// Adapters for NHL Edge tracking data (puck/player tracking system).
// These endpoints live under /v1/edge/* on api-web.nhle.com and provide
// skating speed, distance, shot speed, zone time, and shot location data
// that no other public source offers.

// PHI team ID for Edge endpoints (team IDs differ from abbreviations).
export const PHI_TEAM_ID = 4;

/* ═══════════════════════════════════════════════════════════════
   SKATER EDGE DATA
   ═══════════════════════════════════════════════════════════════ */

/**
 * Adapt /v1/edge/skater-detail/{id}/{season}/{gameType} response.
 * Returns the key Edge metrics for a single skater.
 */
export function adaptSkaterEdge(raw) {
  if (!raw) return null;

  const imperial = (obj) => obj?.imperial ?? null;
  const metric = (obj) => obj?.metric ?? null;
  const pctile = (obj) => obj?.percentile != null ? Math.round(obj.percentile * 100) : null;
  const leagueAvg = (obj) => imperial(obj?.leagueAvg);

  return {
    player: {
      id: raw.player?.id,
      name: `${raw.player?.firstName?.default || ''} ${raw.player?.lastName?.default || ''}`.trim(),
      headshot: raw.player?.headshot,
      position: raw.player?.position,
      number: raw.player?.sweaterNumber,
      team: raw.player?.team?.abbrev,
    },
    topShotSpeed: {
      value: imperial(raw.topShotSpeed),
      percentile: pctile(raw.topShotSpeed),
      leagueAvg: leagueAvg(raw.topShotSpeed),
      unit: 'mph',
    },
    skatingSpeed: {
      max: imperial(raw.skatingSpeed?.speedMax),
      maxPercentile: pctile(raw.skatingSpeed?.speedMax),
      maxLeagueAvg: leagueAvg(raw.skatingSpeed?.speedMax),
      bursts22: raw.skatingSpeed?.burstsOver22?.count ?? null,
      bursts22Percentile: pctile(raw.skatingSpeed?.burstsOver22),
      bursts20: raw.skatingSpeed?.burstsFrom20to22?.count ?? null,
      unit: 'mph',
    },
    distance: {
      total: imperial(raw.totalDistanceSkated),
      totalPercentile: pctile(raw.totalDistanceSkated),
      totalLeagueAvg: leagueAvg(raw.totalDistanceSkated),
      maxGame: imperial(raw.distanceMaxGame),
      maxGamePercentile: pctile(raw.distanceMaxGame),
      unit: 'mi',
    },
    zoneTime: raw.zoneTimeDetails ? {
      offensive: raw.zoneTimeDetails.offensiveZone?.pctg != null ? Math.round(raw.zoneTimeDetails.offensiveZone.pctg * 100) : null,
      neutral: raw.zoneTimeDetails.neutralZone?.pctg != null ? Math.round(raw.zoneTimeDetails.neutralZone.pctg * 100) : null,
      defensive: raw.zoneTimeDetails.defensiveZone?.pctg != null ? Math.round(raw.zoneTimeDetails.defensiveZone.pctg * 100) : null,
    } : null,
    sogSummary: (raw.sogSummary || []).map((s) => ({
      label: s.label?.default || s.label || '—',
      sog: s.shotsOnGoal ?? 0,
      goals: s.goals ?? 0,
      shootingPct: s.shootingPctg != null ? +(s.shootingPctg * 100).toFixed(1) : null,
    })),
  };
}

/* ═══════════════════════════════════════════════════════════════
   TEAM EDGE DATA
   ═══════════════════════════════════════════════════════════════ */

/**
 * Adapt /v1/edge/team-comparison/{teamId}/{season}/{gameType} response.
 * Returns team-level Edge metrics with league comparison.
 */
export function adaptTeamEdge(raw) {
  if (!raw) return null;

  const imperial = (obj) => obj?.imperial ?? null;

  return {
    team: {
      abbrev: raw.team?.abbrev,
      name: raw.team?.commonName?.default,
    },
    shotSpeed: {
      top: imperial(raw.shotSpeedDetails?.topShotSpeed),
      avg: imperial(raw.shotSpeedDetails?.avgShotSpeed),
      topPlayer: raw.shotSpeedDetails?.topShotSpeed?.overlay?.player
        ? `${raw.shotSpeedDetails.topShotSpeed.overlay.player.firstName?.default || ''} ${raw.shotSpeedDetails.topShotSpeed.overlay.player.lastName?.default || ''}`.trim()
        : null,
    },
    skatingSpeed: {
      top: imperial(raw.skatingSpeedDetails?.topSkatingSpeed),
      topPlayer: raw.skatingSpeedDetails?.topSkatingSpeed?.overlay?.player
        ? `${raw.skatingSpeedDetails.topSkatingSpeed.overlay.player.firstName?.default || ''} ${raw.skatingSpeedDetails.topSkatingSpeed.overlay.player.lastName?.default || ''}`.trim()
        : null,
    },
    skatingDistance: raw.skatingDistanceDetails ? {
      avgPerGame: imperial(raw.skatingDistanceDetails.avgPerGame),
      avgPer60: imperial(raw.skatingDistanceDetails.avgPer60),
      leagueAvgPerGame: imperial(raw.skatingDistanceDetails.avgPerGame?.leagueAvg),
    } : null,
    zoneTime: raw.zoneTimeDetails ? {
      offensive: raw.zoneTimeDetails.offensiveZonePctg != null ? Math.round(raw.zoneTimeDetails.offensiveZonePctg * 100) : null,
      neutral: raw.zoneTimeDetails.neutralZonePctg != null ? Math.round(raw.zoneTimeDetails.neutralZonePctg * 100) : null,
      defensive: raw.zoneTimeDetails.defensiveZonePctg != null ? Math.round(raw.zoneTimeDetails.defensiveZonePctg * 100) : null,
      leagueAvgOffensive: raw.zoneTimeDetails.offensiveZoneLeagueAvg != null ? Math.round(raw.zoneTimeDetails.offensiveZoneLeagueAvg * 100) : null,
    } : null,
    shotLocations: (raw.shotLocationDetails || []).map((loc) => ({
      zone: loc.area || '—',
      sog: loc.sog ?? 0,
      goals: loc.goals ?? 0,
      shootingPct: loc.shootingPctg != null ? +(loc.shootingPctg * 100).toFixed(1) : null,
      leagueAvgPct: null, // league avg is in shotLocationTotals, not per-zone
    })),
    shotLocationTotals: (raw.shotLocationTotals || []).reduce((acc, t) => {
      acc[t.locationCode] = { sog: t.sog, goals: t.goals, pct: t.shootingPctg != null ? +(t.shootingPctg * 100).toFixed(1) : null };
      return acc;
    }, {}),
    shotDifferential: raw.shotDifferential ? {
      shotAttemptDiff: raw.shotDifferential.shotAttemptDifferential != null ? +(raw.shotDifferential.shotAttemptDifferential * 100).toFixed(1) : null,
      sogDiff: raw.shotDifferential.sogDifferential != null ? +(raw.shotDifferential.sogDifferential * 100).toFixed(1) : null,
    } : null,
  };
}

/* ═══════════════════════════════════════════════════════════════
   GOALIE EDGE DATA
   ═══════════════════════════════════════════════════════════════ */

/**
 * Adapt /v1/edge/goalie-detail/{id}/{season}/{gameType} response.
 */
export function adaptGoalieEdge(raw) {
  if (!raw) return null;

  return {
    player: {
      id: raw.player?.id,
      name: `${raw.player?.firstName?.default || ''} ${raw.player?.lastName?.default || ''}`.trim(),
      headshot: raw.player?.headshot,
      number: raw.player?.sweaterNumber,
      team: raw.player?.team?.abbrev,
    },
    gaa: raw.goalsAgainstAverage ?? null,
    gamesAbove900: raw.gamesAbove900 ?? null,
    gamesAbove900Pct: raw.gamesAbove900Pctg != null ? Math.round(raw.gamesAbove900Pctg * 100) : null,
    goalDiffPer60: raw.goalDifferentialPer60 ?? null,
    goalSupportAvg: raw.avgGoalSupport ?? null,
    pointPct: raw.pointPctg != null ? Math.round(raw.pointPctg * 100) : null,
    shotLocationSummary: (raw.sogSummary || raw.shotLocationSummary || []).map((s) => ({
      zone: s.label?.default || s.label || '—',
      sa: s.shotsAgainst ?? 0,
      saves: s.saves ?? 0,
      ga: s.goalsAgainst ?? 0,
      svPct: s.savePctg != null ? +(s.savePctg * 100).toFixed(1) : null,
    })),
  };
}

/* ═══════════════════════════════════════════════════════════════
   EDGE LEADERS
   ═══════════════════════════════════════════════════════════════ */

/**
 * Adapt /v1/edge/skater-landing/{season}/{gameType} response.
 * Returns league-wide Edge leaders.
 */
export function adaptEdgeLeaders(raw) {
  if (!raw) return null;

  const extractLeader = (obj) => {
    if (!obj?.leader) return null;
    const p = obj.leader;
    return {
      id: p.playerId || p.id,
      name: `${p.firstName?.default || ''} ${p.lastName?.default || ''}`.trim(),
      headshot: p.headshot,
      team: p.teamAbbrev?.default || p.team?.abbrev,
      value: obj.value?.imperial ?? obj.value ?? null,
      unit: obj.unit || '',
    };
  };

  return {
    topShotSpeed: extractLeader(raw.topShotSpeed),
    topSkatingSpeed: extractLeader(raw.topSkatingSpeed),
    topDistance: extractLeader(raw.topDistance),
    highDangerSOG: extractLeader(raw.highDangerSog),
    offensiveZoneTime: extractLeader(raw.offensiveZoneTime),
  };
}
