// api/og.js
//
// Edge function that renders an Open Graph image. 1200x630 PNG, designed
// for iMessage / Twitter / Discord / Slack previews.
//
// Usage:
//   /api/og              → default brand card (host-aware)
//   /api/og?game=12345   → score-card for that game (host-aware framing)
//   /api/og?panel=standings → conference standings card
//   /api/og?panel=player&player=8478402 → player card
//
// Powered by @vercel/og (Satori). Plain .js (no JSX) so Vercel's
// serverless-function detection picks it up. Critically, no remote
// images: Satori has limited SVG-URL support and the NHL CDN doesn't
// serve CORS-friendly raster versions of team logos. We lean on big
// typography + color blocks instead, which renders bulletproof.
//
// Host awareness:
//   • flyers.fan         → "flyers.fan" brand, PHI-centric framing
//                          (PHI gets the orange treatment, opp is
//                          rendered in neutral white)
//   • scumbag.hockey     → "scumbag.hockey" brand, neutral framing
//                          (away on left, home on right, no team bias)

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

// Resolve host context from the incoming request. Mirrors src/host.js
// logic but is duplicated here because this module runs in the edge
// runtime and can't import from src/.
const resolveHost = (req) => {
  const url = new URL(req.url);
  const host = (url.hostname || '').toLowerCase();
  const isLeague = host === 'scumbag.hockey' || host.endsWith('.scumbag.hockey');
  return {
    scope: isLeague ? 'league' : 'team',
    brand: isLeague ? 'scumbag.hockey' : 'flyers.fan',
    brandUpper: isLeague ? 'SCUMBAG.HOCKEY' : 'FLYERS.FAN',
    focalTeam: isLeague ? null : 'PHI', // null = no team bias
    tagline: isLeague ? 'LIVE NHL TRACKER · STATS · FORECAST' : 'LIVE TRACKER · STATS · FORECAST',
  };
};

const SITE_ACCENT = '#F74902';
const SITE_ACCENT_LITE = '#FF8A4C';

