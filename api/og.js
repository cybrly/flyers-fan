// api/og.js
//
// Edge function that renders an Open Graph image. 1200x630 PNG, designed
// for iMessage / Twitter / Discord / Slack previews.
//
// Usage:
//   /api/og              → default brand card
//   /api/og?game=12345   → score-card for that game
//
// Powered by @vercel/og (Satori). Plain .js (no JSX) so Vercel's
// serverless-function detection picks it up. Critically, no remote
// images: Satori has limited SVG-URL support and the NHL CDN doesn't
// serve CORS-friendly raster versions of team logos. We lean on big
// typography + color blocks instead, which renders bulletproof.

import { ImageResponse } from '@vercel/og';

export const config = { runtime: 'edge' };

const NHL = 'https://api-web.nhle.com';

const fetchGame = async (id) => {
  if (!id) return null;
  try {
    const r = await fetch(`${NHL}/v1/gamecenter/${id}/boxscore`, {
      headers: { accept: 'application/json' },
    });
    if (!r.ok) return null;
    return r.json();
  } catch {
    return null;
  }
};

// Tiny createElement-shaped helper. @vercel/og passes the tree to Satori,
// which only needs `{ type, props }` — no React.createElement runtime
// required, no jsx-runtime, no React import. Children are flattened
// because Satori is strict about array-of-arrays nesting.
const h = (type, props, ...children) => ({
  type,
  props: {
    ...(props || {}),
    children: children.flat(Infinity).filter((c) => c != null && c !== false),
  },
});

const div = (props, ...children) => h('div', props, ...children);

const fetchStandings = async () => {
  try {
    const r = await fetch(`${NHL}/v1/standings/now`, { headers: { accept: 'application/json' } });
    if (!r.ok) return null;
    return r.json();
  } catch { return null; }
};

const fetchPlayer = async (id) => {
  if (!id) return null;
  try {
    const r = await fetch(`${NHL}/v1/player/${id}/landing`, { headers: { accept: 'application/json' } });
    if (!r.ok) return null;
    return r.json();
  } catch { return null; }
};

