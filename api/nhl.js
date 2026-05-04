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
// These apply via the Cache-Control header below.
const cacheFor = (path) => {
  if (path.includes('/gamecenter/') && path.includes('/play-by-play')) return 5;   // during live play
  if (path.includes('/gamecenter/'))                                   return 10;  // boxscore, landing, right-rail
  if (path.startsWith('v1/standings'))                                 return 300; // 5 min
  if (path.startsWith('v1/club-schedule-season'))                      return 60;  // 1 min
  return 30;
};

// NHL endpoints ending in /now (e.g. /v1/standings/now) return a 307 redirect
// to a dated URL. Vercel's edge runtime mangles the Location header during
// fetch (rewrites the host to the Vercel domain), so following the redirect
// fails. Resolve /now ourselves before calling upstream.
//
// Using "today's UTC date" doesn't work in the offseason / playoffs because
// NHL's redirect target is the canonical "standings as of" date, which during
// playoffs is the regular-season-end date — not today. /v1/standings-season
// exposes that date as `currentDate`, so we ask it first when the path is
// standings/now.
const upstreamHeaders = { 'accept': 'application/json', 'user-agent': 'flyers.fan/0.2' };
const NHL = 'https://api-web.nhle.com';

async function resolvePath(path) {
  if (path === 'v1/standings/now') {
    const r = await fetch(`${NHL}/v1/standings-season`, { headers: upstreamHeaders });
    if (r.ok) {
      const j = await r.json();
      if (j?.currentDate) return `v1/standings/${j.currentDate}`;
    }
  }
  return path;
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

  const resolved = await resolvePath(path);
  const upstream = `${NHL}/${resolved}`;
  const ttl = cacheFor(path);

  try {
    const r = await fetch(upstream, { headers: upstreamHeaders });

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
        'cache-control': `public, s-maxage=${ttl}, stale-while-revalidate=${ttl * 3}`,
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
