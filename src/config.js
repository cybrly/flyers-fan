// Constants, formatters, and tiny utilities. No React, no fetch — pure.

export const TEAM_ABBR = 'PHI';
export const SEASON = '20252026';

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
  if (age < 90) return { tone: 'green', label: 'live' };
  if (age < 300) return { tone: 'amber', label: 'stale' };
  return { tone: 'red', label: 'stale' };
};
