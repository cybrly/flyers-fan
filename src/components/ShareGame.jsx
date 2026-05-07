import { useState } from 'react';
import { Share2, Download, Check } from 'lucide-react';

// Share button that hits our edge OG endpoint to get a proper PNG with
// real team logos embedded (via @vercel/og), then either fires the Web
// Share API on mobile or downloads the file on desktop. Previously we
// generated an SVG client-side and rasterized it via canvas, which
// worked but couldn't embed external SVG team logos cleanly — so the
// PHI mark fell back to a stylized "P" inside a circle. The /api/og
// endpoint renders server-side with the real NHL logos, so the share
// image now matches the rest of the site's branding.

export const ShareGameButton = ({ game }) => {
  const [state, setState] = useState('idle'); // idle | working | shared

  if (!game?.id) return null;

  const onClick = async () => {
    if (state === 'working') return;
    setState('working');
    try {
      const r = await fetch(`/api/og?game=${encodeURIComponent(game.id)}`);
      if (!r.ok) throw new Error(`og ${r.status}`);
      const blob = await r.blob();
      const fileName = `flyers-${game.dateLabel?.replace(/\s/g, '_') || 'recap'}.png`;
      const file = new File([blob], fileName, { type: blob.type || 'image/png' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: 'Flyers · Game Recap',
            text: `PHI ${game.score?.us ?? ''}-${game.score?.them ?? ''} ${game.home ? 'vs' : '@'} ${game.oppAbbr || ''}`,
          });
          setState('shared');
          setTimeout(() => setState('idle'), 1800);
          return;
        } catch {
          // user cancelled or share failed — fall through to download
        }
      }

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
    } catch {
      setState('idle');
    }
  };

  const Icon = state === 'shared' ? Check : (typeof navigator !== 'undefined' && navigator.canShare ? Share2 : Download);
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
