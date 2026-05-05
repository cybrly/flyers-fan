import { useMemo } from 'react';
import { TEAM_ABBR } from '../config.js';
import { Section } from './primitives.jsx';

// Goalie shot/save heat map — for a single game's play-by-play, take every
// shot the OPPONENT directed at PHI's net (shots-on-goal, missed, blocked
// don't count for SV%; we use only the same set the league uses, which is
// shots-on-goal + goals against). Bucket by danger zone derived from the
// puck origin coordinates and render a stylized rink half showing each
// zone's save percentage.
//
// NHL coords: x ∈ [-100, 100] (feet, origin = center ice), y ∈ [-42.5, 42.5].
// Goal at x = ±89, y = 0. We mirror so opponent's offensive zone is at +x.

const RINK_W_FT = 100;
const RINK_H_FT = 85;
const SVG_W = 600;
const SVG_H = (SVG_W * RINK_H_FT) / RINK_W_FT;
const ftToX = (ft) => (ft / RINK_W_FT) * SVG_W;
const ftToY = (ft) => ((ft + RINK_H_FT / 2) / RINK_H_FT) * SVG_H;

// Zone polygons in feet, then projected. Order matters: more specific first
// so the slot wins over a generic "inside dots" check.
const ZONES = [
  {
    id: 'slot',     label: 'High-Danger Slot',
    test: (x, y) => x >= 65 && Math.abs(y) <= 13,
    poly: [[65, -13], [89, -13], [89, 13], [65, 13]],
  },
  {
    id: 'l-circle', label: 'Left Circle',
    test: (x, y) => x >= 54 && y >= 13 && y <= 30,
    poly: [[54, 13], [89, 13], [89, 30], [54, 30]],
  },
  {
    id: 'r-circle', label: 'Right Circle',
    test: (x, y) => x >= 54 && y <= -13 && y >= -30,
    poly: [[54, -30], [89, -30], [89, -13], [54, -13]],
  },
  {
    id: 'l-point',  label: 'Left Point',
    test: (x, y) => x >= 25 && y > 0,
    poly: [[25, 0], [54, 0], [54, 42.5], [25, 42.5]],
  },
  {
    id: 'r-point',  label: 'Right Point',
    test: (x, y) => x >= 25 && y <= 0,
    poly: [[25, -42.5], [54, -42.5], [54, 0], [25, 0]],
  },
];

const GOAL_KINDS = new Set(['goal', 'shot-on-goal']);

// Darker red = lower save% (more goals leak through). Anchored:
//  90%+ → near-transparent green
//  85%  → amber
//  80%- → red
const zoneFill = (svPct, shots) => {
  if (shots < 1) return { fill: 'rgba(255,255,255,0.02)', stroke: 'rgba(255,255,255,0.10)' };
  if (svPct >= 0.95) return { fill: 'rgba(16,185,129,0.20)', stroke: 'rgba(16,185,129,0.70)' };
  if (svPct >= 0.90) return { fill: 'rgba(16,185,129,0.12)', stroke: 'rgba(16,185,129,0.55)' };
  if (svPct >= 0.85) return { fill: 'rgba(245,158,11,0.18)', stroke: 'rgba(245,158,11,0.65)' };
  if (svPct >= 0.80) return { fill: 'rgba(239,68,68,0.18)', stroke: 'rgba(239,68,68,0.55)' };
  return { fill: 'rgba(239,68,68,0.32)', stroke: 'rgba(239,68,68,0.80)' };
};

