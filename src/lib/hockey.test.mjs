import test from 'node:test';
import assert from 'node:assert/strict';
import { formatRecord, selectCurrentPlayoffGames, summarizeGames } from './hockey.js';

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
