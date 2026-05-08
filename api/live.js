// api/live.js
//
// Server-Sent Events stream for a single live game. The browser opens
// /api/live?game={id} once and we hold the connection open, polling the
// upstream NHL endpoints (boxscore + play-by-play) at ~1.5s cadence and
// pushing typed events when the snapshot changes. Replaces the 5-second
// client poll for live games — the score/clock now updates within ~2s
// instead of within 5–10s on average.
//
// Architecture:
//   • Vercel Edge runtime — supports streaming responses + cheap close to
//     the user. Each connection is one running function instance, but
//     they all hit Vercel's edge cache for the upstream JSON, so a single
//     warm cache entry serves all concurrent SSE clients.
//   • Connection capped at ~25s so it stays well under any plan-tier
//     timeout. We send a 'reconnect' event before close; the client
//     EventSource auto-reconnects on close anyway, but the explicit
//     event lets us distinguish 'planned rotation' from 'broken'.
//
// Event types:
//   connected — initial handshake { ts, gameId }
//   box       — score / clock / period state changed
//   pbp       — play-by-play count changed (a new event happened)
//   ping      — heartbeat every poll so dead connections close fast
//   reconnect — server is rotating, client should reconnect immediately
//   error     — fetch failure (non-fatal; loop continues)

export const config = { runtime: 'edge' };

const NHL = 'https://api-web.nhle.com';
const POLL_MS = 1500;
const MAX_DURATION_MS = 25_000;

const fetchJson = async (path) => {
  const r = await fetch(`${NHL}/${path}`, {
    headers: { accept: 'application/json', 'user-agent': 'flyers.fan/0.2' },
    redirect: 'follow',
  });
  if (!r.ok) throw new Error(`HTTP ${r.status} ${path}`);
  return r.json();
};

const liveStateActive = (state) => {
  // NHL gameStates: FUT, PRE, LIVE, CRIT, FINAL, OFF. Stream while there's
  // any chance the score is moving — finals settle out via one more poll.
  return state === 'LIVE' || state === 'CRIT';
};

export default async function handler(req) {
  const { searchParams } = new URL(req.url);
  const gameId = (searchParams.get('game') || '').replace(/[^0-9]/g, '');
  if (!gameId) {
    return new Response('missing game', { status: 400 });
  }

  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      let closed = false;
      const send = (event, data) => {
        if (closed) return;
        try {
          controller.enqueue(enc.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        } catch {
          closed = true;
        }
      };

      send('connected', { ts: Date.now(), gameId });

      let lastBoxKey = '';
      let lastPlayCount = -1;
      const startedAt = Date.now();
      let finalReached = false;

      while (!closed && Date.now() - startedAt < MAX_DURATION_MS) {
        try {
          const [box, pbp] = await Promise.all([
            fetchJson(`v1/gamecenter/${gameId}/boxscore`).catch(() => null),
            fetchJson(`v1/gamecenter/${gameId}/play-by-play`).catch(() => null),
          ]);

          if (box) {
            const boxKey = JSON.stringify({
              a: box.awayTeam?.score ?? null,
              h: box.homeTeam?.score ?? null,
              s: box.gameState,
              p: box.periodDescriptor?.number ?? null,
              t: box.periodDescriptor?.periodType ?? null,
              c: box.clock?.timeRemaining ?? null,
              i: !!box.clock?.inIntermission,
              // Strength state — keyed so the broadcast PP banner ticks
              // the second a power play starts/ends/changes.
              hs: box.situation?.homeTeam?.strength ?? null,
              as: box.situation?.awayTeam?.strength ?? null,
              sr: box.situation?.timeRemaining ?? null,
            });
            if (boxKey !== lastBoxKey) {
              send('box', {
                ts: Date.now(),
                state: box.gameState,
                away: { abbr: box.awayTeam?.abbrev, score: box.awayTeam?.score, sog: box.awayTeam?.sog },
                home: { abbr: box.homeTeam?.abbrev, score: box.homeTeam?.score, sog: box.homeTeam?.sog },
                periodDescriptor: box.periodDescriptor || null,
                clock: box.clock || null,
                situation: box.situation || null,
              });
              lastBoxKey = boxKey;
            }
            if (box.gameState === 'FINAL' || box.gameState === 'OFF') {
              finalReached = true;
            }
          }

          if (pbp?.plays?.length != null) {
            const count = pbp.plays.length;
            if (count !== lastPlayCount) {
              send('pbp', {
                ts: Date.now(),
                count,
                tail: pbp.plays.slice(-3),
              });
              lastPlayCount = count;
            }
          }

          send('ping', { ts: Date.now() });
        } catch (err) {
          send('error', { message: String(err?.message || err) });
        }

        // Game ended — final state pushed once, then close so the client
        // stops reconnecting and falls back to the standard poll cadence.
        if (finalReached) {
          send('final', { ts: Date.now() });
          break;
        }

        await new Promise((r) => setTimeout(r, POLL_MS));
      }

      send('reconnect', { ts: Date.now(), reason: finalReached ? 'final' : 'duration' });
      try { controller.close(); } catch { /* ignore */ }
    },
    cancel() {
      // Client disconnected — generator's loop exits naturally on next tick
    },
  });

  return new Response(stream, {
    headers: {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache, no-transform',
      'connection': 'keep-alive',
      'x-accel-buffering': 'no',
      'access-control-allow-origin': '*',
    },
  });
}