export default async function handler(req) {
  try {
    const { searchParams } = new URL(req.url);
    const panel = searchParams.get('panel') || '';
    const gameId = (searchParams.get('game') || '').replace(/[^0-9]/g, '');
    const playerId = (searchParams.get('player') || '').replace(/[^0-9]/g, '');

    let tree;

    if (panel === 'standings') {
      const standings = await fetchStandings();
      tree = standings ? standingsCard(standings) : brandCard();
    } else if (panel === 'player' && playerId) {
      const player = await fetchPlayer(playerId);
      tree = player ? playerCard(player) : brandCard();
    } else {
      const game = gameId ? await fetchGame(gameId) : null;
      tree = game?.homeTeam && game?.awayTeam ? gameCard(game) : brandCard();
    }

    return new ImageResponse(tree, {
      width: 1200,
      height: 630,
      headers: {
        'cache-control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    });
  } catch (err) {
    // Render a debug card so the response is never zero-byte. Lets us
    // see in production what blew up rather than silently 500ing.
    const tree = errorCard(String(err?.message || err || 'unknown'));
    return new ImageResponse(tree, { width: 1200, height: 630 });
  }
}

function gameCard(game) {
  const a = game.awayTeam;
  const hh = game.homeTeam;
  const isPhiHome = hh.abbrev === 'PHI';
  const oppAbbr = isPhiHome ? a.abbrev : hh.abbrev;
  const phiScore = isPhiHome ? (hh.score ?? 0) : (a.score ?? 0);
  const oppScore = isPhiHome ? (a.score ?? 0) : (hh.score ?? 0);
  const isFinal = game.gameState === 'FINAL' || game.gameState === 'OFF';
  const isLive = game.gameState === 'LIVE' || game.gameState === 'CRIT';
  const phiWon = phiScore > oppScore;

  const stateLabel = isLive
    ? `LIVE · P${game.periodDescriptor?.number || '?'}${game.clock?.timeRemaining ? ` · ${game.clock.timeRemaining}` : ''}`
    : isFinal
      ? `FINAL${game.periodDescriptor?.periodType && game.periodDescriptor.periodType !== 'REG' ? ` · ${game.periodDescriptor.periodType}` : ''}`
      : 'UPCOMING';
  const resultLabel = isFinal ? (phiWon ? 'W' : 'L') : null;
  const resultColor = isFinal ? (phiWon ? '#10B981' : '#EF4444') : '#888';

  const sysFont = 'system-ui, -apple-system, sans-serif';

  return div(
    {
      style: {
        height: '100%', width: '100%', display: 'flex', flexDirection: 'column',
        background: '#050505',
        color: '#E8E8E8',
        fontFamily: sysFont,
        position: 'relative',
      },
    },
    // Top accent bar
    div({ style: { display: 'flex', position: 'absolute', top: 0, left: 0, right: 0, height: 8, background: '#F74902' } }),

    // Huge stylized 'PHI' on the left half, occupying most of the canvas.
    div(
      {
        style: {
          display: 'flex',
          position: 'absolute',
          left: -20,
          top: 80,
          fontSize: 480,
          fontWeight: 900,
          color: '#F74902',
          opacity: 0.18,
          letterSpacing: -24,
          fontFamily: sysFont,
          lineHeight: 1,
        },
      },
      'PHI',
    ),

    // Mirror: huge OPP abbr on the right half.
    div(
      {
        style: {
          display: 'flex',
          position: 'absolute',
          right: -20,
          top: 80,
          fontSize: 480,
          fontWeight: 900,
          color: '#FFFFFF',
          opacity: 0.08,
          letterSpacing: -24,
          fontFamily: sysFont,
          lineHeight: 1,
        },
      },
      oppAbbr,
    ),

    // Header bar
    div(
      {
        style: {
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '36px 56px 0 56px', fontSize: 18, color: 'rgba(255,255,255,0.55)', letterSpacing: 2,
          position: 'relative', zIndex: 1,
        },
      },
      div({ style: { display: 'flex' } }, 'FLYERS.FAN · GAME RECAP'),
      div({ style: { display: 'flex', color: '#FF8A4C' } }, stateLabel),
    ),

    // Center score readout
    div(
      {
        style: {
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 80, padding: '0 56px', position: 'relative', zIndex: 1,
        },
      },
      // PHI block
      div(
        { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 } },
        div({ style: { display: 'flex', fontSize: 26, color: '#FF8A4C', fontWeight: 700, letterSpacing: 6 } }, 'PHI'),
        div({ style: { display: 'flex', fontSize: 200, fontWeight: 800, color: '#FF8A4C', lineHeight: 1, letterSpacing: -8 } }, String(phiScore)),
      ),

      // Center separator + result chip
      div(
        { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 } },
        div({ style: { display: 'flex', fontSize: 80, color: 'rgba(255,255,255,0.20)', fontWeight: 600, lineHeight: 1 } }, '–'),
        resultLabel && div(
          {
            style: {
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 64, height: 40, borderRadius: 8,
              background: phiWon ? 'rgba(16,185,129,0.18)' : 'rgba(239,68,68,0.18)',
              color: resultColor, fontSize: 26, fontWeight: 800,
            },
          },
          resultLabel,
        ),
      ),

      // OPP block
      div(
        { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 } },
        div({ style: { display: 'flex', fontSize: 26, color: 'rgba(255,255,255,0.65)', fontWeight: 700, letterSpacing: 6 } }, oppAbbr),
        div({ style: { display: 'flex', fontSize: 200, fontWeight: 800, color: 'rgba(255,255,255,0.85)', lineHeight: 1, letterSpacing: -8 } }, String(oppScore)),
      ),
    ),

    // Footer
    div(
      {
        style: {
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '0 56px 36px 56px', fontSize: 15, color: 'rgba(255,255,255,0.40)',
          letterSpacing: 2, position: 'relative', zIndex: 1,
        },
      },
      div({ style: { display: 'flex' } }, 'flyers.fan'),
      div({ style: { display: 'flex' } }, 'UNOFFICIAL · NOT AFFILIATED WITH THE NHL'),
    ),
  );
}

function brandCard() {
  return div(
    {
      style: {
        height: '100%', width: '100%', display: 'flex', flexDirection: 'column',
        background: '#050505', color: '#E8E8E8',
        fontFamily: 'system-ui, -apple-system, sans-serif', position: 'relative',
        alignItems: 'center', justifyContent: 'center', gap: 24,
      },
    },
    div({ style: { display: 'flex', position: 'absolute', top: 0, left: 0, right: 0, height: 8, background: '#F74902' } }),
    div({ style: { display: 'flex', fontSize: 360, fontWeight: 900, color: '#F74902', letterSpacing: -16, lineHeight: 1 } }, 'PHI'),
    div({ style: { display: 'flex', fontSize: 88, fontWeight: 700, color: '#FF8A4C', letterSpacing: -2, marginTop: -32 } }, 'flyers.fan'),
    div({ style: { display: 'flex', fontSize: 22, color: 'rgba(255,255,255,0.55)', letterSpacing: 4 } }, 'LIVE TRACKER · STATS · FORECAST'),
    div({ style: { display: 'flex', position: 'absolute', bottom: 36, fontSize: 14, color: 'rgba(255,255,255,0.35)', letterSpacing: 2 } }, 'UNOFFICIAL · NOT AFFILIATED WITH THE NHL'),
  );
}

