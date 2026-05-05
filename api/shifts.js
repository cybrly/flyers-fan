// api/shifts.js
//
// Proxy for the NHL shift-chart endpoint:
//   https://api.nhle.com/stats/rest/en/shiftcharts?cayenneExp=gameId={id}
//
// Lives on a different host than api-web.nhle.com, so the standard /api/nhl
// proxy can't fan it out (its allow-list is locked to v1/* paths). One
// dedicated route is simpler than punching a hole in the main proxy.

export const config = { runtime: 'edge' };

const HOST = 'https://api.nhle.com';

export default async function handler(req) {
  const { searchParams } = new URL(req.url);
  const gameId = searchParams.get('gameId');

  // Validate gameId is digits only — refuses arbitrary cayenneExp injection.
  if (!gameId || !/^\d{6,12}$/.test(gameId)) {
    return new Response(JSON.stringify({ error: 'invalid gameId' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  const upstream = `${HOST}/stats/rest/en/shiftcharts?cayenneExp=gameId=${gameId}`;

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
        // Shift data is final once the game ends — cache aggressively. Keep
        // a short revalidate window for live games where shifts trickle in.
        'cache-control': 'public, s-maxage=30, stale-while-revalidate=300, stale-if-error=600',
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
