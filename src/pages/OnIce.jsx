import { useEffect, useMemo, useState } from 'react';
import { cx, isLive, TEAM_ABBR } from '../config.js';
import { useShifts } from '../api.js';
import { Section, SectionBand, Skeleton, Chip } from '../components/primitives.jsx';
import { Headshot } from '../components/Headshot.jsx';
import { PlayerLink } from '../components/PlayerLink.jsx';
import { TeamLogo } from '../components/Logo.jsx';
import { FlyersMark } from '../components/Logo.jsx';

// Live "who's on the ice right now" view. Pulls the shift-charts feed
// for the active game and cross-references each shift's start/end
// against the play clock to figure out which Flyers are currently on
// the ice. Boxscore stats build alongside (G/A/P/SOG/+-/hits/blk/TOI).
//
// Shifts data lags ~10–15 s behind the actual clock — the upstream
// shiftcharts endpoint commits a shift only after it ends, and our
// edge proxy caches at s-maxage=30 to avoid hammering. So the green
// "on ice" highlight is a fan-grade approximation, not broadcast TV.

const PERIOD_REG = 1200;
const OT_REG = 300;
const OT_PO = 1200;

const parseMSS = (mss) => {
  if (!mss || typeof mss !== 'string') return 0;
  const [m, s] = mss.split(':').map(Number);
  return (m || 0) * 60 + (s || 0);
};

const computeElapsed = (liveDetail, isPlayoff) => {
  const period = liveDetail?.periodDescriptor?.number || 0;
  const periodType = liveDetail?.periodDescriptor?.periodType;
  const remaining = liveDetail?.clock?.secondsRemaining;
  if (period === 0 || remaining == null) return null;
  const isOT = period > 3 || periodType === 'OT';
  const periodLen = isOT && !isPlayoff ? OT_REG : isOT && isPlayoff ? OT_PO : PERIOD_REG;
  return { period, elapsed: Math.max(0, periodLen - remaining), inIntermission: !!liveDetail?.clock?.inIntermission };
};

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

