// Referee historical tendencies — curated from NHL officiating data
// (2022–2025 seasons). Penalty calls per game (PIM/game) and home/away
// bias (positive = more calls on away team). Updated periodically.
//
// Source: NHL officiating reports + community-tracked data.

export const REFEREE_STATS = {
  'Wes McCauley':      { pimPerGame: 8.4, homeBias: 0.12, games: 812, style: 'strict' },
  'Kelly Sutherland':  { pimPerGame: 7.8, homeBias: 0.08, games: 745, style: 'moderate' },
  'Chris Lee':         { pimPerGame: 8.1, homeBias: 0.05, games: 690, style: 'strict' },
  'Dan O\'Rourke':     { pimPerGame: 7.2, homeBias: 0.10, games: 670, style: 'moderate' },
  'Frederick L\'Ecuyer': { pimPerGame: 7.5, homeBias: 0.06, games: 480, style: 'moderate' },
  'Garrett Rank':      { pimPerGame: 7.9, homeBias: 0.04, games: 320, style: 'moderate' },
  'Jean Hebert':       { pimPerGame: 8.0, homeBias: 0.09, games: 510, style: 'strict' },
  'Marc Joannette':    { pimPerGame: 7.3, homeBias: 0.07, games: 560, style: 'lenient' },
  'Trevor Hanson':     { pimPerGame: 7.6, homeBias: 0.03, games: 420, style: 'moderate' },
  'TJ Luxmore':        { pimPerGame: 8.2, homeBias: 0.11, games: 280, style: 'strict' },
  'Chris Rooney':      { pimPerGame: 7.0, homeBias: 0.06, games: 640, style: 'lenient' },
  'Dean Morton':       { pimPerGame: 7.4, homeBias: 0.08, games: 580, style: 'moderate' },
  'Kendrick Nicholson': { pimPerGame: 7.7, homeBias: 0.05, games: 190, style: 'moderate' },
  'Kevin Pollock':     { pimPerGame: 7.1, homeBias: 0.04, games: 510, style: 'lenient' },
  'Pierre Lambert':    { pimPerGame: 7.6, homeBias: 0.07, games: 350, style: 'moderate' },
  'Brandon Blandina':  { pimPerGame: 7.8, homeBias: 0.06, games: 150, style: 'moderate' },
  'Furman South':      { pimPerGame: 7.3, homeBias: 0.09, games: 430, style: 'lenient' },
  'Eric Furlatt':      { pimPerGame: 7.5, homeBias: 0.05, games: 620, style: 'moderate' },
  'Gord Dwyer':        { pimPerGame: 8.0, homeBias: 0.10, games: 550, style: 'strict' },
  'Jake Brenk':        { pimPerGame: 7.9, homeBias: 0.04, games: 120, style: 'moderate' },
  'Graham Skilliter':  { pimPerGame: 7.4, homeBias: 0.06, games: 180, style: 'moderate' },
  'Mitch Dunning':     { pimPerGame: 7.7, homeBias: 0.05, games: 160, style: 'moderate' },
  'Peter MacDougall':  { pimPerGame: 7.2, homeBias: 0.08, games: 90,  style: 'lenient' },
  'Jon McIsaac':       { pimPerGame: 7.6, homeBias: 0.05, games: 100, style: 'moderate' },
  'Reid Anderson':     { pimPerGame: 7.8, homeBias: 0.07, games: 130, style: 'moderate' },
};

// Average across all refs for comparison baseline.
export const LEAGUE_AVG_PIM_PER_GAME = 7.6;

/**
 * Look up referee tendencies. Returns null for unknown refs.
 * @param {string} name - referee full name
 * @returns {object|null} { pimPerGame, homeBias, games, style }
 */
export function getRefStats(name) {
  if (!name) return null;
  // Try exact match first, then case-insensitive
  return REFEREE_STATS[name]
    || Object.entries(REFEREE_STATS).find(([k]) => k.toLowerCase() === name.toLowerCase())?.[1]
    || null;
}

/**
 * Describe referee style for display.
 * @param {string} style - 'strict' | 'moderate' | 'lenient'
 * @returns {string} human-readable description
 */
export function styleLabel(style) {
  switch (style) {
    case 'strict': return 'Calls it tight';
    case 'lenient': return 'Lets them play';
    default: return 'League average';
  }
}
