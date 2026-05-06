import { useMemo } from 'react';
import { cx, OPP_FULL, fmtDate } from '../config.js';
import { Section } from './primitives.jsx';
import { TeamLogo } from './Logo.jsx';

// Visualize the next N opponents by record so fans can see whether
// the upcoming stretch is a friendly run or a gauntlet. Each card
// shows opponent abbr/logo, their record + points-percentage, and
// a 0–1 difficulty score (higher pct → harder). Color-codes the
// strip so the eye groups easy / medium / hard at a glance.

const N = 5;

// Map points-percentage to a difficulty bucket. League-average is
// around .500–.550; .600+ is elite, .400- is bottom-feeder.
const difficultyOf = (pct) => {
  if (pct == null) return { label: '—', tone: 'muted' };
  if (pct >= 0.62) return { label: 'Elite', tone: 'red' };
  if (pct >= 0.55) return { label: 'Hard', tone: 'amber' };
  if (pct >= 0.48) return { label: 'Even', tone: 'sky' };
  if (pct >= 0.42) return { label: 'Soft', tone: 'emerald' };
  return { label: 'Easy', tone: 'green' };
};

const TONE = {
  muted:    { fill: 'bg-white/[0.04]',  ring: 'border-white/[0.08]', text: 'text-white/45' },
  red:      { fill: 'bg-red-500/[0.12]', ring: 'border-red-500/40', text: 'text-red-300' },
  amber:    { fill: 'bg-amber-500/[0.10]', ring: 'border-amber-500/40', text: 'text-amber-300' },
  sky:      { fill: 'bg-sky-500/[0.08]', ring: 'border-sky-500/35', text: 'text-sky-300' },
  emerald:  { fill: 'bg-emerald-500/[0.08]', ring: 'border-emerald-500/40', text: 'text-emerald-300' },
  green:    { fill: 'bg-emerald-500/[0.14]', ring: 'border-emerald-500/55', text: 'text-emerald-300' },
};

export const ScheduleStrength = ({ upcoming, standings }) => {
  const cards = useMemo(() => {
    if (!upcoming?.length || !standings?.all?.length) return [];
    const byAbbr = Object.fromEntries(standings.all.map((t) => [t.abbr, t]));
    return upcoming.slice(0, N).map((g) => {
      const opp = byAbbr[g.opp];
      const pct = opp?.pct ?? null;
      const diff = difficultyOf(pct);
      return {
        id: g.id,
        opp: g.opp,
        oppName: OPP_FULL[g.opp] || g.opp,
        date: g.startUTC,
        home: g.home,
        record: opp ? `${opp.w}-${opp.l}${opp.ot ? `-${opp.ot}` : ''}` : null,
        pct,
        diff,
      };
    });
  }, [upcoming, standings]);

  if (cards.length === 0) {
    return (
      <Section title="Schedule Strength" action={<span className="text-[10px] font-mono text-white/40">next {N}</span>}>
        <div className="p-6 text-center text-[11px] font-mono text-white/35">
          No upcoming games to grade.
        </div>
      </Section>
    );
  }

  // Average difficulty across the stretch — a single takeaway number.
  const avgPct = cards.filter((c) => c.pct != null).reduce((a, c) => a + c.pct, 0) / Math.max(1, cards.filter((c) => c.pct != null).length);
  const avgDiff = difficultyOf(avgPct);
  const avgTone = TONE[avgDiff.tone];

  return (
    <Section
      title="Schedule Strength"
      action={
        <span className={cx('text-[10px] font-mono uppercase tracking-wider', avgTone.text)}>
          {avgDiff.label} stretch · {(avgPct * 100).toFixed(0)}% avg
        </span>
      }
    >
      <div className="p-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        {cards.map((c) => {
          const t = TONE[c.diff.tone];
          return (
            <div key={c.id} className={cx('rounded-md border p-2.5 flex flex-col items-center text-center gap-1.5', t.ring, t.fill)}>
              <div className="flex items-center gap-1.5 text-[9px] font-mono text-white/40 uppercase tracking-wider">
                <span>{c.home ? 'vs' : '@'}</span>
                <span>{fmtDate(c.date)}</span>
              </div>
              <TeamLogo abbr={c.opp} size={32} />
              <div className="text-[12px] font-medium text-white/90">{c.opp}</div>
              {c.record && (
                <div className="text-[10px] font-mono text-white/45 tabular-nums">{c.record}</div>
              )}
              <div className={cx('text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded border', t.ring, t.text)}>
                {c.diff.label}
              </div>
            </div>
          );
        })}
      </div>
    </Section>
  );
};