export const GoalieHeatMap = ({ pbpRaw }) => {
  const data = useMemo(() => {
    if (!pbpRaw?.plays?.length) return null;
    const homeId = pbpRaw.homeTeam?.id;
    const awayId = pbpRaw.awayTeam?.id;
    if (!homeId || !awayId) return null;
    const usIsHome = pbpRaw.homeTeam?.abbrev === TEAM_ABBR;
    const usTeamId = usIsHome ? homeId : awayId;

    // Player lookup for goalie names.
    const players = {};
    for (const r of pbpRaw.rosterSpots || []) {
      players[r.playerId] = `${r.firstName?.default?.[0] || ''}. ${r.lastName?.default || ''}`.trim();
    }

    const zoneAcc = Object.fromEntries(ZONES.map((z) => [z.id, { shots: 0, goals: 0 }]));
    const goalies = {}; // { [id]: { id, name, sa, ga } }
    let totalSA = 0;
    let totalGA = 0;
    let goalsBehind = 0; // OPP goals from beyond all zones (e.g. empty net)

    for (const p of pbpRaw.plays) {
      if (!GOAL_KINDS.has(p.typeDescKey)) continue;
      const det = p.details || {};
      let teamId = det.eventOwnerTeamId;
      if (teamId === usTeamId) continue; // shot BY us, not against
      if (det.xCoord == null || det.yCoord == null) continue;

      // Mirror so opponent's offensive zone is +x.
      let { xCoord: x, yCoord: y } = det;
      const homeDefendsRight = p.homeTeamDefendingSide === 'right';
      const ownerIsHome = teamId === homeId;
      const ownerAttacksRight = ownerIsHome ? !homeDefendsRight : homeDefendsRight;
      if (!ownerAttacksRight) { x = -x; y = -y; }
      if (x < 25) continue; // not in offensive zone — skip

      const isGoal = p.typeDescKey === 'goal';
      totalSA++;
      if (isGoal) totalGA++;

      const goalieId = det.goalieInNetId ?? null;
      if (goalieId) {
        const g = goalies[goalieId] || (goalies[goalieId] = { id: goalieId, name: players[goalieId] || '—', sa: 0, ga: 0 });
        g.sa++;
        if (isGoal) g.ga++;
      }

      const zone = ZONES.find((z) => z.test(x, y));
      if (!zone) {
        if (isGoal) goalsBehind++;
        continue;
      }
      zoneAcc[zone.id].shots++;
      if (isGoal) zoneAcc[zone.id].goals++;
    }

    if (totalSA === 0) return null;

    return {
      zones: ZONES.map((z) => {
        const a = zoneAcc[z.id];
        const sv = a.shots ? (a.shots - a.goals) / a.shots : null;
        return { ...z, shots: a.shots, goals: a.goals, sv };
      }),
      goalies: Object.values(goalies).sort((a, b) => b.sa - a.sa),
      totalSA,
      totalGA,
      goalsBehind,
    };
  }, [pbpRaw]);

  if (!data) return null;
  const overallSv = data.totalSA ? ((data.totalSA - data.totalGA) / data.totalSA) : null;

  return (
    <Section
      title="Goalie Heat Map"
      action={
        <span className="text-[10px] font-mono text-white/40 tabular-nums">
          {overallSv != null ? `${(overallSv * 100).toFixed(1)}% SV%` : '—'}
          {data.totalSA > 0 && <span className="ml-2">{data.totalSA - data.totalGA}/{data.totalSA}</span>}
        </span>
      }
    >
      <div className="p-3">
        <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="w-full block" role="img" aria-label="Goalie zone save percentages">
          {/* Ice — offensive half (opponent's, where they shot at PHI) */}
          {(() => {
            const r = ftToX(28) - ftToX(0);
            const d = `M 0 0 L ${SVG_W - r} 0 A ${r} ${r} 0 0 1 ${SVG_W} ${r} L ${SVG_W} ${SVG_H - r} A ${r} ${r} 0 0 1 ${SVG_W - r} ${SVG_H} L 0 ${SVG_H} Z`;
            return <path d={d} fill="#0E1015" stroke="rgba(255,255,255,0.08)" strokeWidth="1.2" />;
          })()}

          {/* Zone polygons — colored by zone's save% */}
          {data.zones.map((z) => {
            const { fill, stroke } = zoneFill(z.sv ?? 1, z.shots);
            const points = z.poly.map(([fx, fy]) => `${ftToX(fx)},${ftToY(fy)}`).join(' ');
            const cx = z.poly.reduce((s, p) => s + ftToX(p[0]), 0) / z.poly.length;
            const cy = z.poly.reduce((s, p) => s + ftToY(p[1]), 0) / z.poly.length;
            return (
              <g key={z.id}>
                <polygon points={points} fill={fill} stroke={stroke} strokeWidth="1.2" />
                {z.shots > 0 && (
                  <>
                    <text x={cx} y={cy - 6} textAnchor="middle" fill="white" fontSize="14" fontWeight="600" fontFamily="ui-monospace, monospace">
                      {z.shots - z.goals}/{z.shots}
                    </text>
                    <text x={cx} y={cy + 12} textAnchor="middle" fill="rgba(255,255,255,0.55)" fontSize="10" fontFamily="ui-monospace, monospace">
                      {z.sv != null ? `${(z.sv * 100).toFixed(0)}%` : ''}
                    </text>
                  </>
                )}
              </g>
            );
          })}

          {/* Rink markings (drawn on top of zones so they remain readable) */}
          <line x1={ftToX(25)} y1={0} x2={ftToX(25)} y2={SVG_H} stroke="#3A6BD9" strokeWidth="2" opacity="0.6" />
          <line x1={ftToX(89)} y1={ftToY(-37)} x2={ftToX(89)} y2={ftToY(37)} stroke="#E14D4D" strokeWidth="1.4" opacity="0.7" />
          <path
            d={`M ${ftToX(89)} ${ftToY(-4)} A ${ftToX(4) - ftToX(0)} ${ftToY(4) - ftToY(0)} 0 0 0 ${ftToX(89)} ${ftToY(4)}`}
            fill="rgba(58,107,217,0.18)" stroke="#3A6BD9" strokeWidth="1" opacity="0.85"
          />
          <rect x={ftToX(89) - 1} y={ftToY(-3)} width="2" height={ftToY(3) - ftToY(-3)} fill="#E14D4D" opacity="0.85" />
          {[-22, 22].map((yy) => (
            <circle key={yy} cx={ftToX(69)} cy={ftToY(yy)} r={ftToX(15) - ftToX(0)} fill="none" stroke="#E14D4D" strokeWidth="0.8" opacity="0.35" />
          ))}
        </svg>
      </div>

      {/* Per-goalie stat strip */}
      {data.goalies.length > 0 && (
        <div className="border-t border-white/[0.05] divide-y divide-white/[0.04]">
          {data.goalies.map((g) => {
            const sv = g.sa ? ((g.sa - g.ga) / g.sa) : 0;
            return (
              <div key={g.id} className="flex items-center justify-between px-4 py-2.5 text-[12px] font-mono">
                <span className="text-white/85">{g.name}</span>
                <div className="flex items-center gap-4 tabular-nums text-white/55">
                  <span>{g.sa - g.ga}/{g.sa} saves</span>
                  <span className={sv >= 0.92 ? 'text-emerald-400' : sv >= 0.88 ? 'text-amber-400' : 'text-red-400'}>
                    {(sv * 100).toFixed(1)}%
                  </span>
                  <span className="text-white/45">{g.ga} GA</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Section>
  );
};
