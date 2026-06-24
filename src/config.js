// Constants, formatters, and tiny utilities. No React, no fetch — pure.

import { makeSeasonId, seasonLabel, calendarStartYear } from './lib/season.js';

// Active team — mutable at runtime. When the user picks a different team
// from the sidebar dropdown, setActiveTeam() updates this and App re-renders,
// causing all hooks/adapters to re-read the new value.
export let TEAM_ABBR = 'PHI';
export const setActiveTeam = (abbr) => { TEAM_ABBR = abbr; };

// Calendar-candidate season. NHL seasons span Oct → Apr/Jun (regular season +
// playoffs); the new season's schedule lands in late summer. calendarStartYear
// flips on Sep 1 so August traffic still sees the prior season until the new
// one is reachable. This is the *candidate* — the runtime season engine
// (lib/season.js + App) may roll forward to UPCOMING_SEASON_ID early, the
// moment that schedule actually posts. SEASON remains the safe default used to
// build the initial schedule fetch path.
const _seasonStartYear = calendarStartYear();
export const SEASON = makeSeasonId(_seasonStartYear);
export const SEASON_LABEL = seasonLabel(SEASON);
export const SEASON_LABEL_FULL = seasonLabel(SEASON, { full: true });
// The season after the current one. Used as the roll-forward probe target and
// by the season-end banner so the "see you next season" copy rolls over
// automatically. Today (candidate 2025–26) this is "20262027" / "2026–27".
export const UPCOMING_SEASON_ID = makeSeasonId(_seasonStartYear + 1);
export const NEXT_SEASON_LABEL_FULL = seasonLabel(UPCOMING_SEASON_ID, { full: true });

// Playoff year is the second calendar year of the season (e.g. 2025–26
// season → 2026 playoffs). NHL Entry Draft happens in late June, so the
// upcoming draft and the playoff year are the same number.
export const PLAYOFF_YEAR = String(_seasonStartYear + 1);
export const UPCOMING_DRAFT_YEAR = String(_seasonStartYear + 1);
export const PRIOR_DRAFT_YEAR = String(_seasonStartYear);

// Poll intervals (ms). Adjust if you want more or less chatter.
export const POLL = {
  live: 10_000,       // when a game is in progress
  near: 30_000,       // when a game is within 30 min or just ended
  idle: 60_000,       // everything else
  standings: 300_000, // standings change slowly
};

// Proxy path. /api/nhl forwards to https://api-web.nhle.com/ (see api/nhl.js).
export const API = (path) => `/api/nhl?path=${encodeURIComponent(path)}`;

export const cx = (...a) => a.filter(Boolean).join(' ');

// NHL arena coordinates (latitude, longitude) keyed by team abbreviation.
// Used to compute travel miles between consecutive games on the schedule.
// Coordinates are approximate but accurate to ~0.5 mile, which is plenty
// for a schedule-context "miles flown" annotation.
export const TEAM_ARENAS = {
  ANA: [33.8078, -117.8761], BOS: [42.3662, -71.0621], BUF: [42.8751, -78.8765],
  CGY: [51.0374, -114.0519], CAR: [35.8033, -78.7217], CHI: [41.8807, -87.6742],
  COL: [39.7487, -105.0076], CBJ: [39.9695, -83.0061], DAL: [32.7905, -96.8104],
  DET: [42.3411, -83.0552],  EDM: [53.5469, -113.4972], FLA: [26.1585, -80.3257],
  LAK: [34.0430, -118.2673], MIN: [44.9447, -93.1011], MTL: [45.4961, -73.5693],
  NSH: [36.1593, -86.7785],  NJD: [40.7336, -74.1709], NYI: [40.7228, -73.5907],
  NYR: [40.7505, -73.9934],  OTT: [45.297, -75.927],   PHI: [39.9012, -75.1719],
  PIT: [40.4395, -79.9893],  SJS: [37.3327, -121.901], SEA: [47.6221, -122.354],
  STL: [38.6266, -90.2026],  TBL: [27.9428, -82.4519], TOR: [43.6435, -79.3791],
  UTA: [40.7683, -111.9011], VAN: [49.2778, -123.1089], VGK: [36.1028, -115.1782],
  WPG: [49.8929, -97.1437],  WSH: [38.898, -77.0209],
};

