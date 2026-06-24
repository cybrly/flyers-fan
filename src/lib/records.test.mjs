import test from 'node:test';
import assert from 'node:assert/strict';
import { adaptRecords, parseHtmlList } from './records.js';

test('parseHtmlList extracts and decodes list items', () => {
  const html = '<ul class="striped-list">\n\t<li>1 &ndash;&nbsp;Bernie Parent (1967-71)</li>\n\t<li>2 &ndash;&nbsp;Mark Howe (1982-92)</li></ul>';
  assert.deepEqual(parseHtmlList(html), [
    '1 – Bernie Parent (1967-71)',
    '2 – Mark Howe (1982-92)',
  ]);
  assert.deepEqual(parseHtmlList(null), []);
  assert.deepEqual(parseHtmlList(''), []);
});

test('adaptRecords shapes franchise totals, cups, and best seasons', () => {
  const totals = { data: [
    { gameTypeId: 2, teamName: 'Philadelphia Flyers', gamesPlayed: 4581, wins: 2249, losses: 1635, ties: 457, overtimeLosses: 240, points: 5195, pointPctg: 0.567, goalsFor: 14770, goalsAgainst: 13513, shutouts: 260, penaltyMinutes: 80019, cups: 2, playoffSeasons: 41, firstSeasonId: 19671968 },
    { gameTypeId: 3, gamesPlayed: 466, wins: 233, losses: 233, seriesPlayed: 84, seriesWins: 45, seriesLosses: 39 },
  ] };
  const seasons = { data: [
    { gameTypeId: 2, seasonId: 19751976, points: 118, wins: 51, losses: 13, ties: 16, overtimeLosses: 0, gamesPlayed: 80 },
    { gameTypeId: 2, seasonId: 19741975, points: 113, wins: 51, losses: 18, ties: 11, overtimeLosses: 0, gamesPlayed: 80 },
    { gameTypeId: 3, seasonId: 19731974, seriesTitle: 'Stanley Cup Final', decision: 'W' },
    { gameTypeId: 3, seasonId: 19741975, seriesTitle: 'Stanley Cup Final', decision: 'W' },
    { gameTypeId: 3, seasonId: 19751976, seriesTitle: 'Stanley Cup Final', decision: 'L' },
  ] };
  const detail = { data: [{ firstSeasonId: 19671968, retiredNumbersSummary: '<ul><li>1 &ndash;&nbsp;Bernie Parent</li></ul>' }] };

  const r = adaptRecords({ totals, seasons, detail });
  assert.equal(r.hasData, true);
  assert.equal(r.teamName, 'Philadelphia Flyers');
  assert.equal(r.firstSeason, '1967–68');
  assert.equal(r.allTime.record, '2249-1635-697'); // ties + OTL folded
  assert.equal(r.allTime.points, 5195);
  assert.equal(r.allTime.cups, 2);
  assert.equal(r.postseason.seriesWins, 45);
  assert.deepEqual(r.cupWins, ['1973–74', '1974–75']);
  assert.deepEqual(r.cupFinals, ['1973–74', '1974–75', '1975–76']);
  assert.equal(r.bestSeasons[0].season, '1975–76');
  assert.equal(r.bestSeasons[0].points, 118);
  assert.equal(r.bestSeasons[0].record, '51-13-16');
  assert.deepEqual(r.retiredNumbers, ['1 – Bernie Parent']);
});

test('adaptRecords degrades gracefully on empty input', () => {
  const r = adaptRecords({});
  assert.equal(r.hasData, false);
  assert.equal(r.allTime, null);
  assert.deepEqual(r.cupWins, []);
  assert.deepEqual(r.bestSeasons, []);
});
