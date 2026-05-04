// api/nhl.js
//
// Vercel serverless function that proxies requests to https://api-web.nhle.com.
// Drop this file at `api/nhl.js` at the root of your project. Vercel auto-wires it.
// The browser calls /api/nhl?path=v1/standings/now and this forwards to the NHL API.
//
// Why this exists: the NHL API doesn't send CORS headers, so a browser can't
// call it directly. This proxy adds the missing headers plus edge caching so
// you don't hammer the upstream.
//
// For Next.js App Router, use /app/api/nhl/route.js instead (same logic,
// different signature — example at the bottom of this file).
// For Cloudflare Workers, the fetch handler is near-identical.

export const config = {
  // Vercel edge runtime: faster cold starts, cheaper, runs close to the user.
  runtime: 'edge',
};

const ALLOWED = /^v1\/[a-zA-Z0-9/_\-?=&.]+$/;

// How long CDN edges may cache each endpoint. Shorter = fresher, higher upstream load.
// These apply via the Cache-Control header below. SWR window = 3× s-maxage so
// stale responses get served instantly while a fresh fetch happens in background.
const cacheFor = (path) => {
  if (path.includes('/gamecenter/') && path.includes('/play-by-play')) return 5;    // live play
  if (path.includes('/gamecenter/'))                                   return 10;   // boxscore, landing, right-rail
  if (path.startsWith('v1/standings'))                                 return 300;  // 5 min
  if (path.startsWith('v1/club-schedule-season'))                      return 60;   // 1 min
  if (path.startsWith('v1/playoff-bracket'))                           return 120;  // 2 min
  if (path.startsWith('v1/schedule/playoff-series'))                   return 120;
  if (path.startsWith('v1/club-stats'))                                return 120;
  if (path.startsWith('v1/roster/'))                                   return 3600; // hourly — roster doesn't churn
  if (path.startsWith('v1/player/'))                                   return 600;  // 10 min — player landing
  return 30;
};

// NHL endpoints ending in /now (e.g. /v1/standings/now, /v1/club-stats/X/now)
// return a 307 redirect to a dated URL. Vercel's edge runtime rewrites the
// host in the Location header to our own Vercel domain — but the path part is
// correct, so we salvage just the path and re-issue against the upstream host
// with our headers preserved.
const upstreamHeaders = { 'accept': 'application/json', 'user-agent': 'flyers.fan/0.2' };
const NHL = 'https://api-web.nhle.com';

async function fetchFollowing(url, maxHops = 5) {
  let current = url;
  for (let i = 0; i < maxHops; i++) {
    const r = await fetch(current, { headers: upstreamHeaders, redirect: 'manual' });
    if (r.status >= 300 && r.status < 400) {
      const loc = r.headers.get('location');
      if (loc) {
        const u = new URL(loc, current);
        current = `${NHL}${u.pathname}${u.search}`;
        continue;
      }
    }
    return r;
  }
  throw new Error('too many redirects');
}

export default async function handler(req) {
  const { searchParams } = new URL(req.url);
  const path = searchParams.get('path');

  if (!path || !ALLOWED.test(path)) {
    return new Response(JSON.stringify({ error: 'invalid path' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  const upstream = `${NHL}/${path}`;
  const ttl = cacheFor(path);

  try {
    const r = await fetchFollowing(upstream);

    if (!r.ok) {
      return new Response(JSON.stringify({ error: 'upstream', status: r.status }), {
        status: r.status,
        headers: { 'content-type': 'application/json' },
      });
    }

    const body = await r.text(); // passthrough, don't parse

    return new Response(body, {
      status: 200,
      headers: {
        'content-type': 'application/json',
        // CDN caches at the edge, serves stale during revalidate, and falls
        // back to stale for ~10 min if upstream errors — site stays useful
        // even if api-web.nhle.com is having a bad day.
        'cache-control': `public, s-maxage=${ttl}, stale-while-revalidate=${ttl * 3}, stale-if-error=600`,
        'access-control-allow-origin': '*',
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }
}

/*
  ─────────── Next.js App Router version (optional) ───────────

  Save at: app/api/nhl/route.js

  export const runtime = 'edge';
  const ALLOWED = /^v1\/[a-zA-Z0-9/_\-?=&.]+$/;

  export async function GET(req) {
    const { searchParams } = new URL(req.url);
    const path = searchParams.get('path');
    if (!path || !ALLOWED.test(path)) {
      return Response.json({ error: 'invalid path' }, { status: 400 });
    }
    const r = await fetch(`https://api-web.nhle.com/${path}`, {
      headers: { accept: 'application/json' },
      next: { revalidate: 10 },
    });
    const body = await r.text();
    return new Response(body, {
      status: r.status,
      headers: {
        'content-type': 'application/json',
        'cache-control': 'public, s-maxage=10, stale-while-revalidate=30',
      },
    });
  }

  ─────────── Cloudflare Worker version (optional) ────────────

  export default {
    async fetch(req) {
      const { searchParams } = new URL(req.url);
      const path = searchParams.get('path');
      if (!path || !/^v1\//.test(path)) return new Response('bad path', { status: 400 });
      const r = await fetch(`https://api-web.nhle.com/${path}`, {
        cf: { cacheTtl: 10, cacheEverything: true },
      });
      return new Response(r.body, {
        status: r.status,
        headers: {
          'content-type': 'application/json',
          'cache-control': 'public, s-maxage=10',
          'access-control-allow-origin': '*',
        },
      });
    }
  }
*/
