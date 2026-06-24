import { useMemo } from 'react';
import { franchiseIdFor, teamIdFor } from '../config.js';
import { useRecords } from '../api.js';
import { useTeam } from '../teamContext.jsx';
import { adaptRecords } from '../lib/records.js';
import { Section, SectionBand, Skeleton } from '../components/primitives.jsx';

// All-time franchise records, live from the NHL Records API
// (records.nhl.com via /api/records). Works for any team on both hosts — the
// selected franchise's all-time record, Stanley Cups, best seasons, and
// retired numbers, replacing the old hand-maintained Flyers-only tables.

const Stat = ({ label, value, sub }) => (
  <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-3">
    <div className="text-[10px] font-mono uppercase tracking-wider text-white/45">{label}</div>
    <div className="mt-1 text-[20px] sm:text-[22px] font-semibold tabular-nums text-white/90">{value}</div>
    {sub && <div className="text-[10px] font-mono text-[var(--team-accent)] mt-0.5">{sub}</div>}
  </div>
);

export const Records = () => {
  const { teamAbbr, teamName } = useTeam();
  const fid = franchiseIdFor(teamAbbr);
  const tid = teamIdFor(teamAbbr);

  const totals = useRecords(fid ? `franchise-team-totals?cayenneExp=franchiseId=${fid}` : null);
  const seasons = useRecords(fid ? `franchise-season-results?cayenneExp=franchiseId=${fid}` : null);
  const detail = useRecords(tid ? `franchise-detail?cayenneExp=mostRecentTeamId=${tid}` : null);

  const loading = totals.loading || seasons.loading || detail.loading;
  const rec = useMemo(
    () => adaptRecords({ totals: totals.data, seasons: seasons.data, detail: detail.data }),
    [totals.data, seasons.data, detail.data],
  );

  const a = rec.allTime;

  return (
    <div className="space-y-6">
      <SectionBand
        label="All-Time Franchise Records"
        color="orange"
        sub={teamName || teamAbbr}
      />

      {loading && !a ? (
        <div className="space-y-3"><Skeleton className="h-24" /><Skeleton className="h-24" /></div>
      ) : !rec.hasData ? (
        <Section title="No records available">
          <div className="px-4 py-8 text-center text-[13px] text-white/60">
            Couldn't load franchise records for {teamName || teamAbbr}.
          </div>
        </Section>
      ) : (
        <>
          {/* All-time regular-season totals */}
          <Section
            title="All-Time Regular Season"
            action={rec.firstSeason && <span className="text-[10px] font-mono text-white/40">since {rec.firstSeason}</span>}
          >
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3">
              <Stat label="Record" value={a.record} sub="W-L-T/OTL" />
              <Stat label="Points" value={a.points.toLocaleString()} sub={a.pointPct != null ? `${a.pointPct.toFixed(3)} pts%` : null} />
              <Stat label="Games" value={a.gp.toLocaleString()} />
              <Stat label="Goals For" value={a.gf.toLocaleString()} />
              <Stat label="Goals Against" value={a.ga.toLocaleString()} />
              <Stat label="Shutouts" value={a.shutouts.toLocaleString()} />
              <Stat label="Penalty Mins" value={a.pim.toLocaleString()} />
              <Stat label="Playoff Seasons" value={a.playoffSeasons} />
            </div>
          </Section>

          {/* Postseason + Stanley Cups */}
          <Section title="Postseason">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3">
              <Stat label="Stanley Cups" value={a.cups} sub={rec.cupWins.length ? rec.cupWins.join(', ') : null} />
              <Stat label="Cup Final Apps" value={rec.cupFinals.length} />
              {rec.postseason && <Stat label="Series Record" value={`${rec.postseason.seriesWins}-${rec.postseason.seriesLosses}`} sub={`${rec.postseason.seriesPlayed} series`} />}
              {rec.postseason && <Stat label="Playoff Games" value={rec.postseason.gp.toLocaleString()} sub={rec.postseason.record} />}
            </div>
          </Section>

          {/* Best regular seasons by points */}
          {rec.bestSeasons.length > 0 && (
            <Section title="Best Regular Seasons" action={<span className="text-[10px] font-mono text-white/40">by points</span>}>
              <div className="divide-y divide-white/[0.04]">
                {rec.bestSeasons.map((s, i) => (
                  <div key={i} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 px-4 py-2.5">
                    <span className="text-[13px] text-white/85">{s.season}</span>
                    <span className="text-[11px] font-mono text-white/45 tabular-nums">{s.record}</span>
                    <span className="text-[18px] font-semibold tabular-nums text-[var(--team-accent)] text-right w-14">{s.points}</span>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Retired numbers */}
          {rec.retiredNumbers.length > 0 && (
            <Section title="Retired Numbers" action={<span className="text-[10px] font-mono text-white/40">{rec.retiredNumbers.length}</span>}>
              <div className="divide-y divide-white/[0.04]">
                {rec.retiredNumbers.map((n, i) => (
                  <div key={i} className="px-4 py-2 text-[13px] text-white/80">{n}</div>
                ))}
              </div>
            </Section>
          )}

          <p className="text-[10px] font-mono text-white/30 px-1">
            All-time franchise records via the NHL Records API. Regular-season totals fold ties and
            overtime losses into the third column. Updated through the most recent completed season.
          </p>
        </>
      )}
    </div>
  );
};
