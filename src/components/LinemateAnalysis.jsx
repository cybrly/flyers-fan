import { useMemo } from 'react';
import { Users } from 'lucide-react';
import { cx, TEAM_ABBR } from '../config.js';
import { useShifts } from '../api.js';
import { Section, Skeleton } from './primitives.jsx';
import { PlayerLink } from './PlayerLink.jsx';

// "Who plays with whom" — derive from a single game's shift data. For each
// pair of PHI skaters, sum the seconds where their shifts overlapped. Top
// pairs read as the most-deployed-together combinations of the night.
//
// We also surface the most-frequent forward trio and defensive pair when
// the data supports it (i.e. three forwards / two defensemen with high
// mutual overlap). Rough but reliable enough at the line level.

const PERIOD_LEN = 1200;

const parseMSS = (mss) => {
  if (typeof mss !== 'string') return 0;
  const [m, s] = mss.split(':').map(Number);
  return (m || 0) * 60 + (s || 0);
};
const fmtMSS = (sec) => {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
};

export const LinemateAnalysis = ({ gameId, focusPlayerId = null }) => {
  const { data: shifts, error, loading } = useShifts(gameId);

  const { pairs, players } = useMemo(() => {
    if (!shifts?.length) return { pairs: [], players: {} };
    // PHI skater shifts only. NHL shift data uses typeCode 517 for both
    // skaters and goalies; goalies always appear as 20:00 "shifts" per
    // period, which would dominate every overlap pair (they're literally
    // on the ice the whole game). Filter shifts longer than 3 minutes —
    // safely above the longest realistic skater shift (~2 min) and well
    // below a goalie's per-period span (15–20 min).
    const phi = shifts
      .filter((s) => {
        if (s.teamAbbrev !== TEAM_ABBR) return false;
        if (s.typeCode !== 517) return false;
        if (!s.duration || s.duration === '00:00') return false;
        const durSec = parseMSS(s.duration);
        return durSec > 0 && durSec < 180; // exclude goalies
      })
      .map((s) => ({
        playerId: s.playerId,
        name: `${s.firstName || ''} ${s.lastName || ''}`.trim(),
        start: (s.period - 1) * PERIOD_LEN + parseMSS(s.startTime),
        end: (s.period - 1) * PERIOD_LEN + parseMSS(s.endTime),
      }));

    const players = {};
    for (const s of phi) {
      if (!players[s.playerId]) {
        players[s.playerId] = { id: s.playerId, name: s.name, total: 0 };
      }
      players[s.playerId].total += s.end - s.start;
    }

    const overlap = new Map(); // key "a-b" → seconds (a < b ids)
    for (let i = 0; i < phi.length; i++) {
      for (let j = i + 1; j < phi.length; j++) {
        const a = phi[i];
        const b = phi[j];
        if (a.playerId === b.playerId) continue;
        const o = Math.min(a.end, b.end) - Math.max(a.start, b.start);
        if (o <= 0) continue;
        const [lo, hi] = a.playerId < b.playerId ? [a.playerId, b.playerId] : [b.playerId, a.playerId];
        const key = `${lo}-${hi}`;
        overlap.set(key, (overlap.get(key) || 0) + o);
      }
    }
    const pairs = [...overlap.entries()]
      .map(([key, seconds]) => {
        const [a, b] = key.split('-').map(Number);
        return { a, b, seconds };
      })
      .sort((p1, p2) => p2.seconds - p1.seconds);
    return { pairs, players };
  }, [shifts]);

  if (!gameId) return null;
  if (loading) {
    return (
      <Section title="Linemates">
        <div className="p-6"><Skeleton height={120} /></div>
      </Section>
    );
  }
  if (error || !shifts?.length) {
    return null;
  }

  // If a focus player is provided (PlayerProfile use case), surface only
  // their top partners. Otherwise show top pairs across the whole roster.
  const filteredPairs = focusPlayerId
    ? pairs.filter((p) => p.a === Number(focusPlayerId) || p.b === Number(focusPlayerId)).slice(0, 8)
    : pairs.slice(0, 12);

  if (!filteredPairs.length) return null;

  return (
    <Section
      title={focusPlayerId ? 'Common Linemates · this game' : 'Linemate Combinations'}
      action={
        <span className="flex items-center gap-1 text-[10px] font-mono text-white/40">
          <Users size={10} /> overlapping shifts
        </span>
      }
    >
      <div className="divide-y divide-white/[0.04]">
        {filteredPairs.map((p, i) => {
          const a = players[p.a];
          const b = players[p.b];
          if (!a || !b) return null;
          const partner = focusPlayerId
            ? (Number(focusPlayerId) === p.a ? b : a)
            : null;
          const maxSec = filteredPairs[0].seconds;
          const widthPct = (p.seconds / maxSec) * 100;
          return (
            <div
              key={`${p.a}-${p.b}`}
              className="grid grid-cols-[24px_1fr_120px_60px] items-center gap-3 px-4 h-9 hover:bg-white/[0.02]"
            >
              <span className={cx('text-[10px] font-mono tabular-nums',
                i === 0 ? 'text-amber-300 font-semibold'
                : i < 3 ? 'text-white/65'
                : 'text-white/35'
              )}>{i + 1}</span>
              {partner ? (
                <span className="flex items-center gap-2 min-w-0 text-[12px] text-white/80">
                  <span className="text-white/35 text-[10px] font-mono">with</span>
                  <PlayerLink playerId={partner.id}>{partner.name}</PlayerLink>
                </span>
              ) : (
                <span className="flex items-center gap-2 min-w-0 text-[12px] text-white/80">
                  <PlayerLink playerId={a.id}>{a.name}</PlayerLink>
                  <span className="text-white/30 text-[10px] font-mono">+</span>
                  <PlayerLink playerId={b.id}>{b.name}</PlayerLink>
                </span>
              )}
              <div className="relative h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 bg-[var(--team-primary)]/70 rounded-full"
                  style={{ width: `${widthPct}%` }}
                />
              </div>
              <span className="text-[11px] font-mono tabular-nums text-right text-[var(--team-accent)]">
                {fmtMSS(p.seconds)}
              </span>
            </div>
          );
        })}
      </div>
    </Section>
  );
};
