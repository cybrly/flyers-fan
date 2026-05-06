import { useEffect, useMemo, useState } from 'react';
import { cx, isLive, TEAM_ABBR } from '../config.js';
import { useShifts } from '../api.js';
import { Section, SectionBand, Skeleton, Chip } from '../components/primitives.jsx';
import { Headshot } from '../components/Headshot.jsx';
import { PlayerLink } from '../components/PlayerLink.jsx';

// Live "who's on the ice right now" view. Pulls the shift-charts feed
// for the active game and cross-references each shift's start/end
// against the play clock to figure out which Flyers are currently on
// the ice. Boxscore stats build alongside (G/A/P/SOG/+-/hits/blk/TOI).
//
// Shifts data lags ~10–15 s behind the actual clock — the upstream
// shiftcharts endpoint commits a shift only after it ends, and our
// edge proxy caches at s-maxage=30 to avoid hammering. So the green
// "on ice" highlight is a fan-grade approximation, not broadcast TV.

const PERIOD_REG = 1200; // seconds per regulation period
const OT_REG = 300;      // regular-season OT
const OT_PO = 1200;      // playoff OT periods

const parseMSS = (mss) => {
  if (!mss || typeof mss !== 'string') return 0;
  const [m, s] = mss.split(':').map(Number);
  return (m || 0) * 60 + (s || 0);
};

// Convert the live game's clock into elapsed seconds within the
// current period. liveDetail.clock.secondsRemaining counts down, so
// elapsed = periodLen − remaining.
const computeElapsed = (liveDetail, isPlayoff) => {
  const period = liveDetail?.periodDescriptor?.number || 0;
  const periodType = liveDetail?.periodDescriptor?.periodType;
  const remaining = liveDetail?.clock?.secondsRemaining;
  if (period === 0 || remaining == null) return null;
  const isOT = period > 3 || periodType === 'OT';
  const periodLen = isOT && !isPlayoff ? OT_REG : isOT && isPlayoff ? OT_PO : PERIOD_REG;
  return { period, elapsed: Math.max(0, periodLen - remaining), inIntermission: !!liveDetail?.clock?.inIntermission };
};

// Walk a player's shifts and return their current-shift state for the
// active period. A "current" shift is one whose start <= elapsed and
// (end >= elapsed) within tolerance. The shifts feed lags so we're
// generous on the trailing edge.
const TOLERANCE_S = 6;
const playerLiveShift = (shifts, playerId, period, elapsed) => {
  if (!shifts || period == null || elapsed == null) return null;
  const candidates = shifts.filter((s) =>
    s.playerId === playerId && s.period === period && s.typeCode === 517 && s.duration && s.duration !== '00:00'
  );
  for (const s of candidates) {
    const start = parseMSS(s.startTime);
    const end = parseMSS(s.endTime);
    if (start <= elapsed + TOLERANCE_S && elapsed <= end + TOLERANCE_S) {
      // Shift active. Compute on-ice seconds so far in this shift.
      const inShiftSec = Math.max(0, Math.min(elapsed, end) - start);
      return { active: true, start, end, inShiftSec };
    }
  }
  return null;
};

const fmtMSS = (sec) => {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
};

