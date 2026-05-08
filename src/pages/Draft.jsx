import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { cx, fmtDate } from '../config.js';
import { Section, Skeleton } from '../components/primitives.jsx';

// NHL Central Scouting pre-draft rankings — fetched from
// /v1/draft/rankings/{year}/{categoryId}. Four categories:
//
//   1 = North American Skater (~225 prospects)
//   2 = International Skater (~128)
//   3 = North American Goalie (~37)
//   4 = International Goalie (~20)
//
// Each prospect has firstName, lastName, position, height/weight, last
// amateur club + league, birth info, midterm rank, and (later in the season)
// a final rank. We render a sortable / searchable / paginated table with a
// category tab strip — defaults to the most-talked-about list (NA-Skater).

const CATEGORIES = [
  { id: 'north-american-skater',   label: 'NA Skaters',     short: 'NAS', tone: 'text-emerald-300' },
  { id: 'international-skater',    label: 'Int Skaters',    short: 'INT', tone: 'text-sky-300' },
  { id: 'north-american-goalie',   label: 'NA Goalies',     short: 'NAG', tone: 'text-amber-300' },
  { id: 'international-goalie',    label: 'Int Goalies',    short: 'IG',  tone: 'text-violet-300' },
];

const HEIGHT = (inches) => inches ? `${Math.floor(inches / 12)}'${inches % 12}"` : '—';

