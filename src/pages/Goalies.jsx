import { useMemo } from 'react';
import { cx, TEAM_ABBR } from '../config.js';
import { Section, Skeleton } from '../components/primitives.jsx';
import { Headshot } from '../components/Headshot.jsx';
import { PlayerLink } from '../components/PlayerLink.jsx';
import { TeamLogo } from '../components/Logo.jsx';
import { useNHL } from '../api.js';
import { GoalieEdgePanel } from '../components/EdgeStats.jsx';

// Goalie-only tracker. Shows season totals per goalie plus a per-game
// trend of save% and GAA derived from /v1/player/{id}/game-log. Two
// sparklines per row: light orange = save% (higher is better), red =
// GAA (lower is better). Recent decisions strip on the right makes hot
// vs. cold runs immediately readable without staring at the charts.

const SEASON_FROM_DATE = (iso) => {
  if (!iso) return null;
  const yr = parseInt(iso.slice(0, 4), 10);
  const month = parseInt(iso.slice(5, 7), 10);
  const startYr = month >= 8 ? yr : yr - 1;
  return `${startYr}${startYr + 1}`;
};

const fmtPct = (v) => v == null ? '—' : `.${Math.round(v * 1000).toString().padStart(3, '0')}`;
const fmtGaa = (v) => v == null ? '—' : v.toFixed(2);

// Compact SVG sparkline — single series, no axes. Gives a feel for
// trajectory at a glance; the table next to it is the precise version.
const Sparkline = ({ values, color, w = 140, h = 32, lowerBetter = false }) => {
  if (!values || values.length < 2) {
    return <div className="text-[10px] font-mono text-white/30">not enough games</div>;
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(0.001, max - min);
  const path = values.map((v, i) => {
    const x = (i / (values.length - 1)) * (w - 2) + 1;
    const y = h - 2 - ((v - min) / range) * (h - 4);
    return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(' ');
  const last = values[values.length - 1];
  const lastX = w - 1;
  const lastY = h - 2 - ((last - min) / range) * (h - 4);
  const trendUp = values[values.length - 1] > values[0];
  const goodTrend = lowerBetter ? !trendUp : trendUp;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} className="overflow-visible">
      <path d={path} stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lastX} cy={lastY} r="2.5" fill={color} />
      <circle cx={lastX} cy={lastY} r="5" fill={color} opacity={goodTrend ? 0.25 : 0.12} />
    </svg>
  );
};

