// NHL Edge tracking data panels — skating speed, distance, shot speed,
// zone time. Used on PlayerProfile (skater), Goalies (goalie), and
// Dashboard (team). Fetches Edge data on mount via useNHL.

import { useMemo } from 'react';
import { cx, SEASON } from '../config.js';
import { useNHL } from '../api.js';
import { Section, Label, Skeleton, Chip } from './primitives.jsx';
import { adaptSkaterEdge, adaptTeamEdge, adaptGoalieEdge, PHI_TEAM_ID } from '../adapters-edge.js';

/* ═══════════════════════════════════════════════════════════════
   SHARED PRIMITIVES
   ═══════════════════════════════════════════════════════════════ */

const EdgeBar = ({ label, value, percentile, leagueAvg, unit = '' }) => {
  const pct = percentile ?? 0;
  const color =
    pct >= 90 ? 'bg-emerald-400' :
    pct >= 70 ? 'bg-sky-400' :
    pct >= 40 ? 'bg-[#FF8A4C]' :
    'bg-red-400';
  const textColor =
    pct >= 90 ? 'text-emerald-400' :
    pct >= 70 ? 'text-sky-400' :
    pct >= 40 ? 'text-[#FF8A4C]' :
    'text-red-400';

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-white/55">{label}</span>
        <div className="flex items-center gap-2">
          {leagueAvg != null && (
            <span className="text-[10px] font-mono text-white/30">avg {leagueAvg}{unit}</span>
          )}
          <span className={cx('text-[13px] font-mono tabular-nums font-medium', textColor)}>
            {value != null ? `${value}${unit}` : '—'}
          </span>
        </div>
      </div>
      {percentile != null && (
        <div className="flex items-center gap-2">
          <div className="flex-1 h-2 bg-white/[0.05] rounded-full overflow-hidden">
            <div
              className={cx('h-full rounded-full transition-all', color)}
              style={{ width: `${Math.max(pct, 2)}%`, opacity: 0.75 }}
            />
          </div>
          <span className={cx('text-[10px] font-mono tabular-nums w-8 shrink-0 text-right', textColor)}>
            {pct}%
          </span>
        </div>
      )}
    </div>
  );
};

const EdgeTile = ({ label, value, sub, unit = '', tone }) => (
  <div className="border border-white/[0.06] rounded-md p-3 bg-white/[0.01]">
    <Label>{label}</Label>
    <div className={cx(
      'text-[20px] font-semibold tabular-nums mt-1',
      tone === 'orange' ? 'text-[#FF8A4C]' :
      tone === 'green' ? 'text-emerald-400' :
      tone === 'sky' ? 'text-sky-400' : 'text-white/85',
    )}>
      {value != null ? `${value}${unit}` : '—'}
    </div>
    {sub && <div className="text-[9px] font-mono text-white/35 mt-0.5">{sub}</div>}
  </div>
);

/* ═══════════════════════════════════════════════════════════════
   SKATER EDGE PANEL — for PlayerProfile
   ═══════════════════════════════════════════════════════════════ */

