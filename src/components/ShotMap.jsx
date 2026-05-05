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

// Pretty-print a shot type. NHL uses short codes like 'wrist', 'snap', etc.
const SHOT_TYPE_LABEL = {
  'wrist': 'Wrist',
  'snap': 'Snap',
  'slap': 'Slap',
  'backhand': 'Backhand',
  'tip-in': 'Tip-in',
  'deflected': 'Deflected',
  'wrap-around': 'Wrap-around',
  'poke': 'Poke',
  'bat': 'Bat',
  'between-legs': 'Between legs',
  'cradle': 'Cradle',
};

// Build a name lookup from the pbp roster — { [playerId]: { name, teamId } }.
function buildPlayerMap(rosterSpots) {
  const out = {};
  for (const p of rosterSpots || []) {
    out[p.playerId] = {
      name: p.firstName?.default && p.lastName?.default
        ? `${p.firstName.default[0]}. ${p.lastName.default}`
        : p.name?.default || '—',
      fullName: p.firstName?.default && p.lastName?.default
        ? `${p.firstName.default} ${p.lastName.default}`
        : p.name?.default || '—',
      teamId: p.teamId,
    };
  }
  return out;
}

function normalizeShots(plays, teamIds, usTeamId, players) {
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

    // Pick the right player ID per kind. Goals carry scoringPlayerId, regular
    // shots use shootingPlayerId, blocked shots track both shooter + blocker.
    const shooterId =
      det.scoringPlayerId ??
      det.shootingPlayerId ??
      null;
    const goalieId = det.goalieInNetId ?? null;
    const blockerId = p.typeDescKey === 'blocked-shot' ? det.blockingPlayerId : null;

    // Distance from the goal mouth (89, 0). NHL coords are in feet.
    const dx = 89 - x;
    const dy = y;
    const distFt = Math.round(Math.sqrt(dx * dx + dy * dy));

    out.push({
      id: p.eventId,
      kind: p.typeDescKey,
      x, y,
      isUs: teamId === usTeamId,
      period: p.periodDescriptor?.number,
      periodType: p.periodDescriptor?.periodType,
      time: p.timeInPeriod,
      shotType: det.shotType || null,
      shooter: shooterId ? players[shooterId] : null,
      goalie: goalieId ? players[goalieId] : null,
      blocker: blockerId ? players[blockerId] : null,
      assist1: det.assist1PlayerId ? players[det.assist1PlayerId] : null,
      assist2: det.assist2PlayerId ? players[det.assist2PlayerId] : null,
      goalsToDate: det.scoringPlayerTotal ?? null,
      distFt,
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

const ShotDot = ({ s, hover, onHover, onLeave }) => {
  const usColor = '#F74902';
  const themColor = '#FFFFFF';
  const cx_ = ftToX(s.x);
  const cy_ = ftToY(s.y);
  const baseColor = s.isUs ? usColor : themColor;
  const isGoal = s.kind === 'goal';
  const isMiss = s.kind === 'missed-shot' || s.kind === 'blocked-shot';
  const active = hover?.shot?.id === s.id;

  if (isGoal) {
    return (
      <g
        onMouseEnter={(e) => onHover(s, e)}
        onMouseMove={(e) => onHover(s, e)}
        onMouseLeave={onLeave}
        style={{ cursor: 'pointer' }}
      >
        <circle cx={cx_} cy={cy_} r={active ? 12 : 9} fill={baseColor} opacity="0.25" />
        <circle cx={cx_} cy={cy_} r={active ? 7 : 6} fill={baseColor} opacity="1" stroke="#000" strokeWidth="1.2" />
      </g>
    );
  }
  return (
    <circle
      cx={cx_}
      cy={cy_}
      r={isMiss ? (active ? 4 : 2.5) : (active ? 6 : 4)}
      fill={isMiss ? 'transparent' : baseColor}
      stroke={baseColor}
      strokeWidth={active ? '2' : '1.4'}
      opacity={active ? 1 : (isMiss ? 0.45 : 0.75)}
      onMouseEnter={(e) => onHover(s, e)}
      onMouseMove={(e) => onHover(s, e)}
      onMouseLeave={onLeave}
      style={{ cursor: 'pointer' }}
    />
  );
};

const KIND_BADGE = {
  goal: { label: 'GOAL', tone: 'orange' },
  'shot-on-goal': { label: 'SHOT ON GOAL', tone: 'default' },
  'missed-shot': { label: 'MISS', tone: 'muted' },
  'blocked-shot': { label: 'BLOCKED', tone: 'muted' },
};

// Tooltip card — positioned absolutely within the rink wrapper, follows the
// cursor with a small offset so the dot stays uncovered. Right-edge clamp so
// it doesn't overflow the container.
const ShotTooltip = ({ hover, oppAbbr, containerW }) => {
  if (!hover) return null;
  const { shot: s, mx, my } = hover;
  const cfg = KIND_BADGE[s.kind] || { label: s.kind, tone: 'default' };
  const isGoal = s.kind === 'goal';
  const isBlock = s.kind === 'blocked-shot';
  const teamLabel = s.isUs ? 'PHI' : (oppAbbr || 'OPP');

  // Best-effort position: 14px right of cursor, 8px above. If the tooltip
  // would overflow the right edge, flip it to the left of the cursor.
  const TOOLTIP_W = 240;
  const flip = mx + 14 + TOOLTIP_W > (containerW || Infinity);
  const left = flip ? Math.max(8, mx - 14 - TOOLTIP_W) : mx + 14;
  const top = Math.max(8, my - 8);

  return (
    <div
      className="absolute pointer-events-none rounded-md border border-white/[0.12] bg-[#0C0D11]/96 backdrop-blur-md shadow-2xl"
      style={{ left, top, width: TOOLTIP_W, zIndex: 5 }}
    >
      <div className="px-3 py-2 border-b border-white/[0.06] flex items-center justify-between">
        <span className={cx('text-[10px] font-mono uppercase tracking-wider font-semibold',
          cfg.tone === 'orange' ? 'text-[#FF8A4C]' : cfg.tone === 'muted' ? 'text-white/45' : 'text-white/85'
        )}>{cfg.label}</span>
        <span className={cx('text-[10px] font-mono',
          s.isUs ? 'text-[#FF8A4C]' : 'text-white/65'
        )}>{teamLabel}</span>
      </div>

      <div className="px-3 py-2 space-y-1">
        {s.shooter && (
          <div className="text-[12px] font-medium text-white">
            {s.shooter.fullName}
            {isGoal && s.goalsToDate ? <span className="text-[10px] font-mono text-white/45 ml-1.5">(#{s.goalsToDate})</span> : null}
          </div>
        )}
        {(s.shotType || s.distFt != null) && (
          <div className="text-[10px] font-mono text-white/55">
            {s.shotType ? (SHOT_TYPE_LABEL[s.shotType] || s.shotType) : '—'}
            {s.distFt != null && <span className="text-white/35"> · {s.distFt} ft</span>}
          </div>
        )}
        <div className="text-[10px] font-mono text-white/50 tabular-nums">
          P{s.period}{s.periodType === 'OT' ? ' OT' : s.periodType === 'SO' ? ' SO' : ''} · {s.time}
        </div>

        {isGoal && (s.assist1 || s.assist2) && (
          <div className="pt-1 mt-1 border-t border-white/[0.05]">
            <div className="text-[9px] font-mono text-white/40 uppercase tracking-wider">Assists</div>
            <div className="text-[11px] text-white/75">
              {s.assist1?.fullName}
              {s.assist2 && <>, {s.assist2.fullName}</>}
            </div>
          </div>
        )}

        {isBlock && s.blocker && (
          <div className="pt-1 mt-1 border-t border-white/[0.05]">
            <div className="text-[9px] font-mono text-white/40 uppercase tracking-wider">Blocked by</div>
            <div className="text-[11px] text-white/75">{s.blocker.fullName}</div>
          </div>
        )}

        {!isBlock && s.goalie && (
          <div className="pt-1 mt-1 border-t border-white/[0.05]">
            <div className="text-[9px] font-mono text-white/40 uppercase tracking-wider">Goalie</div>
            <div className="text-[11px] text-white/75">{s.goalie.fullName}</div>
          </div>
        )}
      </div>
    </div>
  );
};

// Shot density layer — buckets shots into a coarse hex-style grid (rectangular
// for simplicity), then renders each non-empty cell as a soft-edged orange
// glow. Uses a Gaussian-blur SVG filter so overlapping cells blend together
// into a clean heatmap. Goals get a brighter pop to keep them visible.
const ShotHeat = ({ shots }) => {
  // 18 cols × 12 rows over the offensive half = ~5.5 ft per cell, dense
  // enough to show neighborhood patterns without aliasing.
  const COLS = 18;
  const ROWS = 12;
  const cellW = SVG_W / COLS;
  const cellH = SVG_H / ROWS;

  // Build counts per cell.
  const grid = new Map();
  for (const s of shots) {
    const cx_ = ftToX(s.x);
    const cy_ = ftToY(s.y);
    const col = Math.min(COLS - 1, Math.max(0, Math.floor(cx_ / cellW)));
    const row = Math.min(ROWS - 1, Math.max(0, Math.floor(cy_ / cellH)));
    const key = `${col}:${row}`;
    grid.set(key, (grid.get(key) || 0) + 1);
  }
  if (grid.size === 0) return null;
  const max = Math.max(...grid.values());

  const cells = [];
  for (const [key, count] of grid) {
    const [col, row] = key.split(':').map(Number);
    // Power curve so a few hot cells stand out without washing out cold ones.
    const t = Math.pow(count / max, 0.65);
    const opacity = 0.18 + t * 0.72;
    cells.push(
      <rect
        key={key}
        x={col * cellW}
        y={row * cellH}
        width={cellW}
        height={cellH}
        fill="#F74902"
        fillOpacity={opacity}
      />
    );
  }
  // Goals overlay — small filled dots on top so they remain visible.
  const goals = shots.filter((s) => s.kind === 'goal');

  return (
    <>
      <defs>
        <filter id="heatBlur" x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation="9" />
        </filter>
      </defs>
      <g filter="url(#heatBlur)">{cells}</g>
      {goals.map((s) => (
        <g key={s.id}>
          <circle cx={ftToX(s.x)} cy={ftToY(s.y)} r="5" fill="#FFFFFF" opacity="0.95" />
          <circle cx={ftToX(s.x)} cy={ftToY(s.y)} r="3" fill="#F74902" />
        </g>
      ))}
    </>
  );
};

export const ShotMap = ({ pbpData, oppAbbr }) => {
  const [filter, setFilter] = useState('all'); // 'all' | 'us' | 'them'
  const [mode, setMode] = useState('dots');    // 'dots' | 'heat'
  const [hover, setHover] = useState(null);    // { shot, mx, my }
  const [containerW, setContainerW] = useState(0);

  const shots = useMemo(() => {
    if (!pbpData) return [];
    const teamIds = { home: pbpData.homeTeam?.id, away: pbpData.awayTeam?.id };
    const usTeamId = pbpData.homeTeam?.abbrev === TEAM_ABBR ? pbpData.homeTeam.id : pbpData.awayTeam?.id;
    const players = buildPlayerMap(pbpData.rosterSpots);
    return normalizeShots(pbpData.plays, teamIds, usTeamId, players);
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

  // Capture cursor position relative to the SVG wrapper for tooltip placement.
  const onHover = (shot, e) => {
    const wrap = e.currentTarget.closest('.shotmap-wrap');
    if (!wrap) return;
    const rect = wrap.getBoundingClientRect();
    setContainerW(rect.width);
    setHover({
      shot,
      mx: e.clientX - rect.left,
      my: e.clientY - rect.top,
    });
  };
  const onLeave = () => setHover(null);

  return (
    <div className="p-3 sm:p-4">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
        <div className="flex items-center gap-3 text-[11px] font-mono">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#F74902]" /><span className="text-[#FF8A4C]">PHI</span><span className="text-white/65 tabular-nums">{usCounts.g}G · {usCounts.sog}SOG · {usCounts.miss}M</span></span>
          <span className="text-white/15">|</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-white" /><span className="text-white/65">{oppAbbr}</span><span className="text-white/65 tabular-nums">{themCounts.g}G · {themCounts.sog}SOG · {themCounts.miss}M</span></span>
        </div>
        <div className="flex items-center gap-2">
          {/* Dots vs Heat mode toggle — Dots are interactive (hover for shot
              detail), Heat shows shot density via blurred-circle KDE. */}
          <div className="flex items-center gap-0.5 p-0.5 border border-white/[0.08] rounded-md bg-white/[0.02]">
            {[
              { id: 'dots', l: 'Dots' },
              { id: 'heat', l: 'Heat' },
            ].map((t) => (
              <button key={t.id} onClick={() => { setMode(t.id); setHover(null); }}
                className={cx('px-2.5 h-6 text-[11px] font-medium rounded-[4px] transition-colors',
                  mode === t.id ? 'bg-white/[0.08] text-white' : 'text-white/50 hover:text-white'
                )}>{t.l}</button>
            ))}
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
      </div>

      <div className="shotmap-wrap relative">
        <RinkSVG ariaLabel="Shot map">
          {mode === 'heat' ? (
            <ShotHeat shots={filtered} />
          ) : (
            filtered.map((s) => (
              <ShotDot
                key={s.id}
                s={s}
                hover={hover}
                onHover={onHover}
                onLeave={onLeave}
              />
            ))
          )}
        </RinkSVG>
        {mode === 'dots' && <ShotTooltip hover={hover} oppAbbr={oppAbbr} containerW={containerW} />}
      </div>

      {mode === 'dots' ? (
        <div className="flex items-center justify-center gap-4 mt-3 text-[10px] font-mono text-white/40 uppercase tracking-wider">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-white/85 inline-block" />SOG</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full border border-white/65 inline-block" />Miss/Block</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#F74902] inline-block" />Goal</span>
        </div>
      ) : (
        <div className="flex items-center justify-center gap-3 mt-3 text-[10px] font-mono text-white/40 uppercase tracking-wider">
          <span>Density</span>
          <div className="flex items-center gap-0.5">
            <span className="w-3 h-3 rounded-sm" style={{ background: 'rgba(247,73,2,0.15)' }} />
            <span className="w-3 h-3 rounded-sm" style={{ background: 'rgba(247,73,2,0.4)' }} />
            <span className="w-3 h-3 rounded-sm" style={{ background: 'rgba(247,73,2,0.7)' }} />
            <span className="w-3 h-3 rounded-sm" style={{ background: 'rgba(247,73,2,1)' }} />
          </div>
          <span className="text-white/30">low → high</span>
        </div>
      )}
    </div>
  );
};
