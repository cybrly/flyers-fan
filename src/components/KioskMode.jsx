import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Maximize2 } from 'lucide-react';
import { OPP_FULL, cx } from '../config.js';
import { FlyersMark, TeamLogo } from './Logo.jsx';
import { TeamLogoBg } from './Watermark.jsx';
import { useScoreBurst } from '../api.js';
import { GoalCelebration } from './LiveTiles.jsx';

// Full-viewport "broadcast" overlay. Two modes:
//   • Live mode (Hero on Dashboard during a live PHI game): score and
//     clock update in real time via the SSE snapshot.
//   • Recap mode (GameTape header for any selected game): final score
//     plus FINAL chip, no clock animation.
//
// Designed to be readable from across the room while watching on TV.
// Renders via portal so it escapes the dashboard layout, locks body
// scroll, and traps Esc to close.

export const KioskMode = ({ liveGame, liveDetail, liveSnap, game, onClose }) => {
  // Two source-of-truth shapes — Hero passes liveGame/liveDetail; GameTape
  // passes the adapted `game` object. Normalize into one set of locals.
  const isLiveMode = !!liveGame;
  const oppAbbr = isLiveMode ? liveGame.opp : game?.oppAbbr;
  const isHome = isLiveMode ? liveGame.home : game?.home;

  const snapFresh = isLiveMode && liveSnap?.ts && (Date.now() - liveSnap.ts) < 6000;
  let usScore, themScore, period, clock;
  if (isLiveMode) {
    const liveAway = snapFresh && liveSnap?.away?.score != null
      ? liveSnap.away.score
      : (liveGame.home ? liveGame.them : liveGame.us);
    const liveHome = snapFresh && liveSnap?.home?.score != null
      ? liveSnap.home.score
      : (liveGame.home ? liveGame.us : liveGame.them);
    usScore  = liveGame.home ? liveHome : liveAway;
    themScore = liveGame.home ? liveAway : liveHome;
    period = (snapFresh && liveSnap?.periodDescriptor) || liveDetail?.periodDescriptor;
    clock  = (snapFresh && liveSnap?.clock) || liveDetail?.clock;
  } else if (game?.score) {
    usScore = game.score.us;
    themScore = game.score.them;
    period = game.periodDescriptor;
    clock = game.clock;
  } else {
    usScore = 0; themScore = 0; period = null; clock = null;
  }

  const inIntermission = clock?.inIntermission;
  const isFinalState = !isLiveMode && (game?.state === 'FINAL' || game?.state === 'OFF');
  const periodLabel = period?.periodType === 'OT'
    ? 'OVERTIME'
    : period?.periodType === 'SO'
      ? 'SHOOTOUT'
      : period?.number ? `PERIOD ${period.number}` : 'PRE-GAME';
  const clockText = clock?.timeRemaining || '—:—';

  const sog = (isLiveMode ? liveDetail?.stats?.shots : game?.stats?.shots);
  const pp  = (isLiveMode ? liveDetail?.stats?.powerPlay : game?.stats?.powerPlay);
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

  const oppFull = OPP_FULL[oppAbbr] || oppAbbr || 'Opponent';
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
      <TeamLogoBg abbr={oppAbbr} size={780} opacity={0.05} position="bottom-right" />

      {/* Top bar: status chip + period/clock + close */}
      <div className="absolute top-0 inset-x-0 flex items-center justify-between px-6 sm:px-12 py-5">
        <div className="flex items-center gap-3">
          {isLiveMode ? (
            <span className="flex items-center gap-2 px-3 h-8 rounded-md border border-red-500/45 bg-red-500/[0.10]">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-[12px] font-mono font-bold tracking-wider text-red-300">LIVE</span>
            </span>
          ) : (
            <span className="flex items-center gap-2 px-3 h-8 rounded-md border border-white/15 bg-white/[0.05]">
              <span className="text-[12px] font-mono font-bold tracking-wider text-white/75">
                {isFinalState ? 'FINAL' : 'GAME'}
              </span>
            </span>
          )}
          <span className="text-[14px] font-mono uppercase tracking-[0.2em] text-white/85">
            {isLiveMode ? (inIntermission ? 'INTERMISSION' : periodLabel) : (game?.dateLabel || '')}
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
            {isHome
              ? <TeamLogo abbr={oppAbbr} size={120} className="sm:!w-[160px] sm:!h-[160px]" />
              : <FlyersMark size={120} className="sm:!w-[160px] sm:!h-[160px]" />}
            <div className="text-[18px] sm:text-[24px] font-semibold tracking-tight text-center">
              {isHome ? oppFull : 'Philadelphia Flyers'}
            </div>
            <span
              className={cx(
                'text-[140px] sm:text-[200px] font-bold tabular-nums tracking-tight leading-none',
                isHome ? '' : 'text-[#FF8A4C]',
                goalBurst && 'score-flash',
              )}
              style={isHome ? undefined : { textShadow: '0 0 56px rgba(247,73,2,0.5), 0 4px 16px rgba(0,0,0,0.7)' }}
            >
              {isHome ? themScore : usScore}
            </span>
          </div>

          {/* Center — clock or final marker */}
          <div className="flex flex-col items-center gap-2 px-4 sm:px-8">
            <div className="text-[14px] sm:text-[18px] font-mono tracking-[0.25em] text-white/55 uppercase">
              {isLiveMode
                ? (inIntermission ? 'Intermission' : periodLabel.replace('PERIOD ', 'P'))
                : (isFinalState ? 'Final' : (periodLabel || 'Game'))}
            </div>
            <div className="text-[44px] sm:text-[72px] font-mono font-bold tabular-nums text-white/95 leading-none">
              {isLiveMode
                ? (inIntermission ? 'INT' : clockText)
                : (period?.periodType === 'OT' ? 'OT' : period?.periodType === 'SO' ? 'SO' : '—')}
            </div>
            <div className="text-[11px] sm:text-[12px] font-mono uppercase tracking-[0.25em] text-white/30 mt-2">vs</div>
          </div>

          {/* Home side */}
          <div className="flex flex-col items-center gap-3">
            <div className="text-[12px] sm:text-[14px] font-mono uppercase tracking-[0.25em] text-white/45">Home</div>
            {isHome
              ? <FlyersMark size={120} className="sm:!w-[160px] sm:!h-[160px]" />
              : <TeamLogo abbr={oppAbbr} size={120} className="sm:!w-[160px] sm:!h-[160px]" />}
            <div className="text-[18px] sm:text-[24px] font-semibold tracking-tight text-center">
              {isHome ? 'Philadelphia Flyers' : oppFull}
            </div>
            <span
              className={cx(
                'text-[140px] sm:text-[200px] font-bold tabular-nums tracking-tight leading-none',
                isHome ? 'text-[#FF8A4C]' : '',
                goalBurst && 'score-flash',
              )}
              style={isHome ? { textShadow: '0 0 56px rgba(247,73,2,0.5), 0 4px 16px rgba(0,0,0,0.7)' } : undefined}
            >
              {isHome ? usScore : themScore}
            </span>
          </div>
        </div>

        {/* Status pill — who's leading / who won */}
        <div className="mt-8 sm:mt-12">
          <span className={cx(
            'px-4 h-9 inline-flex items-center text-[14px] sm:text-[16px] font-mono uppercase tracking-[0.2em] rounded-md',
            tied ? 'border border-white/15 bg-white/[0.05] text-white/75'
              : phiWinning ? 'border border-[#F74902]/40 bg-[#F74902]/[0.10] text-[#FF8A4C]'
              : 'border border-red-500/30 bg-red-500/[0.06] text-red-300',
          )}>
            {tied ? (isFinalState ? 'Tied' : 'Tied game')
              : phiWinning ? (isFinalState ? 'Flyers win' : 'Flyers lead')
              : `${oppAbbr} ${isFinalState ? 'wins' : 'leads'}`}
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