export const SkaterEdgePanel = ({ playerId, gameType = 2 }) => {
  const path = playerId ? `v1/edge/skater-detail/${playerId}/${SEASON}/${gameType}` : null;
  const { data: raw, loading } = useNHL(path, 0);
  const edge = useMemo(() => adaptSkaterEdge(raw), [raw]);

  if (loading && !edge) {
    return (
      <Section title="NHL Edge · Tracking" action={<Chip tone="muted">NHL EDGE</Chip>}>
        <div className="p-4 space-y-3">
          <Skeleton height={20} />
          <Skeleton height={20} />
          <Skeleton height={20} />
        </div>
      </Section>
    );
  }

  if (!edge) return null;

  return (
    <Section
      title="NHL Edge · Tracking"
      action={<Chip tone="orange">NHL EDGE</Chip>}
    >
      <div className="p-4 space-y-4">
        {/* Headline tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <EdgeTile
            label="Top Shot Speed"
            value={edge.topShotSpeed.value?.toFixed(1)}
            unit=" mph"
            sub={edge.topShotSpeed.percentile != null ? `${edge.topShotSpeed.percentile}th percentile` : undefined}
            tone="orange"
          />
          <EdgeTile
            label="Max Skating Speed"
            value={edge.skatingSpeed.max?.toFixed(1)}
            unit=" mph"
            sub={edge.skatingSpeed.maxPercentile != null ? `${edge.skatingSpeed.maxPercentile}th percentile` : undefined}
            tone="sky"
          />
          <EdgeTile
            label="22+ mph Bursts"
            value={edge.skatingSpeed.bursts22}
            sub={edge.skatingSpeed.bursts22Percentile != null ? `${edge.skatingSpeed.bursts22Percentile}th percentile` : undefined}
            tone="green"
          />
          <EdgeTile
            label="Distance Skated"
            value={edge.distance.total != null ? Math.round(edge.distance.total) : null}
            unit=" mi"
            sub="season total"
          />
        </div>

        {/* Percentile bars */}
        <div className="space-y-3">
          <Label>League Percentile Rankings</Label>
          <EdgeBar
            label="Shot Speed"
            value={edge.topShotSpeed.value?.toFixed(1)}
            percentile={edge.topShotSpeed.percentile}
            leagueAvg={edge.topShotSpeed.leagueAvg?.toFixed(1)}
            unit=" mph"
          />
          <EdgeBar
            label="Skating Speed"
            value={edge.skatingSpeed.max?.toFixed(1)}
            percentile={edge.skatingSpeed.maxPercentile}
            leagueAvg={edge.skatingSpeed.maxLeagueAvg?.toFixed(1)}
            unit=" mph"
          />
          <EdgeBar
            label="Distance Skated"
            value={edge.distance.total != null ? Math.round(edge.distance.total) : null}
            percentile={edge.distance.totalPercentile}
            leagueAvg={edge.distance.totalLeagueAvg != null ? Math.round(edge.distance.totalLeagueAvg) : null}
            unit=" mi"
          />
        </div>

        {/* Zone time */}
        {edge.zoneTime && (
          <div className="space-y-2">
            <Label>Zone Time Distribution</Label>
            <div className="flex h-5 w-full rounded-md overflow-hidden">
              <div className="bg-[#FF8A4C]" style={{ width: `${edge.zoneTime.offensive || 0}%` }} title={`Offensive: ${edge.zoneTime.offensive}%`} />
              <div className="bg-white/20" style={{ width: `${edge.zoneTime.neutral || 0}%` }} title={`Neutral: ${edge.zoneTime.neutral}%`} />
              <div className="bg-sky-400/60" style={{ width: `${edge.zoneTime.defensive || 0}%` }} title={`Defensive: ${edge.zoneTime.defensive}%`} />
            </div>
            <div className="flex items-center gap-4 text-[10px] font-mono text-white/50">
              <span className="flex items-center gap-1"><span className="w-2 h-2 bg-[#FF8A4C] rounded-sm" /> OZ {edge.zoneTime.offensive}%</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 bg-white/20 rounded-sm" /> NZ {edge.zoneTime.neutral}%</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 bg-sky-400/60 rounded-sm" /> DZ {edge.zoneTime.defensive}%</span>
            </div>
          </div>
        )}

        {/* Shot location breakdown */}
        {edge.sogSummary.length > 0 && (
          <div className="space-y-2">
            <Label>Shots by Location</Label>
            <div className="divide-y divide-white/[0.04]">
              {edge.sogSummary.map((s, i) => (
                <div key={i} className="flex items-center justify-between py-1.5">
                  <span className="text-[11px] text-white/55">{s.label}</span>
                  <div className="flex items-center gap-3 text-[11px] font-mono tabular-nums">
                    <span className="text-white/40">{s.sog} SOG</span>
                    <span className="text-[#FF8A4C]">{s.goals}G</span>
                    <span className="text-white/55">{s.shootingPct != null ? `${s.shootingPct}%` : '—'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="text-[9px] font-mono text-white/25">
          Data from NHL Edge puck and player tracking. Updated after each game.
        </div>
      </div>
    </Section>
  );
};

/* ═══════════════════════════════════════════════════════════════
   TEAM EDGE PANEL — for Dashboard
   ═══════════════════════════════════════════════════════════════ */

export const TeamEdgePanel = () => {
  const path = `v1/edge/team-comparison/${PHI_TEAM_ID}/${SEASON}/2`;
  const { data: raw, loading } = useNHL(path, 0);
  const edge = useMemo(() => adaptTeamEdge(raw), [raw]);

  if (loading && !edge) {
    return (
      <Section title="NHL Edge · Team Tracking" action={<Chip tone="muted">NHL EDGE</Chip>}>
        <div className="p-4"><Skeleton height={80} /></div>
      </Section>
    );
  }

  if (!edge) return null;

  return (
    <Section
      title="NHL Edge · Team Tracking"
      action={<Chip tone="orange">NHL EDGE</Chip>}
    >
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <EdgeTile label="Top Shot Speed" value={edge.shotSpeed.top?.toFixed(1)} unit=" mph" sub={edge.shotSpeed.topPlayer} tone="orange" />
          <EdgeTile label="Top Skating Speed" value={edge.skatingSpeed.top?.toFixed(1)} unit=" mph" sub={edge.skatingSpeed.topPlayer} tone="sky" />
          {edge.zoneTime && (
            <EdgeTile label="OZ Time" value={edge.zoneTime.offensive} unit="%" sub={edge.zoneTime.leagueAvgOffensive != null ? `league avg ${edge.zoneTime.leagueAvgOffensive}%` : undefined} tone="green" />
          )}
          {edge.shotDifferential && (
            <EdgeTile
              label="Shot Diff"
              value={edge.shotDifferential.differential != null ? (edge.shotDifferential.differential >= 0 ? `+${edge.shotDifferential.differential}` : edge.shotDifferential.differential) : null}
              sub={`${edge.shotDifferential.shotsFor || 0} for · ${edge.shotDifferential.shotsAgainst || 0} against`}
              tone={edge.shotDifferential.differential >= 0 ? 'green' : undefined}
            />
          )}
        </div>

        {/* Shot location breakdown vs league average */}
        {edge.shotLocations.length > 0 && (
          <div className="space-y-2">
            <Label>Shooting Efficiency by Location</Label>
            <div className="divide-y divide-white/[0.04]">
              <div className="grid grid-cols-[1fr_60px_50px_70px_70px] gap-2 py-1 text-[9px] font-mono text-white/30 uppercase tracking-wider">
                <span>Zone</span><span className="text-right">SOG</span><span className="text-right">G</span>
                <span className="text-right">SH%</span><span className="text-right">Lg Avg</span>
              </div>
              {edge.shotLocations.map((loc, i) => {
                const better = loc.shootingPct != null && loc.leagueAvgPct != null && loc.shootingPct > loc.leagueAvgPct;
                return (
                  <div key={i} className="grid grid-cols-[1fr_60px_50px_70px_70px] gap-2 py-1.5 items-center">
                    <span className="text-[11px] text-white/55">{loc.zone}</span>
                    <span className="text-[11px] font-mono tabular-nums text-white/50 text-right">{loc.sog}</span>
                    <span className="text-[11px] font-mono tabular-nums text-[#FF8A4C] text-right">{loc.goals}</span>
                    <span className={cx('text-[11px] font-mono tabular-nums text-right', better ? 'text-emerald-400' : 'text-white/55')}>
                      {loc.shootingPct != null ? `${loc.shootingPct}%` : '—'}
                    </span>
                    <span className="text-[10px] font-mono tabular-nums text-white/30 text-right">
                      {loc.leagueAvgPct != null ? `${loc.leagueAvgPct}%` : '—'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Zone time */}
        {edge.zoneTime && (
          <div className="space-y-2">
            <Label>Zone Time Distribution</Label>
            <div className="flex h-5 w-full rounded-md overflow-hidden">
              <div className="bg-[#FF8A4C]" style={{ width: `${edge.zoneTime.offensive || 0}%` }} />
              <div className="bg-white/20" style={{ width: `${edge.zoneTime.neutral || 0}%` }} />
              <div className="bg-sky-400/60" style={{ width: `${edge.zoneTime.defensive || 0}%` }} />
            </div>
            <div className="flex items-center gap-4 text-[10px] font-mono text-white/50">
              <span className="flex items-center gap-1"><span className="w-2 h-2 bg-[#FF8A4C] rounded-sm" /> OZ {edge.zoneTime.offensive}%</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 bg-white/20 rounded-sm" /> NZ {edge.zoneTime.neutral}%</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 bg-sky-400/60 rounded-sm" /> DZ {edge.zoneTime.defensive}%</span>
            </div>
          </div>
        )}

        <div className="text-[9px] font-mono text-white/25">
          NHL Edge puck and player tracking data. Comparison to league average.
        </div>
      </div>
    </Section>
  );
};

/* ═══════════════════════════════════════════════════════════════
   GOALIE EDGE PANEL — for Goalies page
   ═══════════════════════════════════════════════════════════════ */

export const GoalieEdgePanel = ({ playerId, gameType = 2 }) => {
  const path = playerId ? `v1/edge/goalie-detail/${playerId}/${SEASON}/${gameType}` : null;
  const { data: raw, loading } = useNHL(path, 0);
  const edge = useMemo(() => adaptGoalieEdge(raw), [raw]);

  if (loading && !edge) {
    return (
      <Section title="NHL Edge · Goalie Tracking" action={<Chip tone="muted">NHL EDGE</Chip>}>
        <div className="p-4"><Skeleton height={60} /></div>
      </Section>
    );
  }

  if (!edge) return null;

  return (
    <Section
      title="NHL Edge · Goalie Tracking"
      action={<Chip tone="orange">NHL EDGE</Chip>}
    >
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <EdgeTile label="Games Above .900" value={edge.gamesAbove900} sub={edge.gamesAbove900Pct != null ? `${edge.gamesAbove900Pct}% of starts` : undefined} tone="green" />
          <EdgeTile label="Goal Diff / 60" value={edge.goalDiffPer60?.toFixed(2)} tone={edge.goalDiffPer60 > 0 ? 'green' : undefined} />
          <EdgeTile label="Avg Goal Support" value={edge.goalSupportAvg?.toFixed(2)} sub="goals per game from team" />
          <EdgeTile label="Point %" value={edge.pointPct} unit="%" tone="orange" />
        </div>

        {/* Shot location saves breakdown */}
        {edge.shotLocationSummary.length > 0 && (
          <div className="space-y-2">
            <Label>Save % by Shot Location</Label>
            <div className="divide-y divide-white/[0.04]">
              {edge.shotLocationSummary.map((s, i) => (
                <div key={i} className="flex items-center justify-between py-1.5">
                  <span className="text-[11px] text-white/55">{s.zone}</span>
                  <div className="flex items-center gap-3 text-[11px] font-mono tabular-nums">
                    <span className="text-white/40">{s.sa} SA</span>
                    <span className="text-emerald-400">{s.saves} SV</span>
                    <span className={cx(s.svPct >= 91 ? 'text-emerald-400' : s.svPct >= 88 ? 'text-white/70' : 'text-red-400')}>
                      {s.svPct != null ? `${s.svPct}%` : '—'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Section>
  );
};
