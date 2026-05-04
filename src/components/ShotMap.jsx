import { useMemo, useState } from 'react';
import { TEAM_ABBR, cx } from '../config.js';

// NHL play coordinates use x ∈ [-100, 100], y ∈ [-42.5, 42.5], origin at
// center ice. Goals sit at x = ±89, y = 0. Each play tells us which side the
// home team is defending in that period; we use it to mirror every shot so
// the offensive end is always to the right (positive x).
//
// We render the offensive half (x in [0, 100]) at scale.

const RINK_W = 100; // ft (offensive half length)
const RINK_H = 85;  // ft
const SVG_W = 600;
const SVG_H = (SVG_W * RINK_H) / RINK_W;

const ftToX = (ft) => (ft / RINK_W) * SVG_W;
const ftToY = (ft) => ((ft + RINK_H / 2) / RINK_H) * SVG_H;

const SHOT_KINDS = new Set(['goal', 'shot-on-goal', 'missed-shot', 'blocked-shot']);

function normalizeShots(plays, teamIds, usTeamId) {
  const out = [];
  for (const p of plays || []) {
    if (!SHOT_KINDS.has(p.typeDescKey)) continue;
    const det = p.details || {};
    if (det.xCoord == null || det.yCoord == null) continue;

    let teamId = det.eventOwnerTeamId;
    // Blocked shots: details.eventOwnerTeamId is the *blocking* team, but the
    // shot itself originated from the other team. Flip so we plot against the
    // shooting team.
    if (p.typeDescKey === 'blocked-shot') {
      teamId = teamId === teamIds.home ? teamIds.away : teamIds.home;
    }

    // Mirror shots so attacking direction is always +x.
    let { xCoord: x, yCoord: y } = det;
    const homeDefendsRight = p.homeTeamDefendingSide === 'right';
    const ownerIsHome = teamId === teamIds.home;
    const ownerAttacksRight = ownerIsHome ? !homeDefendsRight : homeDefendsRight;
    if (!ownerAttacksRight) { x = -x; y = -y; }
    if (x < 0) continue; // defensive-zone events make the chart noisy

    out.push({
      id: p.eventId,
      kind: p.typeDescKey,
      x, y,
      isUs: teamId === usTeamId,
      period: p.periodDescriptor?.number,
      time: p.timeInPeriod,
    });
  }
  return out;
}

const RinkSVG = ({ children, ariaLabel }) => (
  <svg
    viewBox={`0 0 ${SVG_W} ${SVG_H}`}
    width="100%"
    height="auto"
    role="img"
    aria-label={ariaLabel}
    className="block"
  >
    <defs>
      <pattern id="rinkPaint" patternUnits="userSpaceOnUse" width={SVG_W} height={SVG_H}>
        <rect width={SVG_W} height={SVG_H} fill="#0E1015" />
      </pattern>
    </defs>

    {/* Ice */}
    <rect x={0} y={0} width={SVG_W} height={SVG_H} rx={ftToX(28) - ftToX(0)} fill="url(#rinkPaint)" stroke="rgba(255,255,255,0.08)" strokeWidth="1.2" />

    {/* Blue line (defensive blue line is at x=25 from center; in our half mapping it's at x=25 of 100) */}
    <line x1={ftToX(25)} y1={0} x2={ftToX(25)} y2={SVG_H} stroke="#3A6BD9" strokeWidth="3" opacity="0.7" />

    {/* Center red line at x=0 (left edge of half) */}
    <line x1={0} y1={0} x2={0} y2={SVG_H} stroke="#E14D4D" strokeWidth="3" opacity="0.6" />

    {/* Goal line at x=89 */}
    <line x1={ftToX(89)} y1={ftToY(-37)} x2={ftToX(89)} y2={ftToY(37)} stroke="#E14D4D" strokeWidth="1.4" opacity="0.7" />

    {/* Crease (semi-circle) */}
    <path d={`M ${ftToX(89)} ${ftToY(-4)}
              A ${ftToX(4) - ftToX(0)} ${ftToY(4) - ftToY(0)} 0 0 0 ${ftToX(89)} ${ftToY(4)}`}
      fill="rgba(58,107,217,0.15)" stroke="#3A6BD9" strokeWidth="1" opacity="0.7" />

    {/* Goal posts */}
    <rect x={ftToX(89) - 1} y={ftToY(-3)} width="2" height={ftToY(3) - ftToY(-3)} fill="#E14D4D" opacity="0.85" />

    {/* Faceoff circles in offensive zone (at x=69, y=±22) */}
    {[-22, 22].map((yy) => (
      <g key={yy}>
        <circle cx={ftToX(69)} cy={ftToY(yy)} r={ftToX(15) - ftToX(0)} fill="none" stroke="#E14D4D" strokeWidth="1" opacity="0.45" />
        <circle cx={ftToX(69)} cy={ftToY(yy)} r="2" fill="#E14D4D" opacity="0.7" />
      </g>
    ))}

    {/* Neutral-zone dots (at x=20, y=±22) */}
    {[-22, 22].map((yy) => (
      <circle key={yy} cx={ftToX(20)} cy={ftToY(yy)} r="2" fill="#E14D4D" opacity="0.55" />
    ))}

    {children}
  </svg>
);

