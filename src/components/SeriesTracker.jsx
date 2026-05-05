import { Trophy, Calendar } from 'lucide-react';
import { cx, TEAM_ABBR, fmtDate, fmtTime } from '../config.js';
import { Section, Chip } from './primitives.jsx';
import { TeamLogo } from './Logo.jsx';

// Compact playoff-series widget. Pulls PHI's active series straight out of the
// scoreboard payload (seriesStatus). Renders prominently on the Dashboard
// during playoff season so fans see series state at a glance.
export const SeriesTracker = ({ scoreboard, schedule, onOpenGame }) => {
  if (!scoreboard?.games?.length) return null;
  // Find the PHI game from today's slate (live, upcoming, or final).
  const game = scoreboard.games.find((g) => g.away.abbr === TEAM_ABBR || g.home.abbr === TEAM_ABBR);
  if (!game?.series) return null;

  const s = game.series;
  const isUsTop = s.top.abbr === TEAM_ABBR;
  const us = isUsTop ? s.top : s.bottom;
  const them = isUsTop ? s.bottom : s.top;
  const needed = s.neededToWin || 4;
  const usPercent = (us.wins / needed) * 100;
  const themPercent = (them.wins / needed) * 100;

  // Series state copy
  const decided = us.wins >= needed || them.wins >= needed;
  const tied = us.wins === them.wins;
  const usLeading = us.wins > them.wins;

  let stateLine;
  if (decided) {
    stateLine = us.wins >= needed
      ? <span className="text-[#FF8A4C] font-medium">Series won {us.wins}–{them.wins}</span>
      : <span className="text-white/55">Eliminated {us.wins}–{them.wins}</span>;
  } else if (tied) {
    stateLine = <span className="text-white/65">Series tied {us.wins}–{them.wins}</span>;
  } else if (usLeading) {
    stateLine = <span className="text-[#FF8A4C]">Lead {us.wins}–{them.wins}</span>;
  } else {
    stateLine = <span className="text-white/65">Trail {us.wins}–{them.wins}</span>;
  }

  // Past meetings this series — pull from finished games against this opponent
  // in the playoffs (gameType 3). Sort by date asc so games render in order.
  const oppAbbr = them.abbr;
  const seriesFinished = (schedule?.games || [])
    .filter((g) => g.opp === oppAbbr && g.gameType === 3)
    .sort((a, b) => a.date.localeCompare(b.date));

  // Build dot strip — needed slots, filled by who won that game number.
  const totalSlots = (needed - 1) * 2 + 1; // best-of-7 → 7 slots
  const dots = Array.from({ length: totalSlots }, (_, i) => {
    const g = seriesFinished[i];
    if (!g) return 'pending';
    return g.w ? 'us' : 'them';
  });

  return (
    <Section
      title={
        <span className="flex items-center gap-2">
          <Trophy size={12} className="text-[#FF8A4C]" />
          <span>Round {s.round} · vs {oppAbbr}</span>
          {!decided && <Chip tone="green" pulse>ACTIVE</Chip>}
          {decided && us.wins >= needed && <Chip tone="orange">ADVANCED</Chip>}
        </span>
      }
      action={<span className="text-[10px] font-mono text-white/40">first to {needed}</span>}
    >
      <div className="p-4 space-y-3">
        {/* Team rows with bars showing progress to series win */}
        <SeriesRow t={us} percent={usPercent} needed={needed} winning={usLeading || decided && us.wins >= needed} isUs />
        <SeriesRow t={them} percent={themPercent} needed={needed} winning={!usLeading && them.wins > us.wins} />

        <div className="flex items-center justify-between pt-2 border-t border-white/[0.05]">
          <div className="text-[12px] font-mono">{stateLine}</div>
          <div className="flex items-center gap-1">
            {dots.map((d, i) => (
              <span
                key={i}
                title={`Game ${i + 1}`}
                className={cx(
                  'w-2 h-2 rounded-full',
                  d === 'us' ? 'bg-[#F74902]' : d === 'them' ? 'bg-white/65' : 'bg-white/15'
                )}
              />
            ))}
          </div>
        </div>

        {/* Today's game from this series — with a CTA to open Game Tape */}
        {game && (
          <button
            onClick={() => onOpenGame?.(game.id)}
            className="w-full flex items-center justify-between px-3 h-9 border border-white/[0.06] rounded-md bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/[0.12] transition-colors"
          >
            <div className="flex items-center gap-2 text-[11px] font-mono">
              <Calendar size={11} className="text-white/40" />
              <span className="text-white/55">Game {s.gameNum}</span>
              <span className="text-white/25">·</span>
              <span className="text-white/85">
                {game.state === 'LIVE' || game.state === 'CRIT'
                  ? `LIVE · P${game.period?.number || '?'} ${game.clock?.timeRemaining || ''}`
                  : game.state === 'OFF' || game.state === 'FINAL'
                    ? `Final ${game.away.score}–${game.home.score}`
                    : `${fmtDate(game.startUTC)} · ${fmtTime(game.startUTC)}`}
              </span>
            </div>
            <span className="text-[10px] font-mono text-[#FF8A4C]">open tape →</span>
          </button>
        )}
      </div>
    </Section>
  );
};

const SeriesRow = ({ t, percent, needed, winning, isUs = false }) => (
  <div className="space-y-1">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <TeamLogo abbr={t.abbr} size={18} />
        <span className={cx('text-[12px] font-medium',
          isUs ? 'text-white' : 'text-white/85'
        )}>{t.abbr}</span>
      </div>
      <div className="flex items-center gap-2 font-mono tabular-nums">
        <span className={cx('text-[20px]',
          winning ? (isUs ? 'text-[#FF8A4C] font-semibold' : 'text-white font-semibold') : 'text-white/55'
        )}>{t.wins}</span>
        <span className="text-[10px] text-white/30">/ {needed}</span>
      </div>
    </div>
    <div className="relative h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
      <div
        className={cx('absolute left-0 top-0 h-full rounded-full transition-all',
          isUs ? 'bg-[#F74902]' : 'bg-white/55'
        )}
        style={{ width: `${Math.min(100, percent)}%` }}
      />
    </div>
  </div>
);
