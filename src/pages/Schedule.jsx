import { useMemo, useState } from 'react';
import { cx, OPP_FULL, TEAM_ABBR, arenaMiles } from '../config.js';
import { Label, Section, Skeleton } from '../components/primitives.jsx';
import { TeamLogo } from '../components/Logo.jsx';

// Annotate every finished game with rest days (since the prior PHI game) and
// travel miles (great-circle from the prior game's venue to this one's).
// Schedule arrives newest-first, so the "previous game" sits at index+1.
function enrich(games) {
  return games.map((g, i, arr) => {
    const prev = arr[i + 1];
    if (!prev) return { ...g, restDays: null, travelMiles: null };
    const ms = new Date(g.date).getTime() - new Date(prev.date).getTime();
    const restDays = Math.max(0, Math.floor(ms / 86400000));
    const fromArena = prev.home ? TEAM_ABBR : prev.opp;
    const toArena   = g.home    ? TEAM_ABBR : g.opp;
    const travelMiles = arenaMiles(fromArena, toArena);
    return { ...g, restDays, travelMiles };
  });
}

export const Schedule = ({ schedule, onOpenGame }) => {
  const [filter, setFilter] = useState('all');
  const [scope, setScope] = useState('l20'); // 'l20' | 'all'

  const all = useMemo(() => enrich(schedule?.games || []), [schedule]);
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
    <div className="p-3 md:p-5 space-y-3">
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

      <TravelSummary games={filtered} />


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
                <th className="font-normal text-right px-2 h-9 w-[60px]">Diff</th>
                <th className="font-normal text-center px-2 h-9 w-[80px]">Rest</th>
                <th className="font-normal text-right px-2 h-9 w-[70px]">Travel</th>
                <th className="font-normal text-center px-2 h-9 w-[110px]">Goals</th>
                <th className="font-normal text-center px-2 h-9 w-[100px]">Watch on</th>
                <th className="font-normal text-right px-4 h-9 w-[50px]">Type</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {!all.length && Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}><td colSpan={11} className="px-4 h-11"><Skeleton className="w-full" height={18} /></td></tr>
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
                    <td className="px-2 text-center">
                      {g.restDays != null && (
                        <span className={cx('inline-flex items-center gap-1 text-[10px] font-mono tabular-nums',
                          g.restDays === 0 ? 'text-red-400'
                          : g.restDays === 1 ? 'text-amber-400'
                          : g.restDays >= 3 ? 'text-emerald-400'
                          : 'text-white/55'
                        )}>
                          {g.restDays === 0 ? 'B2B' : `${g.restDays}d`}
                        </span>
                      )}
                    </td>
                    <td className="px-2 text-right">
                      {g.travelMiles != null && (
                        <span className={cx('text-[10px] font-mono tabular-nums',
                          g.travelMiles === 0 ? 'text-white/30'
                          : g.travelMiles >= 1500 ? 'text-amber-400'
                          : 'text-white/55'
                        )}>
                          {g.travelMiles === 0 ? '—' : `${g.travelMiles.toLocaleString()}`}
                        </span>
                      )}
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
                    <td className="px-2 text-center">
                      <BroadcastCell broadcasts={g.tvBroadcasts} />
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

// Travel + rest summary tiles. Sums total miles flown, longest road trip,
// number of B2Bs, and gives a record-when-rested-vs-tired split. Uses the
// enriched filtered games (so it respects the active filter).
const TravelSummary = ({ games }) => {
  if (!games?.length) return null;
  const totalMiles = games.reduce((a, g) => a + (g.travelMiles || 0), 0);
  const b2b = games.filter((g) => g.restDays === 0);
  const restedPlus = games.filter((g) => g.restDays != null && g.restDays >= 2);
  const longTravel = games.filter((g) => (g.travelMiles || 0) >= 1500);
  const b2bRecord = `${b2b.filter((g) => g.w).length}–${b2b.filter((g) => !g.w).length}`;
  const restedRecord = `${restedPlus.filter((g) => g.w).length}–${restedPlus.filter((g) => !g.w).length}`;
  return (
    <Section title="Travel & Rest" action={<span className="text-[10px] font-mono text-white/40">{games.length} games</span>}>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-white/[0.04]">
        <Tile label="Miles Flown" value={totalMiles.toLocaleString()} sub="great-circle" color="#8AB4FF" />
        <Tile label="Back-to-Backs" value={b2b.length} sub={`record ${b2bRecord}`} color="#EF4444" tone={b2b.filter((g) => g.w).length >= b2b.length / 2 ? 'good' : 'bad'} />
        <Tile label="2+ Days Rest" value={restedPlus.length} sub={`record ${restedRecord}`} color="#10B981" tone={restedPlus.filter((g) => g.w).length >= restedPlus.length / 2 ? 'good' : null} />
        <Tile label="Long Travel (1.5k+)" value={longTravel.length} sub="cross-country" color="#F59E0B" />
      </div>
    </Section>
  );
};

// Broadcast network pills with tone colors per network. National
// broadcasts (TNT, ESPN, NHLN, SN, TVAS) get warm/cool emphasis; local
// regional networks fade to neutral. Markets: 'H' home, 'A' away, 'N'
// national. We dedupe networks so a national+regional combo doesn't
// double-print the same logo.
const NETWORK_TONE = {
  TNT: 'text-amber-300', 'TBS': 'text-amber-300',
  ESPN: 'text-red-300', 'ESPN+': 'text-red-300', 'ABC': 'text-red-300', 'HULU': 'text-red-300',
  NHLN: 'text-sky-300', 'NHL.TV': 'text-sky-300',
  SN: 'text-orange-300', 'SN1': 'text-orange-300', 'SN360': 'text-orange-300', 'SNNOW': 'text-orange-300',
  TVAS: 'text-violet-300', 'TVAS2': 'text-violet-300',
  CBC: 'text-red-300/80',
};
const BroadcastCell = ({ broadcasts }) => {
  if (!broadcasts?.length) return <span className="text-[10px] font-mono text-white/25">—</span>;
  const seen = new Set();
  const networks = broadcasts.filter((b) => {
    if (!b.network || seen.has(b.network)) return false;
    seen.add(b.network);
    return true;
  });
  return (
    <span className="flex items-center justify-center gap-1 flex-wrap">
      {networks.slice(0, 3).map((b) => (
        <span
          key={b.network}
          className={cx(
            'text-[9px] font-mono font-medium px-1 py-[1px] border rounded-[3px]',
            NETWORK_TONE[b.network] || 'text-white/55',
            'border-current/30 bg-white/[0.02]',
          )}
          title={`${b.market === 'N' ? 'National' : b.market === 'H' ? 'Home' : 'Away'} · ${b.country || ''}`}
        >
          {b.network}
        </span>
      ))}
    </span>
  );
};

const Tile = ({ label, value, sub, color, tone }) => (
  <div className="bg-[#0A0A0A] px-3 py-3">
    <div className="flex items-center gap-1.5">
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
      <span className="text-[9px] font-mono text-white/40 uppercase tracking-wider">{label}</span>
    </div>
    <div className={cx('text-[20px] font-semibold tabular-nums tracking-tight mt-1',
      tone === 'good' ? 'text-emerald-400' : tone === 'bad' ? 'text-red-400' : 'text-white'
    )} style={tone ? {} : { color }}>
      {value}
    </div>
    {sub && <div className="text-[9px] font-mono text-white/30 mt-0.5">{sub}</div>}
  </div>
);

