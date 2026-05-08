// Game Script / Momentum Chart — visualizes cumulative shot attempt
// differential (Corsi) or xG differential over the course of a game.
// Positive values = PHI dominance, negative = opponent dominance.

import React, { useMemo, useId } from 'react';
import { cx, TEAM_ABBR } from '../config.js';
import { Section, Label } from './primitives.jsx';
import { computeXG, tagShotContext } from '../lib/xg.js';
import { parseStrengthState } from '../lib/stats.js';

const SHOT_KINDS = new Set(['shot-on-goal', 'goal', 'missed-shot', 'blocked-shot']);
const XG_KINDS = new Set(['shot-on-goal', 'goal', 'missed-shot']);

/**
 * MomentumChart — SVG game script visualization.
 *
 * @param {object} props
 * @param {object[]} props.events - PBP events (newest first from adapters — we reverse)
 * @param {boolean} props.isHome - whether PHI is the home team
 * @param {'corsi'|'xg'} [props.mode='corsi'] - what to chart
 * @param {number} [props.periods=3] - number of regulation periods
 */
export function MomentumChart({ events, isHome, mode: initialMode, periods = 3 }) {
  const gradientId = useId().replace(/:/g, '');
  const [mode, setMode] = React.useState(initialMode || 'corsi');

  const data = useMemo(() => {
    if (!events?.length) return [];
    const chrono = [...events].reverse();
    const tagged = tagShotContext(chrono);

    const kinds = mode === 'xg' ? XG_KINDS : SHOT_KINDS;
    let cumDiff = 0;
    const points = [{ gameSeconds: 0, diff: 0, period: 1, state: '5v5' }];

    for (const e of tagged) {
      if (!kinds.has(e.kind)) continue;
      const [m, s] = (e.time || '0:00').split(':').map(Number);
      const elapsed = ((e.period - 1) * 1200) + (m || 0) * 60 + (s || 0);
      const state = parseStrengthState(e.situationCode, isHome);

      if (mode === 'xg') {
        const xg = computeXG({ x: e.xCoord ?? 0, y: e.yCoord ?? 0, shotType: e.shotType, emptyNet: e.emptyNet, isRebound: e.isRebound, isRush: e.isRush });
        cumDiff += e.us ? xg : -xg;
      } else {
        cumDiff += e.us ? 1 : -1;
      }

      points.push({ gameSeconds: elapsed, diff: cumDiff, period: e.period, state, kind: e.kind, us: e.us, summary: e.summary });
    }

    return points;
  }, [events, isHome, mode]);

  if (!data.length || data.length < 2) {
    return (
      <Section title="Game Momentum">
        <div className="p-6 text-center text-[12px] text-white/40 font-mono">
          Not enough play-by-play data to chart momentum.
        </div>
      </Section>
    );
  }

  const W = 600;
  const H = 180;
  const PAD = { top: 20, right: 16, bottom: 28, left: 40 };
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const maxSeconds = periods * 1200;
  const maxAbsDiff = Math.max(1, ...data.map((d) => Math.abs(d.diff)));

  const x = (sec) => PAD.left + (sec / maxSeconds) * plotW;
  const y = (diff) => PAD.top + plotH / 2 - (diff / maxAbsDiff) * (plotH / 2);
  const midY = PAD.top + plotH / 2;

  const linePath = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${x(d.gameSeconds).toFixed(1)},${y(d.diff).toFixed(1)}`).join(' ');

  // Area fill (positive = orange, negative = white/grey)
  const areaAbove = `${linePath} L${x(data[data.length - 1].gameSeconds)},${midY} L${x(0)},${midY} Z`;

  // Goal markers
  const goals = data.filter((d) => d.kind === 'goal');

  // Period dividers
  const periodLines = [];
  for (let p = 1; p < periods; p++) {
    periodLines.push(p * 1200);
  }

  return (
    <Section
      title="Game Momentum"
      action={
        <div className="flex items-center gap-0.5 p-0.5 border border-white/[0.08] rounded-md bg-white/[0.02]">
          {[
            { id: 'corsi', label: 'Corsi' },
            { id: 'xg', label: 'xG' },
          ].map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMode(m.id)}
              className={cx(
                'px-2 h-5 text-[10px] font-medium rounded-[3px] transition-colors',
                mode === m.id ? 'bg-white/[0.08] text-white' : 'text-white/50 hover:text-white',
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
      }
    >
      <div className="px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <div className="text-[11px] text-white/50">
            <span className="text-[#FF8A4C] font-medium">PHI advantage</span> above the line,
            opponent below
          </div>
          <div className="flex items-center gap-3 text-[10px] font-mono text-white/40">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#F74902]" /> PHI goal</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-white/40" /> OPP goal</span>
          </div>
        </div>

        <svg width="100%" viewBox={`0 0 ${W} ${H}`} className="block">
          <defs>
            <linearGradient id={`${gradientId}-above`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F74902" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#F74902" stopOpacity="0" />
            </linearGradient>
            <linearGradient id={`${gradientId}-below`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="white" stopOpacity="0" />
              <stop offset="100%" stopColor="white" stopOpacity="0.08" />
            </linearGradient>
            <clipPath id={`${gradientId}-clipAbove`}>
              <rect x={PAD.left} y={PAD.top} width={plotW} height={plotH / 2} />
            </clipPath>
            <clipPath id={`${gradientId}-clipBelow`}>
              <rect x={PAD.left} y={midY} width={plotW} height={plotH / 2} />
            </clipPath>
          </defs>

          {/* Zero line */}
          <line x1={PAD.left} y1={midY} x2={PAD.left + plotW} y2={midY} stroke="rgba(255,255,255,0.12)" strokeDasharray="3 3" />

          {/* Period dividers */}
          {periodLines.map((sec) => (
            <line key={sec} x1={x(sec)} y1={PAD.top} x2={x(sec)} y2={PAD.top + plotH} stroke="rgba(255,255,255,0.08)" />
          ))}

          {/* Period labels */}
          {Array.from({ length: periods }).map((_, i) => (
            <text key={i} x={x(i * 1200 + 600)} y={H - 6} textAnchor="middle" className="fill-white/25 text-[9px] font-mono">
              P{i + 1}
            </text>
          ))}

          {/* Area fills */}
          <g clipPath={`url(#${gradientId}-clipAbove)`}>
            <path d={areaAbove} fill={`url(#${gradientId}-above)`} />
          </g>
          <g clipPath={`url(#${gradientId}-clipBelow)`}>
            <path d={areaAbove} fill={`url(#${gradientId}-below)`} />
          </g>

          {/* Main line */}
          <path d={linePath} fill="none" stroke="#F74902" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />

          {/* Goal markers */}
          {goals.map((g, i) => (
            <circle
              key={i}
              cx={x(g.gameSeconds)}
              cy={y(g.diff)}
              r={4}
              fill={g.us ? '#F74902' : 'rgba(255,255,255,0.6)'}
              stroke={g.us ? '#FF8A4C' : 'rgba(255,255,255,0.3)'}
              strokeWidth="1.5"
            >
              <title>{g.summary}</title>
            </circle>
          ))}

          {/* Y-axis labels */}
          <text x={PAD.left - 4} y={PAD.top + 4} textAnchor="end" className="fill-[#FF8A4C]/60 text-[9px] font-mono">
            +{mode === 'xg' ? maxAbsDiff.toFixed(1) : maxAbsDiff}
          </text>
          <text x={PAD.left - 4} y={PAD.top + plotH} textAnchor="end" className="fill-white/30 text-[9px] font-mono">
            -{mode === 'xg' ? maxAbsDiff.toFixed(1) : maxAbsDiff}
          </text>

          {/* Final value annotation */}
          {data.length > 1 && (
            <text
              x={x(data[data.length - 1].gameSeconds) + 6}
              y={y(data[data.length - 1].diff) + 3}
              className={cx(
                'text-[10px] font-mono font-medium',
                data[data.length - 1].diff >= 0 ? 'fill-[#FF8A4C]' : 'fill-red-400',
              )}
            >
              {data[data.length - 1].diff >= 0 ? '+' : ''}{mode === 'xg' ? data[data.length - 1].diff.toFixed(1) : data[data.length - 1].diff}
            </text>
          )}
        </svg>
      </div>
    </Section>
  );
}
