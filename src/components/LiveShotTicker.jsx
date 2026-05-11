import { useMemo } from 'react';
import { TEAM_ABBR, cx } from '../config.js';
import { Section, Chip } from './primitives.jsx';

// Live rolling shot ticker — pulls shots out of the play-by-play feed
// and surfaces the most recent ones with shooter, location, type, xG,
// and outcome. Sits next to the box score on Game Tape so during a
// live game you can scan "what's happening right now" without
// reading event-by-event in the wide pbp panel.
//
// xG model is the same lightweight distance + angle + shot-type
// formula the ShotMap uses; we recompute here so the ticker doesn't
// need to share state with that component.

const SHOT_KINDS = new Set(['goal', 'shot-on-goal', 'missed-shot', 'blocked-shot']);

const TYPE_MULT = {
  'tip-in': 1.35, 'deflected': 1.50, 'wrap-around': 0.80, 'backhand': 1.05,
  'wrist': 1.00, 'snap': 1.05, 'slap': 0.90, 'poke': 0.85, 'between-legs': 1.20,
};

const SHOT_TYPE_LABEL = {
  'wrist': 'Wrist', 'snap': 'Snap', 'slap': 'Slap', 'backhand': 'Backhand',
  'tip-in': 'Tip', 'deflected': 'Deflect', 'wrap-around': 'Wrap',
  'poke': 'Poke', 'bat': 'Bat', 'between-legs': 'BTL', 'cradle': 'Cradle',
};

const KIND_BADGE = {
  goal: { l: 'GOAL', tone: 'orange' },
  'shot-on-goal': { l: 'SOG', tone: 'sky' },
  'missed-shot': { l: 'MISS', tone: 'muted' },
  'blocked-shot': { l: 'BLK', tone: 'muted' },
};

const KIND_TONE = {
  orange: 'border-[#F74902]/40 bg-[#F74902]/[0.10] text-[#FF8A4C]',
  sky:    'border-sky-500/30 bg-sky-500/[0.06] text-sky-300',
  muted:  'border-white/[0.06] bg-white/[0.02] text-white/45',
};

const buildPlayerMap = (rosterSpots) => {
  const out = {};
  for (const p of rosterSpots || []) {
    out[p.playerId] = p.firstName?.default && p.lastName?.default
      ? `${p.firstName.default[0]}. ${p.lastName.default}`
      : (p.name?.default || '—');
  }
  return out;
};

export const LiveShotTicker = ({ pbpRaw, isLive, oppAbbr }) => {
  const shots = useMemo(() => {
    if (!pbpRaw?.plays?.length) return [];
    const players = buildPlayerMap(pbpRaw.rosterSpots);
    const homeId = pbpRaw.homeTeam?.id;
    const awayId = pbpRaw.awayTeam?.id;
    const usIsHome = pbpRaw.homeTeam?.abbrev === TEAM_ABBR;
    const usTeamId = usIsHome ? homeId : awayId;

    const out = [];
    for (const p of pbpRaw.plays) {
      if (!SHOT_KINDS.has(p.typeDescKey)) continue;
      const det = p.details || {};
      let teamId = det.eventOwnerTeamId;
      if (p.typeDescKey === 'blocked-shot') {
        teamId = teamId === homeId ? awayId : homeId;
      }
      const isUs = teamId === usTeamId;

      // Mirror to attacker's offensive zone (+x).
      let { xCoord: x, yCoord: y } = det;
      if (x == null || y == null) { x = 0; y = 0; }
      const homeDefendsRight = p.homeTeamDefendingSide === 'right';
      const ownerIsHome = teamId === homeId;
      const ownerAttacksRight = ownerIsHome ? !homeDefendsRight : homeDefendsRight;
      if (!ownerAttacksRight) { x = -x; y = -y; }

      const dx = 89 - x;
      const dy = y;
      const distFt = Math.round(Math.sqrt(dx * dx + dy * dy));

      const angleRad = Math.atan2(Math.abs(dy), Math.max(1, dx));
      let xG = Math.max(0.005, 0.22 - 0.0035 * distFt);
      xG *= Math.max(0.45, 1 - angleRad / (Math.PI / 2));
      xG *= TYPE_MULT[det.shotType] || 1;
      if (p.typeDescKey === 'blocked-shot') xG *= 0.45;
      if (p.typeDescKey === 'missed-shot') xG *= 0.85;
      xG = Math.min(0.95, Math.max(0.003, xG));

      const shooterId = det.scoringPlayerId ?? det.shootingPlayerId ?? null;

      out.push({
        id: p.eventId,
        kind: p.typeDescKey,
        period: p.periodDescriptor?.number,
        periodType: p.periodDescriptor?.periodType,
        time: p.timeInPeriod,
        isUs,
        shooter: shooterId ? players[shooterId] : null,
        type: det.shotType,
        distFt,
        xG,
      });
    }
    // Reverse so most recent first.
    return out.reverse().slice(0, 12);
  }, [pbpRaw]);

  if (shots.length === 0) return null;

  return (
    <Section
      title={
        <span className="flex items-center gap-2">
          Shot Ticker
          {isLive && <Chip tone="live" pulse>LIVE</Chip>}
        </span>
      }
      action={<span className="text-[10px] font-mono text-white/40">last {shots.length}</span>}
    >
      <div className="divide-y divide-white/[0.04] max-h-[420px] overflow-y-auto">
        {shots.map((s) => {
          const cfg = KIND_BADGE[s.kind] || { l: s.kind.toUpperCase(), tone: 'muted' };
          const teamLabel = s.isUs ? TEAM_ABBR : (oppAbbr || 'OPP');
          return (
            <div key={s.id} className="px-3 py-2 flex items-center gap-3">
              <span className={cx(
                'inline-flex items-center justify-center px-1.5 h-[18px] text-[9px] font-mono font-semibold rounded-[3px] border tabular-nums shrink-0',
                KIND_TONE[cfg.tone],
              )}>
                {cfg.l}
              </span>
              <span className="text-[10px] font-mono text-white/35 tabular-nums shrink-0 w-12">
                P{s.period}{s.periodType === 'OT' ? ' OT' : ''} {s.time}
              </span>
              <span className={cx('text-[12px] font-medium truncate flex-1', s.isUs ? 'text-[#FF8A4C]' : 'text-white/85')}>
                {s.shooter || '—'}
                <span className="text-white/30 ml-1.5 text-[10px] font-mono">{teamLabel}</span>
              </span>
              <span className="text-[10px] font-mono text-white/45 tabular-nums shrink-0">
                {s.type ? (SHOT_TYPE_LABEL[s.type] || s.type) : '—'}
                <span className="text-white/30 ml-1">· {s.distFt}ft</span>
              </span>
              <span className={cx(
                'text-[10px] font-mono tabular-nums shrink-0 w-12 text-right',
                s.xG >= 0.20 ? 'text-[#FF8A4C]' : s.xG >= 0.10 ? 'text-amber-300' : 'text-white/45',
              )}>
                {s.xG.toFixed(2)} xG
              </span>
            </div>
          );
        })}
      </div>
    </Section>
  );
};
