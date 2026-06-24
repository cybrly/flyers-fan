// Shape the NHL Records API responses into the franchise-records view model.
// Pure — no React, no fetch. Inputs are the raw JSON from the three
// records.nhl.com resources; output is what the Records page renders.

import { seasonLabel } from './season.js';

const num = (v) => (typeof v === 'number' ? v : 0);
const label = (seasonId) => seasonLabel(String(seasonId), { full: true });

// The records feed returns retiredNumbersSummary / captainHistory etc. as an
// HTML "<ul><li>…</li></ul>" string. Pull out the list items as plain text,
// decoding the handful of entities the feed actually uses.
export function parseHtmlList(html) {
  if (!html || typeof html !== 'string') return [];
  return [...html.matchAll(/<li>(.*?)<\/li>/gis)]
    .map((m) => m[1]
      .replace(/<[^>]+>/g, '')
      .replace(/&ndash;/g, '–')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/\s+/g, ' ')
      .trim())
    .filter(Boolean);
}

export function adaptRecords({ totals, seasons, detail } = {}) {
  const totalRows = totals?.data || [];
  const reg = totalRows.find((r) => r.gameTypeId === 2) || null;
  const post = totalRows.find((r) => r.gameTypeId === 3) || null;
  const seasonRows = seasons?.data || [];
  const det = detail?.data?.[0] || null;

  // Best regular seasons by points.
  const bestSeasons = seasonRows
    .filter((r) => r.gameTypeId === 2)
    .sort((a, b) => num(b.points) - num(a.points))
    .slice(0, 5)
    .map((r) => ({
      id: String(r.seasonId),
      season: label(r.seasonId),
      points: num(r.points),
      record: `${num(r.wins)}-${num(r.losses)}-${num(r.ties) + num(r.overtimeLosses)}`,
      gp: num(r.gamesPlayed),
    }));

  // Stanley Cup wins + Final appearances, from the playoff season rows.
  const finals = seasonRows.filter(
    (r) => r.gameTypeId === 3 && /stanley cup final/i.test(r.seriesTitle || ''),
  );
  const cupWins = finals
    .filter((r) => r.decision === 'W')
    .map((r) => label(r.seasonId))
    .sort();
  const cupFinals = finals.map((r) => label(r.seasonId)).sort();

  const allTime = reg ? {
    gp: num(reg.gamesPlayed),
    record: `${num(reg.wins)}-${num(reg.losses)}-${num(reg.ties) + num(reg.overtimeLosses)}`,
    points: num(reg.points),
    pointPct: typeof reg.pointPctg === 'number' ? reg.pointPctg : null,
    gf: num(reg.goalsFor),
    ga: num(reg.goalsAgainst),
    shutouts: num(reg.shutouts),
    pim: num(reg.penaltyMinutes),
    cups: num(reg.cups),
    playoffSeasons: num(reg.playoffSeasons),
  } : null;

  const postseason = post ? {
    gp: num(post.gamesPlayed),
    record: `${num(post.wins)}-${num(post.losses)}`,
    seriesPlayed: num(post.seriesPlayed),
    seriesWins: num(post.seriesWins),
    seriesLosses: num(post.seriesLosses),
  } : null;

  const firstSeasonId = det?.firstSeasonId || reg?.firstSeasonId || null;

  return {
    teamName: reg?.teamName || det?.teamFullName || null,
    firstSeason: firstSeasonId ? label(firstSeasonId) : null,
    allTime,
    postseason,
    bestSeasons,
    cupWins,
    cupFinals,
    retiredNumbers: parseHtmlList(det?.retiredNumbersSummary),
    hasData: !!reg,
  };
}