// Per-row component so each rerender is scoped — the table can have
// 18+ skaters and we want only the active ones to repaint at 1 Hz.
const SkaterRow = ({ p, liveShift, periodLabel, periodElapsed }) => {
  const onIce = !!liveShift?.active;
  // Shift-time-so-far ticks every render via useClockTick at the page
  // level (1 Hz), so we don't need our own timer here — the parent
  // recomputes liveShift on each tick and we just display it.
  const shiftTime = onIce ? liveShift.inShiftSec : null;
  return (
    <div
      className={cx(
        'grid grid-cols-[44px_44px_minmax(140px,1fr)_64px_56px_44px_44px_44px_50px_44px_44px] gap-2 items-center px-3 h-12 transition-colors',
        onIce ? 'bg-emerald-500/[0.10] border-l-2 border-emerald-500/70' : 'border-l-2 border-transparent hover:bg-white/[0.02]',
      )}
    >
      <div className="flex items-center justify-center">
        {onIce ? (
          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/50">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[9px] font-mono font-semibold text-emerald-300 uppercase tracking-wider">on</span>
          </span>
        ) : (
          <span className="text-[10px] font-mono text-white/25">—</span>
        )}
      </div>
      <Headshot playerId={p.id} teamAbbrev={TEAM_ABBR} num={p.num} size={36} />
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-mono text-white/35 tabular-nums shrink-0">#{p.num}</span>
          <PlayerLink playerId={p.id} className="text-[13px] text-white/90 truncate hover:text-white">
            {p.name}
          </PlayerLink>
          <span className="text-[9px] font-mono text-white/30 shrink-0">{p.pos}</span>
        </div>
        {onIce && (
          <div className="text-[10px] font-mono text-emerald-400 tabular-nums mt-0.5">
            shift: {fmtMSS(shiftTime)} · {periodLabel} {fmtMSS(periodElapsed)}
          </div>
        )}
      </div>
      <Stat label="TOI" value={p.toi || '—'} />
      <Stat label="G·A·P" value={`${p.g}·${p.a}·${p.pts}`} highlight={p.pts > 0} />
      <Stat label="SOG" value={p.sog} />
      <Stat label="+/-" value={p.pm > 0 ? `+${p.pm}` : p.pm} tone={p.pm > 0 ? 'good' : p.pm < 0 ? 'bad' : null} />
      <Stat label="Hit" value={p.hits} />
      <Stat label="Blk" value={p.blk} />
      <Stat label="PIM" value={p.pim ?? '—'} />
      <Stat label="FO%" value={p.faceoffPct != null ? `${p.faceoffPct}` : '—'} />
    </div>
  );
};

const Stat = ({ label, value, highlight, tone }) => (
  <div className="text-center">
    <div className="text-[8px] font-mono text-white/30 uppercase tracking-wider">{label}</div>
    <div className={cx(
      'text-[12px] font-mono tabular-nums leading-none mt-0.5',
      tone === 'good' ? 'text-emerald-400' :
      tone === 'bad' ? 'text-red-400' :
      highlight ? 'text-[#FF8A4C]' : 'text-white/85',
    )}>
      {value ?? 0}
    </div>
  </div>
);

const Header = ({ periodLabel, periodElapsed, onIceCount, isLiveGame }) => (
  <div className="flex items-center justify-between flex-wrap gap-3 px-3 py-2 border-b border-white/[0.06]">
    <div className="flex items-center gap-3">
      {isLiveGame ? (
        <Chip tone="live" pulse>LIVE</Chip>
      ) : (
        <Chip tone="muted">FINAL</Chip>
      )}
      {periodLabel && (
        <span className="text-[12px] font-mono uppercase tracking-wider text-white/55 tabular-nums">
          {periodLabel} · {fmtMSS(periodElapsed)} elapsed
        </span>
      )}
    </div>
    {isLiveGame && (
      <span className="text-[11px] font-mono text-emerald-300 tabular-nums">
        {onIceCount} Flyer{onIceCount === 1 ? '' : 's'} on ice
      </span>
    )}
  </div>
);

