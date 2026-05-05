// Proxy for the NHL player-search endpoint at search.d3.nhle.com. Same edge
// runtime as api/nhl.js — kept separate because it hits a different host.
//
// Browser calls /api/search?q=mcdavid → fetches
// https://search.d3.nhle.com/api/v1/search/player?culture=en-us&limit=20&q=mcdavid&active=true

export const config = { runtime: 'edge' };

const HOST = 'https://search.d3.nhle.com';

export default async function handler(req) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get('q') || '').slice(0, 80);
  const limit = (searchParams.get('limit') || '15').slice(0, 4);
  const activeOnly = searchParams.get('active') !== '0';

  if (!q || q.length < 2) {
    return new Response(JSON.stringify([]), {
      status: 200,
      headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' },
    });
  }

  const url = `${HOST}/api/v1/search/player?culture=en-us&limit=${encodeURIComponent(limit)}&q=${encodeURIComponent(q)}${activeOnly ? '&active=true' : ''}`;

  try {
    const r = await fetch(url, { headers: { 'accept': 'application/json', 'user-agent': 'flyers.fan/0.2' } });
    if (!r.ok) {
      return new Response(JSON.stringify({ error: 'upstream', status: r.status }), {
        status: r.status,
        headers: { 'content-type': 'application/json' },
      });
    }
    const body = await r.text();
    return new Response(body, {
      status: 200,
      headers: {
        'content-type': 'application/json',
        // Search results don't change often per query — short cache is fine.
        'cache-control': 'public, s-maxage=60, stale-while-revalidate=300, stale-if-error=600',
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
