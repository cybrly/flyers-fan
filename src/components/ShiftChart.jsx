import { useMemo, useState } from 'react';
import { cx, TEAM_ABBR } from '../config.js';
import { useShifts } from '../api.js';
import { Section, Skeleton } from './primitives.jsx';
import { PlayerLink } from './PlayerLink.jsx';

// Gantt-style shift visualization. Pulls /api/shifts?gameId={id}, groups by
// team and player, renders one row per player with a horizontal bar for each
// shift positioned by absolute game time. Period dividers (and OT/SO if
// applicable) sit as vertical lines across the chart.
//
// The endpoint returns a flat array of shift events across both teams; we
// convert each shift's MM:SS strings into absolute seconds, accumulate per
// player, and bucket into PHI vs opponent rows.

const PERIOD_LEN = 1200; // seconds (regulation period)
const OT_REG_LEN = 300;  // 5 min OT in regular season
// Playoff OT periods are full 20 min, so we use the actual span observed in
// the data rather than a hardcoded length when computing chart width.

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

// Convert period + period-elapsed time into absolute seconds from puck drop.
// NHL shift charts express startTime/endTime as elapsed within the period.
const absSec = (period, mss, isPlayoff) => {
  const periodLen = period <= 3 ? PERIOD_LEN : isPlayoff ? PERIOD_LEN : OT_REG_LEN;
  const before = (period - 1) * PERIOD_LEN;
  // For playoff OT (period > 3) each period is full 1200; in regular season
  // OT is 300, so anything past period 3 needs special width handling.
  return before + Math.min(parseMSS(mss), periodLen);
};

export const ShiftChart = ({ gameId, isPlayoff = false }) => {
  const { data: shifts, error: err, loading } = useShifts(gameId);

  const { teams, totalSec, maxPeriod } = useMemo(() => {
    if (!shifts?.length) return { teams: {}, totalSec: 3600, maxPeriod: 3 };

    // Filter "off-ice" placeholder events that the API sometimes emits with
    // no actual duration, plus non-shift type codes.
    const real = shifts.filter((s) => s.duration && s.duration !== '00:00' && s.typeCode === 517);

    const byTeam = {};
    let maxP = 3;
    for (const s of real) {
      maxP = Math.max(maxP, s.period);
      const t = s.teamAbbrev;
      if (!byTeam[t]) byTeam[t] = {};
      const pid = s.playerId;
      if (!byTeam[t][pid]) {
        byTeam[t][pid] = {
          id: pid,
          name: `${s.firstName || ''} ${s.lastName || ''}`.trim(),
          shifts: [],
          total: 0,
        };
      }
      const start = absSec(s.period, s.startTime, isPlayoff);
      const end = absSec(s.period, s.endTime, isPlayoff);
      const dur = Math.max(0, end - start);
      byTeam[t][pid].shifts.push({
        period: s.period,
        start,
        end,
        dur,
        sn: s.shiftNumber,
      });
      byTeam[t][pid].total += dur;
    }

    // Total chart width — extend through the highest period observed.
    const total = maxP <= 3
      ? PERIOD_LEN * 3
      : isPlayoff
        ? PERIOD_LEN * maxP
        : PERIOD_LEN * 3 + OT_REG_LEN * (maxP - 3);

    return { teams: byTeam, totalSec: total, maxPeriod: maxP };
  }, [shifts, isPlayoff]);

  if (!gameId) return null;
  if (loading) {
    return (
      <Section title="Shift Chart">
        <div className="p-6"><Skeleton height={200} /></div>
      </Section>
    );
  }
  if (err || !shifts?.length) {
    return (
      <Section title="Shift Chart">
        <div className="p-6 text-center text-[11px] font-mono text-white/35">
          {err ? `Couldn't load shift data: ${err}` : 'No shift data for this game.'}
        </div>
      </Section>
    );
  }

  // Period divider positions in seconds.
  const dividers = [];
  for (let p = 1; p < maxPeriod; p++) {
    if (p <= 3) dividers.push({ at: p * PERIOD_LEN, label: `P${p}` });
    else if (isPlayoff) dividers.push({ at: 3 * PERIOD_LEN + (p - 3) * PERIOD_LEN, label: p === 4 ? 'OT' : `OT${p - 3}` });
    else dividers.push({ at: 3 * PERIOD_LEN + (p - 3) * OT_REG_LEN, label: 'OT' });
  }

  // Order: PHI first (focused team), then opponent. Sort each team by total
  // ice time descending — heavy minutes at the top reads more naturally.
  const teamOrder = Object.keys(teams).sort((a, b) => (a === TEAM_ABBR ? -1 : b === TEAM_ABBR ? 1 : 0));

  return (
    <Section
      title="Shift Chart"
      action={<span className="text-[10px] font-mono text-white/40">Gantt · sorted by TOI</span>}
    >
      <div className="p-3 sm:p-4 overflow-x-auto">
        <div style={{ minWidth: 720 }}>
          {/* Period header strip */}
          <div className="relative h-5 mb-1.5">
            {Array.from({ length: maxPeriod }).map((_, i) => {
              const p = i + 1;
              const start = p <= 3 ? (p - 1) * PERIOD_LEN : 3 * PERIOD_LEN + (p - 4) * (isPlayoff ? PERIOD_LEN : OT_REG_LEN);
              const end = p <= 3 ? p * PERIOD_LEN : 3 * PERIOD_LEN + (p - 3) * (isPlayoff ? PERIOD_LEN : OT_REG_LEN);
              const left = (start / totalSec) * 100;
              const width = ((end - start) / totalSec) * 100;
              return (
                <div
                  key={p}
                  className="absolute top-0 h-full flex items-center justify-center text-[9px] font-mono text-white/45 uppercase tracking-wider border-l border-white/[0.08]"
                  style={{ left: `${left}%`, width: `${width}%` }}
                >
                  {p <= 3 ? `Period ${p}` : p === 4 ? 'OT' : `OT${p - 3}`}
                </div>
              );
            })}
          </div>

          {teamOrder.map((teamAbbr) => {
            const players = Object.values(teams[teamAbbr]).sort((a, b) => b.total - a.total);
            const isUs = teamAbbr === TEAM_ABBR;
            return (
              <div key={teamAbbr} className="mb-4 last:mb-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className={cx('text-[11px] font-medium', isUs ? 'text-[var(--team-accent)]' : 'text-white/70')}>
                    {teamAbbr}
                  </span>
                  <span className="text-[10px] font-mono text-white/35">{players.length} skaters</span>
                </div>
                <div className="space-y-[2px]">
                  {players.map((p) => (
                    <ShiftRow
                      key={p.id}
                      player={p}
                      totalSec={totalSec}
                      isUs={isUs}
                    />
                  ))}
                </div>
              </div>
            );
          })}

          {/* Period divider overlay (rendered as thin lines spanning all rows
              after-the-fact so they don't get covered by shift bars). */}
          <div className="relative -mt-2 pointer-events-none" style={{ height: 0 }} aria-hidden>
            {dividers.map((d) => (
              <div
                key={d.at}
                className="absolute top-0 w-px bg-white/10"
                style={{ left: `calc(${(d.at / totalSec) * 100}% + 132px)`, height: 0 }}
              />
            ))}
          </div>
        </div>
        <div className="mt-3 flex items-center gap-4 text-[10px] font-mono text-white/45">
          <span className="flex items-center gap-1.5"><span className="w-3 h-2 bg-[var(--team-primary)]" /> {TEAM_ABBR} shift</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-2 bg-white/40" /> opponent shift</span>
          <span className="text-white/30">· hover a shift for details</span>
        </div>
      </div>
    </Section>
  );
};

