// Season-end announcement banner. Displays once per session (dismissed
// state stored in sessionStorage). Shows a heartfelt thank-you to the
// Flyers and fans with a promise to return next season.

import { useState } from 'react';
import { X } from 'lucide-react';
import { cx } from '../config.js';
import { FlyersMark } from './Logo.jsx';

const DISMISSED_KEY = 'flyersfan.season-end-dismissed';

export const SeasonEndBanner = () => {
  const [dismissed, setDismissed] = useState(() => {
    try { return sessionStorage.getItem(DISMISSED_KEY) === '1'; } catch { return false; }
  });

  if (dismissed) return null;

  const dismiss = () => {
    setDismissed(true);
    try { sessionStorage.setItem(DISMISSED_KEY, '1'); } catch { /* ignore */ }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" style={{ animation: 'fadeIn 0.3s ease-out' }}>
      <div className="relative w-full max-w-lg rounded-xl border border-[#F74902]/30 bg-gradient-to-b from-[#141210] to-[#0A0A0A] shadow-[0_0_60px_-12px_rgba(247,73,2,0.2)] overflow-hidden">
        {/* Orange glow at top */}
        <div className="absolute inset-x-0 top-0 h-32 pointer-events-none" style={{ background: 'radial-gradient(ellipse 70% 100% at 50% 0%, rgba(247,73,2,0.12), transparent)' }} />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#F74902]/50 to-transparent" />

        {/* Close button */}
        <button
          type="button"
          onClick={dismiss}
          className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-white/[0.05] hover:bg-white/[0.1] text-white/50 hover:text-white transition-colors"
          aria-label="Close"
        >
          <X size={16} />
        </button>

        <div className="relative px-8 py-10 text-center">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <FlyersMark size={48} />
          </div>

          {/* Headline */}
          <h2 className="text-[24px] sm:text-[28px] font-semibold tracking-tight leading-tight">
            Thank You, Flyers.
          </h2>

          <p className="mt-4 text-[14px] sm:text-[15px] leading-relaxed text-white/65 max-w-md mx-auto">
            What a season. The heart, the passion, the fight every single night — this team gave everything. From October to the final horn, you left it all on the ice.
          </p>

          <p className="mt-3 text-[13px] leading-relaxed text-white/50 max-w-md mx-auto">
            To every fan who rode every shift with us — thank you. The highs, the lows, the overtime heartbreaks and the comeback wins. This is what it means to bleed orange.
          </p>

          {/* Divider */}
          <div className="mt-6 mb-5 h-px bg-gradient-to-r from-transparent via-[#F74902]/30 to-transparent" />

          <p className="text-[12px] font-mono text-[#FF8A4C] uppercase tracking-wider">
            See you next season
          </p>
          <p className="mt-2 text-[11px] font-mono text-white/35">
            flyers.fan will return for the 2026–27 season. All historical data remains available below.
          </p>

          {/* Dismiss button */}
          <button
            type="button"
            onClick={dismiss}
            className="mt-6 inline-flex items-center px-6 h-10 rounded-lg bg-[#F74902] text-black text-[13px] font-semibold hover:bg-[#ff6426] transition-colors"
          >
            Continue to Site
          </button>
        </div>
      </div>
    </div>
  );
};
