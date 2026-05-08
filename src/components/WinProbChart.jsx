// Win Probability Chart — shows PHI's estimated win probability over
// the course of a game, updated at each goal and period boundary.

import React, { useMemo, useId } from 'react';
import { cx } from '../config.js';
import { Section } from './primitives.jsx';
import { winProbTimeline } from '../lib/winprob.js';

/**
 * @param {object} props
 * @param {object[]} props.events - PBP events (newest first — we reverse)
 * @param {object} props.gameInfo - { isHome, homeStrength, awayStrength }
 * @param {string} [props.oppAbbr] - opponent abbreviation for labels
 */
export function WinProbChart({ events, gameInfo, oppAbbr = 'OPP' }) {
  const gradientId = useId().replace(/:/g, '');

  const timeline = useMemo(() => {
    if (!events?.length) return [];
    const chrono = [...events].reverse();
    return winProbTimeline(chrono, gameInfo);
  }, [events, gameInfo]);

  if (timeline.length < 2) {
    return (
      <Section title="Win Probability">
        <div className="p-6 text-center text-[12px] text-white/40 font-mono">
          Not enough data to compute win probability.
        </div>
      </Section>
    );
  }

  const W = 600;
  const H = 160;
  const PAD = { top: 16, right: 16, bottom: 28, left: 40 };
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;

  const maxSeconds = Math.max(3600, ...timeline.map((t) => t.gameSeconds));
  const x = (sec) => PAD.left + (sec / maxSeconds) * plotW;
  const y = (wp) => PAD.top + plotH - wp * plotH;
  const midY = y(0.5);

  const linePath = timeline.map((t, i) =>
    `${i === 0 ? 'M' : 'L'}${x(t.gameSeconds).toFixed(1)},${y(t.wp).toFixed(1)}`
  ).join(' ');

  // Area above 50%
  const areaPath = `${linePath} L${x(timeline[timeline.length - 1].gameSeconds)},${midY} L${x(0)},${midY} Z`;

  // Goal events only
  const goals = timeline.filter((t) => t.event === 'goal');

  // Final WP
  const finalWP = timeline[timeline.length - 1]?.wp ?? 0.5;

  return (
    <Section
      title="Win Probability"
      action={
        <span className={cx(
          'text-[11px] font-mono font-medium',
          finalWP >= 0.5 ? 'text-[#FF8A4C]' : 'text-red-400',
        )}>
          Final: {(finalWP * 100).toFixed(0)}%
        </span>
      }
    >
      <div className="px-4 py-3">
        <div className="flex items-center justify-between mb-2 text-[10px] font-mono text-white/40">
          <span>PHI win probability over game time</span>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#F74902]" /> PHI goal</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-white/40" /> {oppAbbr} goal</span>
          </div>
        </div>

        <svg width="100%" viewBox={`0 0 ${W} ${H}`} className="block">
          <defs>
            <linearGradient id={`${gradientId}-wp`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F74902" stopOpacity="0.20" />
              <stop offset="100%" stopColor="#F74902" stopOpacity="0" />
            </linearGradient>
            <clipPath id={`${gradientId}-clipAbove`}>
              <rect x={PAD.left} y={PAD.top} width={plotW} height={midY - PAD.top} />
            </clipPath>
          </defs>

          {/* 50% baseline */}
          <line x1={PAD.left} y1={midY} x2={PAD.left + plotW} y2={midY} stroke="rgba(255,255,255,0.15)" strokeDasharray="4 4" />

          {/* Reference lines at 25% and 75% */}
          <line x1={PAD.left} y1={y(0.75)} x2={PAD.left + plotW} y2={y(0.75)} stroke="rgba(255,255,255,0.05)" />
          <line x1={PAD.left} y1={y(0.25)} x2={PAD.left + plotW} y2={y(0.25)} stroke="rgba(255,255,255,0.05)" />

          {/* Period dividers */}
          {[1200, 2400].map((sec) => (
            <line key={sec} x1={x(sec)} y1={PAD.top} x2={x(sec)} y2={PAD.top + plotH} stroke="rgba(255,255,255,0.08)" />
          ))}

          {/* Period labels */}
          {[0, 1, 2].map((i) => (
            <text key={i} x={x(i * 1200 + 600)} y={H - 6} textAnchor="middle" className="fill-white/25 text-[9px] font-mono">
              P{i + 1}
            </text>
          ))}

          {/* Area fill above 50% */}
          <g clipPath={`url(#${gradientId}-clipAbove)`}>
            <path d={areaPath} fill={`url(#${gradientId}-wp)`} />
          </g>

          {/* Main probability line */}
          <path d={linePath} fill="none" stroke="#F74902" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

          {/* Goal markers */}
          {goals.map((g, i) => (
            <g key={i}>
              <circle
                cx={x(g.gameSeconds)}
                cy={y(g.wp)}
                r={4.5}
                fill={g.us ? '#F74902' : 'rgba(255,255,255,0.5)'}
                stroke={g.us ? '#FF8A4C' : 'rgba(255,255,255,0.3)'}
                strokeWidth="1.5"
              />
              <text
                x={x(g.gameSeconds)}
                y={y(g.wp) + (g.us ? -10 : 14)}
                textAnchor="middle"
                className={cx('text-[9px] font-mono', g.us ? 'fill-[#FF8A4C]' : 'fill-white/50')}
              >
                {(g.wp * 100).toFixed(0)}%
              </text>
            </g>
          ))}

          {/* Y-axis labels */}
          <text x={PAD.left - 4} y={y(1) + 4} textAnchor="end" className="fill-[#FF8A4C]/50 text-[9px] font-mono">100%</text>
          <text x={PAD.left - 4} y={midY + 3} textAnchor="end" className="fill-white/30 text-[9px] font-mono">50%</text>
          <text x={PAD.left - 4} y={y(0)} textAnchor="end" className="fill-white/20 text-[9px] font-mono">0%</text>

          {/* Team labels */}
          <text x={PAD.left + 4} y={y(0.92)} className="fill-[#FF8A4C]/40 text-[9px] font-mono">PHI favored</text>
          <text x={PAD.left + 4} y={y(0.08) + 10} className="fill-white/20 text-[9px] font-mono">{oppAbbr} favored</text>
        </svg>
      </div>
    </Section>
  );
}
