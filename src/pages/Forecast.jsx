import { useEffect, useMemo, useRef, useState } from 'react';
import { Sparkles, Play, RotateCcw } from 'lucide-react';
import { cx, SEASON, TEAM_ABBR, API } from '../config.js';
import { Section, Skeleton, Chip } from '../components/primitives.jsx';
import { TeamLogo, FlyersMark } from '../components/Logo.jsx';
import { startForecast } from '../lib/forecast.js';

// Forecast — Monte Carlo playoff-odds page.
//
// Fetches every team's full season schedule in parallel, extracts the
// remaining (un-played) games, and runs the simulator from forecast.js.
// All compute is client-side; the only network cost is 32 small schedule
// fetches that hit the existing edge cache (60s TTL on club-schedule).
//
// Uses the chunked startForecast runner so the UI updates with live
// converging probabilities every 500 sims rather than blocking for a
// second and snapping to a final number.

const isFuture = (state) => state === 'FUT' || state === 'PRE';

const fetchTeamSchedule = async (abbr) => {
  const r = await fetch(API(`v1/club-schedule-season/${abbr}/${SEASON}`));
  if (!r.ok) throw new Error(`schedule ${abbr} ${r.status}`);
  return r.json();
};

// Build the un-played REGULAR-SEASON games list. We deliberately exclude
// preseason (gameType 1) and playoffs (gameType 3) — the simulator
// awards 2 pts for a win, which is meaningful only for the regular
// season standings race. Playoff games happen *after* the standings
// have locked, so including them would (1) misclassify teams already
// in the postseason as "still racing for it" and (2) inflate simulated
// point totals for teams that advance.
const buildRemainingGames = (raws) => {
  const seen = new Map();
  for (const raw of raws) {
    if (!raw?.games) continue;
    for (const g of raw.games) {
      if (!g.id || !isFuture(g.gameState)) continue;
      if (g.gameType !== 2) continue;
      if (seen.has(g.id)) continue;
      const home = g.homeTeam?.abbrev;
      const away = g.awayTeam?.abbrev;
      if (!home || !away) continue;
      seen.set(g.id, { id: g.id, home, away, gameType: g.gameType });
    }
  }
  return [...seen.values()];
};

