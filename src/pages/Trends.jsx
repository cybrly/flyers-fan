import { useMemo, useState, useRef } from 'react';
import { cx } from '../config.js';
import { Section } from '../components/primitives.jsx';
import { useNHL } from '../api.js';
import { navigate, gameHref } from '../router.js';
import { rollingWindow, rollingAvg } from '../lib/stats.js';
import { HISTORICAL_SEASONS } from '../data/historicalSeasons.js';

// Season trajectory chart — multi-line plot of GF / GA / Diff (cumulative),
// 5-game rolling form, points pace, plus an optional per-player cumulative
// overlay. Computes everything from the schedule we already have on the
// dashboard. SVG, no chart library.

const W = 1000;
const H = 320;
const PAD = { top: 16, right: 36, bottom: 64, left: 36 }; // bottom: strip + month band + tick band
const STRIP_H = 8; // W/L color strip height
const PLOT_W = W - PAD.left - PAD.right;
const PLOT_H = H - PAD.top - PAD.bottom;

const PLAYOFF_LINE = 95;   // typical wild-card threshold for a full 82-game season
const SEASON_GAMES = 82;

const SERIES = {
  diff: { label: 'Goal Diff (running)', color: '#F74902', accent: true },
  gf:   { label: 'Goals For (cumulative)', color: '#10B981' },
  ga:   { label: 'Goals Against (cumulative)', color: '#EF4444' },
  form: { label: 'Form % (last 5)', color: '#8AB4FF' },
  pts:  { label: 'Points (cumulative)', color: '#FFA85C' },
};