export default async function handler(req) {
  try {
    const { searchParams } = new URL(req.url);
    const panel = searchParams.get('panel') || '';
    const gameId = (searchParams.get('game') || '').replace(/[^0-9]/g, '');
    const playerId = (searchParams.get('player') || '').replace(/[^0-9]/g, '');
    const hostInfo = resolveHost(req);

    let tree;

    if (panel === 'standings') {
      const standings = await fetchStandings();
      tree = standings ? standingsCard(standings, hostInfo) : brandCard(hostInfo);
    } else if (panel === 'player' && playerId) {
      const player = await fetchPlayer(playerId);
      tree = player ? playerCard(player, hostInfo) : brandCard(hostInfo);
    } else {
      const game = gameId ? await fetchGame(gameId) : null;
      tree = game?.homeTeam && game?.awayTeam ? gameCard(game, hostInfo) : brandCard(hostInfo);
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
    const tree = errorCard(String(err?.message || err || 'unknown'), resolveHost(req));
    return new ImageResponse(tree, { width: 1200, height: 630 });
  }
}

// Pick which side of the matchup gets the brand-accent treatment. On
// team scope we color the focal team's column orange so the share image
// reads "your team did X." On league scope nobody is the focal team —
// home gets a soft warm tint, away stays neutral white, so the eye
// follows the natural away-vs-home reading order without bias.
const pickAccent = (game, hostInfo) => {
  const a = game.awayTeam;
  const h = game.homeTeam;
  if (hostInfo.scope === 'team' && hostInfo.focalTeam) {
    if (h.abbrev === hostInfo.focalTeam) return { side: 'home', awayAccent: '#FFFFFF', homeAccent: SITE_ACCENT_LITE };
    if (a.abbrev === hostInfo.focalTeam) return { side: 'away', awayAccent: SITE_ACCENT_LITE, homeAccent: '#FFFFFF' };
  }
  return { side: null, awayAccent: 'rgba(255,255,255,0.92)', homeAccent: SITE_ACCENT_LITE };
};

function gameCard(game, hostInfo) {
  const a = game.awayTeam;
  const hh = game.homeTeam;
  const aAbbr = a.abbrev || 'AWAY';
  const hAbbr = hh.abbrev || 'HOME';
  const aScore = a.score ?? 0;
  const hScore = hh.score ?? 0;
  const isFinal = game.gameState === 'FINAL' || game.gameState === 'OFF';
  const isLive = game.gameState === 'LIVE' || game.gameState === 'CRIT';

  const stateLabel = isLive
    ? `LIVE · P${game.periodDescriptor?.number || '?'}${game.clock?.timeRemaining ? ` · ${game.clock.timeRemaining}` : ''}`
    : isFinal
      ? `FINAL${game.periodDescriptor?.periodType && game.periodDescriptor.periodType !== 'REG' ? ` · ${game.periodDescriptor.periodType}` : ''}`
      : 'UPCOMING';

  const acc = pickAccent(game, hostInfo);
  // Result chip — only meaningful for the focal team. On league scope
  // we just print the score and let the reader decide who won.
  let resultLabel = null, resultColor = '#888';
  if (isFinal && hostInfo.focalTeam && acc.side) {
    const focalScore = acc.side === 'home' ? hScore : aScore;
    const otherScore = acc.side === 'home' ? aScore : hScore;
    const won = focalScore > otherScore;
    resultLabel = won ? 'W' : focalScore === otherScore ? 'T' : 'L';
    resultColor = won ? '#10B981' : focalScore === otherScore ? '#888' : '#EF4444';
  }

  const sysFont = 'system-ui, -apple-system, sans-serif';

  // Big background letters — split L/R so the eye reads "AWAY vs HOME".
  // On team scope the focal team's side gets the orange tint to anchor
  // the share image; on league scope both sides stay neutral.
  const leftBgColor = acc.side === 'away' ? SITE_ACCENT : '#FFFFFF';
  const leftBgOpacity = acc.side === 'away' ? 0.18 : 0.08;
  const rightBgColor = acc.side === 'home' ? SITE_ACCENT : '#FFFFFF';
  const rightBgOpacity = acc.side === 'home' ? 0.18 : 0.08;

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
    div({ style: { display: 'flex', position: 'absolute', top: 0, left: 0, right: 0, height: 8, background: SITE_ACCENT } }),

    // Huge stylized AWAY abbr on the left half
    div(
      {
        style: {
          display: 'flex', position: 'absolute', left: -20, top: 80,
          fontSize: 480, fontWeight: 900,
          color: leftBgColor, opacity: leftBgOpacity,
          letterSpacing: -24, fontFamily: sysFont, lineHeight: 1,
        },
      },
      aAbbr,
    ),

    // Mirror: huge HOME abbr on the right half
    div(
      {
        style: {
          display: 'flex', position: 'absolute', right: -20, top: 80,
          fontSize: 480, fontWeight: 900,
          color: rightBgColor, opacity: rightBgOpacity,
          letterSpacing: -24, fontFamily: sysFont, lineHeight: 1,
        },
      },
      hAbbr,
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
      div({ style: { display: 'flex' } }, `${hostInfo.brandUpper} · GAME RECAP`),
      div({ style: { display: 'flex', color: SITE_ACCENT_LITE } }, stateLabel),
    ),

    // Center score readout
    div(
      {
        style: {
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 80, padding: '0 56px', position: 'relative', zIndex: 1,
        },
      },
      // AWAY block
      div(
        { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 } },
        div({ style: { display: 'flex', fontSize: 26, color: acc.awayAccent, fontWeight: 700, letterSpacing: 6 } }, aAbbr),
        div({ style: { display: 'flex', fontSize: 200, fontWeight: 800, color: acc.awayAccent, lineHeight: 1, letterSpacing: -8 } }, String(aScore)),
      ),

      // Center separator + result chip (focal team only)
      div(
        { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 } },
        div({ style: { display: 'flex', fontSize: 80, color: 'rgba(255,255,255,0.20)', fontWeight: 600, lineHeight: 1 } }, '–'),
        resultLabel && div(
          {
            style: {
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 64, height: 40, borderRadius: 8,
              background: resultLabel === 'W' ? 'rgba(16,185,129,0.18)'
                : resultLabel === 'L' ? 'rgba(239,68,68,0.18)'
                : 'rgba(255,255,255,0.10)',
              color: resultColor, fontSize: 26, fontWeight: 800,
            },
          },
          resultLabel,
        ),
      ),

      // HOME block
      div(
        { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 } },
        div({ style: { display: 'flex', fontSize: 26, color: acc.homeAccent, fontWeight: 700, letterSpacing: 6 } }, hAbbr),
        div({ style: { display: 'flex', fontSize: 200, fontWeight: 800, color: acc.homeAccent, lineHeight: 1, letterSpacing: -8 } }, String(hScore)),
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
      div({ style: { display: 'flex' } }, hostInfo.brand),
      div({ style: { display: 'flex' } }, 'UNOFFICIAL · NOT AFFILIATED WITH THE NHL'),
    ),
  );
}

