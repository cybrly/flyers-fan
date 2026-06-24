import { useMemo, useState } from 'react';
import { cx, OPP_FULL, TEAM_ABBR, arenaMiles, fmtTime } from '../config.js';
import { Label, Section, Skeleton } from '../components/primitives.jsx';
import { TeamLogo } from '../components/Logo.jsx';
import { TeamLogoBg } from '../components/Watermark.jsx';
import { WatchabilityPanel } from '../components/WatchabilityPanel.jsx';

// Fatigue score 1–5 from rest days + travel miles.
function fatigueScore(restDays, travelMiles) {
  if (restDays == null) return null;
  const miles = travelMiles || 0;
  if (restDays === 0 && miles >= 500) return 5;
  if (restDays === 0)                 return 4;
  if (restDays === 1)                 return 3;
  if (restDays === 2 && miles < 1000) return 2;
  if (restDays >= 3  && miles < 500)  return 1;
  return 2; // fallback: 2+ rest, 1000+ miles
}
const FATIGUE_LABEL = { 1: 'Fresh', 2: 'Normal', 3: 'Tired', 4: 'Exhausted', 5: 'Brutal' };
const FATIGUE_COLOR = { 1: 'text-emerald-400', 2: 'text-emerald-400', 3: 'text-amber-400', 4: 'text-red-400', 5: 'text-red-400' };

// Annotate every finished game with rest days (since the prior PHI game),
// travel miles (great-circle from the prior game's venue to this one's),
// fatigue score, and 3-in-4 flag. Schedule arrives newest-first, so the
// "previous game" sits at index+1.
function enrich(games) {
  return games.map((g, i, arr) => {
    const prev = arr[i + 1];
    if (!prev) return { ...g, restDays: null, travelMiles: null, fatigue: null, threeInFour: false };
    const ms = new Date(g.date).getTime() - new Date(prev.date).getTime();
    const restDays = Math.max(0, Math.floor(ms / 86400000));
    const fromArena = prev.home ? TEAM_ABBR : prev.opp;
    const toArena   = g.home    ? TEAM_ABBR : g.opp;
    const travelMiles = arenaMiles(fromArena, toArena);
    const fatigue = fatigueScore(restDays, travelMiles);
    // 3-in-4: this game is the 3rd game within a 4-day span.
    let threeInFour = false;
    if (i + 2 < arr.length) {
      const twoPrev = arr[i + 2];
      const span = (new Date(g.date).getTime() - new Date(twoPrev.date).getTime()) / 86400000;
      if (span <= 3) threeInFour = true;
    }
    return { ...g, restDays, travelMiles, fatigue, threeInFour };
  });
}

