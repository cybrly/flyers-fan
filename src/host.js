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

// Default page the bare root path resolves to. Both scopes open
// straight into Game Tape — team scope shows the locked team's most
// recent game (live > last final); league scope picks the most recent
// game league-wide via the NHL scoreboard. The fallback resolution
// lives in App.jsx where the schedule + scoreboard data is available.
export const getDefaultRootPage = () => 'game';

// Full SEO/social-card metadata per host. Used by the runtime head
// updater to swap <title>, <meta name=description>, og:*, twitter:*,
// canonical, and apple-mobile-web-app-title so that — for users at
// least — the active brand is reflected everywhere. (Crawlers reading
// static index.html still see the flyers.fan defaults; that's solved
// separately by middleware when we get to it.)
export const getHostMeta = () => {
  const scope = getHostScope();
  if (scope === 'league') {
    return {
      brand:    'scumbag.hockey',
      tagline:  'Live NHL stats',
      url:      'https://scumbag.hockey/',
      desc:     'Live NHL stats, schedule, standings, and game tape — every team, real-time.',
      ogTitle:  'scumbag.hockey — Live NHL stats',
      ogDesc:   'Real-time terminal for the entire NHL. Live scores, standings, shifts, and shot maps.',
      manifest: '/scumbag.webmanifest',
    };
  }
  return {
    brand:    'flyers.fan',
    tagline:  'Live Philadelphia Flyers stats',
    url:      'https://flyers.fan/',
    desc:     'Live Philadelphia Flyers stats, schedule, standings, and game tape.',
    ogTitle:  'flyers.fan — Live Philadelphia Flyers stats',
    ogDesc:   'Live stats, schedule, standings, and game tape. A real-time terminal for Philadelphia Flyers fans.',
    manifest: '/manifest.webmanifest',
  };
};
