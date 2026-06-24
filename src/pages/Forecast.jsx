import { useEffect, useMemo, useRef, useState } from 'react';
import { Play, RotateCcw } from 'lucide-react';
import { cx, SEASON, TEAM_ABBR, API } from '../config.js';
import { Section, Skeleton, Chip } from '../components/primitives.jsx';
import { TeamLogo, FlyersMark } from '../components/Logo.jsx';
import { TeamLogoBg } from '../components/Watermark.jsx';
import { navigate } from '../router.js';
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
  // Interactive scenarios: lock specific game results before simulating.
  // Map of gameId → 'home' | 'away' (the winner). Locked games are
  // excluded from simulation and applied as fixed outcomes.
  const [lockedGames, setLockedGames] = useState(new Map());
  const cancelRef = useRef(null);

  const toggleLock = (gameId, winner) => {
    setLockedGames((prev) => {
      const next = new Map(prev);
      if (next.get(gameId) === winner) next.delete(gameId);
      else next.set(gameId, winner);
      return next;
    });
  };
  const clearLocks = () => setLockedGames(new Map());

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

  const allRemainingGames = useMemo(() => {
    if (!schedRaws) return null;
    return buildRemainingGames(schedRaws);
  }, [schedRaws]);

  // Apply locked game scenarios: remove locked games from remaining,
  // and compute adjusted standings with locked results applied.
  const remainingGames = useMemo(() => {
    if (!allRemainingGames) return null;
    if (lockedGames.size === 0) return allRemainingGames;
    return allRemainingGames.filter((g) => !lockedGames.has(g.id));
  }, [allRemainingGames, lockedGames]);

  const adjustedStandings = useMemo(() => {
    if (!standings?.all || !allRemainingGames || lockedGames.size === 0) return standings;
    const adjustedAll = standings.all.map((t) => ({ ...t }));
    const teamMap = new Map(adjustedAll.map((t) => [t.abbr, t]));
    for (const [gameId, winner] of lockedGames) {
      const game = allRemainingGames.find((g) => g.id === gameId);
      if (!game) continue;
      const winAbbr = winner === 'home' ? game.home : game.away;
      const loseAbbr = winner === 'home' ? game.away : game.home;
      const wt = teamMap.get(winAbbr);
      const lt = teamMap.get(loseAbbr);
      if (wt) { wt.pts += 2; wt.w += 1; wt.gp += 1; }
      if (lt) { lt.gp += 1; lt.l += 1; }
    }
    return { ...standings, all: adjustedAll };
  }, [standings, allRemainingGames, lockedGames]);

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
    if (!adjustedStandings?.all || !remainingGames) return;
    if (cancelRef.current) cancelRef.current();
    setRunning(true);
    setProgress({ done: 0, total: runs });
    setResult(null);
    const useSeed = overrideSeed != null ? overrideSeed : seed;
    cancelRef.current = startForecast({
      standingsAll: adjustedStandings.all,
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
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[20px] font-semibold tracking-tight">Forecast</h1>
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

      {/* Interactive Scenario Builder — lock specific game outcomes */}
      {allRemainingGames && allRemainingGames.length > 0 && (
        <Section
          title={`Scenario Builder${lockedGames.size ? ` · ${lockedGames.size} locked` : ''}`}
          action={lockedGames.size > 0 ? (
            <button
              type="button"
              onClick={() => { clearLocks(); reroll(); }}
              className="text-[10px] font-mono text-white/40 hover:text-white/70 transition-colors"
            >
              Clear all & re-run
            </button>
          ) : null}
        >
          <div className="p-3">
            <p className="text-[11px] text-white/45 mb-3">
              Lock game outcomes then re-run the simulation. Click a team to lock them as the winner.
            </p>
            <div className="max-h-[240px] overflow-y-auto space-y-1">
              {allRemainingGames
                .filter((g) => g.home === TEAM_ABBR || g.away === TEAM_ABBR)
                .slice(0, 15)
                .map((g) => {
                  const locked = lockedGames.get(g.id);
                  return (
                    <div key={g.id} className="flex items-center gap-2 h-8 px-2 rounded-sm hover:bg-white/[0.02]">
                      <button
                        type="button"
                        onClick={() => toggleLock(g.id, 'away')}
                        className={cx(
                          'flex items-center gap-1.5 px-2 h-6 rounded-[3px] text-[11px] font-mono transition-colors',
                          locked === 'away' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-white/55 hover:text-white border border-transparent',
                        )}
                      >
                        <TeamLogo abbr={g.away} size={14} />
                        {g.away}
                      </button>
                      <span className="text-[10px] text-white/25">@</span>
                      <button
                        type="button"
                        onClick={() => toggleLock(g.id, 'home')}
                        className={cx(
                          'flex items-center gap-1.5 px-2 h-6 rounded-[3px] text-[11px] font-mono transition-colors',
                          locked === 'home' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-white/55 hover:text-white border border-transparent',
                        )}
                      >
                        <TeamLogo abbr={g.home} size={14} />
                        {g.home}
                      </button>
                      {locked && (
                        <Chip tone="green">W</Chip>
                      )}
                    </div>
                  );
                })}
            </div>
            {lockedGames.size > 0 && (
              <button
                type="button"
                onClick={reroll}
                disabled={running}
                className="mt-3 w-full h-8 rounded-md bg-[#F74902]/15 border border-[#F74902]/30 text-[#FF8A4C] text-[12px] font-medium hover:bg-[#F74902]/25 disabled:opacity-50 transition-colors"
              >
                Re-run with {lockedGames.size} locked {lockedGames.size === 1 ? 'game' : 'games'}
              </button>
            )}
          </div>
        </Section>
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
  <div className="border border-white/[0.08] bg-[#0C0C0C]/60 rounded-md p-4">
    <div className="text-[13px] text-white/85 font-medium">Regular season complete</div>
    <div className="text-[11px] font-mono text-white/55 mt-1 leading-relaxed">
      Standings are locked — there are no remaining regular-season games to simulate.
      For in-progress playoff series, see the <a href="/playoffs" onClick={(e) => { e.preventDefault(); navigate('/playoffs'); }} className="text-[#FF8A4C] hover:underline">Playoffs</a> page.
    </div>
  </div>
);

const ForecastRunBar = ({ running, pct, progress, onClickRun, canRun, hasResult }) => (
  <div className="border border-white/[0.08] bg-[#0C0C0C]/60 rounded-md p-4">
    <div className="flex items-center gap-4 flex-wrap">
      <button
        onClick={onClickRun}
        disabled={!canRun}
        className={cx(
          'flex items-center justify-center gap-2 h-11 px-5 rounded-md text-[13px] font-semibold tracking-tight transition-colors shrink-0',
          canRun
            ? 'bg-[#F74902] hover:bg-[#FF5A1F] text-white cursor-pointer'
            : 'bg-[#F74902]/40 text-white/70 cursor-not-allowed',
        )}
      >
        {running
          ? <><span className="w-2 h-2 rounded-full bg-white/80 animate-pulse" /> Simulating</>
          : hasResult
            ? <><RotateCcw size={14} /> Run again</>
            : <><Play size={14} fill="currentColor" /> Run forecast</>}
      </button>

      <div className="flex-1 min-w-[180px]">
        <div className="flex items-baseline justify-between mb-1.5">
          <span className="text-[11px] text-white/55">
            {running ? 'Simulating season' : hasResult ? 'Simulation complete' : 'Ready to run'}
          </span>
          <span className="text-[12px] font-mono tabular-nums text-white/85">
            {progress.done.toLocaleString()}<span className="text-white/30"> / {progress.total.toLocaleString()}</span>
          </span>
        </div>
        <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
          <div
            className={cx('h-full transition-[width] duration-150 ease-out',
              running ? 'bg-[#FF8A4C]' : hasResult ? 'bg-emerald-500/70' : 'bg-white/20',
            )}
            style={{ width: `${pct * 100}%` }}
          />
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
    <div className="relative overflow-hidden border border-white/[0.08] bg-[#0C0C0C]/60 rounded-md p-5">
      <TeamLogoBg abbr={TEAM_ABBR} size={220} opacity={0.06} position="bottom-right" />
      <div className="relative grid grid-cols-1 md:grid-cols-[auto_1fr_auto] items-center gap-6">
        <div className="flex items-center gap-3">
          <FlyersMark size={40} />
          <div>
            <div className="text-[11px] text-white/55 flex items-center gap-1.5">
              Philadelphia Flyers
              {running && <span className="w-1.5 h-1.5 rounded-full bg-[#FF8A4C] animate-pulse" />}
            </div>
            <div className="text-[14px] text-white/90 font-medium">Playoff probability</div>
          </div>
        </div>
        <div className="flex items-baseline gap-3">
          <span className={cx('text-[52px] font-semibold tabular-nums tracking-tight leading-none transition-colors duration-200', tone)}>
            {(playoff * 100).toFixed(1)}%
          </span>
          <span className="text-[12px] text-white/45">chance of making the postseason</span>
        </div>
        <div className="text-right">
          <div className="text-[11px] text-white/55">Expected points</div>
          <div className="text-[24px] font-semibold tabular-nums tracking-tight text-white/85 mt-0.5">
            {us.expPts.toFixed(1)}
          </div>
          <div className="text-[11px] text-white/45 mt-0.5">
            currently {us.pts} pts in {us.gp} GP
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