export const Schedule = ({ schedule, monthSchedule, onOpenGame, scoreboard, standings, leagueLeaders }) => {
  const [filter, setFilter] = useState('all');
  const [scope, setScope] = useState('l20'); // 'l20' | 'all'
  const [view, setView] = useState('table');  // 'table' | 'calendar'

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
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[20px] font-semibold tracking-tight">Schedule</h1>
          <p className="text-[12px] text-white/45 mt-1 font-mono">{view === 'calendar' ? 'Calendar · current month' : `Game log · ${scope === 'l20' ? 'last 20 games' : `full season (${all.length})`}`} · live data</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0.5 p-0.5 border border-white/[0.08] rounded-md bg-white/[0.02]">
            {[
              { id: 'table',    l: 'Table' },
              { id: 'calendar', l: 'Calendar' },
            ].map((v) => (
              <button key={v.id} onClick={() => setView(v.id)}
                className={cx('px-2.5 h-6 text-[11px] font-medium rounded-[4px] transition-colors',
                  view === v.id ? 'bg-[var(--team-primary)]/15 text-[var(--team-accent)]' : 'text-white/50 hover:text-white'
                )}>{v.l}</button>
            ))}
          </div>
          {view === 'table' && (
            <>
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
            </>
          )}
        </div>
      </div>

      {view === 'calendar' ? (
        <CalendarView monthSchedule={monthSchedule} onOpenGame={onOpenGame} />
      ) : (
      <>
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
              s.tone === 'orange' ? 'text-[var(--team-accent)]' : s.tone === 'up' ? 'text-[var(--team-accent)]' : s.tone === 'down' ? 'text-red-400' : ''
            )}>{s.v}</div>
            {s.sub && <div className="text-[10px] font-mono text-white/40 mt-0.5">{s.sub}</div>}
          </div>
        ))}
      </div>

      <TravelSummary games={filtered} />

      <WatchabilityPanel
        scoreboard={scoreboard}
        standings={standings}
        leagueLeaders={leagueLeaders}
        ourTeamAbbr={TEAM_ABBR}
      />

      <Section>
        {/* Tablet/desktop — full 11-column table. Hidden on phones in
            favor of the stacked card layout below. */}
        <div className="hidden sm:block overflow-x-auto">
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
                <th className="font-normal text-center px-2 h-9 w-[70px]">Fatigue</th>
                <th className="font-normal text-center px-2 h-9 w-[110px]">Goals</th>
                <th className="font-normal text-center px-2 h-9 w-[140px]">Watch on</th>
                <th className="font-normal text-right px-4 h-9 w-[50px]">Type</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {!all.length && Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}><td colSpan={12} className="px-4 h-11"><Skeleton className="w-full" height={18} /></td></tr>
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
                        g.w ? 'bg-[var(--team-primary)]/15 text-[var(--team-accent)] border border-[var(--team-primary)]/30'
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
                      <span className={g.w ? 'text-[var(--team-accent)] font-medium' : 'text-white/80'}>{g.us}</span>
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
                    <td className="px-2 text-center">
                      {g.fatigue != null && (
                        <span className={cx('inline-flex items-center gap-1 text-[10px] font-mono tabular-nums', FATIGUE_COLOR[g.fatigue])}>
                          {g.fatigue} {FATIGUE_LABEL[g.fatigue]}
                          {g.threeInFour && <span className="text-red-400" title="3rd game in 4 nights">3in4</span>}
                        </span>
                      )}
                    </td>
                    <td className="px-2">
                      <div className="flex items-center justify-center gap-[2px]">
                        {Array.from({ length: max }).map((_, idx) => (
                          <div key={`u${idx}`} className={cx('w-1 h-3', idx < g.us ? 'bg-[var(--team-primary)]' : 'bg-white/[0.06]')} />
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

        {/* Phone — stacked card per game. Two-line layout: result + date
            + opp + score on top, supporting metadata (site / diff / rest
            / travel / type) below. Goal bars trail the second line. */}
        <div className="sm:hidden divide-y divide-white/[0.04]">
          {!all.length && Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="px-4 py-3"><Skeleton className="w-full" height={20} /></div>
          ))}
          {filtered.map((g) => {
            const diff = g.us - g.them;
            const max = Math.max(g.us, g.them);
            return (
              <button
                key={g.id}
                onClick={() => onOpenGame?.(g.id)}
                className="relative overflow-hidden w-full text-left px-4 py-3 flex flex-col gap-1.5 hover:bg-white/[0.03] transition-colors"
              >
                <TeamLogoBg abbr={g.opp} size={96} opacity={0.06} position="bottom-right" />
                <div className="relative flex items-center gap-2">
                  <span className={cx(
                    'inline-flex items-center justify-center w-[22px] h-[18px] text-[10px] font-mono font-semibold rounded-[3px] shrink-0',
                    g.w ? 'bg-[var(--team-primary)]/15 text-[var(--team-accent)] border border-[var(--team-primary)]/30'
                        : 'bg-white/[0.03] text-white/40 border border-white/10'
                  )}>{g.w ? 'W' : 'L'}</span>
                  <TeamLogo abbr={g.opp} size={18} />
                  <span className="text-[10px] font-mono text-white/35 uppercase shrink-0">{g.home ? 'vs' : '@'}</span>
                  <span className="text-[14px] text-white/90 truncate flex-1">{OPP_FULL[g.opp] || g.oppName}</span>
                  <span className="font-mono tabular-nums text-[15px] shrink-0">
                    <span className={g.w ? 'text-[var(--team-accent)] font-medium' : 'text-white/80'}>{g.us}</span>
                    <span className="text-white/30 mx-1">–</span>
                    <span className={g.w ? 'text-white/50' : 'text-white/80 font-medium'}>{g.them}</span>
                  </span>
                </div>
                <div className="relative flex items-center gap-3 text-[10px] font-mono text-white/45 tabular-nums pl-7 flex-wrap">
                  <span>{g.label}</span>
                  <span className={cx(
                    diff > 0 ? 'text-emerald-400' : diff < 0 ? 'text-red-400' : 'text-white/40'
                  )}>{diff > 0 ? '+' : ''}{diff}</span>
                  {g.restDays != null && (
                    <span className={cx(
                      g.restDays === 0 ? 'text-red-400'
                      : g.restDays === 1 ? 'text-amber-400'
                      : g.restDays >= 3 ? 'text-emerald-400'
                      : 'text-white/55'
                    )}>{g.restDays === 0 ? 'B2B' : `${g.restDays}d rest`}</span>
                  )}
                  {g.travelMiles > 0 && (
                    <span className={cx(g.travelMiles >= 1500 ? 'text-amber-400' : 'text-white/40')}>
                      {g.travelMiles.toLocaleString()}mi
                    </span>
                  )}
                  {g.fatigue != null && (
                    <span className={cx(FATIGUE_COLOR[g.fatigue])}>
                      {FATIGUE_LABEL[g.fatigue]}
                      {g.threeInFour && ' 3in4'}
                    </span>
                  )}
                  {g.gameType === 3 && <span className="text-[var(--team-accent)]">PO</span>}
                  <span className="ml-auto flex items-center gap-[2px]">
                    {Array.from({ length: max }).map((_, idx) => (
                      <span key={`u${idx}`} className={cx('w-1 h-3', idx < g.us ? 'bg-[var(--team-primary)]' : 'bg-white/[0.06]')} />
                    ))}
                    <span className="w-1" />
                    {Array.from({ length: max }).map((_, idx) => (
                      <span key={`t${idx}`} className={cx('w-1 h-3', idx < g.them ? 'bg-white/40' : 'bg-white/[0.06]')} />
                    ))}
                  </span>
                </div>
              </button>
            );
          })}
          {all.length > 0 && filtered.length === 0 && (
            <div className="py-12 text-center text-[12px] font-mono text-white/35">No games match.</div>
          )}
        </div>
      </Section>
      </>
      )}
    </div>
  );
};

