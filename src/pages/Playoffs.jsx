import { Trophy } from 'lucide-react';
import { cx, TEAM_ABBR, PLAYOFF_YEAR } from '../config.js';
import { Chip, Section, Skeleton } from '../components/primitives.jsx';
import { TeamLogo } from '../components/Logo.jsx';
import { useTeam } from '../teamContext.jsx';

// Historical NHL best-of-7 series-win probability conditional on current
// series score. Numbers come from publicly-cited NHL splits (3-0 leads have
// almost never been blown, 2-2 series are coin flips, etc.). When the series
// hasn't started, we fall through to a seed-based estimate. This is a
// transparent heuristic — not a betting line — and labelled as such in the UI.
const SERIES_PROB_TABLE = {
  '0-0': 0.50,
  '1-0': 0.66, '0-1': 0.34,
  '2-0': 0.81, '0-2': 0.19,
  '1-1': 0.50,
  '2-1': 0.65, '1-2': 0.35,
  '3-0': 0.96, '0-3': 0.04,
  '3-1': 0.84, '1-3': 0.16,
  '2-2': 0.50,
  '3-2': 0.70, '2-3': 0.30,
};

// Returns { top, bottom } as integer percentages summing to 100.
const seriesOdds = (s) => {
  if (!s) return null;
  if (s.complete) {
    const topWon = s.top.wins > s.bottom.wins;
    return { top: topWon ? 100 : 0, bottom: topWon ? 0 : 100 };
  }
  const tw = s.top.wins ?? 0;
  const bw = s.bottom.wins ?? 0;
  let topProb = SERIES_PROB_TABLE[`${tw}-${bw}`];
  if (topProb == null) {
    // Defensive fallback — shouldn't be reached for a real best-of-7.
    topProb = tw === bw ? 0.5 : tw > bw ? 0.6 : 0.4;
  }
  // Seed adjustment only when the series hasn't started — once games are in,
  // the score itself carries the information. Roughly 3 points per seed gap.
  if (tw === 0 && bw === 0 && s.top.rank && s.bottom.rank) {
    const seedDiff = s.bottom.rank - s.top.rank;
    topProb = 0.5 + Math.max(-0.2, Math.min(0.2, seedDiff * 0.03));
  }
  const top = Math.round(topProb * 100);
  return { top, bottom: 100 - top };
};

// Single series tile — two team rows with rank, logo, name, wins, plus a
// derived series-win probability strip at the bottom. The whole tile is
// clickable and opens the SeriesModal for game-by-game detail.
const SeriesCell = ({ s, onOpen }) => {
  if (!s) {
    // Empty placeholder slot — keeps grid alignment when teams TBD.
    return (
      <div className="border border-dashed border-white/[0.06] bg-white/[0.01] rounded-md h-[120px] flex items-center justify-center">
        <span className="text-[10px] font-mono text-white/25">TBD</span>
      </div>
    );
  }
  const topWon = s.complete && s.top.wins > s.bottom.wins;
  const botWon = s.complete && !topWon;
  const odds = seriesOdds(s);
  const teamRow = (t, won) => (
    <div className={cx(
      'flex items-center gap-2.5 px-3 h-[44px]',
      t.abbr === TEAM_ABBR && 'bg-[var(--team-primary)]/[0.08]',
    )}>
      <span className={cx('text-[11px] font-mono w-7 shrink-0 text-center',
        t.abbr === TEAM_ABBR ? 'text-[var(--team-accent)]' : 'text-white/35'
      )}>{t.rank || ''}</span>
      <TeamLogo abbr={t.abbr} size={28} />
      <span className={cx('flex-1 text-[14px] truncate',
        won ? 'text-white font-medium' : s.complete ? 'text-white/40' : 'text-white/75'
      )}>{t.name || '—'}</span>
      <span className={cx('text-[18px] font-mono tabular-nums shrink-0',
        won ? 'text-[var(--team-accent)] font-semibold' : s.complete ? 'text-white/35' : 'text-white/65'
      )}>{t.wins}</span>
    </div>
  );
  return (
    <button
      type="button"
      onClick={() => onOpen?.(s.letter)}
      className={cx(
        'group block w-full text-left border rounded-md overflow-hidden transition-all',
        s.hasUs
          ? 'border-[var(--team-primary)]/40 bg-[var(--team-primary)]/[0.04] hover:bg-[var(--team-primary)]/[0.08] hover:border-[var(--team-primary)]/60'
          : 'border-white/[0.08] bg-[#0E0E0E]/80 hover:bg-[#141414] hover:border-white/20',
      )}
    >
      <div className="divide-y divide-white/[0.05]">
        {teamRow(s.top, topWon)}
        {teamRow(s.bottom, botWon)}
      </div>
      {odds && (
        <div className="border-t border-white/[0.05] bg-black/20 px-3 py-1.5">
          <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider mb-1">
            <span className={cx('tabular-nums',
              s.complete ? (topWon ? 'text-emerald-400' : 'text-white/35')
                : odds.top >= 60 ? 'text-[var(--team-accent)]' : odds.top <= 40 ? 'text-white/45' : 'text-white/65'
            )}>{odds.top}%</span>
            <span className="text-white/35">{s.complete ? 'final' : 'series odds'}</span>
            <span className={cx('tabular-nums',
              s.complete ? (botWon ? 'text-emerald-400' : 'text-white/35')
                : odds.bottom >= 60 ? 'text-[var(--team-accent)]' : odds.bottom <= 40 ? 'text-white/45' : 'text-white/65'
            )}>{odds.bottom}%</span>
          </div>
          {/* Two-toned probability bar */}
          <div className="h-1 w-full rounded-full overflow-hidden bg-white/[0.04]">
            <div className="h-full bg-[var(--team-primary)]/70" style={{ width: `${odds.top}%` }} />
          </div>
        </div>
      )}
    </button>
  );
};

