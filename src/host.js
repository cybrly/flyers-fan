// Host-aware site context. The same codebase is served from two domains
// with slightly different defaults:
//
//   • flyers.fan         → team scope (Philadelphia Flyers).
//                          Visiting "/" lands on Game Tape of the most
//                          recent Flyers game (live > last result).
//   • scumbag.hockey     → league scope (NHL-wide).
//                          Visiting "/" lands on the Dashboard, framed
//                          around the most recent NHL game played.
//
// Everything that isn't the bare root path is unchanged across hosts —
// /game, /standings, /roster all behave identically. Only the entry
// point and the brand string differ.

const TEAM_HOSTS   = ['flyers.fan'];
const LEAGUE_HOSTS = ['scumbag.hockey'];

const getHostname = () => {
  if (typeof window === 'undefined' || !window.location) return '';
  return (window.location.hostname || '').toLowerCase();
};

const matches = (host, list) => {
  if (!host) return false;
  return list.some((h) => host === h || host.endsWith(`.${h}`));
};

// 'team' (Flyers-centric) or 'league' (NHL-wide). Unknown hosts —
// localhost, vercel previews — default to 'team' so dev mirrors prod.
export const getHostScope = () => {
  const host = getHostname();
  if (matches(host, LEAGUE_HOSTS)) return 'league';
  if (matches(host, TEAM_HOSTS))   return 'team';
  return 'team';
};

// Branding strings used in page titles, install prompts, and any UI
// chrome that needs to read the right name. Kept thin — only what we
// actually surface to users at runtime; static meta tags in index.html
// stay as-is.
export const getHostBrand = () => {
  const scope = getHostScope();
  if (scope === 'league') {
    return {
      short: 'scumbag.hockey',
      long:  'scumbag.hockey',
      tag:   'NHL · league-wide',
    };
  }
  return {
    short: 'flyers.fan',
    long:  'flyers.fan',
    tag:   'Philadelphia Flyers',
  };
};

// Default page the bare root path resolves to. Team scope opens straight
// into Game Tape (the user is here for one team, show their game).
// League scope opens to Dashboard (broader entry, lots of teams).
export const getDefaultRootPage = () => (getHostScope() === 'team' ? 'game' : 'dashboard');
