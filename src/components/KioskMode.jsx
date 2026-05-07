import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Maximize2 } from 'lucide-react';
import { OPP_FULL, cx } from '../config.js';
import { FlyersMark, TeamLogo } from './Logo.jsx';
import { TeamLogoBg } from './Watermark.jsx';
import { useScoreBurst } from '../api.js';
import { GoalCelebration } from './LiveTiles.jsx';

// Full-viewport "broadcast" overlay for the live game. Triggered from
// the Hero during a live PHI game. Designed to be readable from across
// the room while watching the game on TV — score is huge, clock is huge,
// nothing else competes.
//
// Renders via portal so it escapes the dashboard layout, locks body
// scroll, and traps Esc to close. Auto-rotates the SOG / shot-share /
// power-play numbers across the bottom ticker every 5s so the screen
// has motion even when the score is static.

export const KioskMode = ({ liveGame, liveDetail, liveSnap, onClose }) => {
  const snapFresh = liveSnap?.ts && (Date.now() - liveSnap.ts) < 6000;
  const liveAway = snapFresh && liveSnap?.away?.score != null
    ? liveSnap.away.score
    : (liveGame.home ? liveGame.them : liveGame.us);
  const liveHome = snapFresh && liveSnap?.home?.score != null
    ? liveSnap.home.score
    : (liveGame.home ? liveGame.us : liveGame.them);
  const usScore  = liveGame.home ? liveHome : liveAway;
  const themScore = liveGame.home ? liveAway : liveHome;

  const period = (snapFresh && liveSnap?.periodDescriptor) || liveDetail?.periodDescriptor;
  const clock  = (snapFresh && liveSnap?.clock) || liveDetail?.clock;
  const inIntermission = clock?.inIntermission;
  const periodLabel = period?.periodType === 'OT'
    ? 'OVERTIME'
    : period?.periodType === 'SO'
      ? 'SHOOTOUT'
      : period?.number ? `PERIOD ${period.number}` : 'PRE-GAME';
  const clockText = clock?.timeRemaining || '—:—';

  const sog = liveDetail?.stats?.shots;
  const pp = liveDetail?.stats?.powerPlay;
  const goalBurst = useScoreBurst(usScore);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const oppFull = OPP_FULL[liveGame.opp] || liveGame.opp;
  const phiWinning = usScore > themScore;
  const tied = usScore === themScore;

  return createPortal(
    <div
      className="fixed inset-0 z-[60] bg-[#050505] text-white overflow-hidden"
      style={{ animation: 'fadeIn 0.18s ease-out' }}
      role="dialog"
      aria-label="Broadcast view"
    >
      {/* Background watermarks — large, anchored to corners, very low opacity */}
      <TeamLogoBg abbr="PHI" size={780} opacity={0.05} position="bottom-left" />
      <TeamLogoBg abbr={liveGame.opp} size={780} opacity={0.05} position="bottom-right" />

      {/* Top bar: LIVE chip + period/clock + close */}
      <div className="absolute top-0 inset-x-0 flex items-center justify-between px-6 sm:px-12 py-5">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-2 px-3 h-8 rounded-md border border-red-500/45 bg-red-500/[0.10]">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[12px] font-mono font-bold tracking-wider text-red-300">LIVE</span>
          </span>
          <span className="text-[14px] font-mono uppercase tracking-[0.2em] text-white/85">
            {inIntermission ? 'INTERMISSION' : periodLabel}
          </span>
        </div>
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 px-3 h-8 border border-white/15 hover:border-white/40 bg-white/[0.04] rounded-md text-[11px] font-mono text-white/65 hover:text-white transition-colors"
          title="Exit broadcast view (Esc)"
        >
          <X size={12} /> Exit
        </button>
      </div>

      {/* Center stage — score readout */}
      <div className="relative h-full flex flex-col items-center justify-center px-6">
        {goalBurst && <GoalCelebration />}

        {/* Both team identity rows */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-6 sm:gap-12 w-full max-w-6xl">
          {/* Away side */}
          <div className="flex flex-col items-center gap-3">
            <div className="text-[12px] sm:text-[14px] font-mono uppercase tracking-[0.25em] text-white/45">Away</div>
            {liveGame.home
              ? <TeamLogo abbr={liveGame.opp} size={120} className="sm:!w-[160px] sm:!h-[160px]" />
              : <FlyersMark size={120} className="sm:!w-[160px] sm:!h-[160px]" />}
            <div className="text-[18px] sm:text-[24px] font-semibold tracking-tight text-center">
              {liveGame.home ? oppFull : 'Philadelphia Flyers'}
            </div>
            <span
              className={cx(
                'text-[140px] sm:text-[200px] font-bold tabular-nums tracking-tight leading-none',
                liveGame.home ? '' : 'text-[#FF8A4C]',
                goalBurst && 'score-flash',
              )}
              style={liveGame.home ? undefined : { textShadow: '0 0 56px rgba(247,73,2,0.5), 0 4px 16px rgba(0,0,0,0.7)' }}
            >
              {liveGame.home ? themScore : usScore}
            </span>
          </div>

          {/* Center — clock */}
          <div className="flex flex-col items-center gap-2 px-4 sm:px-8">
            <div className="text-[14px] sm:text-[18px] font-mono tracking-[0.25em] text-white/55 uppercase">
              {inIntermission ? 'Intermission' : periodLabel.replace('PERIOD ', 'P')}
            </div>
            <div className="text-[44px] sm:text-[72px] font-mono font-bold tabular-nums text-white/95 leading-none">
              {inIntermission ? 'INT' : clockText}
            </div>
            <div className="text-[11px] sm:text-[12px] font-mono uppercase tracking-[0.25em] text-white/30 mt-2">vs</div>
          </div>

          {/* Home side */}
          <div className="flex flex-col items-center gap-3">
            <div className="text-[12px] sm:text-[14px] font-mono uppercase tracking-[0.25em] text-white/45">Home</div>
            {liveGame.home
              ? <FlyersMark size={120} className="sm:!w-[160px] sm:!h-[160px]" />
              : <TeamLogo abbr={liveGame.opp} size={120} className="sm:!w-[160px] sm:!h-[160px]" />}
            <div className="text-[18px] sm:text-[24px] font-semibold tracking-tight text-center">
              {liveGame.home ? 'Philadelphia Flyers' : oppFull}
            </div>
            <span
              className={cx(
                'text-[140px] sm:text-[200px] font-bold tabular-nums tracking-tight leading-none',
                liveGame.home ? 'text-[#FF8A4C]' : '',
                goalBurst && 'score-flash',
              )}
              style={liveGame.home ? { textShadow: '0 0 56px rgba(247,73,2,0.5), 0 4px 16px rgba(0,0,0,0.7)' } : undefined}
            >
              {liveGame.home ? usScore : themScore}
            </span>
          </div>
        </div>

        {/* Status pill — who's leading */}
        <div className="mt-8 sm:mt-12">
          <span className={cx(
            'px-4 h-9 inline-flex items-center text-[14px] sm:text-[16px] font-mono uppercase tracking-[0.2em] rounded-md',
            tied ? 'border border-white/15 bg-white/[0.05] text-white/75'
              : phiWinning ? 'border border-[#F74902]/40 bg-[#F74902]/[0.10] text-[#FF8A4C]'
              : 'border border-red-500/30 bg-red-500/[0.06] text-red-300',
          )}>
            {tied ? 'Tied game' : phiWinning ? 'Flyers lead' : `${liveGame.opp} leads`}
          </span>
        </div>
      </div>

      {/* Bottom ticker — SOG / shot share / PP if available */}
      {(sog?.us != null || pp?.us != null) && (
        <div className="absolute bottom-0 inset-x-0 border-t border-white/[0.08] bg-black/70 backdrop-blur-sm">
          <div className="px-6 sm:px-12 py-4 flex items-center justify-around text-[14px] sm:text-[18px] font-mono">
            {sog?.us != null && (
              <div className="flex items-center gap-3">
                <span className="text-white/45 uppercase tracking-[0.2em] text-[10px] sm:text-[12px]">Shots on Goal</span>
                <span className="tabular-nums text-[#FF8A4C] font-semibold">{sog.us}</span>
                <span className="text-white/25">–</span>
                <span className="tabular-nums text-white/85 font-semibold">{sog.them}</span>
              </div>
            )}
            {pp?.us != null && (
              <div className="flex items-center gap-3">
                <span className="text-white/45 uppercase tracking-[0.2em] text-[10px] sm:text-[12px]">Power Play</span>
                <span className="tabular-nums text-[#FF8A4C]">{pp.us}</span>
                <span className="text-white/25">·</span>
                <span className="tabular-nums text-white/65">{pp.them}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>,
    document.body,
  );
};

// Trigger button — tucked next to the LIVE chip on the Hero. Only
// rendered on Hero when the kiosk would actually be useful (live game).
export const KioskTrigger = ({ onClick }) => (
  <button
    onClick={onClick}
    title="Broadcast view"
    aria-label="Open broadcast view"
    className="flex items-center gap-1.5 px-2 h-6 border border-white/[0.08] hover:border-[#F74902]/40 bg-white/[0.02] rounded-md text-[10px] font-mono text-white/55 hover:text-white transition-colors"
  >
    <Maximize2 size={11} />
    <span className="hidden sm:inline">Broadcast view</span>
  </button>
);