export const OnIce = ({ game, gameId }) => {
  const liveGame = !!game && isLive(game.state);
  const [tick, setTick] = useState(0);
  // Per-second tick to advance the visible shift timer even though the
  // boxscore poll only runs every ~10s. Pauses when the game isn't
  // live to avoid burning render cycles on a static page.
  useEffect(() => {
    if (!liveGame) return;
    const t = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, [liveGame]);

  // Poll the shifts feed every 15 s during a live game so on-ice
  // membership stays roughly current. The proxy already caches at
  // s-maxage=30 so this won't hammer upstream.
  const { data: shifts, loading: shiftsLoading } = useShifts(gameId, liveGame ? 15000 : 0);

  // Apply the per-second tick to elapsed by interpolating from the
  // boxscore's last-known clock. Shift data itself lags but the
  // "we know the player is on the ice" highlight is correct as soon
  // as the shift starts; the timer just keeps counting until either
  // the next boxscore poll updates or the shift ends.
  const periodState = useMemo(() => {
    if (!game || !liveGame) return null;
    const isPlayoff = game.gameType === 3;
    const base = computeElapsed(game, isPlayoff);
    if (!base) return null;
    return { ...base, elapsed: Math.min(base.elapsed + tick, PERIOD_REG) };
    // tick intentionally part of deps so the elapsed value advances
    // each second without waiting for the next boxscore refresh.
  }, [game, liveGame, tick]);

  const skaters = game?.skaters || [];

  const liveShifts = useMemo(() => {
    if (!periodState) return {};
    const out = {};
    for (const p of skaters) {
      out[p.id] = playerLiveShift(shifts, p.id, periodState.period, periodState.elapsed);
    }
    return out;
  }, [skaters, shifts, periodState]);

  const onIceCount = Object.values(liveShifts).filter((s) => s?.active).length;
  const periodLabel = periodState ? (periodState.period > 3 ? (game?.gameType === 3 ? `OT${periodState.period - 3}` : 'OT') : `P${periodState.period}`) : null;

  // Sort: on-ice players first, then by position (D before F? actually
  // forwards first feels more natural), then by points.
  const sorted = useMemo(() => {
    return [...skaters].sort((a, b) => {
      const aOn = liveShifts[a.id]?.active ? 1 : 0;
      const bOn = liveShifts[b.id]?.active ? 1 : 0;
      if (aOn !== bOn) return bOn - aOn;
      return (b.pts - a.pts) || (b.sog - a.sog);
    });
  }, [skaters, liveShifts]);

  if (!game) {
    return (
      <div className="p-3 md:p-5 space-y-3">
        <SectionBand label="On Ice" color="emerald" sub="live skater state" />
        <Section title="Waiting for a game">
          <div className="p-8 text-center text-[12px] font-mono text-white/40">
            No live or recent game data available.
          </div>
        </Section>
      </div>
    );
  }

  return (
    <div className="p-3 md:p-5 space-y-3">
      <SectionBand
        label="On Ice"
        color="emerald"
        sub={liveGame ? 'live · auto-updating' : 'final game · last known state'}
        count={skaters.length}
      />

      <Section title="Skater Live Tracker" action={<span className="text-[10px] font-mono text-white/40">vs {game.oppAbbr || '—'}</span>}>
        <Header
          periodLabel={periodLabel}
          periodElapsed={periodState?.elapsed || 0}
          onIceCount={onIceCount}
          isLiveGame={liveGame}
        />

        <div className="grid grid-cols-[44px_44px_minmax(140px,1fr)_64px_56px_44px_44px_44px_50px_44px_44px] gap-2 items-center px-3 h-7 text-[9px] font-mono text-white/30 uppercase tracking-wider border-b border-white/[0.04]">
          <span className="text-center">Status</span>
          <span></span>
          <span>Player</span>
          <span className="text-center">TOI</span>
          <span className="text-center">G·A·P</span>
          <span className="text-center">SOG</span>
          <span className="text-center">+/-</span>
          <span className="text-center">Hit</span>
          <span className="text-center">Blk</span>
          <span className="text-center">PIM</span>
          <span className="text-center">FO%</span>
        </div>

        {shiftsLoading && skaters.length === 0 && (
          <div className="p-6 space-y-2">
            <Skeleton height={48} />
            <Skeleton height={48} />
            <Skeleton height={48} />
          </div>
        )}

        <div className="divide-y divide-white/[0.04]">
          {sorted.map((p) => (
            <SkaterRow
              key={p.id}
              p={p}
              liveShift={liveShifts[p.id]}
              periodLabel={periodLabel}
              periodElapsed={periodState?.elapsed || 0}
            />
          ))}
        </div>

        {!liveGame && (
          <div className="px-3 py-2.5 border-t border-white/[0.05] text-[10px] font-mono text-white/35">
            Game isn't live — table shows the final boxscore. The on-ice highlight only fires during live play.
          </div>
        )}
      </Section>
    </div>
  );
};
