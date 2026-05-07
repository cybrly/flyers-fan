// api/og.js
//
// Edge function that renders an Open Graph image for any flyers.fan URL.
// 1200x630 PNG, designed to look great in iMessage / Twitter / Discord /
// Slack previews. Per-game variant fetches the boxscore and shows the
// score and three stars; the no-game default is a brand card.
//
// Usage:
//   /api/og              → default brand card
//   /api/og?game=12345   → score-card for that game
//
// Powered by @vercel/og (Satori under the hood). Uses system fonts only —
// remote font loads in edge functions cost cold-start time and aren't
// worth it for a card that's mostly numbers.

import { ImageResponse } from '@vercel/og';

export const config = { runtime: 'edge' };

const NHL = 'https://api-web.nhle.com';
const PHI_LOGO = 'https://assets.nhle.com/logos/nhl/svg/PHI_dark.svg';
const teamLogo = (abbr) => `https://assets.nhle.com/logos/nhl/svg/${abbr}_dark.svg`;

const FALLBACK_TITLE = 'flyers.fan';
const FALLBACK_SUB = 'Live tracker · stats · forecast';

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

export default async function handler(req) {
  const { searchParams } = new URL(req.url);
  const gameId = (searchParams.get('game') || '').replace(/[^0-9]/g, '');

  const game = gameId ? await fetchGame(gameId) : null;

  let body;
  if (game?.homeTeam && game?.awayTeam) {
    const a = game.awayTeam;
    const h = game.homeTeam;
    const isPhiHome = h.abbrev === 'PHI';
    const oppAbbr = isPhiHome ? a.abbrev : h.abbrev;
    const phiScore = isPhiHome ? (h.score ?? 0) : (a.score ?? 0);
    const oppScore = isPhiHome ? (a.score ?? 0) : (h.score ?? 0);
    const isFinal = game.gameState === 'FINAL' || game.gameState === 'OFF';
    const isLive = game.gameState === 'LIVE' || game.gameState === 'CRIT';
    const phiWon = phiScore > oppScore;

    const stateLabel = isLive
      ? `LIVE · P${game.periodDescriptor?.number || '?'}${game.clock?.timeRemaining ? ` · ${game.clock.timeRemaining}` : ''}`
      : isFinal
        ? `FINAL${game.periodDescriptor?.periodType && game.periodDescriptor.periodType !== 'REG' ? ` · ${game.periodDescriptor.periodType}` : ''}`
        : 'UPCOMING';
    const resultLabel = isFinal ? (phiWon ? 'W' : 'L') : null;
    const resultColor = isFinal ? (phiWon ? '#10B981' : '#EF4444') : null;

    body = (
      <div style={{
        height: '100%', width: '100%', display: 'flex', flexDirection: 'column',
        background: 'linear-gradient(180deg, #0A0A0A 0%, #050505 100%)',
        color: '#E8E8E8', fontFamily: 'system-ui, -apple-system, sans-serif', position: 'relative',
      }}>
        {/* Top accent bar */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 8, background: '#F74902' }} />

        {/* PHI logo watermark, bottom-left */}
        <img
          src={PHI_LOGO}
          width="320" height="320"
          style={{ position: 'absolute', bottom: -40, left: -40, opacity: 0.10 }}
        />
        {/* Opponent watermark, bottom-right */}
        <img
          src={teamLogo(oppAbbr)}
          width="320" height="320"
          style={{ position: 'absolute', bottom: -40, right: -40, opacity: 0.10 }}
        />

        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '36px 56px 0 56px', fontSize: 18, color: 'rgba(255,255,255,0.55)', letterSpacing: 2,
        }}>
          <div style={{ display: 'flex' }}>FLYERS.FAN · GAME RECAP</div>
          <div style={{ display: 'flex', color: '#FF8A4C' }}>{stateLabel}</div>
        </div>

        {/* Center stage */}
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 80, padding: '0 56px',
        }}>
          {/* PHI side */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <img src={PHI_LOGO} width="140" height="140" />
            <div style={{ display: 'flex', fontSize: 22, color: '#FF8A4C', fontWeight: 600 }}>PHI</div>
            <div style={{ display: 'flex', fontSize: 140, fontWeight: 700, color: '#FF8A4C', lineHeight: 1, letterSpacing: -4 }}>{phiScore}</div>
          </div>

          {/* Center separator */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <div style={{ display: 'flex', fontSize: 64, color: 'rgba(255,255,255,0.20)', fontWeight: 600 }}>–</div>
            {resultLabel && (
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 56, height: 36, borderRadius: 8,
                background: phiWon ? 'rgba(16,185,129,0.18)' : 'rgba(239,68,68,0.18)',
                color: resultColor, fontSize: 24, fontWeight: 700,
              }}>{resultLabel}</div>
            )}
          </div>

          {/* OPP side */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <img src={teamLogo(oppAbbr)} width="140" height="140" />
            <div style={{ display: 'flex', fontSize: 22, color: 'rgba(255,255,255,0.65)', fontWeight: 600 }}>{oppAbbr}</div>
            <div style={{ display: 'flex', fontSize: 140, fontWeight: 700, color: 'rgba(255,255,255,0.85)', lineHeight: 1, letterSpacing: -4 }}>{oppScore}</div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '0 56px 36px 56px', fontSize: 15, color: 'rgba(255,255,255,0.40)', letterSpacing: 2,
        }}>
          <div style={{ display: 'flex' }}>flyers.fan</div>
          <div style={{ display: 'flex' }}>UNOFFICIAL · NOT AFFILIATED WITH THE NHL</div>
        </div>
      </div>
    );
  } else {
    // Brand card — used for all non-game URLs
    body = (
      <div style={{
        height: '100%', width: '100%', display: 'flex', flexDirection: 'column',
        background: 'linear-gradient(180deg, #0A0A0A 0%, #050505 100%)',
        color: '#E8E8E8', fontFamily: 'system-ui, -apple-system, sans-serif', position: 'relative',
        alignItems: 'center', justifyContent: 'center', gap: 24,
      }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 8, background: '#F74902' }} />
        <img src={PHI_LOGO} width="280" height="280" style={{ opacity: 0.95 }} />
        <div style={{ display: 'flex', fontSize: 88, fontWeight: 700, color: '#FF8A4C', letterSpacing: -2 }}>{FALLBACK_TITLE}</div>
        <div style={{ display: 'flex', fontSize: 22, color: 'rgba(255,255,255,0.55)', letterSpacing: 4 }}>{FALLBACK_SUB.toUpperCase()}</div>
        <div style={{
          position: 'absolute', bottom: 36, fontSize: 14, color: 'rgba(255,255,255,0.35)', letterSpacing: 2,
        }}>UNOFFICIAL · NOT AFFILIATED WITH THE NHL</div>
      </div>
    );
  }

  return new ImageResponse(body, {
    width: 1200,
    height: 630,
    headers: {
      'cache-control': 'public, s-maxage=60, stale-while-revalidate=300',
    },
  });
}
