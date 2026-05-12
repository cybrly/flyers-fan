// middleware.js — Vercel Edge Middleware.
//
// Two responsibilities:
//
//   1. Bot crawlers (Twitterbot, Slackbot, Discordbot, etc.) on /game/:id
//      or on the bare root path get a tiny HTML stub with the right
//      <meta og:*> tags so link previews on iMessage, Twitter, Discord,
//      Slack, etc. actually carry the per-game (or per-host) preview
//      card. These bots don't run JavaScript, so the SPA's static
//      /index.html — which ships the flyers.fan defaults — would
//      otherwise be all they see.
//
//   2. Host-aware framing — flyers.fan vs scumbag.hockey changes the
//      title, description, OG image, and copy. Real users (no bot UA)
//      always pass through to the SPA which then runs its own runtime
//      head update for the same brand swap.
//
// Real users (any UA without a known bot signature) pass through with
// zero work, so there's no perf cost to the interactive flow.

const BOT_RE = /Twitterbot|facebookexternalhit|Discordbot|Slackbot|LinkedInBot|WhatsApp|Pinterest|Telegram|SkypeUriPreview|GoogleBot|bingbot|Applebot|redditbot|Embedly|iframely/i;

export const config = {
  matcher: ['/', '/game/:path*'],
};

export default async function middleware(request) {
  const ua = request.headers.get('user-agent') || '';
  if (!BOT_RE.test(ua)) {
    return; // pass through to SPA for real users
  }

  const url = new URL(request.url);
  const host = (url.hostname || '').toLowerCase();
  const isLeague = host === 'scumbag.hockey' || host.endsWith('.scumbag.hockey');
  const brand = isLeague ? 'scumbag.hockey' : 'flyers.fan';
  const isRoot = url.pathname === '/';
  const m = url.pathname.match(/\/game\/(\d+)/);
  const gameId = m ? m[1] : null;

  // Root-path bots get the brand introduction, not a game card.
  // Everything else (game pages) tries to fetch the boxscore for a
  // precise title/desc and falls back if upstream errors out.
  let title = isRoot
    ? (isLeague
        ? 'scumbag.hockey — Live NHL stats'
        : 'flyers.fan — Live Philadelphia Flyers stats')
    : `${brand} · Game Recap`;
  let description = isRoot
    ? (isLeague
        ? 'Real-time terminal for the entire NHL. Live scores, standings, shifts, and shot maps.'
        : 'Live stats, schedule, standings, and game tape. A real-time terminal for Philadelphia Flyers fans.')
    : (isLeague
        ? 'NHL live tracker · stats · forecast'
        : 'Live tracker · stats · forecast · Philadelphia Flyers');
  if (gameId) {
    try {
      const r = await fetch(`https://api-web.nhle.com/v1/gamecenter/${gameId}/boxscore`, {
        headers: { accept: 'application/json' },
      });
      if (r.ok) {
        const game = await r.json();
        const a = game.awayTeam;
        const h = game.homeTeam;
        const aAbbr = a?.abbrev || 'AWAY';
        const hAbbr = h?.abbrev || 'HOME';
        const aScore = a?.score ?? 0;
        const hScore = h?.score ?? 0;
        const isFinal = game.gameState === 'FINAL' || game.gameState === 'OFF';

        if (isLeague) {
          // League scope: team-agnostic "AWAY @ HOME · score" framing.
          const verb = isFinal
            ? (hScore === aScore ? 'tied' : (hScore > aScore ? 'beat' : 'fell to'))
            : 'vs';
          title = isFinal
            ? `${hAbbr} ${verb} ${aAbbr} · ${hScore}–${aScore}`
            : `${aAbbr} @ ${hAbbr} · ${aScore}–${hScore}`;
          description = `${isFinal ? 'Final' : 'Live'}: ${aAbbr} ${aScore} — ${hScore} ${hAbbr}`;
        } else {
          // Team scope (flyers.fan): keep the PHI-centric framing.
          const isPhiHome = hAbbr === 'PHI';
          const oppAbbr  = isPhiHome ? aAbbr : hAbbr;
          const phiScore = isPhiHome ? hScore : aScore;
          const oppScore = isPhiHome ? aScore : hScore;
          const verb = isFinal
            ? (phiScore > oppScore ? 'beat' : 'fell to')
            : 'vs';
          title = `PHI ${verb} ${oppAbbr} · ${phiScore}–${oppScore}`;
          description = `Philadelphia Flyers ${isFinal ? 'final' : 'live'}: ${phiScore}–${oppScore} ${isPhiHome ? 'vs' : '@'} ${oppAbbr}`;
        }
      }
    } catch { /* fall back to defaults */ }
  }

  const ogPath = gameId ? `/api/og?game=${gameId}` : '/api/og';
  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <meta property="og:type" content="website" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:image" content="${url.origin}${ogPath}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="twitter:image" content="${url.origin}${ogPath}" />
    <link rel="canonical" href="${url.origin}${url.pathname}" />
  </head>
  <body>
    <p>${escapeHtml(title)}</p>
    <p><a href="${url.origin}${url.pathname}">Open on ${escapeHtml(brand)}</a></p>
  </body>
</html>`;

  return new Response(html, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'public, s-maxage=60, stale-while-revalidate=300',
    },
  });
}

function escapeHtml(s) {
  return String(s ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}