export const Forecast = ({ standings }) => {
  const [schedRaws, setSchedRaws] = useState(null);
  const [error, setError] = useState(null);
  const [runs, setRuns] = useState(10000);
  const [seed, setSeed] = useState(1);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [result, setResult] = useState(null);
  const [hasRun, setHasRun] = useState(false);
  const cancelRef = useRef(null);

  // Fetch every team's schedule in parallel.
  useEffect(() => {
    if (!standings?.all?.length) return;
    let cancelled = false;
    setError(null);
    const abbrs = standings.all.map((t) => t.abbr);
    Promise.all(abbrs.map((a) => fetchTeamSchedule(a).catch(() => null)))
      .then((arr) => {
        if (cancelled) return;
        setSchedRaws(arr);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(String(e?.message || e));
      });
    return () => { cancelled = true; };
  }, [standings]);

  const remainingGames = useMemo(() => {
    if (!schedRaws) return null;
    return buildRemainingGames(schedRaws);
  }, [schedRaws]);

  // Auto-run the first time data is ready so the user sees results
  // without having to click anything. Subsequent runs are user-triggered
  // via the big Re-roll button.
  useEffect(() => {
    if (!standings?.all || !remainingGames || hasRun) return;
    triggerRun();
    setHasRun(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [standings, remainingGames, hasRun]);

  const triggerRun = (overrideSeed) => {
    if (!standings?.all || !remainingGames) return;
    if (cancelRef.current) cancelRef.current();
    setRunning(true);
    setProgress({ done: 0, total: runs });
    setResult(null);
    const useSeed = overrideSeed != null ? overrideSeed : seed;
    cancelRef.current = startForecast({
      standingsAll: standings.all,
      remainingGames,
      ourAbbr: TEAM_ABBR,
      runs,
      seed: useSeed,
      chunkSize: 400,
      onProgress: (snap, done, total) => {
        setResult(snap);
        setProgress({ done, total });
      },
      onComplete: (snap) => {
        setResult(snap);
        setProgress({ done: runs, total: runs });
        setRunning(false);
        cancelRef.current = null;
      },
    });
  };

  // Re-running with a new seed. Pass the fresh seed straight through
  // rather than relying on React state to commit before triggerRun reads
  // it — closure captures of seed inside setTimeout aren't guaranteed to
  // see the updated value.
  const reroll = () => {
    const next = seed + 1;
    setSeed(next);
    triggerRun(next);
  };

  useEffect(() => () => { cancelRef.current?.(); }, []);

  const us = result?.teams?.find((t) => t.abbr === TEAM_ABBR);
  const pct = progress.total ? (progress.done / progress.total) : 0;
  const seasonOver = remainingGames != null && remainingGames.length === 0;

  return (
    <div className="p-3 md:p-5 space-y-4">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[20px] font-semibold tracking-tight flex items-center gap-2">
            <Sparkles size={16} className="text-[#FF8A4C]" /> Forecast
          </h1>
          <p className="text-[12px] text-white/45 mt-1 font-mono">
            Monte Carlo playoff odds · {remainingGames == null
              ? 'loading league schedule…'
              : remainingGames.length === 0
                ? 'regular season complete'
                : `${remainingGames.length} remaining regular-season games · ${runs.toLocaleString()} sims`}
          </p>
        </div>
        <div className="flex items-center gap-0.5 p-0.5 border border-white/[0.08] rounded-md bg-white/[0.02]">
          {[2000, 10000, 50000].map((n) => (
            <button key={n}
              onClick={() => setRuns(n)}
              disabled={running}
              className={cx('px-2.5 h-7 text-[11px] font-medium rounded-[4px] transition-colors disabled:opacity-50',
                runs === n ? 'bg-white/[0.08] text-white' : 'text-white/50 hover:text-white'
              )}>{n.toLocaleString()}</button>
          ))}
        </div>
      </div>

      {seasonOver ? (
        <SeasonOverBanner />
      ) : (
        <ForecastRunBar
          running={running}
          pct={pct}
          progress={progress}
          onClickRun={reroll}
          canRun={!!remainingGames && !running}
          hasResult={!!result}
        />
      )}

      {error && (
        <div className="border border-red-500/40 bg-red-500/[0.08] rounded-md p-4 text-[12px] font-mono text-red-300">
          Failed to load forecast data: {error}
        </div>
      )}

      {!result || !us ? (
        <div className="space-y-3">
          <Skeleton height={140} />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Skeleton height={120} />
            <Skeleton height={120} />
            <Skeleton height={120} />
            <Skeleton height={120} />
          </div>
        </div>
      ) : (
        <>
          <PhiHeadline us={us} running={running} />
          <PhiBreakdown us={us} />
          <PointsHistogram us={us} />
          <ConferenceTable result={result} />
        </>
      )}
    </div>
  );
};

const SeasonOverBanner = () => (
  <div className="border border-emerald-500/30 bg-emerald-500/[0.04] rounded-md p-4 relative overflow-hidden">
    <div className="absolute inset-0 pointer-events-none"
      style={{ background: 'radial-gradient(circle at 0% 50%, rgba(16,185,129,0.08), transparent 50%)' }} />
    <div className="relative flex items-start gap-3">
      <div className="w-10 h-10 rounded-full bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center shrink-0">
        <Sparkles size={18} className="text-emerald-400" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[14px] font-semibold text-white/90">Regular season complete</div>
        <div className="text-[12px] font-mono text-white/55 mt-1 leading-relaxed">
          Standings are locked — there are no remaining regular-season games to simulate.
          The simulator will be active again at next October's season opener; for in-progress
          playoff series, head over to the <a href="/playoffs" className="text-[#FF8A4C] hover:underline">Playoffs</a> page.
        </div>
      </div>
    </div>
  </div>
);

const ForecastRunBar = ({ running, pct, progress, onClickRun, canRun, hasResult }) => (
  <div className="border border-[#F74902]/30 bg-[#F74902]/[0.04] rounded-md p-4 relative overflow-hidden">
    <div className="absolute inset-0 pointer-events-none"
      style={{ background: 'radial-gradient(circle at 0% 50%, rgba(247,73,2,0.08), transparent 50%)' }} />
    <div className="relative flex items-center gap-4 flex-wrap">
      <button
        onClick={onClickRun}
        disabled={!canRun}
        className={cx(
          'flex items-center justify-center gap-2 h-12 px-6 rounded-md text-[14px] font-semibold tracking-tight transition-all shrink-0',
          'shadow-lg shadow-[#F74902]/20',
          canRun
            ? 'bg-[#F74902] hover:bg-[#FF5A1F] text-white border border-[#FF8A4C]/40 hover:border-[#FF8A4C]/70 cursor-pointer'
            : 'bg-[#F74902]/40 text-white/70 border border-[#F74902]/30 cursor-not-allowed',
        )}
      >
        {running
          ? <><span className="w-2.5 h-2.5 rounded-full bg-white/80 animate-pulse" /> Simulating…</>
          : hasResult
            ? <><RotateCcw size={16} /> Run again</>
            : <><Play size={16} fill="currentColor" /> Run forecast</>}
      </button>

      <div className="flex-1 min-w-[180px]">
        <div className="flex items-baseline justify-between mb-1.5">
          <span className="text-[10px] font-mono text-white/40 uppercase tracking-wider">
            {running ? 'simulating season' : hasResult ? 'simulation complete' : 'ready'}
          </span>
          <span className="text-[12px] font-mono tabular-nums text-white/85">
            {progress.done.toLocaleString()}<span className="text-white/30"> / {progress.total.toLocaleString()}</span>
          </span>
        </div>
        <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
          <div
            className={cx('h-full rounded-full transition-all duration-150 ease-out',
              running ? 'bg-[#FF8A4C]' : hasResult ? 'bg-emerald-500/70' : 'bg-white/20',
            )}
            style={{ width: `${Math.max(progress.total ? 0 : 0, pct * 100)}%` }}
          />
        </div>
        <div className="text-[10px] font-mono text-white/35 mt-1.5 leading-relaxed">
          Each simulation plays out every remaining game, scores them with the points-% model + 3.5% home-ice, and tallies final standings. The probabilities below converge as runs accumulate.
        </div>
      </div>
    </div>
  </div>
);

const PhiHeadline = ({ us, running }) => {
  const playoff = us.playoffPct;
  const tone =
    playoff >= 0.7 ? 'text-emerald-400'
    : playoff >= 0.45 ? 'text-[#FF8A4C]'
    : playoff >= 0.20 ? 'text-amber-300'
    : 'text-red-400';
  return (
    <div className="border border-[#F74902]/30 bg-[#F74902]/[0.04] rounded-md p-5 relative overflow-hidden">
      <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(247,73,2,0.10), transparent 70%)' }} />
      <div className="relative grid grid-cols-1 md:grid-cols-[auto_1fr_auto] items-center gap-6">
        <div className="flex items-center gap-3">
          <FlyersMark size={48} />
          <div>
            <div className="text-[11px] font-mono text-white/40 uppercase tracking-wider flex items-center gap-1.5">
              Philadelphia Flyers
              {running && <span className="w-1.5 h-1.5 rounded-full bg-[#FF8A4C] animate-pulse" />}
            </div>
            <div className="text-[14px] text-white/85">Playoff Probability</div>
          </div>
        </div>
        <div className="flex items-baseline gap-3">
          <span className={cx('text-[64px] font-semibold tabular-nums tracking-tight leading-none transition-colors duration-200', tone)}>
            {(playoff * 100).toFixed(1)}%
          </span>
          <span className="text-[12px] font-mono text-white/40">probability of postseason</span>
        </div>
        <div className="text-right">
          <div className="text-[11px] font-mono text-white/40 uppercase tracking-wider">Expected Points</div>
          <div className="text-[28px] font-semibold tabular-nums tracking-tight text-white/85">
            {us.expPts.toFixed(1)}
          </div>
          <div className="text-[10px] font-mono text-white/40 mt-0.5">
            now {us.pts} pts · {us.gp} GP
          </div>
        </div>
      </div>
    </div>
  );
};

const PhiBreakdown = ({ us }) => {
  const cells = [
    { label: 'Win Division',  pct: us.divWinPct,    tone: '#FFA85C',  sub: 'Metro #1 finish' },
    { label: 'Top 3 Division', pct: us.top3Pct,     tone: '#10B981',  sub: 'auto-qualify' },
    { label: 'Wild Card',      pct: us.wildcardPct, tone: '#8AB4FF',  sub: 'east WC1 / WC2' },
    { label: 'Miss Playoffs',  pct: us.missedPct,   tone: '#EF4444',  sub: 'out of top 8' },
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {cells.map((c) => (
        <div key={c.label} className="border border-white/[0.06] bg-[#0C0C0C]/60 rounded-md p-3">
          <div className="text-[10px] font-mono text-white/40 uppercase tracking-wider">{c.label}</div>
          <div className="text-[26px] font-semibold tabular-nums mt-1 transition-colors duration-200" style={{ color: c.tone }}>
            {(c.pct * 100).toFixed(1)}%
          </div>
          <div className="mt-2 h-1 w-full bg-white/[0.04] rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-[width] duration-200 ease-out"
              style={{ width: `${Math.min(100, c.pct * 100)}%`, background: c.tone, opacity: 0.75 }} />
          </div>
          <div className="text-[10px] font-mono text-white/35 mt-1.5">{c.sub}</div>
        </div>
      ))}
    </div>
  );
};

const PointsHistogram = ({ us }) => {
  const dist = us.pointsDist;
  const total = [...dist.values()].reduce((s, n) => s + n, 0) || 1;
  const entries = [...dist.entries()].sort((a, b) => a[0] - b[0]);
  if (!entries.length) return null;
  const minPts = entries[0][0];
  const maxPts = entries[entries.length - 1][0];
  const buckets = [];
  for (let p = minPts; p <= maxPts; p++) {
    buckets.push({ p, count: dist.get(p) || 0 });
  }
  const peak = Math.max(1, ...buckets.map((b) => b.count));
  const PLAYOFF_PT = 95;

  return (
    <Section title="Final Points Distribution" action={<span className="text-[10px] font-mono text-white/40">{entries.length}-pt range across {total.toLocaleString()} sims</span>}>
      <div className="p-4">
        <div className="relative h-32 flex items-end gap-px">
          {buckets.map((b) => {
            const h = (b.count / peak) * 100;
            const isUs = b.p === Math.round(us.expPts);
            const inMode = b.count >= peak * 0.5;
            return (
              <div
                key={b.p}
                title={`${b.p} pts · ${b.count.toLocaleString()} sims (${(b.count / total * 100).toFixed(1)}%)`}
                className="flex-1 flex items-end"
              >
                <div
                  className={cx('w-full rounded-sm transition-[height] duration-150 ease-out',
                    isUs ? 'bg-[#FF8A4C]'
                    : inMode ? 'bg-[#F74902]/60'
                    : 'bg-white/15',
                  )}
                  style={{ height: `${Math.max(2, h)}%` }}
                />
              </div>
            );
          })}
          {minPts <= PLAYOFF_PT && PLAYOFF_PT <= maxPts && (
            <div
              className="absolute top-0 bottom-0 w-px bg-emerald-500/45 pointer-events-none"
              style={{ left: `${((PLAYOFF_PT - minPts) / Math.max(1, maxPts - minPts)) * 100}%` }}
            />
          )}
        </div>
        <div className="flex items-center justify-between mt-2 text-[10px] font-mono text-white/40 tabular-nums">
          <span>{minPts}</span>
          <span className="text-emerald-400/70">95 pts · typical WC cutoff</span>
          <span>{maxPts}</span>
        </div>
      </div>
    </Section>
  );
};

const ConferenceTable = ({ result }) => {
  const east = result.teams
    .filter((t) => t.conference === 'Eastern')
    .sort((a, b) => b.playoffPct - a.playoffPct);
  return (
    <Section title="Eastern Conference · Playoff Odds">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-[10px] font-mono text-white/35 uppercase tracking-wider border-b border-white/[0.05]">
              <th className="font-normal text-left px-4 h-8 w-[44px]">#</th>
              <th className="font-normal text-left px-2 h-8">Team</th>
              <th className="font-normal text-right px-2 h-8 w-[64px]">Now</th>
              <th className="font-normal text-right px-2 h-8 w-[64px]">Exp</th>
              <th className="font-normal text-right px-2 h-8 w-[80px]">Div Win</th>
              <th className="font-normal text-right px-2 h-8 w-[80px]">Top 3</th>
              <th className="font-normal text-right px-2 h-8 w-[80px]">WC</th>
              <th className="font-normal text-right px-4 h-8 w-[88px]">Playoff %</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {east.map((t, i) => {
              const isUs = t.abbr === result.ourAbbr;
              return (
                <tr key={t.abbr} className={cx(
                  'transition-colors',
                  isUs ? 'bg-[#F74902]/[0.06] hover:bg-[#F74902]/[0.10]' : 'hover:bg-white/[0.02]',
                )}>
                  <td className={cx('px-4 h-10 text-[11px] font-mono tabular-nums',
                    i === 0 ? 'text-amber-300 font-semibold' : isUs ? 'text-[#FF8A4C] font-semibold' : 'text-white/40'
                  )}>{i + 1}</td>
                  <td className="px-2">
                    <div className="flex items-center gap-2">
                      <TeamLogo abbr={t.abbr} size={20} />
                      <span className={cx('text-[12px]', isUs ? 'text-white font-medium' : 'text-white/85')}>{t.abbr}</span>
                      {isUs && <Chip tone="orange">YOU</Chip>}
                      <span className="text-[9px] font-mono text-white/30">{t.division}</span>
                    </div>
                  </td>
                  <td className="px-2 text-right text-[11px] font-mono tabular-nums text-white/55">{t.pts}</td>
                  <td className="px-2 text-right text-[11px] font-mono tabular-nums text-white/85">{t.expPts.toFixed(1)}</td>
                  <td className="px-2 text-right text-[11px] font-mono tabular-nums text-amber-300/80">{(t.divWinPct * 100).toFixed(1)}</td>
                  <td className="px-2 text-right text-[11px] font-mono tabular-nums text-emerald-400/80">{(t.top3Pct * 100).toFixed(1)}</td>
                  <td className="px-2 text-right text-[11px] font-mono tabular-nums text-sky-300/80">{(t.wildcardPct * 100).toFixed(1)}</td>
                  <td className={cx('px-4 text-right text-[12px] font-mono tabular-nums font-semibold',
                    t.playoffPct >= 0.85 ? 'text-emerald-400'
                    : t.playoffPct >= 0.55 ? 'text-[#FF8A4C]'
                    : t.playoffPct >= 0.25 ? 'text-amber-300'
                    : 'text-red-400'
                  )}>{(t.playoffPct * 100).toFixed(1)}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="px-4 py-2 border-t border-white/[0.05] text-[10px] font-mono text-white/35 leading-relaxed">
        Win-probability model: points% differential + 3.5% home-ice. ~22% of sim games go past regulation. Click "Run again" to draw a new random seed.
      </div>
    </Section>
  );
};
