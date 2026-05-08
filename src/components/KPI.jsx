import { cx } from '../config.js';
import { useCountUp } from '../api.js';
import { Label, Delta, Skeleton } from './primitives.jsx';
import { Sparkline } from './charts.jsx';

// Semantic tone palette. Border + bg are subtle accent washes; valueColor
// is the strong hex used for the headline number and the sparkline stroke
// when no override is provided. Keep these pre-computed so we don't churn
// Tailwind class lookups inside the hot render path.
const TONES = {
  default: { wrap: 'border-[#F74902]/[0.18] bg-[#0C0C0C]/60 hover:border-[#F74902]/35',
             value: 'text-white', spark: '#F74902', dot: null },
  good:    { wrap: 'border-emerald-500/15 bg-emerald-500/[0.04] hover:border-emerald-500/30',
             value: 'text-emerald-400', spark: '#10B981', dot: 'bg-emerald-400' },
  bad:     { wrap: 'border-red-500/15 bg-red-500/[0.04] hover:border-red-500/30',
             value: 'text-red-400', spark: '#EF4444', dot: 'bg-red-400' },
  warm:    { wrap: 'border-[#F74902]/20 bg-[#F74902]/[0.05] hover:border-[#F74902]/35',
             value: 'text-[#FF8A4C]', spark: '#F74902', dot: 'bg-[#F74902]' },
  cool:    { wrap: 'border-sky-500/15 bg-sky-500/[0.03] hover:border-sky-500/30',
             value: 'text-sky-300', spark: '#38BDF8', dot: 'bg-sky-400' },
  amber:   { wrap: 'border-amber-500/15 bg-amber-500/[0.04] hover:border-amber-500/30',
             value: 'text-amber-300', spark: '#F59E0B', dot: 'bg-amber-400' },
};

export const KPI = ({ label, value, sub, delta, sparkData, trendColor, loading, tone = 'default', rank, rankOf = 32 }) => {
  const animated = useCountUp(typeof value === 'number' ? value : value);
  const t = TONES[tone] || TONES.default;
  const sparkColor = trendColor || t.spark;
  return (
    <div className={cx(
      'min-w-0 border backdrop-blur-sm rounded-md px-3 py-2.5 hover:bg-[#0F0F10]/80 hover:-translate-y-px transition-all duration-200',
      t.wrap,
    )}>
      <div className="flex items-start justify-between mb-1.5">
        <span className="flex items-center gap-1.5 min-w-0">
          {t.dot && <span className={cx('w-1.5 h-1.5 rounded-full shrink-0', t.dot)} />}
          <Label>{label}</Label>
        </span>
        {delta !== undefined && !loading && <Delta value={delta} />}
      </div>
      {loading ? (
        <>
          <Skeleton className="w-20" height={22} />
          <div className="mt-2"><Skeleton className="w-full" height={18} /></div>
        </>
      ) : (
        <>
          <div className="flex items-baseline gap-1.5">
            <span className={cx('text-[22px] font-semibold tracking-tight tabular-nums leading-none', t.value)}>
              {animated}
            </span>
            {sub && <span className="text-[10px] text-white/40 font-mono">{sub}</span>}
          </div>
          {rank != null && (
            <div className="mt-0.5 text-[9px] font-mono tabular-nums text-white/30">
              #{rank} <span className="text-white/20">/ {rankOf}</span>
            </div>
          )}
          {sparkData && (
            <div className="mt-2 -mx-0.5">
              <Sparkline data={sparkData} h={20} stroke={sparkColor} />
            </div>
          )}
        </>
      )}
    </div>
  );
};