// Calendar view — render the current month as a 7-column grid with each
// game pinned to its date cell. Source: /v1/club-schedule/{TEAM}/month/now,
// adapted to a flat games array with us/them/state/etc. Each cell shows the
// opponent logo, score (or start time if upcoming), W/L pill, OT/SO tag,
// playoff series progress, and links to NHL.com video recap when present.
const CalendarView = ({ monthSchedule, onOpenGame }) => {
  if (!monthSchedule) {
    return <Section><div className="p-6"><Skeleton height={280} /></div></Section>;
  }
  const games = monthSchedule.games || [];
  // Group games by ISO date string for O(1) cell lookup.
  const byDate = {};
  for (const g of games) {
    if (!byDate[g.date]) byDate[g.date] = [];
    byDate[g.date].push(g);
  }

  // Build the calendar grid for the current month. currentMonth is YYYY-MM;
  // anchor on the 1st and pad leading/trailing cells to a full week grid.
  const [yr, mo] = (monthSchedule.currentMonth || new Date().toISOString().slice(0, 7)).split('-').map(Number);
  const firstOfMonth = new Date(yr, mo - 1, 1);
  const lastOfMonth = new Date(yr, mo, 0);
  const startWeekday = firstOfMonth.getDay(); // 0=Sun
  const daysInMonth = lastOfMonth.getDate();

  // 6 rows × 7 cols = max 42 cells handles every month layout
  const cells = [];
  for (let i = 0; i < 42; i++) {
    const dayNum = i - startWeekday + 1;
    if (dayNum < 1 || dayNum > daysInMonth) {
      cells.push({ empty: true });
    } else {
      const dateStr = `${yr}-${String(mo).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      cells.push({ dayNum, dateStr, games: byDate[dateStr] || [] });
    }
  }

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const monthLabel = new Date(yr, mo - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <Section
      title={monthLabel}
      action={<span className="text-[10px] font-mono text-white/40">{games.length} game{games.length === 1 ? '' : 's'}</span>}
    >
      <div className="grid grid-cols-7 gap-px bg-white/[0.05] border-b border-white/[0.05]">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <div key={d} className="bg-[#0A0A0A] px-2 h-7 flex items-center text-[10px] font-mono uppercase tracking-wider text-white/40">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-px bg-white/[0.04]">
        {cells.map((c, i) => {
          if (c.empty) return <div key={i} className="bg-[#070707] min-h-[88px]" />;
          const isToday = c.dateStr === todayStr;
          return (
            <div key={i} className={cx(
              'min-h-[88px] p-1.5',
              isToday ? 'bg-[var(--team-primary)]/[0.08] ring-1 ring-[var(--team-primary)]/30 ring-inset' : 'bg-[#0A0A0A]',
            )}>
              <div className="flex items-center justify-between mb-1">
                <span className={cx('text-[10px] font-mono tabular-nums',
                  isToday ? 'text-[var(--team-accent)] font-semibold' : 'text-white/45'
                )}>{c.dayNum}</span>
              </div>
              {c.games.map((g) => <CalendarGame key={g.id} g={g} onOpen={onOpenGame} />)}
            </div>
          );
        })}
      </div>
    </Section>
  );
};

const CalendarGame = ({ g, onOpen }) => {
  const isFinal = g.us != null && g.them != null;
  const won = g.w === true;
  const lost = g.w === false;
  return (
    <button
      onClick={() => onOpen?.(g.id)}
      className={cx(
        'w-full text-left rounded-sm px-1.5 py-1 mb-1 last:mb-0 border transition-colors',
        won
          ? 'border-emerald-500/30 bg-emerald-500/[0.06] hover:bg-emerald-500/[0.10]'
          : lost
            ? 'border-red-500/25 bg-red-500/[0.05] hover:bg-red-500/[0.08]'
            : 'border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05]',
      )}
    >
      <div className="flex items-center gap-1 min-w-0">
        <TeamLogo abbr={g.opp} size={12} />
        <span className="text-[10px] font-mono text-white/60 shrink-0">{g.home ? 'vs' : '@'}</span>
        <span className="text-[10px] font-mono text-white/85 truncate flex-1">{g.opp}</span>
        {g.gameType === 3 && g.seriesStatus && (
          <span className="text-[8px] font-mono text-amber-300/80">G{g.seriesStatus.gameNumberOfSeries}</span>
        )}
      </div>
      <div className="flex items-center justify-between mt-0.5 text-[10px] font-mono tabular-nums">
        {isFinal ? (
          <>
            <span className={cx(won ? 'text-emerald-400 font-semibold' : lost ? 'text-red-400/85' : 'text-white/65')}>
              {g.us}–{g.them}
            </span>
            {g.lastPeriodType && g.lastPeriodType !== 'REG' && (
              <span className="text-amber-300/80">{g.lastPeriodType}</span>
            )}
          </>
        ) : (
          <span className="text-white/55">{fmtTime(g.startUTC)}</span>
        )}
      </div>
    </button>
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
  const threeInFourGames = games.filter((g) => g.threeInFour);
  const threeInFourRecord = `${threeInFourGames.filter((g) => g.w).length}–${threeInFourGames.filter((g) => !g.w).length}`;
  // Win% by fatigue level (1-5).
  const byFatigue = [1, 2, 3, 4, 5].map((lvl) => {
    const g = games.filter((x) => x.fatigue === lvl);
    const w = g.filter((x) => x.w).length;
    return { lvl, n: g.length, w, pct: g.length ? ((w / g.length) * 100).toFixed(0) : '—' };
  });
  return (
    <Section title="Travel & Rest" action={<span className="text-[10px] font-mono text-white/40">{games.length} games</span>}>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-white/[0.04]">
        <Tile label="Miles Flown" value={totalMiles.toLocaleString()} sub="great-circle" color="#8AB4FF" />
        <Tile label="Back-to-Backs" value={b2b.length} sub={`record ${b2bRecord}`} color="#EF4444" tone={b2b.filter((g) => g.w).length >= b2b.length / 2 ? 'good' : 'bad'} />
        <Tile label="2+ Days Rest" value={restedPlus.length} sub={`record ${restedRecord}`} color="#10B981" tone={restedPlus.filter((g) => g.w).length >= restedPlus.length / 2 ? 'good' : null} />
        <Tile label="Long Travel (1.5k+)" value={longTravel.length} sub="cross-country" color="#F59E0B" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-px bg-white/[0.04] mt-px">
        {byFatigue.map(({ lvl, n, w, pct }) => (
          <Tile key={lvl} label={`${FATIGUE_LABEL[lvl]} (${lvl})`} value={n ? `${pct}%` : '—'}
            sub={n ? `${w}–${n - w} in ${n}gm` : 'no games'}
            color={lvl <= 2 ? '#10B981' : lvl === 3 ? '#F59E0B' : '#EF4444'}
            tone={n ? (w / n >= 0.5 ? 'good' : 'bad') : null} />
        ))}
      </div>
      {threeInFourGames.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-white/[0.04] mt-px">
          <Tile label="3-in-4 Nights" value={threeInFourGames.length} sub={`record ${threeInFourRecord}`} color="#EF4444"
            tone={threeInFourGames.filter((g) => g.w).length >= threeInFourGames.length / 2 ? 'good' : 'bad'} />
        </div>
      )}
    </Section>
  );
};

// Broadcast network pills with tone colors per network. National
// broadcasts (TNT, ESPN, NHLN, SN, TVAS) get warm/cool emphasis; local
// regional networks fade to neutral. Markets: 'H' home, 'A' away, 'N'
// national. We dedupe networks so a national+regional combo doesn't
// double-print the same logo.
//
// Per-network classes give us text + bg in one shot so we don't need a
// `border-current/30` (which Tailwind doesn't support — opacity modifiers
// only work on named colors, not currentColor — and was rendering as a
// fully-saturated border that visually overflowed adjacent pills).
const NETWORK_PILL = {
  TNT:    'text-amber-300 bg-amber-500/10',
  TBS:    'text-amber-300 bg-amber-500/10',
  ESPN:   'text-red-300 bg-red-500/10',
  'ESPN+': 'text-red-300 bg-red-500/10',
  ABC:    'text-red-300 bg-red-500/10',
  HULU:   'text-red-300 bg-red-500/10',
  NHLN:   'text-sky-300 bg-sky-500/10',
  'NHL.TV': 'text-sky-300 bg-sky-500/10',
  SN:     'text-orange-300 bg-orange-500/10',
  SN1:    'text-orange-300 bg-orange-500/10',
  SN360:  'text-orange-300 bg-orange-500/10',
  SNNOW:  'text-orange-300 bg-orange-500/10',
  TVAS:   'text-violet-300 bg-violet-500/10',
  TVAS2:  'text-violet-300 bg-violet-500/10',
  CBC:    'text-red-300/80 bg-red-500/[0.08]',
};
const BroadcastCell = ({ broadcasts }) => {
  if (!broadcasts?.length) return <span className="text-[10px] font-mono text-white/25">—</span>;
  const seen = new Set();
  const all = broadcasts.filter((b) => {
    if (!b.network || seen.has(b.network)) return false;
    seen.add(b.network);
    return true;
  });
  // Prefer national broadcasts over regional ones when we run out of room.
  const sorted = [...all].sort((a, b) => {
    const score = (m) => (m === 'N' ? 0 : m === 'H' ? 1 : 2);
    return score(a.market) - score(b.market);
  });
  const visible = sorted.slice(0, 2);
  const overflow = sorted.length - visible.length;
  return (
    <span className="flex items-center justify-center gap-1 flex-nowrap whitespace-nowrap">
      {visible.map((b) => (
        <span
          key={b.network}
          className={cx(
            'text-[9px] font-mono font-medium px-1.5 py-[1px] rounded-[3px]',
            NETWORK_PILL[b.network] || 'text-white/55 bg-white/[0.04]',
          )}
          title={`${b.market === 'N' ? 'National' : b.market === 'H' ? 'Home' : 'Away'} · ${b.country || ''}`}
        >
          {b.network}
        </span>
      ))}
      {overflow > 0 && (
        <span
          className="text-[9px] font-mono text-white/35"
          title={sorted.slice(2).map((b) => b.network).join(', ')}
        >
          +{overflow}
        </span>
      )}
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