// Numeric NHL team IDs keyed by abbreviation. These differ from the 3-letter
// abbrevs and are required by the Edge endpoints (/v1/edge/team-comparison/
// {teamId}/...), which take the numeric id, not the abbrev. Verified against
// api.nhle.com/stats/rest/en/team. Note UTA = 68 (Utah Mammoth, 2025–26);
// the franchise's first-season id 59 (Utah Hockey Club) is intentionally not
// used. Keep this in lockstep with TEAM_ARENAS / OPP_FULL when the league
// changes.
export const TEAM_ID = {
  NJD: 1,  NYI: 2,  NYR: 3,  PHI: 4,  PIT: 5,  BOS: 6,  BUF: 7,  MTL: 8,
  OTT: 9,  TOR: 10, CAR: 12, FLA: 13, TBL: 14, WSH: 15, CHI: 16, DET: 17,
  NSH: 18, STL: 19, CGY: 20, COL: 21, EDM: 22, VAN: 23, ANA: 24, DAL: 25,
  LAK: 26, SJS: 28, CBJ: 29, MIN: 30, WPG: 52, VGK: 54, SEA: 55, UTA: 68,
};
export const teamIdFor = (abbr) => TEAM_ID[abbr] ?? null;

// NHL Records-site franchise IDs keyed by abbreviation. These are DIFFERENT
// from the numeric team IDs above — the records.nhl.com API (all-time franchise
// records, season results, Stanley Cups) keys on franchiseId. Sourced from
// records.nhl.com/site/api/franchise-team-totals (active franchises only).
export const TEAM_FRANCHISE_ID = {
  ANA: 32, BOS: 6,  BUF: 19, CAR: 26, CBJ: 36, CGY: 21, CHI: 11, COL: 27,
  DAL: 15, DET: 12, EDM: 25, FLA: 33, LAK: 14, MIN: 37, MTL: 1,  NJD: 23,
  NSH: 34, NYI: 22, NYR: 10, OTT: 30, PHI: 16, PIT: 17, SEA: 39, SJS: 29,
  STL: 18, TBL: 31, TOR: 5,  UTA: 40, VAN: 20, VGK: 38, WPG: 35, WSH: 24,
};
export const franchiseIdFor = (abbr) => TEAM_FRANCHISE_ID[abbr] ?? null;

// Proxy for the NHL Records API (records.nhl.com/site/api). Separate from the
// api-web proxy because it's a different upstream host. See api/records.js.
export const API_RECORDS = (path) => `/api/records?path=${encodeURIComponent(path)}`;

// Great-circle distance between two lat/lng pairs in miles. Used for travel
// distance calculations on the schedule. Same-arena returns 0.
export function arenaMiles(fromAbbr, toAbbr) {
  const a = TEAM_ARENAS[fromAbbr];
  const b = TEAM_ARENAS[toAbbr];
  if (!a || !b) return null;
  if (a === b) return 0;
  const R = 3958.8; // Earth radius in miles
  const toRad = (d) => d * Math.PI / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const lat1 = toRad(a[0]);
  const lat2 = toRad(b[0]);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const A = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  const C = 2 * Math.atan2(Math.sqrt(A), Math.sqrt(1 - A));
  return Math.round(R * C);
}

// Current team captains (2025–26 NHL season) keyed by team abbreviation.
// Used as the default left/right players on the Compare page when no IDs
// are pinned via URL. NHL roster API doesn't expose a captain flag in the
// public schema we hit, so this is the most reliable path. If a captaincy
// changes mid-season just update the ID — names show up in the page from
// /v1/player/{id}/landing, not from this map.
export const TEAM_CAPTAINS = {
  PHI: '8476461', // Sean Couturier
  PIT: '8471675', // Sidney Crosby
  WSH: '8471214', // Alex Ovechkin
  BUF: '8480839', // Rasmus Dahlin
  DET: '8477946', // Dylan Larkin
  TOR: '8479318', // Auston Matthews
  MTL: '8480018', // Nick Suzuki
  OTT: '8480801', // Brady Tkachuk
  NYI: '8475314', // Anders Lee
  NYR: '8475184', // Chris Kreider
  NJD: '8480002', // Nico Hischier
  BOS: '8473419', // Brad Marchand
  CAR: '8473533', // Jordan Staal
  TBL: '8475167', // Victor Hedman
  FLA: '8477493', // Aleksander Barkov
  CBJ: '8476432', // Boone Jenner
  CHI: '8473492', // Nick Foligno
  NSH: '8474600', // Roman Josi
  STL: '8475170', // Brayden Schenn
  WPG: '8476392', // Adam Lowry
  DAL: '8473994', // Jamie Benn
  MIN: '8474716', // Jared Spurgeon
  COL: '8476454', // Gabriel Landeskog
  VAN: '8480800', // Quinn Hughes
  SEA: '8474586', // Jordan Eberle
  CGY: '8474150', // Mikael Backlund
  EDM: '8478402', // Connor McDavid
  LAK: '8471685', // Anze Kopitar
  SJS: '8474053', // Logan Couture
  ANA: '8475462', // Radko Gudas
  VGK: '8475913', // Mark Stone
  UTA: '8478420', // Clayton Keller (Utah Mammoth)
};

