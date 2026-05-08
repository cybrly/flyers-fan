export const wentExtra = (game) => ['OT', 'SO'].includes(game?.lastPeriodType || game?.periodType);

export const pct = (a, b) => b > 0 ? a / b : 0;

export function summarizeGames(games) {
  const summary = {
    gp: games.length,
    w: 0,
    l: 0,
    otl: 0,
    gf: 0,
    ga: 0,
    points: 0,
  };

  for (const game of games) {
    const diff = (game.us ?? 0) - (game.them ?? 0);
    summary.gf += game.us ?? 0;
    summary.ga += game.them ?? 0;

    if (diff > 0) {
      summary.w += 1;
      summary.points += 2;
    } else if (wentExtra(game)) {
      summary.otl += 1;
      summary.points += 1;
    } else {
      summary.l += 1;
    }
  }

  summary.l += Math.max(0, games.length - summary.w - summary.otl - summary.l);

  return {
    ...summary,
    diff: summary.gf - summary.ga,
    gfPer: summary.gp ? summary.gf / summary.gp : 0,
    gaPer: summary.gp ? summary.ga / summary.gp : 0,
    diffPer: summary.gp ? (summary.gf - summary.ga) / summary.gp : 0,
    winPct: pct(summary.w, summary.gp),
    pointsPct: pct(summary.points, summary.gp * 2),
  };
}

export function formatRecord(summary) {
  if (!summary?.gp) return '—';
  return `${summary.w}-${summary.l}-${summary.otl || 0}`;
}

export function selectCurrentPlayoffGames(playoffGames) {
  if (!playoffGames.length) return [];
  const currentRound = Math.max(...playoffGames.map((game) => game.seriesStatus?.round || 0));
  return playoffGames.filter((game) => (game.seriesStatus?.round || 0) === currentRound);
}
