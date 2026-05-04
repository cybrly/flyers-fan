import { cx, TEAM_ABBR } from '../config.js';
import { Chip, Section, Skeleton } from '../components/primitives.jsx';
import { TeamLogo } from '../components/Logo.jsx';

const SeriesCard = ({ s }) => {
  const topWon = s.complete && s.winningTeamId && s.top.abbr && s.bottom.abbr && s.top.wins > s.bottom.wins;
  const botWon = s.complete && !topWon;
  const teamRow = (t, won) => (
    <div className={cx(
      'flex items-center justify-between px-3 h-9',
      t.abbr === TEAM_ABBR && 'bg-[#F74902]/[0.08]',
    )}>
      <div className="flex items-center gap-2 min-w-0">
        <span className={cx('text-[10px] font-mono w-7 shrink-0',
          t.abbr === TEAM_ABBR ? 'text-[#FF8A4C]' : 'text-white/35'
        )}>{t.rank || ''}</span>
        <TeamLogo abbr={t.abbr} size={16} />
        <span className={cx('text-[12px] truncate',
          won ? 'text-white' : 'text-white/55'
        )}>{t.name}</span>
      </div>
      <span className={cx('text-[14px] font-mono tabular-nums shrink-0',
        won ? 'text-[#FF8A4C] font-semibold' : 'text-white/65'
      )}>{t.wins}</span>
    </div>
  );
  return (
    <div className={cx(
      'border rounded-md overflow-hidden',
      s.hasUs ? 'border-[#F74902]/40 bg-[#F74902]/[0.04]' : 'border-white/[0.06] bg-[#0C0C0C]/60',
    )}>
      <div className="px-3 h-7 flex items-center justify-between border-b border-white/[0.05]">
        <span className="text-[10px] font-mono text-white/40 uppercase tracking-wider">Series {s.letter}</span>
        {s.complete
          ? <Chip tone="muted">DONE</Chip>
          : <Chip tone="green" pulse>ACTIVE</Chip>}
      </div>
      <div className="divide-y divide-white/[0.04]">
        {teamRow(s.top, topWon)}
        {teamRow(s.bottom, botWon)}
      </div>
    </div>
  );
};

export const Playoffs = ({ bracket }) => {
  const data = bracket;
  const ROUND_NAMES = ['', '1st Round', '2nd Round', 'Conference Finals', 'Stanley Cup Final'];

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[20px] font-semibold tracking-tight">Playoffs</h1>
          <p className="text-[12px] text-white/45 mt-1 font-mono">
            {data ? `${data.title || '2026 Stanley Cup Playoffs'} · live` : 'Loading bracket…'}
          </p>
        </div>
      </div>

      {!data && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} height={110} />)}
        </div>
      )}

      {data && data.rounds.map((seriesArr, idx) => {
        const r = idx + 1;
        if (seriesArr.length === 0) return null;
        return (
          <Section key={r} title={ROUND_NAMES[r]} action={<span className="text-[10px] font-mono text-white/40">{seriesArr.length} {seriesArr.length === 1 ? 'series' : 'series'}</span>}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-3">
              {seriesArr.map((s) => <SeriesCard key={s.letter} s={s} />)}
            </div>
          </Section>
        );
      })}
    </div>
  );
};