function brandCard(hostInfo) {
  const sysFont = 'system-ui, -apple-system, sans-serif';
  // On team scope we lean into the "PHI" giant background for the
  // Flyers-fan vibe. On league scope we drop the team abbr and just
  // stamp the brand mark — keeps it neutral when a non-PHI fan shares
  // their saved view of scumbag.hockey.
  const giant = hostInfo.scope === 'team' ? (hostInfo.focalTeam || 'NHL') : 'NHL';
  return div(
    {
      style: {
        height: '100%', width: '100%', display: 'flex', flexDirection: 'column',
        background: '#050505', color: '#E8E8E8',
        fontFamily: sysFont, position: 'relative',
        alignItems: 'center', justifyContent: 'center', gap: 24,
      },
    },
    div({ style: { display: 'flex', position: 'absolute', top: 0, left: 0, right: 0, height: 8, background: SITE_ACCENT } }),
    div({ style: { display: 'flex', fontSize: 360, fontWeight: 900, color: SITE_ACCENT, letterSpacing: -16, lineHeight: 1, opacity: hostInfo.scope === 'league' ? 0.6 : 1 } }, giant),
    div({ style: { display: 'flex', fontSize: 88, fontWeight: 700, color: SITE_ACCENT_LITE, letterSpacing: -2, marginTop: -32 } }, hostInfo.brand),
    div({ style: { display: 'flex', fontSize: 22, color: 'rgba(255,255,255,0.55)', letterSpacing: 4 } }, hostInfo.tagline),
    div({ style: { display: 'flex', position: 'absolute', bottom: 36, fontSize: 14, color: 'rgba(255,255,255,0.35)', letterSpacing: 2 } }, 'UNOFFICIAL · NOT AFFILIATED WITH THE NHL'),
  );
}

