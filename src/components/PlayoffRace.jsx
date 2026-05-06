import { useMemo } from 'react';
import { cx, TEAM_ABBR } from '../config.js';
import { Section } from './primitives.jsx';
import { TeamLogo } from './Logo.jsx';

// Surface PHI's standing relative to the playoff cutline. NHL playoffs
// take the top 3 from each division (6 division spots) plus 2 wild
// cards per conference. The 8th conference seed is the cutline; PHI's
// "magic number" is the points gap to that team scaled against games
// remaining (82 - gp).

export const PlayoffRace = ({ standings }) => {
  const data = useMemo(() => {
    if (!standings?.east?.length) return null;
    const east = standings.east;
    const us = east.find((t) => t.abbr === TEAM_ABBR);
    if (!us) return null;
    const eighth = east[7];
    const ninth = east[8] || null;
    const seventh = east[6] || null;

    const isIn = us.confRank <= 8;
    const cutTeam = isIn ? ninth : eighth; // who's chasing us / who we're chasing
    const gap = isIn ? (us.pts - (cutTeam?.pts ?? us.pts)) : ((eighth?.pts ?? us.pts) - us.pts);
    const remaining = Math.max(0, 82 - us.gp);

    // Top of division = #3 in division (3 division spots). If we're
    // a wild card, this is the leader spot we'd jump to on a rally.
    const division = standings.metro || [];
    const topThree = division.slice(0, 3);
    const inDivisionTop3 = topThree.some((t) => t.abbr === TEAM_ABBR);

    return {
      us, isIn, cutTeam, seventh, eighth, ninth, gap, remaining,
      east, division, topThree, inDivisionTop3,
    };
  }, [standings]);

  if (!data) {
    return (
      <Section title="Playoff Race" action={<span className="text-[10px] font-mono text-white/40">Eastern Conference</span>}>
        <div className="p-6 text-center text-[11px] font-mono text-white/35">
          Standings not loaded.
        </div>
      </Section>
    );
  }

  const { us, isIn, cutTeam, seventh, eighth, ninth, gap, remaining, inDivisionTop3 } = data;

  return (
    <Section
      title="Playoff Race"
      action={
        <span className={cx(
          'text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded border tabular-nums',
          isIn ? 'border-emerald-500/40 bg-emerald-500/[0.08] text-emerald-300'
               : 'border-red-500/40 bg-red-500/[0.10] text-red-300'
        )}>
          {isIn ? `In · ${gap >= 0 ? '+' : ''}${gap}` : `Out · ${gap}`}
        </span>
      }
    >
      <div className="p-4 space-y-4">
        {/* Headline number — points cushion or chase distance, with
            games remaining for context. */}
        <div className="flex items-baseline justify-between flex-wrap gap-3">
          <div>
            <div className={cx(
              'text-[36px] font-semibold tabular-nums tracking-tight leading-none',
              isIn ? (gap >= 6 ? 'text-emerald-400' : gap >= 2 ? 'text-amber-300' : 'text-amber-400')
                   : 'text-red-400'
            )}>
              {gap >= 0 && isIn ? '+' : ''}{gap}
            </div>
            <div className="text-[10px] font-mono text-white/40 uppercase tracking-wider mt-1">
              {isIn ? 'point cushion' : 'points behind'}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[20px] font-semibold tabular-nums text-white/85 leading-none">{remaining}</div>
            <div className="text-[10px] font-mono text-white/40 uppercase tracking-wider mt-1">games left</div>
          </div>
        </div>

        {/* Conference cutline strip — show 7th, 8th, 9th relative to PHI. */}
        <div className="rounded-md border border-white/[0.05] divide-y divide-white/[0.04]">
          <CutlineRow row={seventh} label="7th seed" emphasis={us.confRank === 7} />
          <CutlineRow row={eighth} label="8th seed (cutline)" emphasis={us.confRank === 8} highlightLine />
          <CutlineRow row={ninth} label="1st out" emphasis={us.confRank === 9} />
        </div>

        {/* PHI bullet line summarizing position */}
        <div className="text-[11px] font-mono text-white/55 leading-relaxed">
          PHI sits <span className="text-white/85 tabular-nums">#{us.confRank}</span> in the East
          {inDivisionTop3 ? ' inside the Metro top 3' : ' outside the Metro top 3'}
          {isIn
            ? `, ${gap} pts ahead of the 1st-out team with ${remaining} games to play.`
            : cutTeam
              ? `, ${gap} pts behind the 8th seed with ${remaining} games to play.`
              : '.'}
        </div>
      </div>
    </Section>
  );
};

const CutlineRow = ({ row, label, emphasis, highlightLine }) => {
  if (!row) return (
    <div className="px-3 py-2 flex items-center justify-between text-[11px] font-mono text-white/30">
      <span>{label}</span><span>—</span>
    </div>
  );
  const isUs = row.abbr === TEAM_ABBR;
  return (
    <div className={cx(
      'px-3 py-2 flex items-center gap-3',
      emphasis && 'bg-white/[0.02]',
      isUs && 'bg-[#F74902]/[0.06]',
      highlightLine && 'border-y border-amber-500/20',
    )}>
      <span className="text-[10px] font-mono text-white/35 uppercase tracking-wider w-32 shrink-0">{label}</span>
      <TeamLogo abbr={row.abbr} size={18} />
      <span className={cx('text-[12px] flex-1 truncate', isUs ? 'text-[#FF8A4C] font-semibold' : 'text-white/85')}>
        {row.team}
      </span>
      <span className="text-[11px] font-mono tabular-nums text-white/55 shrink-0">{row.w}-{row.l}{row.ot ? `-${row.ot}` : ''}</span>
      <span className="text-[12px] font-mono font-semibold tabular-nums text-white/85 shrink-0 w-8 text-right">{row.pts}</span>
    </div>
  );
};