export const Draft = ({ rankings, loading }) => {
  const [cat, setCat] = useState('north-american-skater');
  const [q, setQ] = useState('');
  const [showAll, setShowAll] = useState(false);

  const list = rankings?.byCategory?.[cat] || [];
  const filtered = useMemo(() => {
    if (!q.trim()) return list;
    const needle = q.trim().toLowerCase();
    return list.filter((r) =>
      r.name.toLowerCase().includes(needle) ||
      (r.club || '').toLowerCase().includes(needle) ||
      (r.league || '').toLowerCase().includes(needle) ||
      (r.birthCity || '').toLowerCase().includes(needle) ||
      (r.birthCountry || '').toLowerCase().includes(needle),
    );
  }, [list, q]);
  const display = showAll ? filtered : filtered.slice(0, 60);

  // Category counts for the tab strip badges.
  const counts = Object.fromEntries(
    CATEGORIES.map((c) => [c.id, rankings?.byCategory?.[c.id]?.length || 0]),
  );
  const isFinal = list.some((r) => r.finalRank != null);

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[20px] font-semibold tracking-tight">Draft Rankings</h1>
          <p className="text-[12px] text-white/45 mt-1 font-mono">
            NHL Central Scouting · {rankings?.draftYear || '—'} draft · {isFinal ? 'final' : 'midterm'} rankings
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-2.5 h-7 border border-white/[0.08] focus-within:border-[#FF8A4C]/50 bg-white/[0.02] rounded-md">
            <Search size={11} className="text-white/40" />
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search prospect, club, country…"
              className="bg-transparent text-[12px] outline-none placeholder:text-white/30 w-56"
            />
          </div>
        </div>
      </div>

      {/* Category tabs */}
      <div className="flex items-center gap-px border border-white/[0.08] bg-white/[0.01] rounded-md overflow-hidden">
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            onClick={() => setCat(c.id)}
            className={cx(
              'flex-1 flex items-center justify-center gap-2 px-3 h-9 text-[11px] font-mono transition-colors border-r border-white/[0.05] last:border-r-0',
              cat === c.id
                ? `bg-[#0F0F0F] ${c.tone}`
                : 'text-white/55 hover:text-white/85 hover:bg-white/[0.02]',
            )}
          >
            <span>{c.label}</span>
            <span className="text-[10px] text-white/35 tabular-nums">{counts[c.id] || 0}</span>
          </button>
        ))}
      </div>

      <Section
        title={CATEGORIES.find((c) => c.id === cat)?.label || 'Rankings'}
        action={<span className="text-[10px] font-mono text-white/40">{filtered.length} prospects · {isFinal ? 'final' : 'midterm'} rank</span>}
      >
        {loading && !list.length && (
          <div className="p-6"><Skeleton height={200} /></div>
        )}
        {!loading && list.length === 0 && (
          <div className="px-4 py-8 text-center text-[11px] font-mono text-white/35">
            No rankings published for this category yet.
          </div>
        )}
        {list.length > 0 && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="sticky top-0 bg-[#0C0C0C]/95 backdrop-blur-sm z-[1]">
                  <tr className="text-[10px] font-mono text-white/35 uppercase tracking-wider border-b border-white/[0.06]">
                    <th className="font-normal text-left px-4 h-8 w-[44px]">Rank</th>
                    <th className="font-normal text-left px-2 h-8">Prospect</th>
                    <th className="font-normal text-center px-2 h-8 w-[36px]">Pos</th>
                    <th className="font-normal text-center px-2 h-8 w-[36px]">Sh</th>
                    <th className="font-normal text-right px-2 h-8 w-[60px]">HT</th>
                    <th className="font-normal text-right px-2 h-8 w-[60px]">WT</th>
                    <th className="font-normal text-left px-2 h-8 w-[44px]">DOB</th>
                    <th className="font-normal text-left px-2 h-8">Last Club</th>
                    <th className="font-normal text-right px-4 h-8 w-[80px]">Origin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {display.map((r, i) => {
                    const rank = r.finalRank ?? r.midRank ?? null;
                    return (
                      <tr key={`${r.name}-${i}`} className="hover:bg-white/[0.02]">
                        <td className="px-4 h-10">
                          <span className={cx('text-[14px] font-semibold tabular-nums tracking-tight',
                            rank === 1 ? 'text-amber-300'
                            : rank <= 3 ? 'text-[#FF8A4C]'
                            : rank <= 10 ? 'text-emerald-300'
                            : rank <= 31 ? 'text-white/85'
                            : 'text-white/45'
                          )}>
                            {rank ?? '—'}
                          </span>
                        </td>
                        <td className="px-2">
                          <div className="text-[12px] text-white/85">{r.name}</div>
                          {r.birthDate && (
                            <div className="text-[10px] font-mono text-white/35">b. {fmtDate(r.birthDate)}</div>
                          )}
                        </td>
                        <td className="px-2 text-center text-[10px] font-mono text-white/55">{r.pos || '—'}</td>
                        <td className="px-2 text-center text-[10px] font-mono text-white/45">{r.shoots || '—'}</td>
                        <td className="px-2 text-right text-[11px] font-mono tabular-nums text-white/65">{HEIGHT(r.heightIn)}</td>
                        <td className="px-2 text-right text-[11px] font-mono tabular-nums text-white/65">{r.weightLb || '—'}</td>
                        <td className="px-2">
                          <span className="text-[10px] font-mono text-white/45 tabular-nums">
                            {r.birthDate ? r.birthDate.slice(2, 7).replace('-', '/') : '—'}
                          </span>
                        </td>
                        <td className="px-2">
                          <div className="text-[11px] text-white/75 truncate max-w-[200px]">{r.club || '—'}</div>
                          <div className="text-[9px] font-mono text-white/35">{r.league || ''}</div>
                        </td>
                        <td className="px-4 text-right text-[10px] font-mono text-white/55">
                          {[r.birthState, r.birthCountry].filter(Boolean).join(' · ') || '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {!showAll && filtered.length > 60 && (
              <div className="px-4 py-3 border-t border-white/[0.05] text-center">
                <button
                  onClick={() => setShowAll(true)}
                  className="text-[11px] font-mono text-[#FF8A4C] hover:text-white transition-colors"
                >
                  show all {filtered.length} prospects →
                </button>
              </div>
            )}
          </>
        )}
      </Section>
    </div>
  );
};
