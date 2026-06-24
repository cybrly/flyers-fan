import test from 'node:test';
import assert from 'node:assert/strict';
import { formatRecord, selectCurrentPlayoffGames, summarizeGames, streakFromGames, hoursSince, isStaleAsOf, scheduleLooksOffseason } from './hockey.js';

test('summarizeGames counts overtime losses as one standings point', () => {
  const summary = summarizeGames([
    { us: 4, them: 2 },
    { us: 2, them: 3, lastPeriodType: 'OT' },
    { us: 1, them: 5 },
  ]);

  assert.equal(summary.w, 1);
  assert.equal(summary.l, 1);
  assert.equal(summary.otl, 1);
  assert.equal(summary.points, 3);
  assert.equal(summary.pointsPct, 0.5);
  assert.equal(formatRecord(summary), '1-1-1');
});

test('selectCurrentPlayoffGames returns the latest round only', () => {
  const games = [
    { id: 1, seriesStatus: { round: 1, seriesAbbrev: 'R1' } },
    { id: 2, seriesStatus: { round: 1, seriesAbbrev: 'R1' } },
    { id: 3, seriesStatus: { round: 2, seriesAbbrev: 'R2' } },
    { id: 4, seriesStatus: { round: 2, seriesAbbrev: 'R2' } },
  ];

  assert.deepEqual(selectCurrentPlayoffGames(games).map((game) => game.id), [3, 4]);
});

test('streakFromGames counts the leading run of same-result games', () => {
  // newest-first, as adaptSchedule returns
  assert.equal(streakFromGames([{ w: true }, { w: true }, { w: true }, { w: false }]), 'W3');
  assert.equal(streakFromGames([{ w: false }, { w: false }, { w: true }]), 'L2');
  assert.equal(streakFromGames([{ w: true }]), 'W1');
  assert.equal(streakFromGames([]), null);
  assert.equal(streakFromGames(null), null);
});

test('hoursSince handles past, future, and missing dates', () => {
  const now = Date.UTC(2026, 5, 24, 12, 0, 0); // 2026-06-24T12:00:00Z
  assert.equal(hoursSince(new Date(now - 3_600_000).toISOString(), now), 1);
  assert.ok(hoursSince(new Date(now + 7_200_000).toISOString(), now) < 0); // future
  assert.equal(hoursSince(null, now), Infinity);
  assert.equal(hoursSince('not-a-date', now), Infinity);
});

test('isStaleAsOf flags offseason data but not recent or upcoming games', () => {
  const now = Date.UTC(2026, 5, 24, 12, 0, 0); // 2026-06-24
  // Cup Final ~10 days ago → stale (offseason)
  assert.equal(isStaleAsOf('2026-06-14T00:00:00Z', now), true);
  // last night's game → fresh
  assert.equal(isStaleAsOf(new Date(now - 18 * 3_600_000).toISOString(), now), false);
  // a future (FUT) game on the slate → never stale
  assert.equal(isStaleAsOf(new Date(now + 6 * 3_600_000).toISOString(), now), false);
  // missing date counts as stale
  assert.equal(isStaleAsOf(undefined, now), true);
});

test('scheduleLooksOffseason is playoff-aware (no false-positive between rounds)', () => {
  const now = Date.UTC(2026, 5, 24, 12, 0, 0); // 2026-06-24
  const old = '2026-06-14T00:00:00Z'; // ~10 days stale
  const recent = new Date(now - 18 * 3_600_000).toISOString();
  const future = new Date(now + 12 * 3_600_000).toISOString();

  // In-season: an upcoming game on the feed → never offseason.
  assert.equal(scheduleLooksOffseason({ nextGame: { id: 1, startUTC: future }, games: [{ startUTC: old, w: true, gameType: 3 }] }, now), false);
  // Live game in progress → never offseason.
  assert.equal(scheduleLooksOffseason({ liveGame: { id: 1 }, games: [{ startUTC: old, w: false, gameType: 3 }] }, now), false);
  // Between rounds: won last playoff game, nothing scheduled, stale → NOT offseason.
  assert.equal(scheduleLooksOffseason({ games: [{ startUTC: old, w: true, gameType: 3 }] }, now), false);
  // Eliminated: lost last playoff game, nothing scheduled, stale → offseason.
  assert.equal(scheduleLooksOffseason({ games: [{ startUTC: old, w: false, gameType: 3 }] }, now), true);
  // Missed playoffs: last regular-season game, stale, nothing scheduled → offseason.
  assert.equal(scheduleLooksOffseason({ games: [{ startUTC: old, w: false, gameType: 2 }] }, now), true);
  // Recent game (e.g. last night) → not offseason yet.
  assert.equal(scheduleLooksOffseason({ games: [{ startUTC: recent, w: false, gameType: 2 }] }, now), false);
  // Schedule not loaded yet → don't flash offseason.
  assert.equal(scheduleLooksOffseason({ games: [] }, now), false);
  assert.equal(scheduleLooksOffseason(null, now), false);
});
