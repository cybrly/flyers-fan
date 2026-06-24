import { useMemo } from 'react';
import { Section } from './primitives.jsx';
import { todaysHistory } from '../data/flyersHistory.js';
import { useTeam } from '../teamContext.jsx';
import { useRecords } from '../api.js';
import { adaptRecords } from '../lib/records.js';
import { franchiseIdFor, teamIdFor } from '../config.js';

// Dashboard heritage panel. The Flyers have a hand-curated, dated
// "this day in history" set, so PHI keeps that. Every other franchise gets a
// real "Franchise Heritage" card sourced live from the NHL Records API
// (Stanley Cups, founding season, retired numbers) — so the panel works for
// all 32 teams on both hosts instead of being hidden off flyers.fan.

export const ThisDayInHistory = () => {
  const { teamAbbr, teamName, isPHI } = useTeam();
  if (isPHI) return <FlyersThisDay />;
  return <FranchiseHeritage abbr={teamAbbr} name={teamName} />;
};

const FlyersThisDay = () => {
  const entries = useMemo(() => todaysHistory(), []);
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
              <div className="text-[22px] font-semibold tabular-nums text-[var(--team-accent)] leading-none">{e.year}</div>
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

const FranchiseHeritage = ({ abbr, name }) => {
  const fid = franchiseIdFor(abbr);
  const tid = teamIdFor(abbr);
  const totals = useRecords(fid ? `franchise-team-totals?cayenneExp=franchiseId=${fid}` : null);
  const seasons = useRecords(fid ? `franchise-season-results?cayenneExp=franchiseId=${fid}` : null);
  const detail = useRecords(tid ? `franchise-detail?cayenneExp=mostRecentTeamId=${tid}` : null);
  const rec = useMemo(
    () => adaptRecords({ totals: totals.data, seasons: seasons.data, detail: detail.data }),
    [totals.data, seasons.data, detail.data],
  );

  if (!rec.hasData) return null;

  const rows = [];
  if (rec.firstSeason) rows.push({ k: 'Founded', v: rec.firstSeason });
  rows.push({ k: 'Stanley Cups', v: rec.allTime.cups, sub: rec.cupWins.join(', ') || null });
  if (rec.bestSeasons[0]) rows.push({ k: 'Best Season', v: `${rec.bestSeasons[0].points} pts`, sub: rec.bestSeasons[0].season });
  if (rec.retiredNumbers.length) rows.push({ k: 'Retired Numbers', v: rec.retiredNumbers.length });

  return (
    <Section
      title="Franchise Heritage"
      action={<span className="text-[10px] font-mono text-white/40 uppercase tracking-wider">{name || abbr}</span>}
    >
      <div className="divide-y divide-white/[0.04]">
        {rows.map((r, i) => (
          <div key={i} className="px-4 py-2.5 flex items-baseline justify-between gap-4">
            <span className="text-[11px] font-mono uppercase tracking-wider text-white/55">{r.k}</span>
            <span className="text-right min-w-0">
              <span className="text-[15px] font-semibold tabular-nums text-[var(--team-accent)]">{r.v}</span>
              {r.sub && <span className="block text-[10px] font-mono text-white/40 truncate">{r.sub}</span>}
            </span>
          </div>
        ))}
      </div>
    </Section>
  );
};
