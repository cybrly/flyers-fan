import { useEffect, useState } from 'react';
import { getDefaultRootPage } from './host.js';

// Tiny path-based router for shareable URLs.
//
// Routes:
//   /             → host-aware default. flyers.fan opens to Game Tape of
//                   the latest Flyers game; scumbag.hockey opens to the
//                   league-wide Dashboard. See src/host.js.
//   /dashboard    → Dashboard (explicit — reachable from either host)
//   /schedule
//   /standings
//   /game         → live or most recent game
//   /game/:id     → specific game
//   /playoffs
//   /roster
//
// Overlay modals are encoded as query params so they compose with any page:
//   ?player=:id   → PlayerModal open
//   ?series=:l    → SeriesModal open
//
// Path-based (not hash) for clean URLs and OG-friendly sharing. Requires the
// SPA rewrite in vercel.json so direct visits to /game/123 hit index.html.

const PAGES = new Set(['dashboard', 'schedule', 'standings', 'game', 'playoffs', 'roster', 'player', 'compare', 'trends', 'coaches', 'draft', 'records', 'goalies', 'forecast', 'definitions']);
// Retired routes that should silently redirect to a current home so old
// bookmarks / shared links don't 404.
const REDIRECTS = { 'on-ice': 'game' };

export function parseRoute(pathname, search) {
  const [, first = '', second = ''] = pathname.split('/');
  const params = new URLSearchParams(search);
  // Bare '/' is the host's entrypoint and resolves per-domain (Flyers
  // game on flyers.fan; Dashboard on scumbag.hockey). Anything else
  // falls back to a known page or the dashboard as a safety net.
  const resolved = first === ''
    ? getDefaultRootPage()
    : (PAGES.has(first) ? first : (REDIRECTS[first] || 'dashboard'));
  return {
    page: resolved,
    gameId: resolved === 'game' && second ? second : null,
    profileId: resolved === 'player' && second ? second : null,  // /player/:id full page
    playerId: params.get('player') || null,                       // ?player=:id modal overlay
    seriesLetter: params.get('series') || null,
  };
}

const NAV_EVENT = 'flyersfan:nav';

export function useRoute() {
  const [route, setRoute] = useState(() =>
    parseRoute(window.location.pathname, window.location.search)
  );
  useEffect(() => {
    const sync = () => setRoute(parseRoute(window.location.pathname, window.location.search));
    window.addEventListener('popstate', sync);
    window.addEventListener(NAV_EVENT, sync);
    return () => {
      window.removeEventListener('popstate', sync);
      window.removeEventListener(NAV_EVENT, sync);
    };
  }, []);
  return route;
}

export function navigate(href, { replace = false } = {}) {
  const current = window.location.pathname + window.location.search;
  if (href === current) return;
  if (replace) window.history.replaceState({}, '', href);
  else window.history.pushState({}, '', href);
  window.dispatchEvent(new Event(NAV_EVENT));
}

// Overlay modal helpers — preserve current path, just toggle a query param.
export function setOverlay(key, value) {
  const url = new URL(window.location.href);
  if (value == null) url.searchParams.delete(key);
  else url.searchParams.set(key, String(value));
  navigate(url.pathname + (url.search ? url.search : ''));
}

// Dashboard gets an explicit path because '/' is now host-aware — on
// flyers.fan the bare root resolves to Game Tape, so the Dashboard nav
// link can't just be '/' or it'd round-trip back to Game Tape.
export const pageHref = (page) => `/${page}`;
export const gameHref = (id) => (id ? `/game/${id}` : '/game');
export const playerHref = (id) => `/player/${id}`;
