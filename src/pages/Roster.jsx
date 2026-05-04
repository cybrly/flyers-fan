import { useState } from 'react';
import { cx } from '../config.js';
import { Section, Skeleton } from '../components/primitives.jsx';
import { PlayerLink } from '../components/PlayerLink.jsx';

const HEIGHT = (inches) => inches ? `${Math.floor(inches / 12)}'${inches % 12}"` : '—';

const RosterTable = ({ players, showSaves = false }) => (
  <table className="w-full">
    <thead>
      <tr className="text-[10px] font-mono text-white/35 uppercase tracking-wider border-b border-white/[0.05]">
        <th className="font-normal text-left px-4 h-8 w-[36px]">#</th>
        <th className="font-normal text-left px-2 h-8">Player</th>
        <th className="font-normal text-center px-2 h-8 w-[40px]">Pos</th>
        <th className="font-normal text-center px-2 h-8 w-[40px]">{showSaves ? 'C' : 'S'}</th>
        <th className="font-normal text-right px-2 h-8 w-[44px]">HT</th>
        <th className="font-normal text-right px-2 h-8 w-[44px]">WT</th>
        <th className="font-normal text-right px-2 h-8 w-[44px]">Age</th>
        <th className="font-normal text-right px-4 h-8 w-[60px]">Birth</th>
      </tr>
    </thead>
    <tbody className="divide-y divide-white/[0.04]">
      {players.map((p) => (
        <tr key={p.id} className="hover:bg-white/[0.02]">
          <td className="px-4 text-right text-[10px] font-mono tabular-nums text-white/30 h-9">{p.num || '—'}</td>
          <td className="px-2 text-[12px] text-white/85">
            <PlayerLink playerId={p.id}>{p.name}</PlayerLink>
          </td>
          <td className="px-2 text-center text-[10px] font-mono text-white/45">{p.pos}</td>
          <td className="px-2 text-center text-[10px] font-mono text-white/45">{p.shoots || '—'}</td>
          <td className="px-2 text-right text-[11px] font-mono text-white/65 tabular-nums">{HEIGHT(p.heightIn)}</td>
          <td className="px-2 text-right text-[11px] font-mono text-white/65 tabular-nums">{p.weightLb || '—'}</td>
          <td className="px-2 text-right text-[11px] font-mono tabular-nums text-white/65">{p.age ?? '—'}</td>
          <td className="px-4 text-right text-[10px] font-mono text-white/40 truncate max-w-[100px]">{p.birthCountry || '—'}</td>
        </tr>
      ))}
    </tbody>
  </table>
);

const Leaderboard = ({ rows, columns, title }) => (
  <Section title={title}>
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="text-[10px] font-mono text-white/35 uppercase tracking-wider border-b border-white/[0.05]">
            <th className="font-normal text-left px-4 h-8 w-[28px]">#</th>
            <th className="font-normal text-left px-2 h-8">Player</th>
            {columns.map((c) => (
              <th key={c.k} className="font-normal text-right px-2 h-8 w-[44px]">{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.04]">
          {rows.map((p, i) => (
            <tr key={p.id} className="hover:bg-white/[0.02]">
              <td className={cx('px-4 text-left text-[10px] font-mono tabular-nums h-9',
                i < 3 ? 'text-[#FF8A4C]' : 'text-white/30'
              )}>{i + 1}</td>
              <td className="px-2 text-[12px] text-white/85">
                <span className="flex items-center gap-1.5">
                  <PlayerLink playerId={p.id}>{p.name}</PlayerLink>
                  {p.pos && <span className="text-[10px] font-mono text-white/35">{p.pos}</span>}
                </span>
              </td>
              {columns.map((c) => (
                <td key={c.k} className={cx('px-2 text-right text-[11px] font-mono tabular-nums',
                  c.highlight && p[c.k] != null && p[c.k] > 0 ? 'text-white font-medium' : 'text-white/65'
                )}>{c.fmt ? c.fmt(p[c.k]) : (p[c.k] ?? '—')}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </Section>
);

export const Roster = ({ roster, clubStats }) => {
  const [view, setView] = useState('forwards');
  if (!roster) {
    return (
      <div className="p-4 md:p-6 space-y-4">
        <Skeleton height={24} className="w-48" />
        <Skeleton height={400} />
      </div>
    );
  }
  const list = view === 'forwards' ? roster.forwards : view === 'defense' ? roster.defense : roster.goalies;
  const pointLeaders = clubStats ? [...clubStats.skaters].sort((a, b) => b.pts - a.pts).slice(0, 10) : [];
  const goalieLeaders = clubStats ? [...clubStats.goalies].sort((a, b) => (b.savePct ?? 0) - (a.savePct ?? 0)) : [];

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[20px] font-semibold tracking-tight">Roster</h1>
          <p className="text-[12px] text-white/45 mt-1 font-mono">
            Philadelphia Flyers · {roster.forwards.length}F · {roster.defense.length}D · {roster.goalies.length}G
          </p>
        </div>
        <div className="flex items-center gap-0.5 p-0.5 border border-white/[0.08] rounded-md bg-white/[0.02]">
          {[
            { id: 'forwards', l: `Forwards (${roster.forwards.length})` },
            { id: 'defense',  l: `Defense (${roster.defense.length})` },
            { id: 'goalies',  l: `Goalies (${roster.goalies.length})` },
          ].map((t) => (
            <button key={t.id} onClick={() => setView(t.id)}
              className={cx('px-2.5 h-6 text-[11px] font-medium rounded-[4px] transition-colors',
                view === t.id ? 'bg-white/[0.08] text-white' : 'text-white/50 hover:text-white'
              )}>{t.l}</button>
          ))}
        </div>
      </div>

      {clubStats && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Leaderboard
            title="Top Scorers"
            rows={pointLeaders}
            columns={[
              { k: 'gp', label: 'GP' },
              { k: 'g', label: 'G', highlight: true },
              { k: 'a', label: 'A' },
              { k: 'pts', label: 'P', highlight: true },
              { k: 'pm', label: '+/–', fmt: (v) => v > 0 ? `+${v}` : v },
            ]}
          />
          <Leaderboard
            title="Goalie Stats"
            rows={goalieLeaders}
            columns={[
              { k: 'gp', label: 'GP' },
              { k: 'w', label: 'W', highlight: true },
              { k: 'savePct', label: 'SV%', fmt: (v) => v != null ? `${v}%` : '—' },
              { k: 'gaa', label: 'GAA', fmt: (v) => v != null ? v.toFixed(2) : '—' },
              { k: 'so', label: 'SO' },
            ]}
          />
        </div>
      )}

      <Section title={view === 'forwards' ? 'Forwards' : view === 'defense' ? 'Defense' : 'Goalies'}>
        <div className="overflow-x-auto">
          <RosterTable players={list} showSaves={view === 'goalies'} />
        </div>
      </Section>
    </div>
  );
};
