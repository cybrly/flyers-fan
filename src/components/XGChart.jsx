// Expected Goals (xG) visualization — cumulative xG flow chart for a
// single game, reusable on GameTape and Trends pages.

import React, { useMemo, useId } from 'react';
import { cx, TEAM_ABBR } from '../config.js';
import { Section, Label, Chip } from './primitives.jsx';
import { cumulativeXG, tagShotContext, sumXG, computeXG } from '../lib/xg.js';

/**
 * XGSummary — compact xG comparison bar (inline, no chart).
 */
export function XGSummary({ events, isHome }) {
  const xg = useMemo(() => {
    if (!events?.length) return null;
    const chrono = [...events].reverse();
    const tagged = tagShotContext(chrono);
    return cumulativeXG(tagged, TEAM_ABBR);
  }, [events]);

  if (!xg) return null;

  const total = xg.totalUs + xg.totalThem;
  const usPct = total > 0 ? (xg.totalUs / total) * 100 : 50;

  return (
    <div className="flex items-center gap-3">
      <span className="text-[12px] font-mono tabular-nums text-[var(--team-accent)] font-medium">
        {xg.totalUs.toFixed(1)}
      </span>
      <div className="flex-1 h-2 bg-white/[0.06] rounded-full overflow-hidden relative">
        <div
          className="absolute inset-y-0 left-0 bg-[var(--team-primary)]/60 rounded-l-full transition-all duration-500"
          style={{ width: `${usPct}%` }}
        />
      </div>
      <span className="text-[12px] font-mono tabular-nums text-white/60">
        {xg.totalThem.toFixed(1)}
      </span>
    </div>
  );
}

/**
 * XGChart — full cumulative xG flow chart.
 *
 * @param {object} props
 * @param {object[]} props.events - PBP events (newest first — we reverse)
 * @param {string} [props.oppAbbr] - opponent abbreviation
 * @param {number} [props.actualGoalsUs] - actual goals scored by PHI
 * @param {number} [props.actualGoalsThem] - actual goals scored by opponent
 */
