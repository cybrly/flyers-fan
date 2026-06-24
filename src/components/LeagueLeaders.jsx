import { useState } from 'react';
import { Trophy } from 'lucide-react';
import { cx, TEAM_ABBR } from '../config.js';
import { Section, Skeleton } from './primitives.jsx';
import { TeamLogo } from './Logo.jsx';
import { Headshot } from './Headshot.jsx';
import { PlayerLink } from './PlayerLink.jsx';

// League leaders panel — pulls from /v1/skater-stats-leaders and
// /v1/goalie-stats-leaders. Tabs for skater categories (Points / Goals /
// Assists / Plus-Minus) and goalie categories (Save% / GAA / Wins).
// Click any player to open their full profile.

const SKATER_TABS = [
  { id: 'points',    label: 'Points',     fmt: (v) => v },
  { id: 'goals',     label: 'Goals',      fmt: (v) => v },
  { id: 'assists',   label: 'Assists',    fmt: (v) => v },
  { id: 'plusMinus', label: '+/–',        fmt: (v) => (v > 0 ? `+${v}` : v) },
];
const GOALIE_TABS = [
  { id: 'savePctg',             label: 'SV%', fmt: (v) => v != null ? (v * 100).toFixed(1) + '%' : '—' },
  { id: 'goalsAgainstAverage',  label: 'GAA', fmt: (v) => v != null ? v.toFixed(2) : '—' },
  { id: 'wins',                 label: 'Wins', fmt: (v) => v },
];

export const LeagueLeaders = ({ data }) => {
  const [side, setSide] = useState('skaters'); // skaters | goalies
  const tabs = side === 'skaters' ? SKATER_TABS : GOALIE_TABS;
  const [cat, setCat] = useState(tabs[0].id);

  // When the user flips skater↔goalie, jump to the first valid category.
  const switchSide = (s) => {
    setSide(s);
    setCat(s === 'skaters' ? 'points' : 'savePctg');
  };

  if (!data) {
    return (
      <Section title={<span className="flex items-center gap-2"><Trophy size={12} className="text-amber-400" /> League Leaders</span>}>
        <div className="p-4"><Skeleton height={120} /></div>
      </Section>
    );
  }

  const rows = data[cat] || [];
  const tab = tabs.find((t) => t.id === cat) || tabs[0];

  return (
    <Section
      title={<span className="flex items-center gap-2"><Trophy size={12} className="text-amber-400" /> League Leaders</span>}
      action={
        <div className="flex items-center gap-2">
          <div className="flex border border-white/[0.08] rounded-md overflow-hidden">
            {['skaters', 'goalies'].map((s) => (
              <button
                key={s}
                onClick={() => switchSide(s)}
                className={cx(
                  'px-2.5 h-6 text-[10px] font-mono capitalize transition-colors',
                  side === s ? 'bg-white/[0.08] text-white' : 'text-white/45 hover:text-white/75',
                )}
              >{s}</button>
            ))}
          </div>
        </div>
      }
    >
      {/* Category tabs */}
      <div className="flex items-center gap-px bg-white/[0.04] border-b border-white/[0.05] overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setCat(t.id)}
            className={cx(
              'px-3 h-8 text-[11px] font-mono whitespace-nowrap transition-colors',
              cat === t.id
                ? 'bg-[#0A0A0A] text-[var(--team-accent)]'
                : 'bg-[#0C0C0C]/40 text-white/55 hover:text-white/80'
            )}
          >{t.label}</button>
        ))}
      </div>

      <div className="divide-y divide-white/[0.04]">
        {rows.length === 0 && (
          <div className="px-4 py-6 text-center text-[11px] font-mono text-white/35">
            No data for this category yet.
          </div>
        )}
        {rows.map((p, i) => {
          const isUs = p.team === TEAM_ABBR;
          return (
            <div key={p.id} className={cx(
              'grid grid-cols-[28px_1fr_auto_auto] items-center gap-2 px-3 h-10',
              isUs ? 'bg-[var(--team-primary)]/[0.05]' : 'hover:bg-white/[0.02]',
            )}>
              <span className={cx('text-[11px] font-mono tabular-nums',
                i === 0 ? 'text-amber-300 font-semibold'
                : i === 1 ? 'text-white/65'
                : i === 2 ? 'text-orange-300/70'
                : 'text-white/35'
              )}>{i + 1}</span>
              <span className="flex items-center gap-2 min-w-0">
                <Headshot src={p.headshot} num={p.num} size={22} />
                <PlayerLink playerId={p.id}>
                  <span className={cx('text-[12px] truncate', isUs && 'text-[var(--team-accent)] font-medium')}>
                    {p.name}
                  </span>
                </PlayerLink>
                {p.pos && <span className="text-[9px] font-mono text-white/30">{p.pos}</span>}
              </span>
              <span className="flex items-center gap-1.5 text-[10px] font-mono text-white/45 shrink-0">
                <TeamLogo abbr={p.team} size={14} />
                {p.team}
              </span>
              <span className={cx('text-[14px] font-mono tabular-nums tracking-tight font-semibold ml-2 shrink-0',
                isUs ? 'text-[var(--team-accent)]' : 'text-white'
              )}>
                {tab.fmt(p.value)}
              </span>
            </div>
          );
        })}
      </div>
    </Section>
  );
};
