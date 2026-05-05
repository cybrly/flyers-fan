import { useState } from 'react';
import { cx } from '../config.js';
import { Chip, Label, Section, Skeleton } from '../components/primitives.jsx';
import { MiniBar } from '../components/charts.jsx';
import { FlyersMark, TeamLogo } from '../components/Logo.jsx';

const clinchChip = (c) => {
  if (c === 'z') return <Chip tone="amber">PRES</Chip>;
  if (c === 'y') return <Chip tone="amber">DIV</Chip>;
  if (c === 'p') return <Chip tone="green">PLAYOFFS</Chip>;
  if (c === 'x') return <Chip tone="green">PLAYOFFS</Chip>;
  if (c === 'e') return <Chip tone="muted">OUT</Chip>;
  return null;
};

export const Standings = ({ standings }) => {
  const [view, setView] = useState('metro');
  const rows = view === 'metro'
    ? standings?.metro
    : view === 'east'
      ? standings?.east
      : standings?.all;

  const us = standings?.us;
  const data = rows || [];

  return (
    <div className="p-3 md:p-5 space-y-3">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[20px] font-semibold tracking-tight">Standings</h1>
          <p className="text-[12px] text-white/45 mt-1 font-mono">Live standings · refreshed from NHL every 5 min</p>
        </div>
        <div className="flex items-center gap-0.5 p-0.5 border border-white/[0.08] rounded-md bg-white/[0.02]">
          {[
            { id: 'metro', l: 'Metro' },
            { id: 'east',  l: 'East' },
            { id: 'all',   l: 'League' },
          ].map((t) => (
            <button key={t.id} onClick={() => setView(t.id)}
              className={cx('px-3 h-6 text-[11px] font-medium rounded-[4px] transition-colors',
                view === t.id ? 'bg-white/[0.08] text-white' : 'text-white/50 hover:text-white'
              )}>{t.l}</button>
          ))}
        </div>
      </div>

      {us && view === 'metro' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-1 border border-[#F74902]/30 bg-[#F74902]/[0.05] rounded-md p-4 relative overflow-hidden">
            <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full pointer-events-none"
              style={{ background: 'radial-gradient(circle, rgba(247,73,2,0.2), transparent 70%)' }} />
            <div className="relative flex items-center gap-2 mb-3">
              <FlyersMark size={16} />
              <span className="text-[11px] font-medium">Philadelphia Flyers</span>
              <Chip tone="orange">YOU</Chip>
            </div>
            <div className="relative flex items-baseline gap-2">
              <span className="text-[38px] font-semibold tabular-nums tracking-tight text-[#FF8A4C]">#{us.divRank}</span>
              <span className="text-[11px] font-mono text-white/50">of {standings.metro.length}</span>
            </div>
            <div className="relative mt-2 text-[11px] font-mono text-white/55">{us.w}–{us.l} · {us.pts} pts</div>
            <div className="relative mt-3 pt-3 border-t border-white/[0.08] flex items-center justify-between text-[10px] font-mono">
              <span className="text-white/40">GAMES BACK FROM #1</span>
              <span className="text-white/80 tabular-nums">{standings.metro[0].pts - us.pts}</span>
            </div>
          </div>

          <div className="md:col-span-3 border border-white/[0.06] bg-[#0C0C0C]/60 rounded-md p-4 space-y-3">
            <div className="flex items-center justify-between">
              <Label>Playoff Picture · Metro</Label>
              <span className="text-[10px] font-mono text-white/40">Top 3 auto-qualify</span>
            </div>
            <div className="flex items-center gap-1">
              {standings.metro.map((t, i) => {
                const inside = i < 3;
                return (
                  <div key={t.abbr} className={cx('flex-1 flex flex-col items-center gap-1 py-2 rounded-sm transition-colors',
                    t.us ? 'bg-[#F74902]/[0.1]' : 'hover:bg-white/[0.02]',
                  )}>
                    <span className={cx('text-[10px] font-mono tabular-nums',
                      t.us ? 'text-[#FF8A4C]' : inside ? 'text-white/60' : 'text-white/25'
                    )}>{i + 1}</span>
                    <TeamLogo abbr={t.abbr} size={24} className={cx(!inside && !t.us && 'opacity-50')} />
                    <div className="text-[10px] font-mono tabular-nums text-white/40">{t.pts}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <Section title={view === 'metro' ? 'Metropolitan Division' : view === 'east' ? 'Eastern Conference' : 'Full League'}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="sticky">
              <tr className="text-[10px] font-mono text-white/35 uppercase tracking-wider border-b border-white/[0.05]">
                <th className="font-normal text-left px-4 h-9 w-[36px]">#</th>
                <th className="font-normal text-left px-2 h-9">Team</th>
                <th className="font-normal text-right px-2 h-9 w-[44px]">GP</th>
                <th className="font-normal text-right px-2 h-9 w-[44px]">W</th>
                <th className="font-normal text-right px-2 h-9 w-[44px]">L</th>
                <th className="font-normal text-right px-2 h-9 w-[44px]">OT</th>
                <th className="font-normal text-right px-2 h-9 w-[54px]">PTS</th>
                <th className="font-normal text-right px-2 h-9 w-[60px]">P%</th>
                <th className="font-normal text-right px-2 h-9 w-[50px]">DIFF</th>
                <th className="font-normal text-center px-2 h-9 w-[120px]">Points Share</th>
                <th className="font-normal text-right px-4 h-9 w-[110px]">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {!data.length && Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}><td colSpan={11} className="px-4 h-11"><Skeleton className="w-full" height={16} /></td></tr>
              ))}
              {data.map((t, i) => {
                const isUs = t.us;
                const inPlayoffs = view === 'metro' ? i < 3 : false;
                const maxPts = Math.max(1, ...data.map((x) => x.pts));
                return (
                  <tr key={t.abbr} className={cx('transition-colors',
                    isUs ? 'bg-[#F74902]/[0.06] hover:bg-[#F74902]/[0.1]' : 'hover:bg-white/[0.02]',
                  )}>
                    <td className={cx('px-4 h-11 text-[12px] font-mono tabular-nums',
                      isUs ? 'text-[#FF8A4C] font-semibold' : inPlayoffs ? 'text-white/70' : 'text-white/30'
                    )}>{i + 1}</td>
                    <td className="px-2">
                      <div className="flex items-center gap-2.5">
                        <TeamLogo abbr={t.abbr} size={20} />
                        <span className={cx('text-[12px]', isUs ? 'text-white font-medium' : 'text-white/80')}>{t.team}</span>
                        <span className="text-[10px] font-mono text-white/30 hidden md:inline">{t.abbr}</span>
                      </div>
                    </td>
                    <td className="px-2 text-right text-[11px] font-mono tabular-nums text-white/50">{t.gp}</td>
                    <td className="px-2 text-right text-[12px] font-mono tabular-nums font-medium">{t.w}</td>
                    <td className="px-2 text-right text-[12px] font-mono tabular-nums text-white/55">{t.l}</td>
                    <td className="px-2 text-right text-[11px] font-mono tabular-nums text-white/45">{t.ot || 0}</td>
                    <td className="px-2 text-right text-[12px] font-mono tabular-nums font-semibold">{t.pts}</td>
                    <td className="px-2 text-right text-[11px] font-mono tabular-nums text-white/70">{(t.pct * 100).toFixed(1)}</td>
                    <td className={cx('px-2 text-right text-[11px] font-mono tabular-nums',
                      t.diff > 0 ? 'text-emerald-400' : t.diff < 0 ? 'text-red-400' : 'text-white/50'
                    )}>{t.diff > 0 ? '+' : ''}{t.diff}</td>
                    <td className="px-2">
                      <div className="flex items-center gap-2">
                        <MiniBar value={t.pts} max={maxPts} color={isUs ? '#F74902' : inPlayoffs ? '#B0B0B0' : '#3F3F3F'} h={4} />
                      </div>
                    </td>
                    <td className="px-4 text-right">{clinchChip(t.clinched)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
};