function standingsCard(raw, hostInfo) {
  const focal = hostInfo.focalTeam;
  // On team scope show the focal team's conference; on league scope
  // show whichever conference has the most movement — but the standings
  // endpoint doesn't let us trivially compute "most interesting", so we
  // default to Eastern. League hosts can hit ?panel=standings&conf=west
  // if/when we add that param.
  const conf = 'Eastern';
  const teams = (raw?.standings || []).filter((t) => t.conferenceName === conf).sort((a, b) => a.conferenceSequence - b.conferenceSequence).slice(0, 8);
  const sysFont = 'system-ui, -apple-system, sans-serif';

  return div(
    { style: { height: '100%', width: '100%', display: 'flex', flexDirection: 'column', background: '#050505', color: '#E8E8E8', fontFamily: sysFont, position: 'relative' } },
    div({ style: { display: 'flex', position: 'absolute', top: 0, left: 0, right: 0, height: 8, background: SITE_ACCENT } }),
    div({ style: { display: 'flex', justifyContent: 'space-between', padding: '36px 56px 24px', fontSize: 22, letterSpacing: 2 } },
      div({ style: { display: 'flex', color: SITE_ACCENT_LITE, fontWeight: 700 } }, `${conf.toUpperCase()} CONFERENCE`),
      div({ style: { display: 'flex', color: 'rgba(255,255,255,0.45)' } }, hostInfo.brandUpper),
    ),
    div({ style: { display: 'flex', flexDirection: 'column', padding: '0 56px', gap: 6, flex: 1 } },
      ...teams.map((t, i) => {
        const abbr = t.teamAbbrev?.default || '???';
        const isFocal = focal && abbr === focal;
        return div(
          { style: { display: 'flex', alignItems: 'center', gap: 16, padding: '10px 16px', borderRadius: 8, background: isFocal ? 'rgba(247,73,2,0.12)' : 'transparent' } },
          div({ style: { display: 'flex', width: 32, fontSize: 18, fontWeight: 600, color: isFocal ? SITE_ACCENT_LITE : i < 3 ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.3)' } }, String(i + 1)),
          div({ style: { display: 'flex', fontSize: 20, fontWeight: 700, color: isFocal ? SITE_ACCENT_LITE : 'rgba(255,255,255,0.85)', width: 64 } }, abbr),
          div({ style: { display: 'flex', fontSize: 18, color: 'rgba(255,255,255,0.55)', flex: 1 } }, `${t.wins}-${t.losses}-${t.otLosses || 0}`),
          div({ style: { display: 'flex', fontSize: 24, fontWeight: 700, color: isFocal ? SITE_ACCENT_LITE : 'rgba(255,255,255,0.9)' } }, `${t.points} pts`),
        );
      }),
    ),
    div({ style: { display: 'flex', padding: '0 56px 36px', fontSize: 14, color: 'rgba(255,255,255,0.3)', letterSpacing: 2 } }, 'UNOFFICIAL · NOT AFFILIATED WITH THE NHL'),
  );
}

function playerCard(player, hostInfo) {
  const name = [player.firstName?.default, player.lastName?.default].filter(Boolean).join(' ');
  const sub = player.featuredStats?.regularSeason?.subSeason;
  const sysFont = 'system-ui, -apple-system, sans-serif';
  const stats = sub ? `${sub.goals || 0}G · ${sub.assists || 0}A · ${sub.points || 0}P in ${sub.gamesPlayed || 0} GP` : '';
  // Use the player's actual team abbr for the background letters, not
  // a hardcoded one — this image is more useful when it brands around
  // the player's team than the host's focal team.
  const bgAbbr = player.currentTeamAbbrev || hostInfo.focalTeam || 'NHL';

  return div(
    { style: { height: '100%', width: '100%', display: 'flex', flexDirection: 'column', background: '#050505', color: '#E8E8E8', fontFamily: sysFont, position: 'relative', alignItems: 'center', justifyContent: 'center', gap: 16 } },
    div({ style: { display: 'flex', position: 'absolute', top: 0, left: 0, right: 0, height: 8, background: SITE_ACCENT } }),
    div({ style: { display: 'flex', position: 'absolute', left: -20, top: 60, fontSize: 400, fontWeight: 900, color: SITE_ACCENT, opacity: 0.1, lineHeight: 1, letterSpacing: -16 } }, bgAbbr),
    div({ style: { display: 'flex', fontSize: 28, color: SITE_ACCENT_LITE, fontWeight: 600, letterSpacing: 4, zIndex: 1 } }, `${hostInfo.brandUpper} · PLAYER`),
    div({ style: { display: 'flex', fontSize: 100, fontWeight: 800, color: 'rgba(255,255,255,0.95)', letterSpacing: -4, zIndex: 1 } }, name),
    div({ style: { display: 'flex', fontSize: 18, color: 'rgba(255,255,255,0.55)', zIndex: 1 } }, `${player.position || '?'} · #${player.sweaterNumber || '?'} · ${bgAbbr}`),
    stats && div({ style: { display: 'flex', fontSize: 36, fontWeight: 700, color: SITE_ACCENT_LITE, zIndex: 1, marginTop: 8 } }, stats),
    div({ style: { display: 'flex', position: 'absolute', bottom: 36, fontSize: 14, color: 'rgba(255,255,255,0.3)', letterSpacing: 2 } }, 'UNOFFICIAL · NOT AFFILIATED WITH THE NHL'),
  );
}

function errorCard(msg, hostInfo) {
  return div(
    {
      style: {
        height: '100%', width: '100%', display: 'flex', flexDirection: 'column',
        background: '#050505', color: '#E8E8E8',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        alignItems: 'center', justifyContent: 'center', gap: 16, padding: 64,
      },
    },
    div({ style: { display: 'flex', fontSize: 64, fontWeight: 700, color: SITE_ACCENT } }, hostInfo?.brand || 'flyers.fan'),
    div({ style: { display: 'flex', fontSize: 22, color: 'rgba(255,255,255,0.55)' } }, 'OG image failed to render'),
    div({ style: { display: 'flex', fontSize: 18, color: 'rgba(255,255,255,0.35)', maxWidth: 1000, textAlign: 'center' } }, String(msg).slice(0, 200)),
  );
}
