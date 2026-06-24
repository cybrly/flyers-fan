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

// Current win/loss streak derived from a schedule's finished games, which the
// adapter returns newest-first with a boolean `w` (win) on each. Returns e.g.
// "W3" / "L2", or null when there are no finished games.
//
// This is the single source of truth for streak across the app. We derive it
// from the schedule rather than the standings endpoint's streakCode because
// /standings/now freezes streakCode at the regular-season finale — during the
// playoffs (and the offseason) it will happily report a stale "W3" while the
// team has since been knocked out. schedule.games includes playoff results,
// so the derived streak stays honest year-round.
export function streakFromGames(games) {
  if (!games || games.length === 0) return null;
  const type = games[0].w;
  let n = 0;
  for (const g of games) {
    if (g.w === type) n += 1;
    else break;
  }
  return `${type ? 'W' : 'L'}${n}`;
}

// Cumulative standings points across a season's finished regular-season games,
// in chronological order: +2 for a win, +1 for an OT/SO loss, 0 for a
// regulation loss. Input is an adapted schedule's `games` array (newest-first,
// as adaptSchedule returns), so we reverse to chronological. Used to overlay a
// past season's points pace onto the current season on the Trends chart.
export function cumulativePoints(games) {
  if (!Array.isArray(games)) return [];
  const chrono = games
    .filter((g) => g.gameType === 2 && typeof g.w === 'boolean')
    .slice()
    .reverse();
  const out = [];
  let pts = 0;
  for (const g of chrono) {
    if (g.w) pts += 2;
    else if (wentExtra(g)) pts += 1;
    out.push(pts);
  }
  return out;
}

// Hours elapsed between an ISO timestamp and `now` (ms epoch). Negative for
// future timestamps. Returns Infinity for a missing/invalid date so callers
// treat "no data" as maximally stale.
export function hoursSince(iso, now = Date.now()) {
  if (!iso) return Infinity;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return Infinity;
  return (now - t) / 3_600_000;
}

// Whether a snapshot anchored at `iso` is stale relative to wall-clock `now`.
//
// The NHL API never returns an "empty" scoreboard/standings in the offseason —
// it pins to the last game played (e.g. the Stanley Cup Final in June). So the
// presence of data is NOT a freshness signal; the date is. A snapshot counts as
// stale once its most-recent game is more than `hours` behind now. The 48h
// default absorbs ordinary 1–2 day gaps between game nights (and the All-Star
// break, where upcoming FUT games carry a future startUTC → negative hours →
// never stale) without false-flagging during the season.
export function isStaleAsOf(iso, now = Date.now(), hours = 48) {
  return hoursSince(iso, now) > hours;
}

// Whether the selected team's schedule indicates the season is genuinely over
// (offseason) — as opposed to in-season, or merely between playoff rounds.
//
// "No upcoming game + last game is stale" is NOT sufficient on its own: the NHL
// schedule feed carries no FUT entry during the multi-day gap between playoff
// rounds (most acutely the wait between a Conference Final clincher and Game 1
// of the Cup Final, historically 4–9 days). A team sitting in that gap has no
// next game and a >48h-old last game, but is very much still playing.
//
// The tell is whether that last playoff game was a WIN: a team that just won a
// playoff game with nothing scheduled has advanced (it's between rounds, or has
// won the Cup) and is not in the offseason. A team whose last game was a loss
// (eliminated) — or a stale regular-season game (missed the playoffs) — is done.
export function scheduleLooksOffseason(schedule, now = Date.now()) {
  if (!schedule) return false;
  if (schedule.liveGame || schedule.nextGame) return false;
  const last = schedule.games && schedule.games[0];
  if (!last) return false; // schedule not loaded yet — don't flash the offseason state
  if (last.gameType === 3 && last.w) return false; // won last playoff game, awaiting next round
  return isStaleAsOf(last.startUTC, now);
}
