import { cx } from '../config.js';
import { useCountUp } from '../api.js';
import { Label, Delta, Skeleton } from './primitives.jsx';
import { Sparkline } from './charts.jsx';

export const KPI = ({ label, value, sub, delta, sparkData, trendColor, loading }) => {
  // Smooth count-up for numeric values; strings pass through unchanged.
  const animated = useCountUp(typeof value === 'number' ? value : value);
  return (
    <div className="min-w-0 border border-white/[0.06] bg-[#0C0C0C]/60 backdrop-blur-sm rounded-md px-3 py-2.5 hover:border-white/[0.12] hover:bg-[#0F0F10]/80 hover:-translate-y-px transition-all duration-200">
      <div className="flex items-start justify-between mb-1.5">
        <Label>{label}</Label>
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
            <span className="text-[22px] font-semibold tracking-tight tabular-nums leading-none">{animated}</span>
            {sub && <span className="text-[10px] text-white/40 font-mono">{sub}</span>}
          </div>
          {sparkData && (
            <div className="mt-2 -mx-0.5">
              <Sparkline data={sparkData} h={20} stroke={trendColor || '#F74902'} />
            </div>
          )}
        </>
      )}
    </div>
  );
};
