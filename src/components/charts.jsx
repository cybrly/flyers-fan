import { useMemo } from 'react';
import { cx } from '../config.js';

let sparkSeq = 0;
export const Sparkline = ({ data, w = 120, h = 28, stroke = '#F74902' }) => {
  // Stable id per instance — generated once. Must run before any early return
  // to keep the hook order consistent across renders.
  const id = useMemo(() => `sg${++sparkSeq}`, []);
  if (!data || data.length < 2) return <div style={{ height: h }} />;
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => [
    (i / (data.length - 1)) * w,
    h - 2 - ((v - min) / range) * (h - 4),
  ]);
  const path = pts.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(' ');
  const area = `${path} L${w},${h} L0,${h} Z`;
  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="block">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.22" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} />
      <path d={path} fill="none" stroke={stroke} strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r={2} fill={stroke} />
    </svg>
  );
};

export const GoalDiffBars = ({ games, h = 56 }) => {
  const diffs = [...games].reverse().map((g) => g.us - g.them);
  const maxAbs = Math.max(1, ...diffs.map(Math.abs));
  const bw = 100 / Math.max(1, diffs.length);
  return (
    <svg width="100%" height={h} viewBox={`0 0 100 ${h}`} preserveAspectRatio="none">
      <line x1="0" y1={h / 2} x2="100" y2={h / 2} stroke="rgba(255,255,255,0.08)" strokeDasharray="1 2" />
      {diffs.map((d, i) => {
        const barH = (Math.abs(d) / maxAbs) * (h / 2 - 3);
        const y = d >= 0 ? h / 2 - barH : h / 2;
        return (
          <rect
            key={i}
            x={i * bw + 0.3} y={y}
            width={bw - 0.6} height={Math.max(barH, 1)}
            fill={d > 0 ? '#F74902' : d < 0 ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.1)'}
          />
        );
      })}
    </svg>
  );
};

export const FormDots = ({ games, size = 8 }) => (
  <div className="flex gap-[3px]">
    {[...games].reverse().map((g, i) => (
      <div
        key={i}
        title={`${g.label} · ${g.w ? 'W' : 'L'} ${g.home ? 'vs' : '@'} ${g.opp} ${g.us}-${g.them}`}
        className={cx('shrink-0', g.w ? 'bg-[#F74902]' : 'bg-white/15')}
        style={{ width: size, height: size, borderRadius: 1 }}
      />
    ))}
  </div>
);

export const MiniBar = ({ value, max, color = '#F74902', h = 4 }) => (
  <div className="relative bg-white/[0.04] w-full" style={{ height: h }}>
    <div
      className="absolute inset-y-0 left-0 transition-all duration-500"
      style={{ width: `${Math.min(100, (value / max) * 100)}%`, background: color }}
    />
  </div>
);