// Single player row: name on the left, track on the right with one rect per
// shift. We use an SVG so hover tooltips compose cleanly.
const ShiftRow = ({ player, totalSec, isUs }) => {
  const [hover, setHover] = useState(null);
  const trackHeight = 16;
  return (
    <div className="grid grid-cols-[120px_1fr_44px] items-center gap-2">
      <div className="text-[11px] truncate">
        <PlayerLink playerId={player.id}>{player.name}</PlayerLink>
      </div>
      <div className="relative">
        <svg width="100%" height={trackHeight} viewBox={`0 0 ${totalSec} ${trackHeight}`} preserveAspectRatio="none" className="block">
          <rect x={0} y={trackHeight / 2 - 1} width={totalSec} height={2} fill="rgba(255,255,255,0.04)" />
          {player.shifts.map((s, i) => (
            <rect
              key={i}
              x={s.start}
              y={2}
              width={Math.max(2, s.dur)}
              height={trackHeight - 4}
              fill={isUs ? 'var(--team-primary)' : 'rgba(255,255,255,0.55)'}
              opacity={hover && hover !== i ? 0.4 : 0.92}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              style={{ cursor: 'pointer' }}
            >
              <title>
                Period {s.period} · {fmtMSS(s.start - (s.period - 1) * PERIOD_LEN)}–{fmtMSS(s.end - (s.period - 1) * PERIOD_LEN)} · {fmtMSS(s.dur)}
              </title>
            </rect>
          ))}
        </svg>
      </div>
      <span className={cx('text-[10px] font-mono tabular-nums text-right',
        isUs ? 'text-[var(--team-accent)]' : 'text-white/65'
      )}>{fmtMSS(player.total)}</span>
    </div>
  );
};
