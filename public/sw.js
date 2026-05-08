// flyers.fan — service worker with offline support.
//
// Strategies:
//
//   1. API requests (/api/nhl*, /api/milestones*, /api/shifts*):
//      Stale-while-revalidate — serve from cache immediately, then update
//      the cache in the background. If the network fetch fails, the cached
//      response keeps the app functional offline (stale data beats blank
//      screens). If nothing is cached yet, fall back to network-only.
//
//   2. Static build assets (/assets/*): cache-first. Vite hashes filenames
//      so cached assets are immutable and safe to serve forever.
//
//   3. App shell (HTML, icons, manifest): network-first with cache fallback.
//      The SPA serves the same index.html for all routes via Vercel rewrites.
//
//   4. Versioned cache names — old caches are cleaned up on activate.
//
// No Workbox — plain service worker API only.

const VERSION = 'v4';
const SHELL_CACHE  = `shell-${VERSION}`;
const ASSET_CACHE  = `assets-${VERSION}`;
const API_CACHE    = `api-${VERSION}`;
const KNOWN_CACHES = [SHELL_CACHE, ASSET_CACHE, API_CACHE];

const SHELL_URLS = [
  '/', '/manifest.webmanifest', '/favicon.svg', '/icon-512.svg',
  '/schedule', '/standings', '/roster', '/playoffs',
];

// --- Helpers ---------------------------------------------------------------

// Which API paths we cache for offline use.
const isApiRoute = (pathname) =>
  pathname.startsWith('/api/nhl') ||
  pathname.startsWith('/api/milestones') ||
  pathname.startsWith('/api/shifts');

// Build a stable cache key from a request so query-param order doesn't matter.
// We keep it simple: origin + pathname + sorted search params.
const apiCacheKey = (url) => {
  const params = [...url.searchParams].sort((a, b) => a[0].localeCompare(b[0]));
  const qs = params.map(([k, v]) => `${k}=${v}`).join('&');
  return `${url.origin}${url.pathname}${qs ? '?' + qs : ''}`;
};

// --- Install ---------------------------------------------------------------

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL_CACHE);
    // allSettled — if a single URL 404s on a bad deploy we still install.
    await Promise.allSettled(
      SHELL_URLS.map((u) => cache.add(u).catch(() => {}))
    );
  })());
  self.skipWaiting();
});

// --- Activate (clean up old versioned caches) ------------------------------

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(
      names
        .filter((n) => !KNOWN_CACHES.includes(n))
        .map((n) => caches.delete(n))
    );
    await self.clients.claim();
  })());
});

// --- Fetch -----------------------------------------------------------------

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // ── API: stale-while-revalidate ──────────────────────────────────────
  if (isApiRoute(url.pathname)) {
    event.respondWith((async () => {
      const cache = await caches.open(API_CACHE);
      const key = apiCacheKey(url);
      const cached = await cache.match(key);

      // Fire off network fetch regardless — it will update the cache.
      const networkPromise = fetch(req)
        .then((res) => {
          if (res.ok) {
            // Clone before consuming — cache.put reads the body.
            cache.put(key, res.clone()).catch(() => {});
          }
          return res;
        })
        .catch((err) => {
          // Network failed. If we have a cached copy we already returned it
          // below; if not, there's nothing we can do.
          if (cached) return null; // swallow — stale copy already served
          throw err;               // no cache, propagate the error
        });

      // If we have a cached response, serve it immediately.
      if (cached) {
        // Background: don't await, just let the network update the cache.
        // eslint-disable-next-line no-unused-expressions
        networkPromise;
        return cached;
      }

      // Nothing cached yet — wait for the network.
      return networkPromise;
    })());
    return;
  }

  // ── Static assets: cache-first ───────────────────────────────────────
  // Hashed Vite assets (immutable filenames), plus images/fonts/SVGs.
  if (
    url.pathname.startsWith('/assets/') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.ico') ||
    url.pathname.endsWith('.woff2')
  ) {
    event.respondWith((async () => {
      const cache = await caches.open(ASSET_CACHE);
      const hit = await cache.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok) cache.put(req, res.clone());
      return res;
    })());
    return;
  }

  // ── Navigation / shell: network-first ────────────────────────────────
  if (req.mode === 'navigate' || req.destination === 'document') {
    event.respondWith((async () => {
      try {
        const res = await fetch(req);
        const cache = await caches.open(SHELL_CACHE);
        cache.put('/', res.clone()).catch(() => {});
        return res;
      } catch {
        const cache = await caches.open(SHELL_CACHE);
        return (await cache.match('/')) || Response.error();
      }
    })());
    return;
  }

  // ── CSS/JS that isn't under /assets/ (unlikely with Vite, but safe) ──
  if (req.destination === 'script' || req.destination === 'style') {
    event.respondWith((async () => {
      const cache = await caches.open(ASSET_CACHE);
      const hit = await cache.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok) cache.put(req, res.clone());
      return res;
    })());
  }
});

// Goal-notification click handler: focus an existing flyers.fan window if
// one is open, otherwise spawn a new one on the page that surfaced the
// alert. The data.url is set by the page when it posts the notification.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of all) {
      if (c.url.includes(self.location.origin)) {
        c.focus();
        if ('navigate' in c) c.navigate(targetUrl).catch(() => {});
        return;
      }
    }
    if (self.clients.openWindow) await self.clients.openWindow(targetUrl);
  })());
});