const ShotDot = ({ s, hover, setHover }) => {
  const usColor = '#F74902';
  const themColor = '#FFFFFF';
  const cx_ = ftToX(s.x);
  const cy_ = ftToY(s.y);
  const baseColor = s.isUs ? usColor : themColor;
  const isGoal = s.kind === 'goal';
  const isMiss = s.kind === 'missed-shot' || s.kind === 'blocked-shot';

  if (isGoal) {
    return (
      <g
        onMouseEnter={() => setHover(s)}
        onMouseLeave={() => setHover(null)}
        style={{ cursor: 'pointer' }}
      >
        <circle cx={cx_} cy={cy_} r="9" fill={baseColor} opacity="0.25" />
        <circle cx={cx_} cy={cy_} r="6" fill={baseColor} opacity={hover?.id === s.id ? 1 : 0.95} stroke="#000" strokeWidth="1.2" />
      </g>
    );
  }
  return (
    <circle
      cx={cx_}
      cy={cy_}
      r={isMiss ? 2.5 : 4}
      fill={isMiss ? 'transparent' : baseColor}
      stroke={baseColor}
      strokeWidth="1.4"
      opacity={isMiss ? 0.45 : 0.75}
      onMouseEnter={() => setHover(s)}
      onMouseLeave={() => setHover(null)}
      style={{ cursor: 'pointer' }}
    />
  );
};

export const ShotMap = ({ pbpData, oppAbbr }) => {
  const [filter, setFilter] = useState('all'); // 'all' | 'us' | 'them'
  const [hover, setHover] = useState(null);

  const shots = useMemo(() => {
    if (!pbpData) return [];
    const teamIds = { home: pbpData.homeTeam?.id, away: pbpData.awayTeam?.id };
    const usTeamId = pbpData.homeTeam?.abbrev === TEAM_ABBR ? pbpData.homeTeam.id : pbpData.awayTeam?.id;
    return normalizeShots(pbpData.plays, teamIds, usTeamId);
  }, [pbpData]);

  const filtered = useMemo(() => {
    if (filter === 'us')   return shots.filter((s) => s.isUs);
    if (filter === 'them') return shots.filter((s) => !s.isUs);
    return shots;
  }, [shots, filter]);

  const usCounts = useMemo(() => ({
    g: shots.filter((s) => s.isUs && s.kind === 'goal').length,
    sog: shots.filter((s) => s.isUs && s.kind === 'shot-on-goal').length,
    miss: shots.filter((s) => s.isUs && (s.kind === 'missed-shot' || s.kind === 'blocked-shot')).length,
  }), [shots]);
  const themCounts = useMemo(() => ({
    g: shots.filter((s) => !s.isUs && s.kind === 'goal').length,
    sog: shots.filter((s) => !s.isUs && s.kind === 'shot-on-goal').length,
    miss: shots.filter((s) => !s.isUs && (s.kind === 'missed-shot' || s.kind === 'blocked-shot')).length,
  }), [shots]);

  if (shots.length === 0) {
    return (
      <div className="p-6 text-center text-[12px] font-mono text-white/40">
        No shot location data yet.
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
        <div className="flex items-center gap-3 text-[11px] font-mono">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#F74902]" /><span className="text-[#FF8A4C]">PHI</span><span className="text-white/65 tabular-nums">{usCounts.g}G · {usCounts.sog}SOG · {usCounts.miss}M</span></span>
          <span className="text-white/15">|</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-white" /><span className="text-white/65">{oppAbbr}</span><span className="text-white/65 tabular-nums">{themCounts.g}G · {themCounts.sog}SOG · {themCounts.miss}M</span></span>
        </div>
        <div className="flex items-center gap-0.5 p-0.5 border border-white/[0.08] rounded-md bg-white/[0.02]">
          {[
            { id: 'all',  l: 'Both' },
            { id: 'us',   l: 'PHI' },
            { id: 'them', l: oppAbbr || 'Opp' },
          ].map((t) => (
            <button key={t.id} onClick={() => setFilter(t.id)}
              className={cx('px-2.5 h-6 text-[11px] font-medium rounded-[4px] transition-colors',
                filter === t.id ? 'bg-white/[0.08] text-white' : 'text-white/50 hover:text-white'
              )}>{t.l}</button>
          ))}
        </div>
      </div>

      <div className="relative">
        <RinkSVG ariaLabel="Shot map">
          {filtered.map((s) => <ShotDot key={s.id} s={s} hover={hover} setHover={setHover} />)}
        </RinkSVG>
        {hover && (
          <div className="absolute top-2 left-2 px-2 py-1 rounded-md border border-white/[0.1] bg-[#0C0D11]/95 backdrop-blur-sm text-[11px] font-mono pointer-events-none">
            <span className={hover.isUs ? 'text-[#FF8A4C]' : 'text-white/85'}>
              {hover.isUs ? 'PHI' : oppAbbr} · {hover.kind === 'goal' ? 'GOAL' : hover.kind === 'shot-on-goal' ? 'SOG' : hover.kind === 'missed-shot' ? 'MISS' : 'BLOCK'}
            </span>
            <span className="text-white/45 ml-2">P{hover.period} · {hover.time}</span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-center gap-4 mt-3 text-[10px] font-mono text-white/40 uppercase tracking-wider">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-white/85 inline-block" />SOG</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full border border-white/65 inline-block" />Miss/Block</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#F74902] inline-block" />Goal</span>
      </div>
    </div>
  );
};
