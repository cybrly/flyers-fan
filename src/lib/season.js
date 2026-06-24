// Season resolution — pure, no React, no fetch.
//
// The NHL API never returns an "empty" current season in the offseason; it
// pins /now endpoints to the last season played. And the new season's
// schedule doesn't post until mid-summer. So "what season is it?" can't be
// answered from a date alone — it depends on whether the upcoming season's
// schedule has actually been published yet.
//
// This module owns that decision. The impure part (fetching the upcoming
// season's schedule to learn whether it has posted) lives in App; it passes
// the result in as `upcomingPosted` so everything here stays a pure function
// of its inputs and is unit-testable against a fixed `now`.

import { scheduleLooksOffseason } from './hockey.js';

// "20252026" from a start year of 2025.
export const makeSeasonId = (startYear) => `${startYear}${startYear + 1}`;

// 2025 from "20252026".
export const seasonStartYear = (id) => Number(String(id).slice(0, 4));

// "25–26" (short) or "2025–26" (full) from a season id.
export const seasonLabel = (id, { full = false } = {}) => {
  const a = seasonStartYear(id);
  const b = a + 1;
  return full ? `${a}–${String(b).slice(2)}` : `${String(a).slice(2)}–${String(b).slice(2)}`;
};

// The calendar-based season start year. NHL seasons span Oct → Apr/Jun; the
// new schedule lands in late summer. We treat Sep 1 as the rollover so August
// traffic still sees the prior season until the new one is reachable. This is
// only the *candidate* season — resolveSeasonState may roll past it once the
// upcoming schedule actually posts (which can happen before Sep 1).
export const calendarStartYear = (now = Date.now()) => {
  const d = new Date(now);
  return d.getMonth() >= 8 ? d.getFullYear() : d.getFullYear() - 1;
};

// Resolve the season the app should present, given the calendar candidate, the
// selected team's currently-loaded (adapted) schedule, and whether the
// upcoming season's schedule has posted yet.
//
// Returns:
//   activeSeasonId   - the season whose data the app should treat as current
//   upcomingSeasonId - the season being counted toward in the offseason (or
//                      null when a live/in-progress season is the active one)
//   rolledForward    - true once we've adopted the upcoming season early
//   phase            - 'regular' | 'playoffs' | 'offseason' | 'preseason'
//   isFinal          - the active season is complete (show "Final", not "Live")
//   statusLabel      - short status word for chips/headings
//   label/labelFull  - season label strings for the active season
export function resolveSeasonState({
  now = Date.now(),
  calSeasonId,
  upcomingSeasonId,
  schedule = null,
  upcomingPosted = false,
} = {}) {
  const calStart = calendarStartYear(now);
  const calId = calSeasonId || makeSeasonId(calStart);
  const nextId = upcomingSeasonId || makeSeasonId(calStart + 1);

  const rolledForward = !!upcomingPosted;
  const activeSeasonId = rolledForward ? nextId : calId;

  const live = !!(schedule && (schedule.liveGame || schedule.nextGame));
  const offseason = !rolledForward && scheduleLooksOffseason(schedule, now);
  const lastWasPlayoff = schedule?.games?.[0]?.gameType === 3;

  let phase;
  if (rolledForward) phase = 'preseason';        // upcoming season posted, not yet underway
  else if (live) phase = lastWasPlayoff ? 'playoffs' : 'regular';
  else if (offseason) phase = 'offseason';
  else phase = lastWasPlayoff ? 'playoffs' : 'regular';

  const isFinal = phase === 'offseason';

  const statusLabel = rolledForward ? 'Upcoming'
    : phase === 'offseason' ? 'Final'
    : phase === 'playoffs' ? 'Playoffs'
    : 'Live';

  return {
    activeSeasonId,
    // Surface the season we're counting toward whenever we aren't already
    // showing a live/in-progress one.
    upcomingSeasonId: rolledForward ? null : (offseason ? nextId : null),
    rolledForward,
    phase,
    isFinal,
    statusLabel,
    label: seasonLabel(activeSeasonId),
    labelFull: seasonLabel(activeSeasonId, { full: true }),
  };
}