export function XGChart({ events, oppAbbr = 'OPP', actualGoalsUs, actualGoalsThem }) {
  const gradientId = useId().replace(/:/g, '');

  const { usLine, themLine, totalUs, totalThem } = useMemo(() => {
    if (!events?.length) return { usLine: [], themLine: [], totalUs: 0, totalThem: 0 };
    const chrono = [...events].reverse();
    const tagged = tagShotContext(chrono);
    const result = cumulativeXG(tagged, TEAM_ABBR);

    const toLine = (arr) => arr.map((e) => {
      const [m, s] = (e.time || '0:00').split(':').map(Number);
      const gameSeconds = ((e.period - 1) * 1200) + (m || 0) * 60 + (s || 0);
      return { gameSeconds, cumXG: e.cumXG, kind: e.kind };
    });

    return {
      usLine: [{ gameSeconds: 0, cumXG: 0 }, ...toLine(result.us)],
      themLine: [{ gameSeconds: 0, cumXG: 0 }, ...toLine(result.them)],
      totalUs: result.totalUs,
      totalThem: result.totalThem,
    };
  }, [events]);

  if (!usLine.length || usLine.length < 2) {
    return (
      <Section title="Expected Goals (xG)">
        <div className="p-6 text-center text-[12px] text-white/40 font-mono">
          Not enough shot data to compute xG.
        </div>
      </Section>
    );
  }

  const W = 600;
  const H = 160;
  const PAD = { top: 16, right: 60, bottom: 28, left: 40 };
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;

  const maxSeconds = 3600;
  const maxXG = Math.max(1, totalUs, totalThem) * 1.15;

  const sx = (sec) => PAD.left + (sec / maxSeconds) * plotW;
  const sy = (xg) => PAD.top + plotH - (xg / maxXG) * plotH;

  const makePath = (line) => line.map((d, i) => `${i === 0 ? 'M' : 'L'}${sx(d.gameSeconds).toFixed(1)},${sy(d.cumXG).toFixed(1)}`).join(' ');

  const usPath = makePath(usLine);
  const themPath = makePath(themLine);

  const diff = totalUs - totalThem;
  const diffLabel = `${diff >= 0 ? '+' : ''}${diff.toFixed(1)} xG`;

  return (
    <Section
      title="Expected Goals (xG)"
      action={
        <Chip tone={diff >= 0 ? 'orange' : 'muted'}>
          {diffLabel}
        </Chip>
      }
    >
      <div className="px-4 py-3">
        {/* Actual vs Expected comparison */}
        <div className="grid grid-cols-2 gap-px bg-white/[0.04] rounded-md overflow-hidden mb-3">
          <div className="bg-[#0C0C0C] p-2.5">
            <Label>{TEAM_ABBR}</Label>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-[18px] font-semibold tabular-nums text-[var(--team-accent)]">{totalUs.toFixed(1)}</span>
              <span className="text-[10px] font-mono text-white/40">xG</span>
              {actualGoalsUs != null && (
                <span className={cx(
                  'text-[11px] font-mono',
                  actualGoalsUs > totalUs + 0.5 ? 'text-emerald-400' :
                  actualGoalsUs < totalUs - 0.5 ? 'text-red-400' : 'text-white/40',
                )}>
                  ({actualGoalsUs}G actual)
                </span>
              )}
            </div>
          </div>
          <div className="bg-[#0C0C0C] p-2.5">
            <Label>{oppAbbr}</Label>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-[18px] font-semibold tabular-nums text-white/70">{totalThem.toFixed(1)}</span>
              <span className="text-[10px] font-mono text-white/40">xG</span>
              {actualGoalsThem != null && (
                <span className={cx(
                  'text-[11px] font-mono',
                  actualGoalsThem > totalThem + 0.5 ? 'text-red-400' :
                  actualGoalsThem < totalThem - 0.5 ? 'text-emerald-400' : 'text-white/40',
                )}>
                  ({actualGoalsThem}G actual)
                </span>
              )}
            </div>
          </div>
        </div>

        <svg width="100%" viewBox={`0 0 ${W} ${H}`} className="block">
          <defs>
            <linearGradient id={`${gradientId}-us`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--team-primary)" stopOpacity="0.15" />
              <stop offset="100%" stopColor="var(--team-primary)" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Period dividers */}
          {[1200, 2400].map((sec) => (
            <line key={sec} x1={sx(sec)} y1={PAD.top} x2={sx(sec)} y2={PAD.top + plotH} stroke="rgba(255,255,255,0.08)" />
          ))}

          {/* Period labels */}
          {[0, 1, 2].map((i) => (
            <text key={i} x={sx(i * 1200 + 600)} y={H - 6} textAnchor="middle" className="fill-white/25 text-[9px] font-mono">
              P{i + 1}
            </text>
          ))}

          {/* PHI xG area + line */}
          <path d={`${usPath} L${sx(usLine[usLine.length - 1].gameSeconds)},${sy(0)} L${sx(0)},${sy(0)} Z`} fill={`url(#${gradientId}-us)`} />
          <path d={usPath} fill="none" stroke="var(--team-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

          {/* Opponent xG line */}
          <path d={themPath} fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="4 3" />

          {/* End labels */}
          <text x={sx(usLine[usLine.length - 1].gameSeconds) + 6} y={sy(totalUs) + 3} className="fill-[var(--team-accent)] text-[10px] font-mono font-medium">
            {totalUs.toFixed(1)}
          </text>
          <text x={sx(themLine[themLine.length - 1].gameSeconds) + 6} y={sy(totalThem) + 3} className="fill-white/45 text-[10px] font-mono">
            {totalThem.toFixed(1)}
          </text>

          {/* Y-axis */}
          <text x={PAD.left - 4} y={PAD.top + 4} textAnchor="end" className="fill-white/25 text-[9px] font-mono">{maxXG.toFixed(0)}</text>
          <text x={PAD.left - 4} y={sy(0)} textAnchor="end" className="fill-white/25 text-[9px] font-mono">0</text>

          {/* Legend */}
          <line x1={W - 55} y1={PAD.top + 4} x2={W - 40} y2={PAD.top + 4} stroke="var(--team-primary)" strokeWidth="2" />
          <text x={W - 36} y={PAD.top + 8} className="fill-[var(--team-accent)] text-[9px] font-mono">{TEAM_ABBR}</text>
          <line x1={W - 55} y1={PAD.top + 18} x2={W - 40} y2={PAD.top + 18} stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" strokeDasharray="4 3" />
          <text x={W - 36} y={PAD.top + 22} className="fill-white/40 text-[9px] font-mono">{oppAbbr}</text>
        </svg>

        <div className="mt-2 text-[10px] text-white/35 font-mono">
          xG measures shot quality based on distance, angle, and shot type. A higher xG means more dangerous chances.
        </div>
      </div>
    </Section>
  );
}
