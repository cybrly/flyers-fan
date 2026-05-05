import { useMemo, useState } from 'react';
import { cx } from '../config.js';
import { Section } from '../components/primitives.jsx';

// Season trajectory chart — multi-line plot of GF / GA / Diff (cumulative) and
// a 5-game rolling form line. All computed client-side from the schedule data
// we already fetch on the dashboard. SVG, no chart library.

const W = 1000;
const H = 280;
const PAD = { top: 16, right: 28, bottom: 28, left: 36 };
const PLOT_W = W - PAD.left - PAD.right;
const PLOT_H = H - PAD.top - PAD.bottom;

const SERIES = {
  diff: { label: 'Goal Diff (running)', color: '#F74902', accent: true },
  gf:   { label: 'Goals For (cumulative)', color: '#10B981' },
  ga:   { label: 'Goals Against (cumulative)', color: '#EF4444' },
  form: { label: 'Form % (last 5)', color: '#8AB4FF' },
  pts:  { label: 'Points (cumulative)', color: '#FFA85C' },
};

// Build a path string from points relative to the SVG plot area.
const pathFrom = (values, yMin, yMax) => {
  if (!values.length || yMax === yMin) return '';
  const n = values.length;
  return values.map((v, i) => {
    const x = PAD.left + (n === 1 ? 0 : (i / (n - 1)) * PLOT_W);
    const y = PAD.top + PLOT_H - ((v - yMin) / (yMax - yMin)) * PLOT_H;
    return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(' ');
};

export const Trends = ({ schedule }) => {
  const [active, setActive] = useState({ diff: true, gf: true, ga: true, form: false, pts: false });

  const games = useMemo(() => {
    const finished = schedule?.games || [];
    return [...finished].sort((a, b) => a.date.localeCompare(b.date)); // chrono
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
      // 2 pts for win, 1 for OT/SO loss, 0 for reg loss.
      const isOTSO = g.lastPeriodType === 'OT' || g.lastPeriodType === 'SO';
      cpts += g.w ? 2 : isOTSO ? 1 : 0;
      pts.push(cpts);
      // 5-game rolling win %
      const window = games.slice(Math.max(0, i - 4), i + 1);
      const wins = window.filter((x) => x.w).length;
      form.push((wins / window.length) * 100);
    });
    return { gf, ga, diff, pts, form };
  }, [games]);

  const yScales = useMemo(() => {
    // Two y-axes: one for cumulative goals/diff/pts (left side), one for
    // form % which is 0-100 (right side, only used when form is active).
    const cumulative = [];
    if (active.gf)   cumulative.push(...series.gf);
    if (active.ga)   cumulative.push(...series.ga);
    if (active.diff) cumulative.push(...series.diff);
    if (active.pts)  cumulative.push(...series.pts);
    if (cumulative.length === 0) cumulative.push(0, 1);
    const cumMin = Math.min(0, ...cumulative);
    const cumMax = Math.max(1, ...cumulative);
    const cumPad = Math.max(2, (cumMax - cumMin) * 0.08);
    return {
      cum: { min: Math.floor(cumMin - cumPad), max: Math.ceil(cumMax + cumPad) },
      form: { min: 0, max: 100 },
    };
  }, [series, active]);

  const N = games.length;
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
    const step = Math.ceil(range / 5);
    const out = [];
    for (let v = Math.floor(min / step) * step; v <= max; v += step) out.push(v);
    return out;
  })();

  // X-axis ticks at every ~10 games
  const xTicks = [];
  for (let i = 0; i < N; i += Math.max(1, Math.floor(N / 10))) xTicks.push(i);
  if (!xTicks.includes(N - 1)) xTicks.push(N - 1);

  return (
    <div className="p-3 md:p-5 space-y-3">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[20px] font-semibold tracking-tight">Trends</h1>
          <p className="text-[12px] text-white/45 mt-1 font-mono">
            Season trajectory · {N} games · cumulative + rolling form
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

      <Section title="Season Trajectory" action={<span className="text-[10px] font-mono text-white/40">cumulative · multi-axis</span>}>
        <div className="p-3 sm:p-4">
          <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="auto" className="block">
            {/* Plot area background */}
            <rect x={PAD.left} y={PAD.top} width={PLOT_W} height={PLOT_H} fill="rgba(255,255,255,0.01)" />

            {/* Y grid + labels (cumulative scale) */}
            {ticks.map((t) => {
              const y = PAD.top + PLOT_H - ((t - yScales.cum.min) / (yScales.cum.max - yScales.cum.min)) * PLOT_H;
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

            {/* Zero line for diff (if visible in range) */}
            {active.diff && yScales.cum.min < 0 && yScales.cum.max > 0 && (
              <line
                x1={PAD.left}
                x2={PAD.left + PLOT_W}
                y1={PAD.top + PLOT_H - ((0 - yScales.cum.min) / (yScales.cum.max - yScales.cum.min)) * PLOT_H}
                y2={PAD.top + PLOT_H - ((0 - yScales.cum.min) / (yScales.cum.max - yScales.cum.min)) * PLOT_H}
                stroke="rgba(255,255,255,0.18)" strokeWidth="1"
              />
            )}

            {/* Series — render in a stable order, fade inactive */}
            {[
              ['ga', series.ga, yScales.cum],
              ['gf', series.gf, yScales.cum],
              ['pts', series.pts, yScales.cum],
              ['diff', series.diff, yScales.cum],
              ['form', series.form, yScales.form],
            ].map(([key, vals, scale]) => active[key] && (
              <g key={key}>
                <path
                  d={pathFrom(vals, scale.min, scale.max)}
                  fill="none"
                  stroke={SERIES[key].color}
                  strokeWidth={SERIES[key].accent ? 2.4 : 1.6}
                  opacity={SERIES[key].accent ? 1 : 0.85}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
                {/* End marker */}
                {vals.length > 0 && (() => {
                  const x = PAD.left + ((vals.length - 1) / Math.max(1, N - 1)) * PLOT_W;
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

            {/* X-axis tick labels (game number) */}
            {xTicks.map((i) => {
              const x = PAD.left + (i / Math.max(1, N - 1)) * PLOT_W;
              return (
                <g key={i}>
                  <line x1={x} y1={PAD.top + PLOT_H} x2={x} y2={PAD.top + PLOT_H + 4} stroke="rgba(255,255,255,0.15)" />
                  <text x={x} y={PAD.top + PLOT_H + 16} textAnchor="middle"
                    fontSize="9" fill="rgba(255,255,255,0.35)" fontFamily="ui-monospace, SF Mono, monospace">
                    {i + 1}
                  </text>
                </g>
              );
            })}
            <text x={PAD.left + PLOT_W / 2} y={H - 4} textAnchor="middle"
              fontSize="9" fill="rgba(255,255,255,0.3)" fontFamily="ui-monospace, SF Mono, monospace">
              GAME #
            </text>
          </svg>
        </div>
      </Section>

      {/* Compact summary tiles for current values */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { l: 'Goal Diff', v: series.diff[N - 1], color: '#F74902' },
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
    </div>
  );
};