function standingsCard(raw) {
  const teams = (raw?.standings || []).filter((t) => t.conferenceName === 'Eastern').sort((a, b) => a.conferenceSequence - b.conferenceSequence).slice(0, 8);
  const phi = teams.find((t) => t.teamAbbrev?.default === 'PHI');
  const sysFont = 'system-ui, -apple-system, sans-serif';

  return div(
    { style: { height: '100%', width: '100%', display: 'flex', flexDirection: 'column', background: '#050505', color: '#E8E8E8', fontFamily: sysFont, position: 'relative' } },
    div({ style: { display: 'flex', position: 'absolute', top: 0, left: 0, right: 0, height: 8, background: '#F74902' } }),
    div({ style: { display: 'flex', justifyContent: 'space-between', padding: '36px 56px 24px', fontSize: 22, letterSpacing: 2 } },
      div({ style: { display: 'flex', color: '#FF8A4C', fontWeight: 700 } }, 'EASTERN CONFERENCE'),
      div({ style: { display: 'flex', color: 'rgba(255,255,255,0.45)' } }, 'FLYERS.FAN'),
    ),
    div({ style: { display: 'flex', flexDirection: 'column', padding: '0 56px', gap: 6, flex: 1 } },
      ...teams.map((t, i) => {
        const abbr = t.teamAbbrev?.default || '???';
        const isPHI = abbr === 'PHI';
        return div(
          { style: { display: 'flex', alignItems: 'center', gap: 16, padding: '10px 16px', borderRadius: 8, background: isPHI ? 'rgba(247,73,2,0.12)' : 'transparent' } },
          div({ style: { display: 'flex', width: 32, fontSize: 18, fontWeight: 600, color: isPHI ? '#FF8A4C' : i < 3 ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.3)' } }, String(i + 1)),
          div({ style: { display: 'flex', fontSize: 20, fontWeight: 700, color: isPHI ? '#FF8A4C' : 'rgba(255,255,255,0.85)', width: 64 } }, abbr),
          div({ style: { display: 'flex', fontSize: 18, color: 'rgba(255,255,255,0.55)', flex: 1 } }, `${t.wins}-${t.losses}-${t.otLosses || 0}`),
          div({ style: { display: 'flex', fontSize: 24, fontWeight: 700, color: isPHI ? '#FF8A4C' : 'rgba(255,255,255,0.9)' } }, `${t.points} pts`),
        );
      }),
    ),
    div({ style: { display: 'flex', padding: '0 56px 36px', fontSize: 14, color: 'rgba(255,255,255,0.3)', letterSpacing: 2 } }, 'UNOFFICIAL · NOT AFFILIATED WITH THE NHL'),
  );
}

function playerCard(player) {
  const name = [player.firstName?.default, player.lastName?.default].filter(Boolean).join(' ');
  const sub = player.featuredStats?.regularSeason?.subSeason;
  const sysFont = 'system-ui, -apple-system, sans-serif';
  const stats = sub ? `${sub.goals || 0}G · ${sub.assists || 0}A · ${sub.points || 0}P in ${sub.gamesPlayed || 0} GP` : '';

  return div(
    { style: { height: '100%', width: '100%', display: 'flex', flexDirection: 'column', background: '#050505', color: '#E8E8E8', fontFamily: sysFont, position: 'relative', alignItems: 'center', justifyContent: 'center', gap: 16 } },
    div({ style: { display: 'flex', position: 'absolute', top: 0, left: 0, right: 0, height: 8, background: '#F74902' } }),
    div({ style: { display: 'flex', position: 'absolute', left: -20, top: 60, fontSize: 400, fontWeight: 900, color: '#F74902', opacity: 0.1, lineHeight: 1, letterSpacing: -16 } }, 'PHI'),
    div({ style: { display: 'flex', fontSize: 28, color: '#FF8A4C', fontWeight: 600, letterSpacing: 4, zIndex: 1 } }, 'FLYERS.FAN · PLAYER'),
    div({ style: { display: 'flex', fontSize: 100, fontWeight: 800, color: 'rgba(255,255,255,0.95)', letterSpacing: -4, zIndex: 1 } }, name),
    div({ style: { display: 'flex', fontSize: 18, color: 'rgba(255,255,255,0.55)', zIndex: 1 } }, `${player.position || '?'} · #${player.sweaterNumber || '?'}`),
    stats && div({ style: { display: 'flex', fontSize: 36, fontWeight: 700, color: '#FF8A4C', zIndex: 1, marginTop: 8 } }, stats),
    div({ style: { display: 'flex', position: 'absolute', bottom: 36, fontSize: 14, color: 'rgba(255,255,255,0.3)', letterSpacing: 2 } }, 'UNOFFICIAL · NOT AFFILIATED WITH THE NHL'),
  );
}

function errorCard(msg) {
  return div(
    {
      style: {
        height: '100%', width: '100%', display: 'flex', flexDirection: 'column',
        background: '#050505', color: '#E8E8E8',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        alignItems: 'center', justifyContent: 'center', gap: 16, padding: 64,
      },
    },
    div({ style: { display: 'flex', fontSize: 64, fontWeight: 700, color: '#F74902' } }, 'flyers.fan'),
    div({ style: { display: 'flex', fontSize: 22, color: 'rgba(255,255,255,0.55)' } }, 'OG image failed to render'),
    div({ style: { display: 'flex', fontSize: 18, color: 'rgba(255,255,255,0.35)', maxWidth: 1000, textAlign: 'center' } }, msg.slice(0, 200)),
  );
}
