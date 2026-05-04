import { useState } from 'react';
import { cx, OPP_FULL } from '../config.js';
import { Label, Section, Skeleton } from '../components/primitives.jsx';
import { TeamLogo } from '../components/Logo.jsx';

export const Schedule = ({ schedule, onOpenGame }) => {
  const [filter, setFilter] = useState('all');
  const [scope, setScope] = useState('l20'); // 'l20' | 'all'

  const all = schedule?.games || [];
  const base = scope === 'l20' ? all.slice(0, 20) : all;

  const filtered = base.filter((g) => {
    if (filter === 'home')   return g.home;
    if (filter === 'away')   return !g.home;
    if (filter === 'wins')   return g.w;
    if (filter === 'losses') return !g.w;
    return true;
  });

  const { gf, ga } = filtered.reduce((a, g) => ({ gf: a.gf + g.us, ga: a.ga + g.them }), { gf: 0, ga: 0 });
  const wins = filtered.filter((g) => g.w).length;

  const FILTERS = [
    { id: 'all', label: 'All' }, { id: 'wins', label: 'Wins' }, { id: 'losses', label: 'Losses' },
    { id: 'home', label: 'Home' }, { id: 'away', label: 'Away' },
  ];

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[20px] font-semibold tracking-tight">Schedule</h1>
          <p className="text-[12px] text-white/45 mt-1 font-mono">Game log · {scope === 'l20' ? 'last 20 games' : `full season (${all.length})`} · live data</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0.5 p-0.5 border border-white/[0.08] rounded-md bg-white/[0.02]">
            {[{ id: 'l20', l: 'L20' }, { id: 'all', l: 'Season' }].map((s) => (
              <button key={s.id} onClick={() => setScope(s.id)}
                className={cx('px-2.5 h-6 text-[11px] font-medium rounded-[4px] transition-colors',
                  scope === s.id ? 'bg-white/[0.08] text-white' : 'text-white/50 hover:text-white'
                )}>{s.l}</button>
            ))}
          </div>
          <div className="flex items-center gap-0.5 p-0.5 border border-white/[0.08] rounded-md bg-white/[0.02]">
            {FILTERS.map((f) => (
              <button key={f.id} onClick={() => setFilter(f.id)}
                className={cx('px-2.5 h-6 text-[11px] font-medium rounded-[4px] transition-colors',
                  filter === f.id ? 'bg-white/[0.08] text-white' : 'text-white/50 hover:text-white'
                )}>{f.label}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { l: 'Games', v: filtered.length },
          { l: 'Record', v: `${wins}–${filtered.length - wins}` },
          { l: 'Goals For', v: gf, sub: filtered.length ? (gf / filtered.length).toFixed(2) + ' /gm' : '', tone: 'orange' },
          { l: 'Goals Ag.', v: ga, sub: filtered.length ? (ga / filtered.length).toFixed(2) + ' /gm' : '' },
          { l: 'Diff', v: `${gf - ga >= 0 ? '+' : ''}${gf - ga}`, tone: gf - ga >= 0 ? 'up' : 'down' },
        ].map((s) => (
          <div key={s.l} className="border border-white/[0.06] bg-[#0C0C0C]/60 rounded-md p-3">
            <Label>{s.l}</Label>
            <div className={cx('text-[20px] font-semibold mt-1 tabular-nums',
              s.tone === 'orange' ? 'text-[#FF8A4C]' : s.tone === 'up' ? 'text-[#FF8A4C]' : s.tone === 'down' ? 'text-red-400' : ''
            )}>{s.v}</div>
            {s.sub && <div className="text-[10px] font-mono text-white/40 mt-0.5">{s.sub}</div>}
          </div>
        ))}
      </div>

      <Section>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="sticky">
              <tr className="text-[10px] font-mono text-white/35 uppercase tracking-wider border-b border-white/[0.05]">
                <th className="font-normal text-left px-4 h-9 w-[44px]">Res</th>
                <th className="font-normal text-left px-2 h-9 w-[80px]">Date</th>
                <th className="font-normal text-left px-2 h-9">Opponent</th>
                <th className="font-normal text-center px-2 h-9 w-[60px]">Site</th>
                <th className="font-normal text-right px-2 h-9 w-[90px]">Score</th>
                <th className="font-normal text-right px-2 h-9 w-[80px]">Diff</th>
                <th className="font-normal text-center px-2 h-9 w-[120px]">Goals</th>
                <th className="font-normal text-right px-4 h-9 w-[50px]">Type</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {!all.length && Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}><td colSpan={8} className="px-4 h-11"><Skeleton className="w-full" height={18} /></td></tr>
              ))}
              {filtered.map((g) => {
                const diff = g.us - g.them;
                const max = Math.max(g.us, g.them);
                return (
                  <tr
                    key={g.id}
                    onClick={() => onOpenGame?.(g.id)}
                    className="hover:bg-white/[0.03] transition-colors cursor-pointer"
                  >
                    <td className="px-4 h-11">
                      <span className={cx(
                        'inline-flex items-center justify-center w-[22px] h-[18px] text-[10px] font-mono font-semibold rounded-[3px]',
                        g.w ? 'bg-[#F74902]/15 text-[#FF8A4C] border border-[#F74902]/30'
                            : 'bg-white/[0.03] text-white/40 border border-white/10'
                      )}>{g.w ? 'W' : 'L'}</span>
                    </td>
                    <td className="px-2 text-[11px] font-mono text-white/55 tabular-nums">{g.label}</td>
                    <td className="px-2">
                      <div className="flex items-center gap-2">
                        <TeamLogo abbr={g.opp} size={18} />
                        <span className="text-[12px] text-white/85">{OPP_FULL[g.opp] || g.oppName}</span>
                        <span className="text-[10px] font-mono text-white/30">{g.opp}</span>
                      </div>
                    </td>
                    <td className="px-2 text-center text-[10px] font-mono text-white/45">{g.home ? 'HOME' : 'AWAY'}</td>
                    <td className="px-2 text-right font-mono tabular-nums text-[13px]">
                      <span className={g.w ? 'text-[#FF8A4C] font-medium' : 'text-white/80'}>{g.us}</span>
                      <span className="text-white/25 mx-1">–</span>
                      <span className={g.w ? 'text-white/50' : 'text-white/80 font-medium'}>{g.them}</span>
                    </td>
                    <td className="px-2 text-right">
                      <span className={cx('text-[11px] font-mono tabular-nums',
                        diff > 0 ? 'text-emerald-400' : diff < 0 ? 'text-red-400' : 'text-white/40'
                      )}>{diff > 0 ? '+' : ''}{diff}</span>
                    </td>
                    <td className="px-2">
                      <div className="flex items-center justify-center gap-[2px]">
                        {Array.from({ length: max }).map((_, idx) => (
                          <div key={`u${idx}`} className={cx('w-1 h-3', idx < g.us ? 'bg-[#F74902]' : 'bg-white/[0.06]')} />
                        ))}
                        <div className="w-1.5" />
                        {Array.from({ length: max }).map((_, idx) => (
                          <div key={`t${idx}`} className={cx('w-1 h-3', idx < g.them ? 'bg-white/40' : 'bg-white/[0.06]')} />
                        ))}
                      </div>
                    </td>
                    <td className="px-4 text-right">
                      <span className="text-[10px] font-mono text-white/35">{g.gameType === 3 ? 'PO' : 'REG'}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {all.length > 0 && filtered.length === 0 && (
            <div className="py-12 text-center text-[12px] font-mono text-white/35">No games match.</div>
          )}
        </div>
      </Section>
    </div>
  );
};