export const OPP_FULL = {
  MTL: 'Montreal Canadiens', CAR: 'Carolina Hurricanes', WPG: 'Winnipeg Jets',
  DET: 'Detroit Red Wings', NJD: 'New Jersey Devils', NJ: 'New Jersey Devils',
  BOS: 'Boston Bruins', NYI: 'New York Islanders', WSH: 'Washington Capitals',
  DAL: 'Dallas Stars', CHI: 'Chicago Blackhawks', CBJ: 'Columbus Blue Jackets',
  SJS: 'San Jose Sharks', SJ: 'San Jose Sharks', LAK: 'LA Kings', LA: 'LA Kings',
  ANA: 'Anaheim Ducks', MIN: 'Minnesota Wild', NYR: 'New York Rangers',
  PIT: 'Pittsburgh Penguins', TBL: 'Tampa Bay Lightning', FLA: 'Florida Panthers',
  TOR: 'Toronto Maple Leafs', BUF: 'Buffalo Sabres', OTT: 'Ottawa Senators',
  COL: 'Colorado Avalanche', VGK: 'Vegas Golden Knights', EDM: 'Edmonton Oilers',
  CGY: 'Calgary Flames', SEA: 'Seattle Kraken', STL: 'St. Louis Blues',
  NSH: 'Nashville Predators', UTA: 'Utah Mammoth', VAN: 'Vancouver Canucks',
  PHI: 'Philadelphia Flyers',
};

// Reverse map: full team name → 3-letter abbreviation. Used when an API
// payload only carries the team's display name (e.g. NHL player landing
// /seasonTotals returns teamName.default = "Philadelphia Flyers" with no
// teamAbbrev) and we need the abbrev to load the team logo. We dedupe on
// canonical names so the second "NJ"/"SJ"/"LA" alias entries in OPP_FULL
// don't override the canonical 3-letter codes.
export const NAME_TO_ABBR = (() => {
  const out = {};
  // Walk in reverse so the canonical 3-letter entry wins (it appears first
  // for each team in OPP_FULL).
  for (const [abbr, name] of Object.entries(OPP_FULL)) {
    if (abbr.length === 3 || !out[name]) out[name] = abbr;
  }
  return out;
})();

const GAME_LIVE_STATES = ['LIVE', 'CRIT'];
const GAME_FINAL_STATES = ['OFF', 'FINAL'];
const GAME_FUTURE_STATES = ['FUT', 'PRE'];

export const isLive = (s) => GAME_LIVE_STATES.includes(s);
export const isFinal = (s) => GAME_FINAL_STATES.includes(s);
export const isFuture = (s) => GAME_FUTURE_STATES.includes(s);

export const fmtDate = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};
export const fmtDateFull = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
};
export const fmtTime = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
};
export const fmtRelative = (ts) => {
  if (!ts) return '—';
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 5) return 'just now';
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
};

export const connStatus = (lastFetch, error) => {
  if (error) return { tone: 'red', label: 'disconnected' };
  if (!lastFetch) return { tone: 'amber', label: 'connecting' };
  const age = (Date.now() - lastFetch) / 1000;
  // "online" describes the data connection (a recent successful fetch), not
  // whether a game is live — surfaces that mean "a game is in progress" gate
  // on an actual LIVE/CRIT gameState, never on this label.
  if (age < 90) return { tone: 'green', label: 'online' };
  if (age < 300) return { tone: 'amber', label: 'stale' };
  return { tone: 'red', label: 'stale' };
};