const GoalieRow = ({ goalie, seasonStr }) => {
  const path = goalie?.id && seasonStr ? `v1/player/${goalie.id}/game-log/${seasonStr}/2` : null;
  const { data, loading } = useNHL(path, 0);

  const log = useMemo(() => {
    const entries = (data?.gameLog || []).filter((e) => (e.gamesStarted || e.toi) && e.shotsAgainst != null);
    return [...entries].sort((a, b) => (a.gameDate || '').localeCompare(b.gameDate || ''));
  }, [data]);

  const savePctSeries = useMemo(() => log.map((e) => {
    if (e.savePctg != null) return e.savePctg;
    if (e.shotsAgainst > 0) return e.saves / e.shotsAgainst;
    return null;
  }).filter((v) => v != null), [log]);

  // Quality Starts: SV% >= .913 in that game
  const qualityStarts = useMemo(() => {
    const qs = savePctSeries.filter((sv) => sv >= 0.913).length;
    return { qs, total: savePctSeries.length, pct: savePctSeries.length > 0 ? (qs / savePctSeries.length * 100).toFixed(0) : '—' };
  }, [savePctSeries]);

  const gaaSeries = useMemo(() => {
    return log.map((e) => {
      const toi = parseToiSeconds(e.toi);
      if (!toi || e.goalsAgainst == null) return null;
      return (e.goalsAgainst / toi) * 3600;
    }).filter((v) => v != null);
  }, [log]);

  const recent = log.slice(-10);

  return (
    <div className="border-b border-white/[0.04] last:border-b-0">
      <div className="grid grid-cols-1 md:grid-cols-[260px_1fr_auto] gap-4 items-center px-4 py-4">
        <div className="flex items-center gap-3 min-w-0">
          <Headshot src={goalie.headshot} playerId={goalie.id} num={goalie.num} size={56} />
          <div className="min-w-0">
            <PlayerLink playerId={goalie.id} className="text-[15px] font-medium text-white/90 truncate hover:text-white">
              {goalie.name || '—'}
            </PlayerLink>
            <div className="text-[10px] font-mono text-white/40 mt-0.5">
              #{goalie.num || '?'} · {goalie.gp} GP · {goalie.w}-{goalie.l}-{goalie.otl}
            </div>
            <div className="grid grid-cols-4 gap-3 mt-2 text-[11px] font-mono tabular-nums">
              <div>
                <div className="text-[9px] text-white/35 uppercase tracking-wider">Save %</div>
                <div className="text-[var(--team-accent)]">{goalie.savePct != null ? `${goalie.savePct.toFixed(1)}%` : '—'}</div>
              </div>
              <div>
                <div className="text-[9px] text-white/35 uppercase tracking-wider">GAA</div>
                <div className="text-red-400">{goalie.gaa != null ? goalie.gaa.toFixed(2) : '—'}</div>
              </div>
              <div>
                <div className="text-[9px] text-white/35 uppercase tracking-wider">SO</div>
                <div className="text-emerald-400">{goalie.so || 0}</div>
              </div>
              <div>
                <div className="text-[9px] text-white/35 uppercase tracking-wider">QS%</div>
                <div className="text-sky-300">{qualityStarts.pct}%</div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="border border-white/[0.05] rounded-md px-3 py-2.5 bg-white/[0.01]">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[9px] font-mono text-white/40 uppercase tracking-wider">Save % · trend</span>
              <span className="text-[11px] font-mono tabular-nums text-[var(--team-accent)]">
                {savePctSeries.length ? fmtPct(savePctSeries[savePctSeries.length - 1]) : '—'}
              </span>
            </div>
            <div className="mt-1.5 flex items-center justify-center min-h-[32px]">
              {loading ? <Skeleton width={140} height={20} /> : <Sparkline values={savePctSeries} color="var(--team-accent)" />}
            </div>
            <div className="mt-1 text-[9px] font-mono text-white/30">{savePctSeries.length} games</div>
          </div>
          <div className="border border-white/[0.05] rounded-md px-3 py-2.5 bg-white/[0.01]">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[9px] font-mono text-white/40 uppercase tracking-wider">GAA · trend</span>
              <span className="text-[11px] font-mono tabular-nums text-red-400">
                {gaaSeries.length ? fmtGaa(gaaSeries[gaaSeries.length - 1]) : '—'}
              </span>
            </div>
            <div className="mt-1.5 flex items-center justify-center min-h-[32px]">
              {loading ? <Skeleton width={140} height={20} /> : <Sparkline values={gaaSeries} color="#EF4444" lowerBetter />}
            </div>
            <div className="mt-1 text-[9px] font-mono text-white/30">lower is better</div>
          </div>
        </div>

        <div className="flex flex-col gap-1.5 min-w-[120px]">
          <span className="text-[9px] font-mono text-white/40 uppercase tracking-wider">Last 10</span>
          <div className="flex items-center gap-1 flex-wrap">
            {recent.length === 0 && <span className="text-[10px] font-mono text-white/30">no games</span>}
            {recent.map((e) => {
              const dec = e.decision || '';
              const tone = dec === 'W' ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                : dec === 'L' ? 'bg-red-500/15 border-red-500/35 text-red-300'
                : dec === 'O' ? 'bg-amber-500/15 border-amber-500/35 text-amber-300'
                : 'bg-white/[0.04] border-white/[0.08] text-white/45';
              return (
                <span
                  key={e.gameId}
                  title={`${e.gameDate} · ${dec || '—'} · ${e.savePctg != null ? fmtPct(e.savePctg) : '—'}`}
                  className={cx(
                    'px-1 h-5 inline-flex items-center justify-center rounded border text-[9px] font-mono font-semibold tabular-nums',
                    tone,
                  )}
                >
                  {dec || '·'}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

const parseToiSeconds = (toi) => {
  if (!toi || typeof toi !== 'string') return 0;
  const parts = toi.split(':').map(Number);
  if (parts.length !== 2 || parts.some((n) => Number.isNaN(n))) return 0;
  return parts[0] * 60 + parts[1];
};

// One row in a Top-10 NHL board. Highlights PHI goalies even if they're
// outside the top 10, by re-injecting them with their actual rank.
const LeaderRow = ({ entry, rank, formatVal, valueLabel, accent }) => {
  const isPhi = entry.team === TEAM_ABBR;
  return (
    <div
      className={cx(
        'grid grid-cols-[28px_28px_1fr_auto] items-center gap-2 px-3 h-10',
        isPhi ? 'bg-[var(--team-primary)]/[0.08] border-l-2 border-[var(--team-primary)]/70' : 'hover:bg-white/[0.02] border-l-2 border-transparent',
      )}
    >
      <span className={cx('text-[11px] font-mono tabular-nums',
        rank === 1 ? 'text-amber-300 font-semibold' : isPhi ? 'text-[var(--team-accent)] font-semibold' : 'text-white/40'
      )}>{rank}</span>
      <Headshot src={entry.headshot} num={entry.num} size={24} />
      <div className="flex items-center gap-1.5 min-w-0">
        <PlayerLink playerId={entry.id} className={cx('text-[12px] truncate hover:text-white', isPhi ? 'text-white' : 'text-white/85')}>
          {entry.name}
        </PlayerLink>
        {entry.team && <TeamLogo abbr={entry.team} size={14} />}
        <span className="text-[9px] font-mono text-white/35 shrink-0">{entry.team}</span>
      </div>
      <span className="flex items-baseline gap-1 shrink-0">
        <span className="text-[12px] font-mono tabular-nums font-medium" style={{ color: accent }}>
          {formatVal(entry.value)}
        </span>
        <span className="text-[9px] font-mono text-white/35 uppercase tracking-wider">{valueLabel}</span>
      </span>
    </div>
  );
};

// One leaderboard column — top 10 + any PHI goalies outside the top 10
// re-inserted with their actual league rank so PHI fans can see exactly
// where their goalies stand without scrolling a 70-row list.
const LeaderboardColumn = ({ title, sub, list, accent, formatVal, valueLabel, loading }) => {
  const top10 = (list || []).slice(0, 10);
  const phiBelow10 = (list || [])
    .map((entry, i) => ({ entry, rank: i + 1 }))
    .filter(({ entry, rank }) => entry.team === TEAM_ABBR && rank > 10);

  return (
    <Section title={title} action={<span className="text-[10px] font-mono text-white/40 uppercase tracking-wider">{sub}</span>}>
      {loading && top10.length === 0 ? (
        <div className="p-3 space-y-2">
          <Skeleton height={32} />
          <Skeleton height={32} />
          <Skeleton height={32} />
        </div>
      ) : top10.length === 0 ? (
        <div className="px-4 py-6 text-center text-[11px] font-mono text-white/35">No data yet.</div>
      ) : (
        <div className="divide-y divide-white/[0.04]">
          {top10.map((entry, i) => (
            <LeaderRow
              key={entry.id}
              entry={entry}
              rank={i + 1}
              formatVal={formatVal}
              valueLabel={valueLabel}
              accent={accent}
            />
          ))}
          {phiBelow10.length > 0 && (
            <>
              <div className="px-3 py-1.5 text-[9px] font-mono text-white/30 uppercase tracking-wider bg-white/[0.015]">
                ··· PHI rank
              </div>
              {phiBelow10.map(({ entry, rank }) => (
                <LeaderRow
                  key={entry.id}
                  entry={entry}
                  rank={rank}
                  formatVal={formatVal}
                  valueLabel={valueLabel}
                  accent={accent}
                />
              ))}
            </>
          )}
        </div>
      )}
    </Section>
  );
};

export const Goalies = ({ clubStats, schedule, goalieLeaders }) => {
  const goalies = clubStats?.goalies || [];
  const seasonStr = useMemo(() => SEASON_FROM_DATE(schedule?.games?.[0]?.date), [schedule]);

  // Goalie-stats-leaders endpoint returns 'savePctg', 'goalsAgainstAverage',
  // and 'wins' arrays of { id, name, team, value, headshot, ... }. Already
  // sorted server-side; we just need top 10 + PHI tail.
  const svList   = goalieLeaders?.savePctg || [];
  const gaaList  = goalieLeaders?.goalsAgainstAverage || [];
  const winsList = goalieLeaders?.wins || [];
  const llLoading = !goalieLeaders || (svList.length === 0 && gaaList.length === 0 && winsList.length === 0);

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div>
        <h1 className="text-[20px] font-semibold tracking-tight">Goalies</h1>
        <p className="text-[12px] text-white/45 mt-1 font-mono">
          Per-game save % and GAA trends · last 10 decisions · NHL leaderboards
        </p>
      </div>

      <Section title="Crease Watch" action={<span className="text-[10px] font-mono text-white/40 uppercase tracking-wider">{goalies.length || ''} {goalies.length ? 'goalies' : ''}</span>}>
        {!clubStats ? (
          <div className="p-4 space-y-3">
            <Skeleton height={88} />
            <Skeleton height={88} />
          </div>
        ) : goalies.length === 0 ? (
          <div className="p-8 text-center text-[12px] font-mono text-white/40">No goalie stats available.</div>
        ) : (
          <div>
            {goalies.map((g) => (
              <GoalieRow key={g.id} goalie={g} seasonStr={seasonStr} />
            ))}
          </div>
        )}
      </Section>

      {/* NHL Edge tracking data for each goalie */}
      {goalies.filter((g) => g.id).slice(0, 2).map((g) => (
        <GoalieEdgePanel key={g.id} playerId={g.id} />
      ))}

      <div>
        <h2 className="text-[14px] font-semibold tracking-tight">NHL Top 10 · Goalies</h2>
        <p className="text-[10px] font-mono text-white/40 mt-0.5 uppercase tracking-wider">
          League leaders updated daily · PHI goalies highlighted even outside the top 10
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <LeaderboardColumn
          title="Save %"
          sub="higher is better"
          list={svList}
          accent="var(--team-accent)"
          valueLabel="SV%"
          formatVal={(v) => v == null ? '—' : `.${Math.round(v * 1000).toString().padStart(3, '0')}`}
          loading={llLoading}
        />
        <LeaderboardColumn
          title="Goals Against Avg"
          sub="lower is better"
          list={gaaList}
          accent="#EF4444"
          valueLabel="GAA"
          formatVal={(v) => v == null ? '—' : v.toFixed(2)}
          loading={llLoading}
        />
        <LeaderboardColumn
          title="Wins"
          sub="season totals"
          list={winsList}
          accent="#10B981"
          valueLabel="W"
          formatVal={(v) => v == null ? '—' : String(v)}
          loading={llLoading}
        />
      </div>
    </div>
  );
};