const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Build a path string from points relative to the SVG plot area.
const pathFrom = (values, yMin, yMax, n) => {
  if (!values.length || yMax === yMin) return '';
  const span = n ?? values.length;
  return values.map((v, i) => {
    const x = PAD.left + (span <= 1 ? 0 : (i / (span - 1)) * PLOT_W);
    const y = PAD.top + PLOT_H - ((v - yMin) / (yMax - yMin)) * PLOT_H;
    return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(' ');
};

const xForIndex = (i, n) => PAD.left + (n <= 1 ? 0 : (i / (n - 1)) * PLOT_W);
const yForCum = (v, scale) => PAD.top + PLOT_H - ((v - scale.min) / Math.max(1, scale.max - scale.min)) * PLOT_H;

export const Trends = ({ schedule, roster, clubStats }) => {
  const [active, setActive] = useState({ diff: true, gf: true, ga: true, form: false, pts: true });
  const [hoverIdx, setHoverIdx] = useState(null);
  const [playerId, setPlayerId] = useState('');
  const [playerStat, setPlayerStat] = useState('points'); // 'points' | 'goals'
  const [rollWindow, setRollWindow] = useState(10);
  const [histOverlay, setHistOverlay] = useState(null);
  const svgRef = useRef(null);

  // Trends curves and per-game splits are about the regular-season race,
  // so we filter out playoff games (gameType 3). Including them would
  // push the cumulative points curve past the actual final standings
  // total once the postseason starts, which is misleading.
  const games = useMemo(() => {
    const finished = schedule?.games || [];
    return [...finished]
      .filter((g) => g.gameType !== 3)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [schedule]);

  const series = useMemo(() => {
    const gf = []; const ga = []; const diff = []; const pts = []; const form = [];
    let cgf = 0; let cga = 0; let cpts = 0;
    games.forEach((g, i) => {
      cgf += g.us;
      cga += g.them;
      gf.push(cgf);
      ga.push(cga);
      diff.push(cgf - cga);
      const isOTSO = g.lastPeriodType === 'OT' || g.lastPeriodType === 'SO';
      cpts += g.w ? 2 : isOTSO ? 1 : 0;
      pts.push(cpts);
      const window = games.slice(Math.max(0, i - 4), i + 1);
      const wins = window.filter((x) => x.w).length;
      form.push((wins / window.length) * 100);
    });
    return { gf, ga, diff, pts, form };
  }, [games]);

  // Player game-log fetch — only on demand. NHL endpoint shape:
  //   v1/player/{id}/game-log/{season}/{gameType=2|3}
  // Returns gameLog: [{ gameDate, gameId, points, goals, assists, ... }]
  const seasonStr = schedule?.games?.[0]?.date ? (() => {
    const yr = parseInt(schedule.games[0].date.slice(0, 4), 10);
    // Season is YYYYZZZZ where ZZZZ = YYYY+1; games in Jan-Jun belong to (yr-1, yr).
    const month = parseInt(schedule.games[0].date.slice(5, 7), 10);
    const startYr = month >= 8 ? yr : yr - 1;
    return `${startYr}${startYr + 1}`;
  })() : null;
  const playerLogPath = playerId && seasonStr ? `v1/player/${playerId}/game-log/${seasonStr}/2` : null;
  const playerLogRaw = useNHL(playerLogPath, 0);

  // Map gameId → cumulative player stat aligned to the team games array.
  const playerSeries = useMemo(() => {
    if (!playerId || !playerLogRaw.data?.gameLog) return null;
    const byGameId = new Map();
    for (const entry of playerLogRaw.data.gameLog) {
      const v = playerStat === 'goals' ? (entry.goals || 0) : (entry.points || 0);
      byGameId.set(entry.gameId, v);
    }
    let cum = 0;
    const out = [];
    for (const g of games) {
      cum += byGameId.get(g.id) || 0;
      out.push(cum);
    }
    return out;
  }, [playerId, playerLogRaw.data, games, playerStat]);

  const playerName = playerLogRaw.data
    ? `${playerLogRaw.data.firstName?.default || ''} ${playerLogRaw.data.lastName?.default || ''}`.trim() || 'Player'
    : 'Player';

  // Rolling points% series from stats.js — uses the rolling-window toggle.
  const rollingPtsPct = useMemo(() => {
    if (games.length < rollWindow) return [];
    const windows = rollingWindow(games, rollWindow);
    return windows.map((w) => ({ index: w.index, value: (w.pointsPct ?? 0) * 100 }));
  }, [games, rollWindow]);

  // Historical season overlay data (cumulative points, trimmed to current N).
  const histSeason = useMemo(() => {
    if (!histOverlay) return null;
    const s = HISTORICAL_SEASONS.find((h) => h.id === histOverlay);
    if (!s) return null;
    return { ...s, pts: s.points.slice(0, N) };
  }, [histOverlay, N]);

  // Projected pace — extend cumulative points to game 82 using the current
  // points-per-game rate. Drawn as a faint dashed extension of the pts line.
  const N = games.length;
  const pace = useMemo(() => {
    if (N === 0) return null;
    const ppg = series.pts[N - 1] / N;
    return { ppg, projected82: Math.round(ppg * SEASON_GAMES) };
  }, [series.pts, N]);

  const yScales = useMemo(() => {
    const cumulative = [];
    if (active.gf)   cumulative.push(...series.gf);
    if (active.ga)   cumulative.push(...series.ga);
    if (active.diff) cumulative.push(...series.diff);
    if (active.pts)  cumulative.push(...series.pts);
    if (playerSeries) cumulative.push(...playerSeries);
    if (histSeason) cumulative.push(...histSeason.pts);
    // If pts is active, extend the y-axis to fit projected pace + threshold.
    if (active.pts && pace) cumulative.push(pace.projected82, PLAYOFF_LINE);
    if (cumulative.length === 0) cumulative.push(0, 1);
    const cumMin = Math.min(0, ...cumulative);
    const cumMax = Math.max(1, ...cumulative);
    const cumPad = Math.max(2, (cumMax - cumMin) * 0.08);
    return {
      cum: { min: Math.floor(cumMin - cumPad), max: Math.ceil(cumMax + cumPad) },
      form: { min: 0, max: 100 },
    };
  }, [series, active, playerSeries, pace, histSeason]);

  // Rolling 10-game window stats (over the most recent 10 finished games).
  const last10 = useMemo(() => {
    if (N === 0) return null;
    const window = games.slice(Math.max(0, N - 10));
    const w = window.filter((g) => g.w).length;
    const l = window.length - w;
    const gf = window.reduce((s, g) => s + g.us, 0);
    const ga = window.reduce((s, g) => s + g.them, 0);
    const otso = window.filter((g) => !g.w && (g.lastPeriodType === 'OT' || g.lastPeriodType === 'SO')).length;
    const points = w * 2 + otso;
    return { n: window.length, w, l, gf, ga, diff: gf - ga, points, pace: window.length ? +(points / window.length * SEASON_GAMES).toFixed(0) : 0 };
  }, [games, N]);

  // Cross-game situational splits: home/away, rest-day buckets, monthly.
  // All derived from the same games array we already use elsewhere on the
  // page — each split is a small accumulator that buckets games and rolls
  // up record + GF + GA + diff so we can show "where are the points coming
  // from" instead of just season totals.
  const splits = useMemo(() => {
    const empty = () => ({ n: 0, w: 0, gf: 0, ga: 0 });
    const accumulate = (b, g) => {
      b.n++;
      if (g.w) b.w++;
      b.gf += g.us;
      b.ga += g.them;
    };
    const home = empty(), away = empty();
    const restB2B = empty(), restStd = empty(), restLong = empty();
    const months = new Map();

    games.forEach((g, i) => {
      accumulate(g.home ? home : away, g);

      // Rest days: gap to the prior chronological game (games is asc by date).
      const prev = games[i - 1];
      let rest = null;
      if (prev) {
        const ms = new Date(g.date).getTime() - new Date(prev.date).getTime();
        rest = Math.max(0, Math.floor(ms / 86400000));
      }
      if (rest != null) {
        if (rest <= 1) accumulate(restB2B, g);
        else if (rest <= 3) accumulate(restStd, g);
        else accumulate(restLong, g);
      }

      const ym = g.date.slice(0, 7); // YYYY-MM
      if (!months.has(ym)) months.set(ym, empty());
      accumulate(months.get(ym), g);
    });

    const monthList = [...months.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([ym, b]) => {
        const [y, m] = ym.split('-');
        return { ym, label: MONTH_ABBR[parseInt(m, 10) - 1] + ' ' + y.slice(2), ...b };
      });

    return { home, away, restB2B, restStd, restLong, months: monthList };
  }, [games]);

  // Decisions split — REG / OT / SO outcomes from lastPeriodType.
  const decisions = useMemo(() => {
    const acc = { regW: 0, regL: 0, otW: 0, otL: 0, soW: 0, soL: 0 };
    games.forEach((g) => {
      const t = g.lastPeriodType || 'REG';
      if (g.w) {
        if (t === 'OT') acc.otW++; else if (t === 'SO') acc.soW++; else acc.regW++;
      } else {
        if (t === 'OT') acc.otL++; else if (t === 'SO') acc.soL++; else acc.regL++;
      }
    });
    return acc;
  }, [games]);

  if (N === 0) {
    return (
      <div className="p-3 md:p-5 space-y-3">
        <h1 className="text-[20px] font-semibold tracking-tight">Trends</h1>
        <Section title="Season Trajectory">
          <div className="p-10 text-center text-[12px] font-mono text-white/40">No games yet this season.</div>
        </Section>
      </div>
    );
  }

  // Y-axis ticks (cumulative scale)
  const ticks = (() => {
    const min = yScales.cum.min;
    const max = yScales.cum.max;
    const range = max - min;
    const step = Math.max(1, Math.ceil(range / 5));
    const out = [];
    for (let v = Math.floor(min / step) * step; v <= max; v += step) out.push(v);
    return out;
  })();

  // X-axis: game-number ticks every ~10 games + month boundary markers.
  const xTicks = [];
  for (let i = 0; i < N; i += Math.max(1, Math.floor(N / 10))) xTicks.push(i);
  if (!xTicks.includes(N - 1)) xTicks.push(N - 1);

  const monthMarks = (() => {
    const seen = new Set();
    const out = [];
    games.forEach((g, i) => {
      const ym = g.date.slice(0, 7);
      if (!seen.has(ym)) {
        seen.add(ym);
        const month = parseInt(g.date.slice(5, 7), 10);
        out.push({ idx: i, label: MONTH_ABBR[month - 1] });
      }
    });
    return out;
  })();

  // Pointer → nearest game index. Uses SVG viewBox coords by mapping client
  // x to plot-area x.
  const handleMove = (e) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const xRatio = (e.clientX - rect.left) / rect.width;
    const xViewBox = xRatio * W;
    const localX = xViewBox - PAD.left;
    if (localX < 0 || localX > PLOT_W) { setHoverIdx(null); return; }
    const idx = Math.round((localX / PLOT_W) * (N - 1));
    setHoverIdx(Math.max(0, Math.min(N - 1, idx)));
  };
  const handleLeave = () => setHoverIdx(null);
  const handleClick = () => {
    if (hoverIdx == null) return;
    const g = games[hoverIdx];
    if (g?.id) navigate(gameHref(g.id));
  };

  // Threshold + projected-pace path math (only relevant if pts active).
  const thresholdY = yForCum(PLAYOFF_LINE, yScales.cum);
  const showThreshold = active.pts && PLAYOFF_LINE >= yScales.cum.min && PLAYOFF_LINE <= yScales.cum.max;

  // Build a virtual extended pts line from the last actual game out to game 82.
  // Uses an extended x-axis where game 82 sits at the right edge.
  const extPts = active.pts && pace ? (() => {
    if (N >= SEASON_GAMES) return null;
    const lastVal = series.pts[N - 1];
    const lastX = xForIndex(N - 1, N);
    // Map "future" games onto remaining space proportionally to N→82.
    const scaleX = (gameNum) => PAD.left + (gameNum / (N - 1)) * PLOT_W;
    // We'll project across the full plot width by interpreting indices >N-1
    // as a continuation of the same per-index step.
    const dx = (PLOT_W / Math.max(1, N - 1));
    const remaining = SEASON_GAMES - N;
    const endX = lastX + dx * remaining;
    const endY = yForCum(lastVal + pace.ppg * remaining, yScales.cum);
    return { lastX, lastY: yForCum(lastVal, yScales.cum), endX, endY, scaleX };
  })() : null;

  // Roster from adaptRoster is shaped { forwards, defense, goalies } with
  // each player exposing { id, name, num, pos, ... } — flatten skaters from
  // forwards + defense and sort alphabetically by surname for the picker.
  const skaters = [...(roster?.forwards || []), ...(roster?.defense || [])]
    .slice()
    .sort((a, b) => {
      const la = a.name.split(' ').slice(-1)[0] || '';
      const lb = b.name.split(' ').slice(-1)[0] || '';
      return la.localeCompare(lb);
    });
  const goalies = roster?.goalies || [];

  return (
    <div className="p-3 md:p-5 space-y-3">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[20px] font-semibold tracking-tight">Trends</h1>
          <p className="text-[12px] text-white/45 mt-1 font-mono">
            Season trajectory · {N} games · cumulative + rolling form
            {pace && active.pts && <> · projected <span className="text-[#FFA85C]">{pace.projected82} pts</span></>}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {Object.entries(SERIES).map(([key, s]) => (
            <button
              key={key}
              onClick={() => setActive((a) => ({ ...a, [key]: !a[key] }))}
              className={cx(
                'flex items-center gap-1.5 px-2.5 h-7 rounded-md border text-[11px] font-mono transition-colors',
                active[key]
                  ? 'border-white/15 bg-white/[0.04] text-white'
                  : 'border-white/[0.06] bg-white/[0.01] text-white/45 hover:text-white/75'
              )}
            >
              <span className="w-2 h-2 rounded-full" style={{ background: s.color, opacity: active[key] ? 1 : 0.4 }} />
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Player overlay picker */}
      {(skaters.length > 0 || goalies.length > 0) && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-mono text-white/40 uppercase tracking-wider">Player overlay</span>
          <select
            value={playerId}
            onChange={(e) => setPlayerId(e.target.value)}
            className="h-7 px-2 bg-white/[0.03] border border-white/[0.08] hover:border-white/20 text-[11px] font-mono text-white/85 rounded-md outline-none focus:border-[#FF8A4C]/50"
          >
            <option value="">— none —</option>
            {skaters.length > 0 && (
              <optgroup label="Skaters">
                {skaters.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} · {p.pos} #{p.num}</option>
                ))}
              </optgroup>
            )}
          </select>
          {playerId && (
            <>
              <div className="flex items-center gap-1 border border-white/[0.08] rounded-md overflow-hidden">
                {['points', 'goals'].map((k) => (
                  <button
                    key={k}
                    onClick={() => setPlayerStat(k)}
                    className={cx('px-2 h-7 text-[11px] font-mono transition-colors',
                      playerStat === k ? 'bg-white/[0.06] text-white' : 'text-white/45 hover:text-white/75'
                    )}
                  >
                    {k}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setPlayerId('')}
                className="text-[11px] font-mono text-white/45 hover:text-white/85"
              >
                clear
              </button>
              {playerLogRaw.loading && (
                <span className="text-[10px] font-mono text-white/35">loading…</span>
              )}
            </>
          )}
        </div>
      )}

      {/* Rolling window + historical overlay controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-[10px] font-mono text-white/40 uppercase tracking-wider">Rolling pts%</span>
        <div className="flex items-center gap-1 border border-white/[0.08] rounded-md overflow-hidden">
          {[5, 10, 20].map((w) => (
            <button
              key={w}
              onClick={() => setRollWindow(w)}
              className={cx('px-2 h-7 text-[11px] font-mono transition-colors',
                rollWindow === w ? 'bg-white/[0.06] text-white' : 'text-white/45 hover:text-white/75'
              )}
            >
              {w}g
            </button>
          ))}
        </div>
        <span className="text-[10px] font-mono text-white/40 uppercase tracking-wider ml-2">Historical overlay</span>
        <select
          value={histOverlay || ''}
          onChange={(e) => setHistOverlay(e.target.value || null)}
          className="h-7 px-2 bg-white/[0.03] border border-white/[0.08] hover:border-white/20 text-[11px] font-mono text-white/85 rounded-md outline-none focus:border-[#FF8A4C]/50"
        >
          <option value="">— none —</option>
          {HISTORICAL_SEASONS.map((s) => (
            <option key={s.id} value={s.id}>{s.label}</option>
          ))}
        </select>
        {histOverlay && (
          <button
            onClick={() => setHistOverlay(null)}
            className="text-[11px] font-mono text-white/45 hover:text-white/85"
          >
            clear
          </button>
        )}
      </div>

      <Section title="Season Trajectory" action={<span className="text-[10px] font-mono text-white/40">cumulative · multi-axis</span>}>
        <div className="p-3 sm:p-4">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${W} ${H}`}
            width="100%"
            height="auto"
            className="block cursor-crosshair"
            onMouseMove={handleMove}
            onMouseLeave={handleLeave}
            onClick={handleClick}
          >
            {/* Plot area background */}
            <rect x={PAD.left} y={PAD.top} width={PLOT_W} height={PLOT_H} fill="rgba(255,255,255,0.01)" />

            {/* Y grid + labels (cumulative scale) */}
            {ticks.map((t) => {
              const y = yForCum(t, yScales.cum);
              return (
                <g key={t}>
                  <line x1={PAD.left} y1={y} x2={PAD.left + PLOT_W} y2={y}
                    stroke="rgba(255,255,255,0.05)" strokeDasharray="2 4" />
                  <text x={PAD.left - 6} y={y + 3} textAnchor="end"
                    fontSize="9" fill="rgba(255,255,255,0.35)" fontFamily="ui-monospace, SF Mono, monospace">
                    {t}
                  </text>
                </g>
              );
            })}

            {/* Right axis labels for form (0-100) */}
            {active.form && [0, 25, 50, 75, 100].map((p) => {
              const y = PAD.top + PLOT_H - (p / 100) * PLOT_H;
              return (
                <text key={p} x={PAD.left + PLOT_W + 6} y={y + 3}
                  fontSize="9" fill="rgba(138,180,255,0.5)" fontFamily="ui-monospace, SF Mono, monospace">
                  {p}%
                </text>
              );
            })}

            {/* Playoff threshold line */}
            {showThreshold && (
              <g>
                <line x1={PAD.left} x2={PAD.left + PLOT_W} y1={thresholdY} y2={thresholdY}
                  stroke="rgba(255,168,92,0.35)" strokeWidth="1" strokeDasharray="4 3" />
                <text x={PAD.left + PLOT_W - 4} y={thresholdY - 3} textAnchor="end"
                  fontSize="9" fill="rgba(255,168,92,0.7)" fontFamily="ui-monospace, SF Mono, monospace">
                  playoff line · {PLAYOFF_LINE} pts
                </text>
              </g>
            )}

            {/* Projected pace extension (clipped to visible plot extents). */}
            {extPts && (
              <g>
                <line
                  x1={extPts.lastX} y1={extPts.lastY}
                  x2={Math.min(PAD.left + PLOT_W, extPts.endX)}
                  y2={extPts.lastY + (extPts.endY - extPts.lastY) * Math.min(1, (PAD.left + PLOT_W - extPts.lastX) / Math.max(1, extPts.endX - extPts.lastX))}
                  stroke={SERIES.pts.color} strokeWidth="1.4" strokeDasharray="3 4" opacity="0.55"
                />
              </g>
            )}

            {/* Zero line for diff (if visible in range) */}
            {active.diff && yScales.cum.min < 0 && yScales.cum.max > 0 && (
              <line
                x1={PAD.left} x2={PAD.left + PLOT_W}
                y1={yForCum(0, yScales.cum)} y2={yForCum(0, yScales.cum)}
                stroke="rgba(255,255,255,0.18)" strokeWidth="1"
              />
            )}

            {/* Series — stable order, fade inactive */}
            {[
              ['ga', series.ga, yScales.cum],
              ['gf', series.gf, yScales.cum],
              ['pts', series.pts, yScales.cum],
              ['diff', series.diff, yScales.cum],
              ['form', series.form, yScales.form],
            ].map(([key, vals, scale]) => active[key] && (
              <g key={key}>
                <path
                  d={pathFrom(vals, scale.min, scale.max, N)}
                  fill="none"
                  stroke={SERIES[key].color}
                  strokeWidth={SERIES[key].accent ? 2.4 : 1.6}
                  opacity={SERIES[key].accent ? 1 : 0.85}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
                {vals.length > 0 && (() => {
                  const x = xForIndex(vals.length - 1, N);
                  const lastY = PAD.top + PLOT_H - ((vals[vals.length - 1] - scale.min) / Math.max(1, scale.max - scale.min)) * PLOT_H;
                  return (
                    <g>
                      <circle cx={x} cy={lastY} r="3" fill={SERIES[key].color} />
                      <text x={x + 6} y={lastY + 3} fontSize="10"
                        fill={SERIES[key].color} fontFamily="ui-monospace, SF Mono, monospace">
                        {key === 'form' ? `${Math.round(vals[vals.length - 1])}%` : vals[vals.length - 1]}
                      </text>
                    </g>
                  );
                })()}
              </g>
            ))}

            {/* Player overlay line — drawn on top, lavender. */}
            {playerSeries && (
              <g>
                <path
                  d={pathFrom(playerSeries, yScales.cum.min, yScales.cum.max, N)}
                  fill="none"
                  stroke="#C4B5FD"
                  strokeWidth="1.8"
                  opacity="0.9"
                  strokeDasharray="0"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
                {playerSeries.length > 0 && (() => {
                  const x = xForIndex(playerSeries.length - 1, N);
                  const y = yForCum(playerSeries[playerSeries.length - 1], yScales.cum);
                  return (
                    <g>
                      <circle cx={x} cy={y} r="3" fill="#C4B5FD" />
                      <text x={x + 6} y={y + 3} fontSize="10"
                        fill="#C4B5FD" fontFamily="ui-monospace, SF Mono, monospace">
                        {playerName.split(' ').slice(-1)[0]} {playerSeries[playerSeries.length - 1]}
                      </text>
                    </g>
                  );
                })()}
              </g>
            )}

            {/* Rolling points% line — uses form (0-100) scale, right axis */}
            {rollingPtsPct.length > 0 && (
              <g>
                <path
                  d={rollingPtsPct.map((p, i) => {
                    const x = xForIndex(p.index, N);
                    const y = PAD.top + PLOT_H - (p.value / 100) * PLOT_H;
                    return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
                  }).join(' ')}
                  fill="none"
                  stroke="#FBBF24"
                  strokeWidth="1.6"
                  opacity="0.8"
                  strokeDasharray="4 2"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
                {(() => {
                  const last = rollingPtsPct[rollingPtsPct.length - 1];
                  const x = xForIndex(last.index, N);
                  const y = PAD.top + PLOT_H - (last.value / 100) * PLOT_H;
                  return (
                    <g>
                      <circle cx={x} cy={y} r="3" fill="#FBBF24" />
                      <text x={x + 6} y={y + 3} fontSize="10"
                        fill="#FBBF24" fontFamily="ui-monospace, SF Mono, monospace">
                        {Math.round(last.value)}% ({rollWindow}g)
                      </text>
                    </g>
                  );
                })()}
              </g>
            )}

            {/* Historical season overlay line — cumulative points */}
            {histSeason && histSeason.pts.length > 0 && (
              <g>
                <path
                  d={pathFrom(histSeason.pts, yScales.cum.min, yScales.cum.max, N)}
                  fill="none"
                  stroke="#A78BFA"
                  strokeWidth="1.4"
                  opacity="0.65"
                  strokeDasharray="6 3"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
                {(() => {
                  const lastIdx = histSeason.pts.length - 1;
                  const x = xForIndex(lastIdx, N);
                  const y = yForCum(histSeason.pts[lastIdx], yScales.cum);
                  return (
                    <g>
                      <circle cx={x} cy={y} r="3" fill="#A78BFA" opacity="0.7" />
                      <text x={x + 6} y={y + 3} fontSize="10"
                        fill="#A78BFA" fontFamily="ui-monospace, SF Mono, monospace" opacity="0.85">
                        {histSeason.id} · {histSeason.pts[lastIdx]}
                      </text>
                    </g>
                  );
                })()}
              </g>
            )}

            {/* W/L color strip directly below plot */}
            {games.map((g, i) => {
              const x1 = xForIndex(i, N);
              const x2 = xForIndex(i + 1, N);
              const w = i === N - 1 ? Math.max(2, PLOT_W / N) : Math.max(1.5, x2 - x1);
              const stripY = PAD.top + PLOT_H + 4;
              return (
                <rect key={`wl-${i}`}
                  x={x1 - w / 2} y={stripY}
                  width={w} height={STRIP_H}
                  fill={g.w ? '#10B981' : '#EF4444'}
                  opacity={hoverIdx === i ? 1 : 0.55}
                />
              );
            })}

            {/* Month boundary marks — ~14px below the W/L strip */}
            {monthMarks.map((m) => {
              const x = xForIndex(m.idx, N);
              return (
                <g key={`m-${m.idx}`}>
                  <line x1={x} y1={PAD.top} x2={x} y2={PAD.top + PLOT_H}
                    stroke="rgba(255,255,255,0.05)" strokeDasharray="1 4" />
                  <text x={x} y={PAD.top + PLOT_H + STRIP_H + 16} textAnchor="middle"
                    fontSize="10" fill="rgba(255,255,255,0.55)" fontFamily="ui-monospace, SF Mono, monospace">
                    {m.label}
                  </text>
                </g>
              );
            })}

            {/* X-axis tick labels (game number) — separate row, ~16px below months */}
            {xTicks.map((i) => {
              const x = xForIndex(i, N);
              return (
                <text key={`g-${i}`} x={x} y={PAD.top + PLOT_H + STRIP_H + 32} textAnchor="middle"
                  fontSize="9" fill="rgba(255,255,255,0.32)" fontFamily="ui-monospace, SF Mono, monospace">
                  #{i + 1}
                </text>
              );
            })}

            {/* Hover guide + tooltip */}
            {hoverIdx != null && (() => {
              const g = games[hoverIdx];
              const x = xForIndex(hoverIdx, N);
              // Tooltip dims — flip side near right edge.
              const TT_W = 160;
              const TT_H = 12 + 14 * (
                1 + // header date
                (active.diff ? 1 : 0) + (active.gf ? 1 : 0) + (active.ga ? 1 : 0) +
                (active.pts ? 1 : 0) + (active.form ? 1 : 0) +
                (playerSeries ? 1 : 0) +
                (rollingPtsPct.length > 0 ? 1 : 0) +
                (histSeason ? 1 : 0) +
                1 // result row
              );
              const flip = x + TT_W + 12 > PAD.left + PLOT_W;
              const tx = flip ? x - TT_W - 8 : x + 8;
              const ty = Math.max(PAD.top + 4, Math.min(PAD.top + PLOT_H - TT_H - 4, PAD.top + 8));
              let row = 0;
              const rowY = () => ty + 18 + 14 * row++;
              return (
                <g pointerEvents="none">
                  <line x1={x} x2={x} y1={PAD.top} y2={PAD.top + PLOT_H}
                    stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
                  <rect x={tx} y={ty} width={TT_W} height={TT_H} rx="4"
                    fill="rgba(8,8,8,0.96)" stroke="rgba(255,255,255,0.12)" />
                  <text x={tx + 8} y={ty + 14} fontSize="10" fill="rgba(255,255,255,0.85)"
                    fontFamily="ui-monospace, SF Mono, monospace" fontWeight="600">
                    Game {hoverIdx + 1} · {g.date.slice(5)}
                  </text>
                  <text x={tx + 8} y={rowY()} fontSize="10"
                    fill={g.w ? '#10B981' : '#EF4444'} fontFamily="ui-monospace, SF Mono, monospace">
                    {g.w ? 'W' : 'L'} {g.us}–{g.them} {g.home ? 'vs' : '@'} {g.opp}
                    {g.lastPeriodType && g.lastPeriodType !== 'REG' ? ` (${g.lastPeriodType})` : ''}
                  </text>
                  {active.diff && (
                    <text x={tx + 8} y={rowY()} fontSize="10" fill={SERIES.diff.color} fontFamily="ui-monospace, SF Mono, monospace">
                      diff · {series.diff[hoverIdx] > 0 ? '+' : ''}{series.diff[hoverIdx]}
                    </text>
                  )}
                  {active.gf && (
                    <text x={tx + 8} y={rowY()} fontSize="10" fill={SERIES.gf.color} fontFamily="ui-monospace, SF Mono, monospace">
                      GF · {series.gf[hoverIdx]}
                    </text>
                  )}
                  {active.ga && (
                    <text x={tx + 8} y={rowY()} fontSize="10" fill={SERIES.ga.color} fontFamily="ui-monospace, SF Mono, monospace">
                      GA · {series.ga[hoverIdx]}
                    </text>
                  )}
                  {active.pts && (
                    <text x={tx + 8} y={rowY()} fontSize="10" fill={SERIES.pts.color} fontFamily="ui-monospace, SF Mono, monospace">
                      PTS · {series.pts[hoverIdx]}
                    </text>
                  )}
                  {active.form && (
                    <text x={tx + 8} y={rowY()} fontSize="10" fill={SERIES.form.color} fontFamily="ui-monospace, SF Mono, monospace">
                      form · {Math.round(series.form[hoverIdx])}%
                    </text>
                  )}
                  {playerSeries && (
                    <text x={tx + 8} y={rowY()} fontSize="10" fill="#C4B5FD" fontFamily="ui-monospace, SF Mono, monospace">
                      {playerName.split(' ').slice(-1)[0]} · {playerSeries[hoverIdx]} {playerStat === 'goals' ? 'G' : 'P'}
                    </text>
                  )}
                  {rollingPtsPct.length > 0 && (() => {
                    const entry = rollingPtsPct.find((p) => p.index === hoverIdx);
                    return entry ? (
                      <text x={tx + 8} y={rowY()} fontSize="10" fill="#FBBF24" fontFamily="ui-monospace, SF Mono, monospace">
                        roll pts% · {Math.round(entry.value)}% ({rollWindow}g)
                      </text>
                    ) : null;
                  })()}
                  {histSeason && hoverIdx < histSeason.pts.length && (
                    <text x={tx + 8} y={rowY()} fontSize="10" fill="#A78BFA" fontFamily="ui-monospace, SF Mono, monospace">
                      {histSeason.id} · {histSeason.pts[hoverIdx]} pts
                    </text>
                  )}
                  <text x={tx + 8} y={ty + TT_H - 5} fontSize="9" fill="rgba(255,255,255,0.4)" fontFamily="ui-monospace, SF Mono, monospace">
                    click → game tape
                  </text>
                </g>
              );
            })()}

          </svg>
          <div className="mt-1.5 text-center text-[10px] font-mono text-white/35">
            click any point to open the game tape
          </div>
        </div>
      </Section>

      {/* Compact summary tiles for current values */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { l: 'Goal Diff', v: (series.diff[N - 1] > 0 ? '+' : '') + series.diff[N - 1], color: '#F74902' },
          { l: 'Goals For', v: series.gf[N - 1], color: '#10B981' },
          { l: 'Goals Ag.', v: series.ga[N - 1], color: '#EF4444' },
          { l: 'Points',    v: series.pts[N - 1], color: '#FFA85C' },
          { l: 'L5 Form',   v: `${Math.round(series.form[N - 1])}%`, color: '#8AB4FF' },
        ].map((t) => (
          <div key={t.l} className="border border-white/[0.06] bg-[#0C0C0C]/60 rounded-md px-3 py-2.5">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ background: t.color }} />
              <span className="text-[10px] font-mono text-white/40 uppercase tracking-wider">{t.l}</span>
            </div>
            <div className="text-[20px] font-semibold tabular-nums tracking-tight mt-1" style={{ color: t.color }}>{t.v}</div>
          </div>
        ))}
      </div>

      {/* Bottom: rolling 10-game + decisions split side-by-side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {last10 && (
          <Section title={`Last ${last10.n} Games`} action={<span className="text-[10px] font-mono text-white/40">rolling window</span>}>
            <div className="grid grid-cols-3 gap-px bg-white/[0.04]">
              {[
                { l: 'Record',  v: `${last10.w}-${last10.l}`,                             tone: last10.w >= last10.l ? '#10B981' : '#EF4444' },
                { l: 'Points',  v: `${last10.points} · ${last10.pace}-pt pace`,           tone: '#FFA85C' },
                { l: 'Goal Diff', v: `${last10.diff > 0 ? '+' : ''}${last10.diff}`,       tone: last10.diff >= 0 ? '#10B981' : '#EF4444' },
                { l: 'Goals For',  v: `${last10.gf} · ${(last10.gf / Math.max(1, last10.n)).toFixed(1)}/g`, tone: '#10B981' },
                { l: 'Goals Ag.',  v: `${last10.ga} · ${(last10.ga / Math.max(1, last10.n)).toFixed(1)}/g`, tone: '#EF4444' },
                { l: 'Win %',      v: `${Math.round(100 * last10.w / Math.max(1, last10.n))}%`,             tone: '#8AB4FF' },
              ].map((t) => (
                <div key={t.l} className="bg-[#0C0C0C] px-3 py-2.5">
                  <div className="text-[10px] font-mono text-white/40 uppercase tracking-wider">{t.l}</div>
                  <div className="text-[14px] font-semibold tabular-nums mt-1" style={{ color: t.tone }}>{t.v}</div>
                </div>
              ))}
            </div>
          </Section>
        )}

        <Section title="Result Decisions" action={<span className="text-[10px] font-mono text-white/40">REG · OT · SO</span>}>
          <div className="p-4">
            <div className="grid grid-cols-3 gap-3">
              {[
                { l: 'Regulation', w: decisions.regW, l_: decisions.regL },
                { l: 'Overtime',   w: decisions.otW,  l_: decisions.otL },
                { l: 'Shootout',   w: decisions.soW,  l_: decisions.soL },
              ].map((d) => {
                const tot = d.w + d.l_;
                const wPct = tot ? (d.w / tot) * 100 : 0;
                return (
                  <div key={d.l} className="border border-white/[0.06] rounded-md p-3 bg-white/[0.01]">
                    <div className="text-[10px] font-mono text-white/40 uppercase tracking-wider">{d.l}</div>
                    <div className="text-[18px] font-semibold tabular-nums mt-1">
                      <span className="text-[#10B981]">{d.w}</span>
                      <span className="text-white/30 mx-1">–</span>
                      <span className="text-[#EF4444]">{d.l_}</span>
                    </div>
                    <div className="mt-2 h-1 w-full bg-white/[0.04] rounded-full overflow-hidden">
                      <div className="h-full bg-[#10B981]" style={{ width: `${wPct}%` }} />
                    </div>
                    <div className="text-[10px] font-mono text-white/40 mt-1">
                      {tot ? `${tot} game${tot === 1 ? '' : 's'} · ${Math.round(wPct)}% W` : 'no games'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Section>
      </div>

      <SituationalSplits splits={splits} clubStats={clubStats} />
    </div>
  );
};

// Cross-game situational splits — three ways to slice the season:
// venue (home/away), rest days (B2B / standard / 4+), and month-by-month.
// Each card shows record + diff + GF/GA per game so you can spot where the
// points are actually coming from instead of just the season totals.
const SplitCard = ({ label, sub, b }) => {
  const tot = b?.n || 0;
  const w = b?.w || 0;
  const l = tot - w;
  const gf = b?.gf || 0;
  const ga = b?.ga || 0;
  const diff = gf - ga;
  const gfPg = tot ? gf / tot : 0;
  const gaPg = tot ? ga / tot : 0;
  const wPct = tot ? (w / tot) * 100 : 0;
  return (
    <div className="border border-white/[0.06] rounded-md p-3 bg-white/[0.01]">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[10px] font-mono text-white/40 uppercase tracking-wider">{label}</span>
        <span className="text-[9px] font-mono text-white/30 tabular-nums">{tot} GP</span>
      </div>
      <div className="text-[18px] font-semibold tabular-nums mt-1">
        <span className="text-[#10B981]">{w}</span>
        <span className="text-white/30 mx-1">–</span>
        <span className="text-[#EF4444]">{l}</span>
      </div>
      {sub && <div className="text-[9px] font-mono text-white/35 mt-0.5">{sub}</div>}
      <div className="mt-2 h-1 w-full bg-white/[0.04] rounded-full overflow-hidden">
        <div className="h-full bg-[#10B981]" style={{ width: `${wPct}%` }} />
      </div>
      <div className="grid grid-cols-3 gap-1 mt-2 text-[10px] font-mono tabular-nums">
        <div>
          <div className="text-white/30 text-[9px] uppercase tracking-wider">GF/g</div>
          <div className="text-[#10B981]">{gfPg.toFixed(2)}</div>
        </div>
        <div>
          <div className="text-white/30 text-[9px] uppercase tracking-wider">GA/g</div>
          <div className="text-[#EF4444]">{gaPg.toFixed(2)}</div>
        </div>
        <div>
          <div className="text-white/30 text-[9px] uppercase tracking-wider">Diff</div>
          <div className={diff > 0 ? 'text-[#FF8A4C]' : diff < 0 ? 'text-red-400' : 'text-white/50'}>
            {diff > 0 ? '+' : ''}{diff}
          </div>
        </div>
      </div>
    </div>
  );
};

const SituationalSplits = ({ splits, clubStats }) => {
  const { home, away, restB2B, restStd, restLong, months } = splits;

  // Strength-state goal breakdown from clubStats skater aggregates.
  const strengthSplit = useMemo(() => {
    const skaters = clubStats?.skaters;
    if (!skaters?.length) return null;
    const totalG = skaters.reduce((s, p) => s + (p.g || 0), 0);
    const ppG = skaters.reduce((s, p) => s + (p.ppGoals || 0), 0);
    const shG = skaters.reduce((s, p) => s + (p.shGoals || 0), 0);
    const evG = totalG - ppG - shG;
    const ppPts = skaters.reduce((s, p) => s + (p.ppPts || 0), 0);
    return { totalG, ppG, shG, evG, ppPts };
  }, [clubStats]);

  return (
    <div className="space-y-3">
      {/* Strength-state goal breakdown */}
      {strengthSplit && strengthSplit.totalG > 0 && (
        <Section title="Strength State Splits" action={<span className="text-[10px] font-mono text-white/40">5v5 · PP · SH</span>}>
          <div className="p-3 space-y-3">
            {/* Stacked bar showing EV / PP / SH proportions */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-3 text-[10px] font-mono text-white/50">
                <span className="flex items-center gap-1"><span className="w-2 h-2 bg-[#10B981] rounded-sm" /> Even Strength</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 bg-[#FF8A4C] rounded-sm" /> Power Play</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 bg-[#8AB4FF] rounded-sm" /> Shorthanded</span>
              </div>
              <div className="flex h-4 w-full rounded-md overflow-hidden">
                <div className="bg-[#10B981]" style={{ width: `${(strengthSplit.evG / strengthSplit.totalG * 100).toFixed(1)}%` }} />
                <div className="bg-[#FF8A4C]" style={{ width: `${(strengthSplit.ppG / strengthSplit.totalG * 100).toFixed(1)}%` }} />
                <div className="bg-[#8AB4FF]" style={{ width: `${(strengthSplit.shG / strengthSplit.totalG * 100).toFixed(1)}%` }} />
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="border border-white/[0.06] rounded-md p-3 bg-white/[0.01]">
                <div className="text-[10px] font-mono text-white/40 uppercase tracking-wider">Even Strength</div>
                <div className="text-[18px] font-semibold tabular-nums mt-1 text-[#10B981]">{strengthSplit.evG}</div>
                <div className="text-[9px] font-mono text-white/35 mt-0.5">{(strengthSplit.evG / strengthSplit.totalG * 100).toFixed(1)}% of goals</div>
              </div>
              <div className="border border-white/[0.06] rounded-md p-3 bg-white/[0.01]">
                <div className="text-[10px] font-mono text-white/40 uppercase tracking-wider">Power Play</div>
                <div className="text-[18px] font-semibold tabular-nums mt-1 text-[#FF8A4C]">{strengthSplit.ppG}</div>
                <div className="text-[9px] font-mono text-white/35 mt-0.5">{(strengthSplit.ppG / strengthSplit.totalG * 100).toFixed(1)}% of goals</div>
              </div>
              <div className="border border-white/[0.06] rounded-md p-3 bg-white/[0.01]">
                <div className="text-[10px] font-mono text-white/40 uppercase tracking-wider">Shorthanded</div>
                <div className="text-[18px] font-semibold tabular-nums mt-1 text-[#8AB4FF]">{strengthSplit.shG}</div>
                <div className="text-[9px] font-mono text-white/35 mt-0.5">{strengthSplit.shG} SHG scored</div>
              </div>
              <div className="border border-white/[0.06] rounded-md p-3 bg-white/[0.01]">
                <div className="text-[10px] font-mono text-white/40 uppercase tracking-wider">PP Points</div>
                <div className="text-[18px] font-semibold tabular-nums mt-1 text-[#FF8A4C]">{strengthSplit.ppPts}</div>
                <div className="text-[9px] font-mono text-white/35 mt-0.5">goals + assists on PP</div>
              </div>
            </div>
          </div>
        </Section>
      )}

      <Section title="Venue Split" action={<span className="text-[10px] font-mono text-white/40">home vs road</span>}>
        <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <SplitCard label="Home" sub="at WFC" b={home} />
          <SplitCard label="Away" sub="on the road" b={away} />
        </div>
      </Section>

      <Section title="Rest Day Split" action={<span className="text-[10px] font-mono text-white/40">days since last game</span>}>
        <div className="p-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <SplitCard label="Back-to-back" sub="0–1 day rest" b={restB2B} />
          <SplitCard label="Standard" sub="2–3 days rest" b={restStd} />
          <SplitCard label="Rested" sub="4+ days rest" b={restLong} />
        </div>
      </Section>

      {months.length > 0 && (
        <Section title="Month-by-Month" action={<span className="text-[10px] font-mono text-white/40">rolling chronological</span>}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-[10px] font-mono text-white/35 uppercase tracking-wider border-b border-white/[0.05]">
                  <th className="font-normal text-left px-4 h-9">Month</th>
                  <th className="font-normal text-right px-2 h-9 w-[44px]">GP</th>
                  <th className="font-normal text-right px-2 h-9 w-[64px]">Record</th>
                  <th className="font-normal text-right px-2 h-9 w-[60px]">GF</th>
                  <th className="font-normal text-right px-2 h-9 w-[60px]">GA</th>
                  <th className="font-normal text-right px-2 h-9 w-[64px]">Diff</th>
                  <th className="font-normal text-right px-4 h-9 w-[80px]">Win %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {months.map((m) => {
                  const l = m.n - m.w;
                  const diff = m.gf - m.ga;
                  const wPct = m.n ? Math.round((m.w / m.n) * 100) : 0;
                  return (
                    <tr key={m.ym} className="hover:bg-white/[0.02]">
                      <td className="px-4 h-10 text-[12px]">{m.label}</td>
                      <td className="px-2 text-right text-[11px] font-mono tabular-nums text-white/55">{m.n}</td>
                      <td className="px-2 text-right text-[12px] font-mono tabular-nums">
                        <span className="text-[#10B981]">{m.w}</span>
                        <span className="text-white/25">–</span>
                        <span className="text-[#EF4444]">{l}</span>
                      </td>
                      <td className="px-2 text-right text-[11px] font-mono tabular-nums text-[#10B981]">{m.gf}</td>
                      <td className="px-2 text-right text-[11px] font-mono tabular-nums text-[#EF4444]">{m.ga}</td>
                      <td className={cx('px-2 text-right text-[11px] font-mono tabular-nums',
                        diff > 0 ? 'text-[#FF8A4C]' : diff < 0 ? 'text-red-400' : 'text-white/50'
                      )}>
                        {diff > 0 ? '+' : ''}{diff}
                      </td>
                      <td className="px-4 text-right text-[11px] font-mono tabular-nums text-white/70">{wPct}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Section>
      )}
    </div>
  );
};
