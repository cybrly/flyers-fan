// Historical standings comparison — "Where were we on this date last year?"
// Fetches /v1/standings/{date} for the same month-day in the prior season
// and compares PHI's position then vs now.

import { useMemo } from 'react';
import { cx, TEAM_ABBR, SEASON_LABEL } from '../config.js';
import { useNHL } from '../api.js';
import { Section, Label, Chip, Skeleton } from './primitives.jsx';

const lastYearDate = () => {
  const now = new Date();
  const ly = new Date(now);
  ly.setFullYear(ly.getFullYear() - 1);
  return ly.toISOString().slice(0, 10);
};

export const HistoricalStandings = ({ currentUs }) => {
  const date = useMemo(() => lastYearDate(), []);
  const { data, loading } = useNHL(`v1/standings/${date}`, 0);

  const lastYearUs = useMemo(() => {
    if (!data?.standings) return null;
    return data.standings.find((t) => t.teamAbbrev?.default === TEAM_ABBR);
  }, [data]);

  if (loading && !lastYearUs) {
    return (
      <Section title="This Date Last Year">
        <div className="p-4"><Skeleton height={40} /></div>
      </Section>
    );
  }

  if (!lastYearUs || !currentUs) return null;

  const ly = {
    w: lastYearUs.wins,
    l: lastYearUs.losses,
    ot: lastYearUs.otLosses,
    pts: lastYearUs.points,
    gp: lastYearUs.gamesPlayed,
    diff: lastYearUs.goalDifferential,
    divRank: lastYearUs.divisionSequence,
    pct: lastYearUs.pointPctg,
  };

  const ptsDelta = currentUs.pts - ly.pts;
  const gpDelta = currentUs.gp - ly.gp;
  const diffDelta = (currentUs.diff || 0) - (ly.diff || 0);

  return (
    <Section
      title="This Date Last Year"
      action={<span className="text-[10px] font-mono text-white/35">{date}</span>}
    >
      <div className="p-4">
        <div className="grid grid-cols-2 gap-4">
          {/* Last year */}
          <div className="border border-white/[0.06] rounded-lg p-3 bg-white/[0.01]">
            <Label>Last Season</Label>
            <div className="text-[18px] font-semibold tabular-nums mt-1 text-white/70">
              {ly.w}–{ly.l}–{ly.ot}
            </div>
            <div className="text-[11px] font-mono text-white/45 mt-1">
              {ly.pts} pts · {ly.gp} GP · Metro #{ly.divRank}
            </div>
          </div>
          {/* This year */}
          <div className="border border-[#F74902]/[0.18] rounded-lg p-3 bg-[#F74902]/[0.03]">
            <Label>This Season</Label>
            <div className="text-[18px] font-semibold tabular-nums mt-1 text-[#FF8A4C]">
              {currentUs.w}–{currentUs.l}–{currentUs.ot || 0}
            </div>
            <div className="text-[11px] font-mono text-white/55 mt-1">
              {currentUs.pts} pts · {currentUs.gp} GP · Metro #{currentUs.divRank}
            </div>
          </div>
        </div>

        {/* Delta summary */}
        <div className="mt-3 flex items-center justify-center gap-4 text-[12px] font-mono">
          <span className={cx('tabular-nums', ptsDelta > 0 ? 'text-emerald-400' : ptsDelta < 0 ? 'text-red-400' : 'text-white/50')}>
            {ptsDelta > 0 ? '+' : ''}{ptsDelta} pts
          </span>
          <span className="text-white/20">·</span>
          <span className={cx('tabular-nums', gpDelta !== 0 ? 'text-white/55' : 'text-white/35')}>
            {gpDelta > 0 ? '+' : ''}{gpDelta} GP
          </span>
          <span className="text-white/20">·</span>
          <span className={cx('tabular-nums', diffDelta > 0 ? 'text-emerald-400' : diffDelta < 0 ? 'text-red-400' : 'text-white/50')}>
            {diffDelta > 0 ? '+' : ''}{diffDelta} goal diff
          </span>
        </div>

        <div className="mt-2 text-center text-[11px] text-white/40">
          {ptsDelta > 5 ? 'Significantly ahead of last year\'s pace.' :
           ptsDelta > 0 ? 'Slightly ahead of last year.' :
           ptsDelta === 0 ? 'Tracking identically to last season.' :
           ptsDelta > -5 ? 'Slightly behind last year.' :
           'Well behind last year\'s pace.'}
        </div>
      </div>
    </Section>
  );
};
