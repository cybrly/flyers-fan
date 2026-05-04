// flyers.fan — minimal service worker.
//
// Goals: make the app installable + load instantly on repeat visits, while
// never serving stale data. The strategy is intentionally simple:
//
//   - Static build assets (/assets/*, icons, manifest): cache-first.
//   - Navigation requests (the HTML shell): network-first with a cache
//     fallback so the app works offline; the actual data still has to come
//     over the network.
//   - /api/nhl: never cached here — Vercel's edge already caches it with
//     proper TTLs and we want fresh data.
//
// Bump the cache name on each deploy that ships SW changes.

const VERSION = 'v1';
const SHELL_CACHE = `shell-${VERSION}`;
const ASSET_CACHE = `assets-${VERSION}`;
const SHELL_URLS = ['/', '/manifest.webmanifest', '/favicon.svg', '/icon-512.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(SHELL_CACHE).then((c) => c.addAll(SHELL_URLS)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(
      names
        .filter((n) => n !== SHELL_CACHE && n !== ASSET_CACHE)
        .map((n) => caches.delete(n))
    );
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Always go to network for the API proxy — no SW caching.
  if (url.pathname.startsWith('/api/')) return;

  // Hashed Vite assets: cache-first (immutable filenames make this safe).
  if (url.pathname.startsWith('/assets/')) {
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

  // Navigation / shell: network-first, fall back to cache when offline.
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
  }
});
