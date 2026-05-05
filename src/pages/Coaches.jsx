import { useMemo, useState } from 'react';
import { Award, Search } from 'lucide-react';
import { cx, TEAM_ABBR, OPP_FULL } from '../config.js';
import { Section, Chip } from '../components/primitives.jsx';
import { TeamLogo } from '../components/Logo.jsx';
import { COACHES } from '../data/coaches.js';

// NHL head coaches view — 32 cards in a sortable / searchable grid. The
// public NHL API doesn't expose coach data, so the underlying source is a
// manually curated table; the page itself is read-only and just renders it.
export const Coaches = () => {
  const [q, setQ] = useState('');
  const [sort, setSort] = useState('team'); // 'team' | 'tenure' | 'name'

  const filtered = useMemo(() => {
    let list = [...COACHES];
    if (q.trim()) {
      const needle = q.trim().toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(needle) ||
          c.team.toLowerCase().includes(needle) ||
          c.abbr.toLowerCase().includes(needle),
      );
    }
    if (sort === 'name') list.sort((a, b) => a.name.split(' ').slice(-1)[0].localeCompare(b.name.split(' ').slice(-1)[0]));
    else if (sort === 'tenure') list.sort((a, b) => Number(a.hired.slice(0, 4)) - Number(b.hired.slice(0, 4)));
    else list.sort((a, b) => a.team.localeCompare(b.team));
    return list;
  }, [q, sort]);

  const longest = [...COACHES].sort((a, b) => Number(a.hired.slice(0, 4)) - Number(b.hired.slice(0, 4)))[0];
  const cupWinners = COACHES.filter((c) => c.highlight && /Cup/.test(c.highlight));

  return (
    <div className="p-3 md:p-5 space-y-3">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[20px] font-semibold tracking-tight">Head Coaches</h1>
          <p className="text-[12px] text-white/45 mt-1 font-mono">
            All 32 NHL head coaches · {COACHES.length} bench bosses · {cupWinners.length} Stanley Cup winners
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-2.5 h-7 border border-white/[0.08] focus-within:border-[#FF8A4C]/50 bg-white/[0.02] rounded-md">
            <Search size={11} className="text-white/40" />
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search coach or team…"
              className="bg-transparent text-[12px] outline-none placeholder:text-white/30 w-44"
            />
          </div>
          <div className="flex items-center gap-0.5 p-0.5 border border-white/[0.08] rounded-md bg-white/[0.02]">
            {[
              { id: 'team',   l: 'Team' },
              { id: 'name',   l: 'Name' },
              { id: 'tenure', l: 'Tenure' },
            ].map((s) => (
              <button
                key={s.id}
                onClick={() => setSort(s.id)}
                className={cx('px-2.5 h-6 text-[11px] font-medium rounded-[4px] transition-colors',
                  sort === s.id ? 'bg-white/[0.08] text-white' : 'text-white/50 hover:text-white'
                )}
              >{s.l}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Quick-glance stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryTile label="Cup Winners" value={cupWinners.length} sub="active head coaches" tone="amber" />
        <SummaryTile label="Longest Tenure" value={longest?.name?.split(' ').slice(-1)[0] || '—'} sub={`${longest?.team} · since ${longest?.hired}`} tone="warm" />
        <SummaryTile label="First-time HCs" value={COACHES.filter((c) => !c.priorTeams?.length).length} sub="no prior NHL stint" tone="cool" />
        <SummaryTile label="Mid-Season Hires" value={COACHES.filter((c) => /\d{4}-\d{2}/.test(c.hired)).length} sub="this 25–26 season" tone="default" />
      </div>

      <Section title="Coaches Directory" action={<span className="text-[10px] font-mono text-white/40">{filtered.length} of {COACHES.length}</span>}>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-px bg-white/[0.04]">
          {filtered.map((c) => <CoachCard key={c.abbr} c={c} />)}
        </div>
        {filtered.length === 0 && (
          <div className="px-4 py-8 text-center text-[11px] font-mono text-white/35">No coaches match.</div>
        )}
      </Section>
    </div>
  );
};

const SummaryTile = ({ label, value, sub, tone }) => {
  const valueClass =
    tone === 'amber' ? 'text-amber-300' :
    tone === 'warm' ? 'text-[#FF8A4C]' :
    tone === 'cool' ? 'text-sky-300' :
    'text-white';
  const dot =
    tone === 'amber' ? 'bg-amber-400' :
    tone === 'warm' ? 'bg-[#F74902]' :
    tone === 'cool' ? 'bg-sky-400' :
    'bg-white/40';
  return (
    <div className="border border-white/[0.06] bg-[#0C0C0C]/60 rounded-md px-3 py-2.5">
      <div className="flex items-center gap-1.5">
        <span className={cx('w-1.5 h-1.5 rounded-full', dot)} />
        <span className="text-[10px] font-mono text-white/40 uppercase tracking-wider">{label}</span>
      </div>
      <div className={cx('text-[20px] font-semibold tracking-tight mt-1', valueClass)}>{value}</div>
      {sub && <div className="text-[10px] font-mono text-white/40 mt-0.5 truncate">{sub}</div>}
    </div>
  );
};

const CoachCard = ({ c }) => {
  const isUs = c.abbr === TEAM_ABBR;
  return (
    <div className={cx(
      'p-4 transition-colors',
      isUs ? 'bg-[#F74902]/[0.06]' : 'bg-[#0A0A0A] hover:bg-[#0E0E0E]',
    )}>
      <div className="flex items-start gap-3">
        <TeamLogo abbr={c.abbr} size={32} className="mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className={cx('text-[16px] font-semibold tracking-tight', isUs && 'text-[#FF8A4C]')}>
              {c.name}
            </span>
            {isUs && <Chip tone="orange">PHI</Chip>}
          </div>
          <div className="text-[11px] font-mono text-white/55 mt-0.5">
            {OPP_FULL[c.abbr] || c.team} · since {c.hired}
          </div>
          {c.highlight && (
            <div className="mt-1.5 flex items-center gap-1.5 text-[11px] font-mono text-amber-300/85">
              <Award size={11} /> {c.highlight}
            </div>
          )}
          {c.biography && (
            <p className="text-[11px] text-white/65 mt-2 leading-snug">
              {c.biography}
            </p>
          )}
          {c.priorTeams?.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1 text-[9px] font-mono">
              <span className="text-white/35 uppercase tracking-wider">Prior:</span>
              {c.priorTeams.map((t, i) => (
                <span key={i} className="text-white/55">
                  {t}{i < c.priorTeams.length - 1 ? ' ·' : ''}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
