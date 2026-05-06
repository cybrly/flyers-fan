import { useState } from 'react';
import { Share2, Download, Check } from 'lucide-react';
import { OPP_FULL } from '../config.js';

// Generate a 1200x630 PNG (Twitter/iMessage-friendly OG dimensions) of
// the game result for sharing. Builds an inline SVG, rasterizes via
// canvas, and either fires the Web Share API (mobile) or downloads the
// PNG (desktop). No external libs, no fonts beyond system sans/mono.
//
// Trade-off: SVG-to-canvas drops external resources (web fonts, custom
// images), so we deliberately keep the design text-heavy and use system
// fonts. Player headshots are skipped — they'd require pre-loading the
// remote PNG into a data URL before SVG rasterization, which adds CORS
// risk and complexity for marginal visual gain.

const W = 1200;
const H = 630;

// Tightly hand-tuned SVG template. Pure neutrals for backgrounds (per
// the user-stored preference) and orange only for accents.
const buildSVG = (game) => {
  const oppFull = OPP_FULL[game.oppAbbr] || game.oppName || game.oppAbbr || 'Opponent';
  const won = game.score.us > game.score.them;
  const phiSide = game.home ? 'home' : 'away';
  const resultColor = won ? '#10B981' : '#EF4444';
  const resultLabel = won ? 'W' : 'L';
  const resultBig   = `${game.score.us}–${game.score.them}`;
  const stars = (game.stars || []).slice(0, 3);

  // Precompute star rows so we can pad cleanly when fewer than 3.
  const starRows = stars.map((s, i) => {
    const yBase = 410 + i * 56;
    return `
      <text x="60" y="${yBase}" font-family="ui-monospace, SF Mono, Menlo, monospace" font-size="22" fill="#FFA85C" font-weight="600">★ ${s.star || i + 1}</text>
      <text x="120" y="${yBase}" font-family="ui-sans-serif, system-ui, -apple-system, sans-serif" font-size="24" fill="#E8E8E8">${escapeXml(s.name || '—')}</text>
      <text x="120" y="${yBase + 22}" font-family="ui-monospace, SF Mono, Menlo, monospace" font-size="14" fill="rgba(255,255,255,0.4)">${escapeXml((s.position || '') + (s.points != null ? ` · ${s.points} pts (${s.goals || 0}G ${s.assists || 0}A)` : ''))}</text>
    `;
  }).join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#0A0A0A"/>
        <stop offset="1" stop-color="#050505"/>
      </linearGradient>
      <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#F74902" stop-opacity="0.35"/>
        <stop offset="1" stop-color="#F74902" stop-opacity="0"/>
      </linearGradient>
    </defs>
    <rect width="${W}" height="${H}" fill="url(#bg)"/>
    <rect x="0" y="0" width="${W}" height="6" fill="#F74902"/>
    <rect x="0" y="${H - 1}" width="${W}" height="1" fill="rgba(247,73,2,0.35)"/>
    <rect x="0" y="0" width="600" height="${H}" fill="url(#accent)"/>

    <text x="60" y="80" font-family="ui-monospace, SF Mono, Menlo, monospace" font-size="14" fill="rgba(255,255,255,0.4)" letter-spacing="2">FLYERS.FAN · GAME RECAP</text>

    <text x="60" y="160" font-family="ui-sans-serif, system-ui, -apple-system, sans-serif" font-size="32" font-weight="600" fill="#E8E8E8">${escapeXml(game.dateLabel || '')}</text>

    <text x="60" y="220" font-family="ui-monospace, SF Mono, Menlo, monospace" font-size="20" fill="rgba(255,255,255,0.55)" letter-spacing="1.5">PHI ${phiSide === 'away' ? '@' : 'vs'} ${escapeXml(game.oppAbbr || '')}</text>
    <text x="60" y="252" font-family="ui-sans-serif, system-ui, -apple-system, sans-serif" font-size="22" fill="rgba(255,255,255,0.7)">${escapeXml(oppFull)}</text>

    <!-- Score block -->
    <text x="60" y="350" font-family="ui-sans-serif, system-ui, -apple-system, sans-serif" font-size="120" font-weight="700" fill="#FF8A4C" letter-spacing="-3">${resultBig}</text>
    <rect x="60" y="365" width="120" height="40" fill="${resultColor}" opacity="0.18" rx="6"/>
    <text x="120" y="394" text-anchor="middle" font-family="ui-monospace, SF Mono, Menlo, monospace" font-size="24" font-weight="700" fill="${resultColor}">${resultLabel}</text>

    ${stars.length > 0 ? `
      <text x="60" y="${410 - 24}" font-family="ui-monospace, SF Mono, Menlo, monospace" font-size="14" fill="rgba(255,255,255,0.4)" letter-spacing="2">THREE STARS</text>
      ${starRows}
    ` : ''}

    <!-- Right column: PHI mark -->
    <g transform="translate(900, 200)">
      <circle r="160" fill="rgba(247,73,2,0.10)" stroke="rgba(247,73,2,0.35)" stroke-width="2"/>
      <text text-anchor="middle" y="40" font-family="ui-sans-serif, system-ui, -apple-system, sans-serif" font-size="180" font-weight="800" fill="#F74902" letter-spacing="-8">P</text>
    </g>

    <!-- Footer line -->
    <text x="60" y="${H - 40}" font-family="ui-monospace, SF Mono, Menlo, monospace" font-size="14" fill="rgba(255,255,255,0.35)" letter-spacing="2">flyers.fan</text>
    <text x="${W - 60}" y="${H - 40}" text-anchor="end" font-family="ui-monospace, SF Mono, Menlo, monospace" font-size="14" fill="rgba(255,255,255,0.35)" letter-spacing="2">unofficial · not affiliated with the NHL</text>
  </svg>`;
};

const escapeXml = (s) => String(s ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&apos;');

const svgToBlob = async (svg) => {
  const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);
  try {
    const img = await new Promise((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = (e) => rej(e);
      i.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, W, H);
    const blob = await new Promise((res) => canvas.toBlob(res, 'image/png', 0.92));
    return blob;
  } finally {
    URL.revokeObjectURL(url);
  }
};

export const ShareGameButton = ({ game }) => {
  const [state, setState] = useState('idle'); // idle | working | shared

  if (!game?.score) return null;

  const onClick = async () => {
    if (state === 'working') return;
    setState('working');
    try {
      const svg = buildSVG(game);
      const blob = await svgToBlob(svg);
      if (!blob) throw new Error('blob failed');
      const fileName = `flyers-${game.dateLabel?.replace(/\s/g, '_') || 'recap'}.png`;
      const file = new File([blob], fileName, { type: 'image/png' });

      // Web Share with files (mobile + some desktop browsers)
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: 'Flyers · Game Recap',
            text: `PHI ${game.score.us}-${game.score.them} ${game.home ? 'vs' : '@'} ${game.oppAbbr}`,
          });
          setState('shared');
          setTimeout(() => setState('idle'), 1800);
          return;
        } catch (err) {
          // user cancelled or share failed — fall through to download
        }
      }

      // Fallback: download the PNG
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setState('shared');
      setTimeout(() => setState('idle'), 1800);
    } catch (err) {
      setState('idle');
    }
  };

  const Icon = state === 'shared' ? Check : (navigator.canShare ? Share2 : Download);
  return (
    <button
      onClick={onClick}
      disabled={state === 'working'}
      title={state === 'shared' ? 'Saved' : 'Share this game'}
      className="flex items-center gap-1.5 px-2.5 h-7 border border-white/[0.08] hover:border-[#F74902]/40 bg-white/[0.02] rounded-md text-[11px] font-mono text-white/65 hover:text-white transition-colors disabled:opacity-50"
    >
      <Icon size={12} />
      <span>{state === 'working' ? 'Generating…' : state === 'shared' ? 'Saved' : 'Share'}</span>
    </button>
  );
};
