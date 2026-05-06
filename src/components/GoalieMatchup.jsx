import { useMemo } from 'react';
import { TEAM_ABBR, SEASON } from '../config.js';
import { useNHL } from '../api.js';
import { Section } from './primitives.jsx';
import { Headshot } from './Headshot.jsx';
import { PlayerLink } from './PlayerLink.jsx';

// Season-to-date head-to-head: how has each opposing goalie fared
// against PHI THIS season? We pull each opposing goalie's regular-
// season game log, filter for PHI matchups, and aggregate. Career
// totals would need multi-season fetches and the panel would feel
// stale early in the year — current-season scope keeps it tight and
// actionable for tonight's broadcast.

const OPP_GAME_TYPE = 2; // regular season

const aggregateVsPhi = (gameLog) => {
  const vs = (gameLog || []).filter((g) => g.opponentAbbrev === TEAM_ABBR);
  if (vs.length === 0) return null;
  const totals = vs.reduce((a, g) => {
    a.gp += 1;
    a.sa += g.shotsAgainst || 0;
    a.ga += g.goalsAgainst || 0;
    a.saves += (g.shotsAgainst || 0) - (g.goalsAgainst || 0);
    if (g.decision === 'W') a.w += 1;
    else if (g.decision === 'L') a.l += 1;
    else if (g.decision === 'O') a.otl += 1;
    return a;
  }, { gp: 0, sa: 0, ga: 0, saves: 0, w: 0, l: 0, otl: 0 });
  const sv = totals.sa > 0 ? totals.saves / totals.sa : null;
  // Goalie GAA is goals-against per 60. Without TOI per-game we approximate
  // on full-game starts. Good enough for a contextual panel.
  const gaa = totals.gp > 0 ? totals.ga / totals.gp : null;
  return { ...totals, sv, gaa, recent: vs.slice(0, 3) };
};

const GoalieRow = ({ goalie }) => {
  const path = goalie?.id ? `v1/player/${goalie.id}/game-log/${SEASON}/${OPP_GAME_TYPE}` : null;
  const { data, loading } = useNHL(path, 0);
  const stats = useMemo(() => aggregateVsPhi(data?.gameLog), [data]);

  return (
    <div className="px-4 py-3 grid grid-cols-[44px_1fr_auto] items-center gap-3">
      <Headshot playerId={goalie.id} size={44} />
      <div className="min-w-0">
        <PlayerLink playerId={goalie.id} className="text-[13px] font-medium text-white/90 hover:text-white">
          {goalie.name}
        </PlayerLink>
        <div className="text-[10px] font-mono text-white/40 mt-0.5">
          {loading ? 'Loading vs PHI…' :
            stats ? `${stats.gp} prior meeting${stats.gp === 1 ? '' : 's'} this season` :
            'No prior meeting this season'}
        </div>
      </div>
      {stats && (
        <div className="flex items-center gap-3 sm:gap-4 tabular-nums shrink-0">
          {(stats.w + stats.l + stats.otl) > 0 && (
            <Stat label="W-L" value={`${stats.w}-${stats.l}${stats.otl ? `-${stats.otl}` : ''}`} />
          )}
          {stats.sv != null && <Stat label="SV%" value={`${(stats.sv * 100).toFixed(1)}`} highlight />}
          {stats.gaa != null && <Stat label="GAA" value={stats.gaa.toFixed(2)} />}
        </div>
      )}
    </div>
  );
};

const Stat = ({ label, value, highlight }) => (
  <div className="text-right">
    <div className="text-[9px] font-mono text-white/35 uppercase tracking-wider">{label}</div>
    <div className={highlight ? 'text-[14px] font-semibold text-[#FF8A4C]' : 'text-[13px] font-medium text-white/85'}>
      {value}
    </div>
  </div>
);

export const GoalieMatchup = ({ goalies, oppAbbr }) => {
  // Show the OPPOSING goalies (skater POV: we want to know how PHI's
  // shooters have fared against the netminders they're seeing tonight).
  const themGoalies = (goalies?.them || []).filter((g) => g.id);
  if (themGoalies.length === 0) return null;

  return (
    <Section
      title="Goalie Matchup"
      action={<span className="text-[10px] font-mono text-white/40 uppercase tracking-wider">PHI vs {oppAbbr || 'opp'} netminders · season</span>}
    >
      <div className="divide-y divide-white/[0.04]">
        {themGoalies.map((g) => <GoalieRow key={g.id} goalie={g} />)}
      </div>
    </Section>
  );
};
