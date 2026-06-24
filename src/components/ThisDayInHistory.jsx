import { useMemo } from 'react';
import { Section } from './primitives.jsx';
import { todaysHistory } from '../data/flyersHistory.js';
import { getHostScope } from '../host.js';

// Dashboard panel surfacing curated "on this day" events from Flyers
// history. Falls back gracefully on dates without any entries — the
// section returns null so the layout doesn't reserve dead space.
//
// The curated entries are Philadelphia-only, so this panel is team
// scope (flyers.fan) only. On league scope (scumbag.hockey) it would
// surface Flyers history under whatever team is selected, which is
// wrong — so we render nothing there rather than fabricate league-wide
// history.

export const ThisDayInHistory = () => {
  const isLeague = getHostScope() === 'league';
  const entries = useMemo(() => todaysHistory(), []);
  if (isLeague) return null;
  if (entries.length === 0) return null;

  const today = new Date();
  const todayLabel = today.toLocaleDateString(undefined, { month: 'long', day: 'numeric' });
  const yearsAgo = (year) => {
    const diff = today.getFullYear() - year;
    return diff === 0 ? 'this year' : `${diff} year${diff === 1 ? '' : 's'} ago`;
  };

  return (
    <Section
      title="This Day in Flyers History"
      action={<span className="text-[10px] font-mono text-white/40 uppercase tracking-wider">{todayLabel}</span>}
    >
      <div className="divide-y divide-white/[0.04]">
        {entries.map((e, i) => (
          <div key={i} className="px-4 py-3 grid grid-cols-[60px_1fr] gap-4 items-baseline">
            <div className="text-right">
              <div className="text-[22px] font-semibold tabular-nums text-[#FF8A4C] leading-none">{e.year}</div>
              <div className="text-[9px] font-mono text-white/35 mt-1 uppercase tracking-wider">{yearsAgo(e.year)}</div>
            </div>
            <div className="min-w-0">
              <div className="text-[13px] font-medium text-white/90">{e.title}</div>
              <p className="text-[11px] font-mono text-white/50 mt-1 leading-relaxed">{e.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
};
