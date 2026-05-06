import { useEffect, useState } from 'react';

// Tiny path-based router for shareable URLs.
//
// Routes:
//   /             → dashboard
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

const PAGES = new Set(['dashboard', 'schedule', 'standings', 'game', 'playoffs', 'roster', 'player', 'compare', 'trends', 'coaches', 'draft', 'records', 'on-ice', 'goalies', 'forecast']);

export function parseRoute(pathname, search) {
  const [, first = '', second = ''] = pathname.split('/');
  const params = new URLSearchParams(search);
  const page = PAGES.has(first) ? first : 'dashboard';
  return {
    page,
    gameId: page === 'game' && second ? second : null,
    profileId: page === 'player' && second ? second : null,  // /player/:id full page
    playerId: params.get('player') || null,                   // ?player=:id modal overlay
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

export const pageHref = (page) => (page === 'dashboard' ? '/' : `/${page}`);
export const gameHref = (id) => (id ? `/game/${id}` : '/game');
export const playerHref = (id) => `/player/${id}`;
