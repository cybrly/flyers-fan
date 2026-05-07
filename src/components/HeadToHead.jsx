import { Swords } from 'lucide-react';
import { cx, OPP_FULL, fmtDate } from '../config.js';
import { Section, Chip } from './primitives.jsx';
import { TeamLogoBg } from './Watermark.jsx';
import { TeamLogo } from './Logo.jsx';

// Season series vs the most relevant opponent — live game's opp, then next
// game, then most recent. Renders W/L record, last meeting summary, and a
// compact list of every meeting this season (regular + playoffs).
//
// Uses only the schedule we already have client-side; no new fetches.
export const HeadToHead = ({ schedule, onOpenGame }) => {
  const oppAbbr =
    schedule?.liveGame?.opp ||
    schedule?.upcoming?.[0]?.opp ||
    schedule?.nextGame?.opp ||
    schedule?.games?.[0]?.opp ||
    null;
  if (!oppAbbr || !schedule?.games?.length) return null;

  // All finished games vs this opponent this season (regular + playoffs).
  const meetings = schedule.games
    .filter((g) => g.opp === oppAbbr)
    .sort((a, b) => a.date.localeCompare(b.date));
  if (meetings.length === 0) return null;

  const wins = meetings.filter((g) => g.w).length;
  const losses = meetings.filter((g) => !g.w).length;
  const last = meetings[meetings.length - 1];
  const reg = meetings.filter((g) => g.gameType === 2);
  const po = meetings.filter((g) => g.gameType === 3);

  // Goals for / against in the season series — telling indicator.
  const gf = meetings.reduce((a, g) => a + g.us, 0);
  const ga = meetings.reduce((a, g) => a + g.them, 0);

  const oppFull = OPP_FULL[oppAbbr] || last.oppName;
  const isLeading = wins > losses;
  const isTied = wins === losses;

  return (
    <Section
      title={
        <span className="flex items-center gap-2">
          <Swords size={11} className="text-[#FF8A4C]" />
          <span>vs {oppAbbr} · Season Series</span>
        </span>
      }
      action={<span className="text-[10px] font-mono text-white/40">{meetings.length} meeting{meetings.length === 1 ? '' : 's'}</span>}
    >
      <div className="relative overflow-hidden p-3.5 space-y-3">
        <TeamLogoBg abbr={oppAbbr} size={176} opacity={0.06} position="bottom-right" />
        {/* Big record + opp name */}
        <div className="relative flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <TeamLogo abbr={oppAbbr} size={28} />
            <div className="min-w-0">
              <div className="text-[12px] font-mono text-white/45 uppercase tracking-wider">vs</div>
              <div className="text-[14px] font-medium truncate">{oppFull}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-baseline gap-1.5 justify-end font-mono tabular-nums">
              <span className={cx('text-[28px] font-semibold tracking-tight',
                isLeading ? 'text-[#FF8A4C]' : isTied ? 'text-white/85' : 'text-white/55'
              )}>{wins}</span>
              <span className="text-[14px] text-white/25">–</span>
              <span className={cx('text-[28px] font-semibold tracking-tight',
                !isLeading && !isTied ? 'text-white' : 'text-white/55'
              )}>{losses}</span>
            </div>
            <div className="text-[10px] font-mono text-white/40 mt-0.5">
              {isLeading ? 'leading' : isTied ? 'tied' : 'trailing'}
            </div>
          </div>
        </div>

        {/* GF/GA + reg/po split */}
        <div className="relative grid grid-cols-3 gap-2 pt-3 border-t border-white/[0.05] text-center">
          <div>
            <div className="text-[9px] font-mono text-white/40 uppercase tracking-wider">Goals For</div>
            <div className="text-[16px] font-mono tabular-nums text-[#FF8A4C] mt-0.5">{gf}</div>
          </div>
          <div>
            <div className="text-[9px] font-mono text-white/40 uppercase tracking-wider">Goals Ag.</div>
            <div className="text-[16px] font-mono tabular-nums text-white/85 mt-0.5">{ga}</div>
          </div>
          <div>
            <div className="text-[9px] font-mono text-white/40 uppercase tracking-wider">Diff</div>
            <div className={cx('text-[16px] font-mono tabular-nums mt-0.5',
              gf - ga > 0 ? 'text-emerald-400' : gf - ga < 0 ? 'text-red-400' : 'text-white/65'
            )}>{gf - ga > 0 ? '+' : ''}{gf - ga}</div>
          </div>
        </div>

        {/* Reg/PO split chips if both exist */}
        {(po.length > 0 && reg.length > 0) && (
          <div className="relative flex items-center gap-2 pt-2 border-t border-white/[0.05]">
            <span className="text-[10px] font-mono text-white/40">Splits:</span>
            <Chip tone="muted">REG {reg.filter((g) => g.w).length}–{reg.filter((g) => !g.w).length}</Chip>
            <Chip tone="orange">PO {po.filter((g) => g.w).length}–{po.filter((g) => !g.w).length}</Chip>
          </div>
        )}

        {/* Last meeting */}
        <div className="relative pt-2 border-t border-white/[0.05]">
          <div className="text-[9px] font-mono text-white/40 uppercase tracking-wider mb-1">Last meeting</div>
          <button
            onClick={() => onOpenGame?.(last.id)}
            className="w-full flex items-center justify-between hover:bg-white/[0.02] -mx-2 px-2 py-1.5 rounded transition-colors"
          >
            <span className="flex items-center gap-2 text-[12px] font-mono">
              <span className={cx(
                'inline-flex items-center justify-center w-[20px] h-[16px] text-[9px] font-mono font-semibold rounded-[3px]',
                last.w ? 'bg-[#F74902]/15 text-[#FF8A4C] border border-[#F74902]/30'
                       : 'bg-white/[0.03] text-white/40 border border-white/10'
              )}>{last.w ? 'W' : 'L'}</span>
              <span className="text-white/55">{fmtDate(last.date)}</span>
              <span className="text-white/30">·</span>
              <span className="text-white/55">{last.home ? 'vs' : '@'} {oppAbbr}</span>
              {last.gameType === 3 && <Chip tone="orange">PO</Chip>}
              {last.lastPeriodType && last.lastPeriodType !== 'REG' && (
                <span className="text-[9px] text-amber-400">{last.lastPeriodType}</span>
              )}
            </span>
            <span className="text-[13px] font-mono tabular-nums text-white/85">
              <span className={last.w ? 'text-[#FF8A4C] font-medium' : ''}>{last.us}</span>
              <span className="text-white/25 mx-1">–</span>
              <span className={!last.w ? 'text-white font-medium' : ''}>{last.them}</span>
            </span>
          </button>
        </div>

        {/* Compact dot strip — last 8 results */}
        {meetings.length > 1 && (
          <div className="relative pt-2 border-t border-white/[0.05] flex items-center gap-2">
            <span className="text-[9px] font-mono text-white/40 uppercase tracking-wider">All</span>
            <div className="flex items-center gap-1 flex-wrap">
              {meetings.slice(-12).map((g) => (
                <span
                  key={g.id}
                  title={`${fmtDate(g.date)} · ${g.us}–${g.them}${g.lastPeriodType !== 'REG' ? ` ${g.lastPeriodType}` : ''}`}
                  className={cx(
                    'inline-flex items-center justify-center w-[18px] h-[18px] text-[9px] font-mono font-medium rounded-sm',
                    g.w ? 'bg-[#F74902]/20 text-[#FF8A4C] border border-[#F74902]/40'
                        : 'bg-white/[0.05] text-white/45 border border-white/[0.1]'
                  )}
                >{g.w ? 'W' : 'L'}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </Section>
  );
};
