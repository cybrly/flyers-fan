import { useEffect, useMemo, useState } from 'react';
import { Sparkles, RefreshCw } from 'lucide-react';
import { cx, SEASON, TEAM_ABBR, API } from '../config.js';
import { Section, Skeleton, Chip } from '../components/primitives.jsx';
import { TeamLogo, FlyersMark } from '../components/Logo.jsx';
import { runForecast } from '../lib/forecast.js';

// Forecast — Monte Carlo playoff-odds page.
//
// Fetches every team's full season schedule in parallel, extracts the
// remaining (un-played) games, and runs the simulator from forecast.js.
// All compute is client-side; the only network cost is 32 small schedule
// fetches that hit the existing edge cache (60s TTL on club-schedule).
//
// Default 10K runs takes ~0.5–1s on a recent laptop. Falls back to a
// "Run again" button so users can re-roll with no upstream re-fetch.

const isFuture = (state) => state === 'FUT' || state === 'PRE';

const fetchTeamSchedule = async (abbr) => {
  const r = await fetch(API(`v1/club-schedule-season/${abbr}/${SEASON}`));
  if (!r.ok) throw new Error(`schedule ${abbr} ${r.status}`);
  return r.json();
};

const buildRemainingGames = (raws) => {
  // Each team's schedule includes their own games. The same game appears
  // on both teams' schedules, so we dedupe by gameId. Keep only future
  // (un-played) games for the simulator.
  const seen = new Map();
  for (const raw of raws) {
    if (!raw?.games) continue;
    for (const g of raw.games) {
      if (!g.id || !isFuture(g.gameState)) continue;
      if (g.gameType === 1) continue; // skip preseason
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
  const [result, setResult] = useState(null);

  // Fetch every team's schedule in parallel. Edge cache is generous on
  // club-schedule, so these mostly come back as warm cache hits.
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

  // Run the sim. Yields to the event loop first via setTimeout 0 so the
  // "Running…" state actually paints before the (synchronous) sim blocks.
  useEffect(() => {
    if (!standings?.all || !remainingGames) return;
    setRunning(true);
    const t = setTimeout(() => {
      const out = runForecast({
        standingsAll: standings.all,
        remainingGames,
        ourAbbr: TEAM_ABBR,
        runs,
        seed,
      });
      setResult(out);
      setRunning(false);
    }, 0);
    return () => clearTimeout(t);
  }, [standings, remainingGames, runs, seed]);

  const us = result?.teams?.find((t) => t.abbr === TEAM_ABBR);

  return (
    <div className="p-3 md:p-5 space-y-3">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[20px] font-semibold tracking-tight flex items-center gap-2">
            <Sparkles size={16} className="text-[#FF8A4C]" /> Forecast
          </h1>
          <p className="text-[12px] text-white/45 mt-1 font-mono">
            Monte Carlo playoff odds · {result ? `${result.runs.toLocaleString()} simulations · ${result.simulatedGames} remaining games` : 'crunching the season…'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0.5 p-0.5 border border-white/[0.08] rounded-md bg-white/[0.02]">
            {[2000, 10000, 50000].map((n) => (
              <button key={n} onClick={() => setRuns(n)}
                className={cx('px-2.5 h-6 text-[11px] font-medium rounded-[4px] transition-colors',
                  runs === n ? 'bg-white/[0.08] text-white' : 'text-white/50 hover:text-white'
                )}>{n.toLocaleString()}</button>
            ))}
          </div>
          <button
            onClick={() => setSeed((s) => s + 1)}
            disabled={running || !remainingGames}
            title="Re-run with a new random seed"
            className="flex items-center gap-1.5 px-2.5 h-7 border border-white/[0.08] hover:border-[#F74902]/40 bg-white/[0.02] rounded-md text-[11px] font-mono text-white/65 hover:text-white transition-colors disabled:opacity-50"
          >
            <RefreshCw size={12} className={running ? 'animate-spin' : ''} />
            <span>{running ? 'Running…' : 'Re-roll'}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="border border-red-500/40 bg-red-500/[0.08] rounded-md p-4 text-[12px] font-mono text-red-300">
          Failed to load forecast data: {error}
        </div>
      )}

      {!result || !us ? (
        <div className="space-y-3">
          <Skeleton height={140} />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Skeleton height={120} />
            <Skeleton height={120} />
            <Skeleton height={120} />
          </div>
        </div>
      ) : (
        <>
          <PhiHeadline us={us} />
          <PhiBreakdown us={us} />
          <PointsHistogram us={us} />
          <ConferenceTable result={result} />
        </>
      )}
    </div>
  );
};

const PhiHeadline = ({ us }) => {
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
            <div className="text-[11px] font-mono text-white/40 uppercase tracking-wider">Philadelphia Flyers</div>
            <div className="text-[14px] text-white/85">Playoff Probability</div>
          </div>
        </div>
        <div className="flex items-baseline gap-3">
          <span className={cx('text-[64px] font-semibold tabular-nums tracking-tight leading-none', tone)}>
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
          <div className="text-[26px] font-semibold tabular-nums mt-1" style={{ color: c.tone }}>
            {(c.pct * 100).toFixed(1)}%
          </div>
          <div className="mt-2 h-1 w-full bg-white/[0.04] rounded-full overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${Math.min(100, c.pct * 100)}%`, background: c.tone, opacity: 0.75 }} />
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

  // Mark the playoff threshold around 95 (typical wild-card cutoff) and PHI's
  // current points so the user sees their starting line.
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
                  className={cx('w-full rounded-sm',
                    isUs ? 'bg-[#FF8A4C]'
                    : inMode ? 'bg-[#F74902]/60'
                    : 'bg-white/15',
                  )}
                  style={{ height: `${Math.max(2, h)}%` }}
                />
              </div>
            );
          })}
          {/* Playoff threshold line */}
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
  // Show all 16 Eastern Conference teams sorted by playoff %. Western
  // doesn't matter for PHI's race; trim it for noise.
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
        Win-probability model: points% differential + 3.5% home-ice. ~22% of sim games go past regulation. Re-roll with the button above to draw a new random seed.
      </div>
    </Section>
  );
};