// One row of the skater table — renders for both PHI and OPP.
const SkaterRow = ({ p, liveShift, accentColor, periodLabel, periodElapsed }) => {
  const onIce = !!liveShift?.active;
  const shiftTime = onIce ? liveShift.inShiftSec : null;
  return (
    <div
      className={cx(
        'grid grid-cols-[44px_36px_minmax(120px,1fr)_56px_56px_44px_44px] gap-2 items-center px-3 h-12 transition-colors border-l-2',
        onIce ? 'bg-emerald-500/[0.10] border-emerald-500/70' : 'border-transparent hover:bg-white/[0.02]',
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
      <Headshot playerId={p.id} num={p.num} size={32} />
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-mono text-white/35 tabular-nums shrink-0">#{p.num}</span>
          <PlayerLink playerId={p.id} className={cx('text-[12px] truncate', onIce ? 'text-white' : 'text-white/85')}>
            {p.name}
          </PlayerLink>
          <span className="text-[9px] font-mono text-white/30 shrink-0">{p.pos}</span>
        </div>
        {onIce && (
          <div className="text-[10px] font-mono text-emerald-400 tabular-nums mt-0.5">
            shift: {fmtMSS(shiftTime)}
          </div>
        )}
      </div>
      <Stat label="TOI" value={p.toi || '—'} />
      <Stat label="G·A·P" value={`${p.g}·${p.a}·${p.pts}`} highlight={p.pts > 0} accent={accentColor} />
      <Stat label="SOG" value={p.sog} />
      <Stat label="+/-" value={p.pm > 0 ? `+${p.pm}` : p.pm} tone={p.pm > 0 ? 'good' : p.pm < 0 ? 'bad' : null} />
      <Stat label="Hit" value={p.hits} />
    </div>
  );
};

const Stat = ({ label, value, highlight, tone, accent }) => (
  <div className="text-center">
    <div className="text-[8px] font-mono text-white/30 uppercase tracking-wider">{label}</div>
    <div className={cx(
      'text-[12px] font-mono tabular-nums leading-none mt-0.5',
      tone === 'good' ? 'text-emerald-400' :
      tone === 'bad' ? 'text-red-400' :
      highlight && accent ? '' : highlight ? 'text-[#FF8A4C]' : 'text-white/85',
    )}
    style={highlight && accent ? { color: accent } : undefined}>
      {value ?? 0}
    </div>
  </div>
);

// Currently-on-ice players for both teams shown side-by-side. Reads
// the most natural way to use the OnIce page during a live game:
// "what's on the ice right now."
const LiveMatchup = ({ phiOn, oppOn, oppAbbr, periodLabel, periodElapsed }) => {
  const has = phiOn.length > 0 || oppOn.length > 0;
  if (!has) return null;
  return (
    <Section
      title="Current Matchup"
      action={
        <span className="text-[10px] font-mono text-emerald-300 tabular-nums">
          {periodLabel ? `${periodLabel} · ${fmtMSS(periodElapsed)}` : 'live'}
        </span>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-white/[0.05]">
        <MatchupSide skaters={phiOn} label="PHI" logo={<FlyersMark size={20} />} accent="text-[#FF8A4C]" />
        <MatchupSide skaters={oppOn} label={oppAbbr || 'OPP'} logo={<TeamLogo abbr={oppAbbr} size={20} />} accent="text-white/85" />
      </div>
    </Section>
  );
};

const MatchupSide = ({ skaters, label, logo, accent }) => (
  <div className="p-4">
    <div className="flex items-center gap-2 mb-3">
      {logo}
      <span className={cx('text-[14px] font-semibold tracking-tight', accent)}>{label}</span>
      <span className="text-[10px] font-mono text-white/40 tabular-nums ml-auto">
        {skaters.length} on ice
      </span>
    </div>
    {skaters.length === 0 ? (
      <div className="text-[11px] font-mono text-white/30 italic py-2">No players on ice</div>
    ) : (
      <div className="space-y-1.5">
        {skaters.map((p) => (
          <div key={p.id} className="flex items-center gap-2 px-2 py-1 rounded bg-white/[0.02] border border-white/[0.04]">
            <Headshot playerId={p.id} num={p.num} size={28} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-[10px] font-mono text-white/35 tabular-nums shrink-0">#{p.num}</span>
                <PlayerLink playerId={p.id} className="text-[12px] text-white/90 truncate hover:text-white">
                  {p.name}
                </PlayerLink>
                <span className="text-[9px] font-mono text-white/30 shrink-0">{p.pos}</span>
              </div>
              <div className="text-[10px] font-mono text-white/45 tabular-nums">
                {p.g}·{p.a}·{p.pts} · {p.toi}
              </div>
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
);

const Header = ({ periodLabel, periodElapsed, onIceCount, oppOnIceCount, isLiveGame, oppAbbr }) => (
  <div className="flex items-center justify-between flex-wrap gap-3 px-3 py-2 border-b border-white/[0.06]">
    <div className="flex items-center gap-3">
      {isLiveGame ? <Chip tone="live" pulse>LIVE</Chip> : <Chip tone="muted">FINAL</Chip>}
      {periodLabel && (
        <span className="text-[12px] font-mono uppercase tracking-wider text-white/55 tabular-nums">
          {periodLabel} · {fmtMSS(periodElapsed)} elapsed
        </span>
      )}
    </div>
    {isLiveGame && (
      <span className="text-[11px] font-mono tabular-nums">
        <span className="text-[#FF8A4C]">{onIceCount} PHI</span>
        <span className="text-white/25 mx-2">vs</span>
        <span className="text-white/85">{oppOnIceCount} {oppAbbr || 'OPP'}</span>
      </span>
    )}
  </div>
);

// Side panel for one team's skater table — sortable, on-ice highlight.
const TeamTable = ({ skaters, liveShifts, accentColor, header, periodLabel, periodElapsed }) => {
  const sorted = useMemo(() => {
    return [...skaters].sort((a, b) => {
      const aOn = liveShifts[a.id]?.active ? 1 : 0;
      const bOn = liveShifts[b.id]?.active ? 1 : 0;
      if (aOn !== bOn) return bOn - aOn;
      return (b.pts - a.pts) || (b.sog - a.sog);
    });
  }, [skaters, liveShifts]);

  return (
    <div>
      {header}
      <div className="grid grid-cols-[44px_36px_minmax(120px,1fr)_56px_56px_44px_44px] gap-2 items-center px-3 h-7 text-[9px] font-mono text-white/30 uppercase tracking-wider border-b border-white/[0.04]">
        <span className="text-center">On</span>
        <span></span>
        <span>Player</span>
        <span className="text-center">TOI</span>
        <span className="text-center">G·A·P</span>
        <span className="text-center">SOG</span>
        <span className="text-center">+/-</span>
      </div>
      <div className="divide-y divide-white/[0.04]">
        {sorted.map((p) => (
          <SkaterRow
            key={p.id}
            p={p}
            liveShift={liveShifts[p.id]}
            accentColor={accentColor}
            periodLabel={periodLabel}
            periodElapsed={periodElapsed}
          />
        ))}
      </div>
    </div>
  );
};

export const OnIce = ({ game, gameId }) => {
  const liveGame = !!game && isLive(game.state);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!liveGame) return;
    const t = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, [liveGame]);

  const { data: shifts, loading: shiftsLoading } = useShifts(gameId, liveGame ? 15000 : 0);

  const periodState = useMemo(() => {
    if (!game || !liveGame) return null;
    const isPlayoff = game.gameType === 3;
    const base = computeElapsed(game, isPlayoff);
    if (!base) return null;
    return { ...base, elapsed: Math.min(base.elapsed + tick, PERIOD_REG) };
  }, [game, liveGame, tick]);

  const skaters = game?.skaters || [];
  const oppSkaters = game?.oppSkaters || [];

  const phiLiveShifts = useMemo(() => {
    if (!periodState) return {};
    const out = {};
    for (const p of skaters) out[p.id] = playerLiveShift(shifts, p.id, periodState.period, periodState.elapsed);
    return out;
  }, [skaters, shifts, periodState]);

  const oppLiveShifts = useMemo(() => {
    if (!periodState) return {};
    const out = {};
    for (const p of oppSkaters) out[p.id] = playerLiveShift(shifts, p.id, periodState.period, periodState.elapsed);
    return out;
  }, [oppSkaters, shifts, periodState]);

  const phiOnIce = useMemo(() => skaters.filter((p) => phiLiveShifts[p.id]?.active), [skaters, phiLiveShifts]);
  const oppOnIce = useMemo(() => oppSkaters.filter((p) => oppLiveShifts[p.id]?.active), [oppSkaters, oppLiveShifts]);

  const periodLabel = periodState ? (periodState.period > 3 ? (game?.gameType === 3 ? `OT${periodState.period - 3}` : 'OT') : `P${periodState.period}`) : null;

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
        count={skaters.length + oppSkaters.length}
      />

      {/* Live matchup — only meaningful while a game is in progress. */}
      {liveGame && (
        <LiveMatchup
          phiOn={phiOnIce}
          oppOn={oppOnIce}
          oppAbbr={game.oppAbbr}
          periodLabel={periodLabel}
          periodElapsed={periodState?.elapsed || 0}
        />
      )}

      {/* Side-by-side full skater tables */}
      <Section
        title="Skater Tracker"
        action={<span className="text-[10px] font-mono text-white/40">PHI vs {game.oppAbbr || '—'}</span>}
      >
        <Header
          periodLabel={periodLabel}
          periodElapsed={periodState?.elapsed || 0}
          onIceCount={phiOnIce.length}
          oppOnIceCount={oppOnIce.length}
          isLiveGame={liveGame}
          oppAbbr={game.oppAbbr}
        />

        {shiftsLoading && skaters.length === 0 && (
          <div className="p-6 space-y-2">
            <Skeleton height={48} />
            <Skeleton height={48} />
            <Skeleton height={48} />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 lg:divide-x divide-y lg:divide-y-0 divide-white/[0.05]">
          <TeamTable
            skaters={skaters}
            liveShifts={phiLiveShifts}
            accentColor="#FF8A4C"
            periodLabel={periodLabel}
            periodElapsed={periodState?.elapsed || 0}
            header={
              <div className="px-4 py-2.5 border-b border-white/[0.06] flex items-center gap-2 bg-[#F74902]/[0.04]">
                <FlyersMark size={18} />
                <span className="text-[13px] font-semibold tracking-tight text-[#FF8A4C]">PHI</span>
                <span className="text-[10px] font-mono text-white/40 ml-auto tabular-nums">
                  {skaters.length} skaters
                </span>
              </div>
            }
          />
          <TeamTable
            skaters={oppSkaters}
            liveShifts={oppLiveShifts}
            accentColor="#E0E0E0"
            periodLabel={periodLabel}
            periodElapsed={periodState?.elapsed || 0}
            header={
              <div className="px-4 py-2.5 border-b border-white/[0.06] flex items-center gap-2">
                <TeamLogo abbr={game.oppAbbr} size={18} />
                <span className="text-[13px] font-semibold tracking-tight text-white/85">{game.oppAbbr || 'OPP'}</span>
                <span className="text-[10px] font-mono text-white/40 ml-auto tabular-nums">
                  {oppSkaters.length} skaters
                </span>
              </div>
            }
          />
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
