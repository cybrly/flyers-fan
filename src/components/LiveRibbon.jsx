import { ArrowRight } from 'lucide-react';
import { cx, isLive } from '../config.js';
import { FlyersMark, TeamLogo } from './Logo.jsx';

// Slim sticky strip below the Topbar that shows live Flyers game state on
// every page. Only renders when there's an active game; otherwise returns
// null and the layout reclaims the space. Pulls from the same boxscore
// that the Game Tape uses, so period/clock match exactly.
export const LiveRibbon = ({ liveGame, liveDetail, onOpenGame, currentPage }) => {
  if (!liveGame) return null;
  if (currentPage === 'game') return null; // already on Game Tape — no ribbon

  const period = liveDetail?.periodDescriptor;
  const clock = liveDetail?.clock;
  const periodLabel = period?.periodType === 'OT'
    ? 'OT'
    : period?.periodType === 'SO'
      ? 'SO'
      : period?.number ? `P${period.number}` : 'LIVE';
  const clockText = clock?.inIntermission ? 'INT' : (clock?.timeRemaining || '—:—');

  // Last goal scorer — slips a bit of color onto the ribbon.
  const last = liveDetail?.timeline?.[liveDetail.timeline.length - 1];

  return (
    <div className="sticky top-12 z-20 h-9 border-b border-[#F74902]/[0.22] bg-[#0A0A0A]/95 backdrop-blur-md">
      <button
        onClick={() => onOpenGame?.(liveGame.id)}
        className="w-full h-full px-4 md:px-6 flex items-center gap-3 sm:gap-4 hover:bg-white/[0.02] transition-colors group"
      >
        {/* Live pulse */}
        <span className="flex items-center gap-1.5 shrink-0">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-70" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-400" />
          </span>
          <span className="text-[10px] font-mono text-red-400 uppercase tracking-wider font-medium">LIVE</span>
        </span>

        {/* Score with logos */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {liveGame.home ? (
            <>
              <TeamLogo abbr={liveGame.opp} size={14} />
              <span className="text-[11px] font-mono text-white/65 hidden sm:inline">{liveGame.opp}</span>
              <span className="text-[13px] font-mono tabular-nums font-semibold text-white/85">{liveGame.them}</span>
              <span className="text-white/25 text-[12px]">–</span>
              <span className={cx('text-[13px] font-mono tabular-nums font-semibold',
                liveGame.us >= liveGame.them ? 'text-[#FF8A4C]' : 'text-white/85'
              )}>{liveGame.us}</span>
              <span className="text-[11px] font-mono text-[#FF8A4C] hidden sm:inline">PHI</span>
              <FlyersMark size={14} />
            </>
          ) : (
            <>
              <FlyersMark size={14} />
              <span className="text-[11px] font-mono text-[#FF8A4C] hidden sm:inline">PHI</span>
              <span className={cx('text-[13px] font-mono tabular-nums font-semibold',
                liveGame.us >= liveGame.them ? 'text-[#FF8A4C]' : 'text-white/85'
              )}>{liveGame.us}</span>
              <span className="text-white/25 text-[12px]">–</span>
              <span className="text-[13px] font-mono tabular-nums font-semibold text-white/85">{liveGame.them}</span>
              <span className="text-[11px] font-mono text-white/65 hidden sm:inline">{liveGame.opp}</span>
              <TeamLogo abbr={liveGame.opp} size={14} />
            </>
          )}
        </div>

        <span className="text-white/15 hidden md:inline">·</span>

        {/* Period · Clock */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[10px] font-mono text-[#FF8A4C] uppercase tracking-wider font-medium">{periodLabel}</span>
          <span className="text-[12px] font-mono tabular-nums text-white/85">{clockText}</span>
        </div>

        {/* Last goal — fills available space */}
        {last && (
          <div className="hidden md:flex items-center gap-2 min-w-0 flex-1 text-[11px] font-mono">
            <span className="text-white/35 uppercase tracking-wider text-[9px]">Last goal</span>
            <span className={cx('truncate', last.us ? 'text-[#FF8A4C]' : 'text-white/75')}>
              {last.scorer}
            </span>
            <span className="text-white/35 shrink-0">P{last.period} · {last.time}</span>
          </div>
        )}

        {/* CTA */}
        <span className="ml-auto md:ml-0 flex items-center gap-1 text-[10px] font-mono text-white/45 group-hover:text-[#FF8A4C] transition-colors shrink-0">
          <span className="hidden sm:inline">Open Game Tape</span>
          <ArrowRight size={10} />
        </span>
      </button>
    </div>
  );
};