// Vertical column of series with even spacing — flex justify-around aligns
// children at consistent ratios so a 2-series column visually centers between
// pairs of a 4-series column to its left.
const Column = ({ series, count, label, onOpen, accent = false }) => {
  // Pad with nulls so we always render `count` slots. Keeps alignment when
  // not all matchups exist yet (e.g. round 2 before round 1 finishes).
  const slots = [...series];
  while (slots.length < count) slots.push(null);
  return (
    <div className="flex flex-col h-full">
      <div className={cx(
        'text-center text-[10px] font-mono uppercase tracking-wider mb-2 shrink-0',
        accent ? 'text-[var(--team-accent)]' : 'text-white/40'
      )}>
        {label}
      </div>
      <div className="flex-1 flex flex-col justify-around gap-2">
        {slots.map((s, i) => <SeriesCell key={s?.letter || `slot-${i}`} s={s} onOpen={onOpen} />)}
      </div>
    </div>
  );
};

// Stanley Cup Final — bigger, centered, with a trophy badge.
const ScfCell = ({ s, onOpen }) => {
  const topWon = s?.complete && s.top.wins > s.bottom.wins;
  const botWon = s?.complete && !topWon;
  const champ = s?.complete ? (topWon ? s.top : s.bottom) : null;
  return (
    <div className="flex flex-col h-full">
      <div className="text-center text-[10px] font-mono uppercase tracking-wider mb-2 text-[var(--team-accent)] shrink-0 flex items-center justify-center gap-1.5">
        <Trophy size={11} /> Stanley Cup
      </div>
      <div className="flex-1 flex items-center justify-center">
        <div className="w-full">
          {s ? (
            <button
              type="button"
              onClick={() => onOpen?.(s.letter)}
              className={cx(
                'w-full block text-left border rounded-md overflow-hidden transition-all',
                champ?.abbr === TEAM_ABBR
                  ? 'border-[var(--team-primary)]/60 bg-[var(--team-primary)]/[0.10] hover:bg-[var(--team-primary)]/[0.15]'
                  : 'border-[var(--team-primary)]/30 bg-gradient-to-br from-[#1A1208] via-[#141414] to-[#0E0E0E] hover:border-[var(--team-primary)]/50',
              )}
            >
              <div className="px-2.5 py-1 border-b border-white/[0.08] flex items-center justify-between">
                <span className="text-[9px] font-mono text-[var(--team-accent)]/70 uppercase tracking-wider">Final</span>
                {s.complete
                  ? <Chip tone="orange">CHAMP</Chip>
                  : <Chip tone="green" pulse>LIVE</Chip>}
              </div>
              <div className="divide-y divide-white/[0.06]">
                <div className={cx('flex items-center gap-2.5 px-3 h-[52px]',
                  s.top.abbr === TEAM_ABBR && 'bg-[var(--team-primary)]/[0.08]',
                )}>
                  <span className="text-[11px] font-mono w-7 shrink-0 text-center text-white/35">{s.top.rank || ''}</span>
                  <TeamLogo abbr={s.top.abbr} size={36} />
                  <span className={cx('flex-1 text-[15px] truncate',
                    topWon ? 'text-white font-medium' : 'text-white/65'
                  )}>{s.top.name || '—'}</span>
                  <span className={cx('text-[20px] font-mono tabular-nums shrink-0',
                    topWon ? 'text-[var(--team-accent)] font-semibold' : 'text-white/55'
                  )}>{s.top.wins}</span>
                </div>
                <div className={cx('flex items-center gap-2.5 px-3 h-[52px]',
                  s.bottom.abbr === TEAM_ABBR && 'bg-[var(--team-primary)]/[0.08]',
                )}>
                  <span className="text-[11px] font-mono w-7 shrink-0 text-center text-white/35">{s.bottom.rank || ''}</span>
                  <TeamLogo abbr={s.bottom.abbr} size={36} />
                  <span className={cx('flex-1 text-[15px] truncate',
                    botWon ? 'text-white font-medium' : 'text-white/65'
                  )}>{s.bottom.name || '—'}</span>
                  <span className={cx('text-[20px] font-mono tabular-nums shrink-0',
                    botWon ? 'text-[var(--team-accent)] font-semibold' : 'text-white/55'
                  )}>{s.bottom.wins}</span>
                </div>
              </div>
            </button>
          ) : (
            <div className="border border-dashed border-[var(--team-primary)]/20 bg-[var(--team-primary)]/[0.02] rounded-md py-8 text-center">
              <Trophy size={20} className="text-[var(--team-primary)]/40 mx-auto mb-2" />
              <div className="text-[10px] font-mono text-white/30 uppercase tracking-wider">awaiting champions</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const Playoffs = ({ bracket, onOpenSeries }) => {
  const { teamAbbr } = useTeam();
  if (!bracket) {
    return (
      <div className="p-4 md:p-6 space-y-5">
        <Skeleton height={28} className="w-48" />
        <div className="grid grid-cols-7 gap-3">
          {Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} height={400} />)}
        </div>
      </div>
    );
  }

  // Round 1–3: split by conference. Round 4 (SCF) is shared.
  const split = (rIdx) => {
    const series = bracket.rounds[rIdx] || [];
    return {
      west: series.filter((s) => s.conf === 'W'),
      east: series.filter((s) => s.conf === 'E'),
    };
  };
  const r1 = split(0);
  const r2 = split(1);
  const r3 = split(2);
  const scf = bracket.rounds[3]?.[0] || null;

  const hasAny = bracket.rounds.some((arr) => arr.length > 0);

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[20px] font-semibold tracking-tight">Playoffs</h1>
          <p className="text-[12px] text-white/45 mt-1 font-mono">
            {bracket.title || `${PLAYOFF_YEAR} Stanley Cup Playoffs`} · live
          </p>
        </div>
        <div className="flex items-center gap-3 text-[10px] font-mono text-white/40">
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-[var(--team-primary)]/40 border border-[var(--team-primary)]/60" /> {teamAbbr}</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-white/10 border border-white/20" /> other</span>
        </div>
      </div>

      {!hasAny && (
        <div className="border border-white/[0.06] bg-[#0C0C0C]/60 rounded-md p-10 text-center">
          <Trophy size={24} className="text-[var(--team-primary)]/40 mx-auto mb-3" />
          <div className="text-[14px] text-white/85">Bracket not yet set</div>
          <div className="text-[11px] font-mono text-white/40 mt-1">
            Matchups appear once the regular season ends and seeding is finalized.
          </div>
        </div>
      )}

      {hasAny && (
        <>
          {/* Desktop / tablet — full traditional bracket layout */}
          <div className="hidden md:block border border-white/[0.06] bg-[#0C0C0C]/40 rounded-md p-4 lg:p-5">
            <div
              className="grid gap-2 lg:gap-3"
              style={{ gridTemplateColumns: '1fr 1fr 1fr 1.4fr 1fr 1fr 1fr', minHeight: 560 }}
            >
              {/* WEST — left side, R1 → R2 → CF */}
              <Column series={r1.west} count={4} label="West · R1" onOpen={onOpenSeries} />
              <Column series={r2.west} count={2} label="West · R2" onOpen={onOpenSeries} />
              <Column series={r3.west} count={1} label="W. Final"  onOpen={onOpenSeries} />
              {/* CENTER — Stanley Cup Final */}
              <ScfCell s={scf} onOpen={onOpenSeries} />
              {/* EAST — right side, CF → R2 → R1 (mirrored) */}
              <Column series={r3.east} count={1} label="E. Final"  onOpen={onOpenSeries} />
              <Column series={r2.east} count={2} label="East · R2" onOpen={onOpenSeries} />
              <Column series={r1.east} count={4} label="East · R1" onOpen={onOpenSeries} />
            </div>
          </div>

          {/* Mobile — stacked by round */}
          <div className="md:hidden space-y-4">
            {bracket.rounds.map((arr, i) => {
              if (!arr.length) return null;
              const ROUND_NAMES = ['1st Round', '2nd Round', 'Conference Finals', 'Stanley Cup Final'];
              return (
                <Section key={i} title={ROUND_NAMES[i]} action={<span className="text-[10px] font-mono text-white/40">{arr.length}</span>}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-2">
                    {arr.map((s) => (
                      <SeriesCell key={s.letter} s={s} onOpen={onOpenSeries} />
                    ))}
                  </div>
                </Section>
              );
            })}
          </div>
        </>
      )}

      {/* Tap-target hint */}
      {hasAny && (
        <p className="text-[10px] font-mono text-white/30 text-center">
          Click any series for game-by-game detail.
        </p>
      )}
    </div>
  );
};

