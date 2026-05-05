import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';
import { OPP_FULL, cx } from '../config.js';
import { FlyersMark, TeamLogo } from './Logo.jsx';

// Sidebar prank widget — looks like a team switcher but every selection
// (except PHI) opens a fullscreen modal that gently informs the user
// that the chosen team sucks. PHI returns to the normal app with no
// modal. Pure client-side; no real switching happens.

const DIVISIONS = [
  {
    conference: 'Eastern',
    divisions: [
      { name: 'Metropolitan', teams: ['CAR', 'NJD', 'NYR', 'WSH', 'CBJ', 'NYI', 'PIT', 'PHI'] },
      { name: 'Atlantic',     teams: ['TOR', 'TBL', 'FLA', 'BOS', 'OTT', 'DET', 'MTL', 'BUF'] },
    ],
  },
  {
    conference: 'Western',
    divisions: [
      { name: 'Central',      teams: ['DAL', 'COL', 'WPG', 'MIN', 'NSH', 'STL', 'UTA', 'CHI'] },
      { name: 'Pacific',      teams: ['VGK', 'EDM', 'LAK', 'CGY', 'VAN', 'SEA', 'SJS', 'ANA'] },
    ],
  },
];

export const TeamSwitcherPrank = () => {
  const [open, setOpen] = useState(false);
  const [pranked, setPranked] = useState(null); // abbr of the selected team

  // Click-outside to close the menu (modal has its own dismissal flow).
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e) => {
      if (!e.target.closest('[data-team-switcher]')) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  // Esc closes the modal too.
  useEffect(() => {
    if (!pranked) return;
    const onKey = (e) => { if (e.key === 'Escape') setPranked(null); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [pranked]);

  const select = (abbr) => {
    setOpen(false);
    if (abbr === 'PHI') return; // no prank on home team
    setPranked(abbr);
  };

  return (
    <>
      <div className="relative" data-team-switcher>
        <button
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="listbox"
          aria-expanded={open}
          className="flex items-center gap-1.5 px-1.5 py-1 -mx-1.5 rounded hover:bg-white/[0.04] transition-colors"
        >
          <FlyersMark size={20} />
          <div className="flex items-baseline gap-1">
            <span className="text-[13px] font-semibold tracking-tight">flyers</span>
            <span className="text-[13px] text-[#F74902] font-semibold">.fan</span>
          </div>
          <ChevronDown size={12} className={cx('text-white/40 transition-transform', open && 'rotate-180')} />
        </button>

        {open && (
          <div
            role="listbox"
            className="absolute left-0 top-full mt-1.5 w-[260px] max-h-[70vh] overflow-y-auto rounded-md border border-white/[0.08] bg-[#0C0C0C]/98 backdrop-blur-md shadow-[0_18px_42px_-18px_rgba(0,0,0,0.9)] z-50"
          >
            <div className="px-3 py-2 border-b border-white/[0.06] flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-wider text-white/45">Switch team</span>
              <span className="text-[10px] font-mono text-white/30">32 teams</span>
            </div>
            {DIVISIONS.map((conf) => (
              <div key={conf.conference}>
                <div className="px-3 pt-3 pb-1 text-[9px] font-mono uppercase tracking-[0.12em] text-white/35">
                  {conf.conference} Conference
                </div>
                {conf.divisions.map((div) => (
                  <div key={div.name} className="pb-1">
                    <div className="px-3 py-1 text-[10px] font-mono uppercase tracking-wider text-white/55">
                      {div.name}
                    </div>
                    {div.teams.map((abbr) => {
                      const isUs = abbr === 'PHI';
                      return (
                        <button
                          key={abbr}
                          role="option"
                          onClick={() => select(abbr)}
                          className={cx(
                            'w-full flex items-center gap-2.5 px-3 py-1.5 text-left transition-colors',
                            isUs
                              ? 'bg-[#F74902]/[0.06] text-[#FF8A4C]'
                              : 'text-white/80 hover:bg-white/[0.04] hover:text-white'
                          )}
                        >
                          {isUs ? <FlyersMark size={18} /> : <TeamLogo abbr={abbr} size={18} />}
                          <span className="text-[12px] truncate">{OPP_FULL[abbr] || abbr}</span>
                          {isUs && (
                            <span className="ml-auto text-[9px] font-mono uppercase tracking-wider text-[#FF8A4C]/85">current</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {pranked && <PrankModal abbr={pranked} onClose={() => setPranked(null)} />}
    </>
  );
};

const PrankModal = ({ abbr, onClose }) => {
  const teamName = OPP_FULL[abbr] || abbr;
  // Render via portal because the Sidebar drawer uses CSS transforms,
  // which create a containing block that traps position:fixed children.
  // Without the portal the backdrop ends up clipped to the 244px sidebar.
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${teamName} sucks`}
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm"
      style={{ animation: 'fadeIn 0.2s ease-out' }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[760px] max-h-[90vh] overflow-y-auto rounded-2xl border border-white/[0.10] bg-gradient-to-b from-[#141414] via-[#0C0C0C] to-[#070707] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.95)]"
        style={{ animation: 'pmIn 0.28s cubic-bezier(0.2, 0.8, 0.2, 1)' }}
      >
        <style>{`
          @keyframes pmIn { from { opacity: 0; transform: scale(0.94); } to { opacity: 1; transform: scale(1); } }
          @keyframes pmGlow { 0%, 100% { filter: drop-shadow(0 0 24px rgba(247,73,2,0.45)); } 50% { filter: drop-shadow(0 0 48px rgba(247,73,2,0.85)); } }
        `}</style>

        <div className="flex flex-col items-center text-center px-6 sm:px-12 py-12 sm:py-16 gap-8">
          <div style={{ animation: 'pmGlow 2.4s ease-in-out infinite' }}>
            <FlyersMark size={140} />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-center gap-3">
              <TeamLogo abbr={abbr} size={36} />
              <span className="text-[16px] sm:text-[20px] font-mono uppercase tracking-wider text-white/55">
                {teamName}
              </span>
            </div>
            <h2 className="text-[64px] sm:text-[112px] font-semibold tracking-tight leading-none"
              style={{ textShadow: '0 0 40px rgba(247,73,2,0.4), 0 6px 12px rgba(0,0,0,0.7)' }}>
              <span className="text-white/85">{abbr}</span>
              <span className="text-[#FF8A4C]"> sucks</span>
            </h2>
            <p className="text-[13px] sm:text-[14px] font-mono text-white/45 max-w-[520px] mx-auto pt-2">
              Confirmed by every Flyers fan. There is no further analysis to perform.
            </p>
          </div>

          <button
            onClick={onClose}
            autoFocus
            className="mt-2 px-8 py-3 rounded-md bg-[#F74902] hover:bg-[#FF5C1F] text-black text-[14px] font-semibold uppercase tracking-wider transition-colors shadow-[0_0_24px_rgba(247,73,2,0.3)]"
          >
            I know
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};
