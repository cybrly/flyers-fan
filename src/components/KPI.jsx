import { cx } from '../config.js';
import { Label, Delta, Skeleton } from './primitives.jsx';
import { Sparkline } from './charts.jsx';

export const KPI = ({ label, value, sub, delta, sparkData, trendColor, loading }) => (
  <div className="min-w-0 border border-white/[0.06] bg-[#0C0C0C]/60 backdrop-blur-sm rounded-md px-3 py-2.5 hover:border-white/[0.12] transition-colors">
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
          <span className="text-[22px] font-semibold tracking-tight tabular-nums leading-none">{value}</span>
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
