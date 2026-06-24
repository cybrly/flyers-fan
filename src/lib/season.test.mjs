import test from 'node:test';
import assert from 'node:assert/strict';
import {
  makeSeasonId,
  seasonStartYear,
  seasonLabel,
  calendarStartYear,
  resolveSeasonState,
} from './season.js';

test('season id and label helpers', () => {
  assert.equal(makeSeasonId(2025), '20252026');
  assert.equal(seasonStartYear('20252026'), 2025);
  assert.equal(seasonLabel('20252026'), '25–26');
  assert.equal(seasonLabel('20252026', { full: true }), '2025–26');
  assert.equal(seasonLabel('20262027', { full: true }), '2026–27');
});

test('calendarStartYear flips around the Sep 1 rollover', () => {
  // Uses local month (matching the prior config behavior); assert with
  // mid-month noon dates so the exact UTC/local boundary isn't in play.
  // Jun 2026 → still the 2025–26 season year (rollover hasn't happened)
  assert.equal(calendarStartYear(new Date(2026, 5, 24, 12).getTime()), 2025);
  // Aug 2026 → still 2025
  assert.equal(calendarStartYear(new Date(2026, 7, 15, 12).getTime()), 2025);
  // Sep 2026 → rolls to 2026
  assert.equal(calendarStartYear(new Date(2026, 8, 15, 12).getTime()), 2026);
  // Jan 2027 (mid-season) → 2026
  assert.equal(calendarStartYear(new Date(2027, 0, 15, 12).getTime()), 2026);
});

const now = Date.UTC(2026, 5, 24, 12, 0, 0); // 2026-06-24
const old = '2026-06-14T00:00:00Z';          // ~10 days stale
const future = new Date(now + 12 * 3_600_000).toISOString();

test('offseason today: shows last season as Final, counts toward next', () => {
  // Eliminated last playoff game, nothing scheduled, stale → offseason.
  const schedule = { games: [{ startUTC: old, w: false, gameType: 3 }] };
  const s = resolveSeasonState({ now, schedule, upcomingPosted: false });
  assert.equal(s.activeSeasonId, '20252026');
  assert.equal(s.phase, 'offseason');
  assert.equal(s.isFinal, true);
  assert.equal(s.statusLabel, 'Final');
  assert.equal(s.upcomingSeasonId, '20262027');
  assert.equal(s.label, '25–26');
});

test('auto roll-forward: upcoming schedule posted → adopt it as preseason', () => {
  // The current-season schedule still looks offseason, but the upcoming
  // season has posted (probe returned games). We roll forward.
  const schedule = { games: [{ startUTC: old, w: false, gameType: 3 }] };
  const s = resolveSeasonState({ now, schedule, upcomingPosted: true });
  assert.equal(s.activeSeasonId, '20262027');
  assert.equal(s.rolledForward, true);
  assert.equal(s.phase, 'preseason');
  assert.equal(s.isFinal, false);
  assert.equal(s.statusLabel, 'Upcoming');
  assert.equal(s.upcomingSeasonId, null);
});

test('in-season: live/upcoming game → Live, no roll-forward, no upcoming label', () => {
  const schedule = { nextGame: { id: 1, startUTC: future }, games: [{ startUTC: old, w: true, gameType: 2 }] };
  const inSeasonNow = Date.UTC(2027, 0, 15, 12, 0, 0); // Jan 2027
  const s = resolveSeasonState({ now: inSeasonNow, schedule, upcomingPosted: false });
  assert.equal(s.activeSeasonId, '20262027');
  assert.equal(s.phase, 'regular');
  assert.equal(s.isFinal, false);
  assert.equal(s.statusLabel, 'Live');
  assert.equal(s.upcomingSeasonId, null);
});

test('playoffs in progress: live playoff game → Playoffs status', () => {
  const playoffNow = Date.UTC(2026, 4, 20, 12, 0, 0); // mid-May
  const schedule = { liveGame: { id: 9 }, games: [{ startUTC: old, w: true, gameType: 3 }] };
  const s = resolveSeasonState({ now: playoffNow, schedule, upcomingPosted: false });
  assert.equal(s.phase, 'playoffs');
  assert.equal(s.statusLabel, 'Playoffs');
  assert.equal(s.isFinal, false);
});

test('schedule not loaded yet → does not flash offseason', () => {
  const s = resolveSeasonState({ now, schedule: { games: [] }, upcomingPosted: false });
  assert.equal(s.phase, 'regular'); // neutral default, not offseason
  assert.equal(s.isFinal, false);
});
