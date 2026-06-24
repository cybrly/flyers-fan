// api/records.js
//
// Vercel edge function that proxies the NHL Records API
// (https://records.nhl.com/site/api). Mirrors api/nhl.js but for the records
// host, which serves all-time franchise records, season-by-season results, and
// franchise detail (Stanley Cups, retired numbers, captain/coach history).
//
// Why a separate proxy: different upstream host, no CORS headers, and the data
// is effectively static (franchise history changes a few times a year), so it
// gets a much longer cache than the live api-web feeds.

export const config = {
  runtime: 'edge',
};

// Only the franchise-records resources the app actually reads. The query string
// (cayenneExp/sort/dir) is allowed to contain the characters the NHL API uses,
// including URL-encoded spaces (%20) and the '=' inside cayenne expressions.
const ALLOWED = /^(franchise-team-totals|franchise-season-results|franchise-detail)\?[a-zA-Z0-9%=&_.\-]+$/;

const RECORDS = 'https://records.nhl.com/site/api';
const upstreamHeaders = { accept: 'application/json', 'user-agent': 'flyers.fan/0.2' };

export default async function handler(req) {
  const { searchParams } = new URL(req.url);
  const path = searchParams.get('path');

  if (!path || !ALLOWED.test(path)) {
    return new Response(JSON.stringify({ error: 'invalid path' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  const upstream = `${RECORDS}/${path}`;

  try {
    const r = await fetch(upstream, { headers: upstreamHeaders });
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
        // Franchise records barely change — cache a day at the edge, serve
        // stale for a week while revalidating, and tolerate upstream outages.
        'cache-control': 'public, s-maxage=86400, stale-while-revalidate=604800, stale-if-error=86400',
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
