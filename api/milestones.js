// api/milestones.js
//
// Proxy for the NHL milestones endpoints:
//   https://api.nhle.com/stats/rest/en/milestones/skaters
//   https://api.nhle.com/stats/rest/en/milestones/goalies
//
// Lives on api.nhle.com (same host as shifts), not the main api-web.nhle.com
// proxy. Accepts ?type=skaters or ?type=goalies to select the endpoint.

export const config = { runtime: 'edge' };

const HOST = 'https://api.nhle.com';
const ALLOWED_TYPES = new Set(['skaters', 'goalies']);

export default async function handler(req) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type') || 'skaters';

  if (!ALLOWED_TYPES.has(type)) {
    return new Response(JSON.stringify({ error: 'invalid type — use skaters or goalies' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  const upstream = `${HOST}/stats/rest/en/milestones/${type}`;

  try {
    const r = await fetch(upstream, {
      headers: { 'accept': 'application/json', 'user-agent': 'flyers.fan/0.2' },
    });
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
        // Milestones update infrequently — cache for 5 min, revalidate for 15.
        'cache-control': 'public, s-maxage=300, stale-while-revalidate=900, stale-if-error=600',
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
