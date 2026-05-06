import { useMemo } from 'react';
import { cx } from '../config.js';
import { Section } from './primitives.jsx';
import { Headshot } from './Headshot.jsx';
import { PlayerLink } from './PlayerLink.jsx';

// Special-teams personnel read from clubStats. The NHL public API doesn't
// expose rolling per-game PP%/PK% on the endpoints we already proxy, so
// instead of bolting on a new upstream we surface the next-best signal:
// who's actually getting the special-teams ice time. Coaches' decisions
// over a season are revealed by avgPowerPlayTimeOnIcePerGame and the
// shorthanded equivalent — that's the real "PP1 / PK1 unit," not the
// dotted lines on a chalkboard.
//
// Three columns: PP candidates, PK candidates, and a discipline column
// (highest PIM/g — the players most likely to put PHI on the kill).

const fmtMSS = (sec) => {
  if (sec == null) return '—';
  const s = Math.round(sec);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
};

const Unit = ({ title, sub, color, players, valueFor, valueLabel, formatVal }) => (
  <Section title={title} action={<span className="text-[10px] font-mono text-white/40 uppercase tracking-wider">{sub}</span>}>
    <div className="divide-y divide-white/[0.04]">
      {players.length === 0 ? (
        <div className="px-4 py-3 text-[11px] font-mono text-white/35">No data yet.</div>
      ) : (
        players.map((p, i) => {
          const v = valueFor(p);
          return (
            <div key={p.id} className="grid grid-cols-[18px_28px_1fr_auto] items-center gap-2 px-3 h-10 hover:bg-white/[0.02]">
              <span className={cx('text-[10px] font-mono tabular-nums',
                i === 0 ? 'text-amber-300 font-semibold' : 'text-white/30'
              )}>{i + 1}</span>
              <Headshot playerId={p.id} num={p.num} size={24} />
              <span className="flex items-center gap-1.5 min-w-0">
                <PlayerLink playerId={p.id} className="text-[12px] truncate hover:text-white">
                  {p.name}
                </PlayerLink>
                <span className="text-[9px] font-mono text-white/30 shrink-0">{p.pos}</span>
              </span>
              <span className="flex items-baseline gap-1 shrink-0">
                <span className="text-[12px] font-mono tabular-nums font-medium" style={{ color }}>
                  {formatVal(v)}
                </span>
                <span className="text-[9px] font-mono text-white/35 uppercase tracking-wider">{valueLabel}</span>
              </span>
            </div>
          );
        })
      )}
    </div>
  </Section>
);

export const SpecialTeams = ({ clubStats }) => {
  const skaters = clubStats?.skaters || [];

  const ppUnit = useMemo(() => {
    return [...skaters]
      .filter((p) => (p.avgPpToi || 0) > 30) // skip skaters with negligible PP time
      .sort((a, b) => (b.avgPpToi || 0) - (a.avgPpToi || 0))
      .slice(0, 5);
  }, [skaters]);

  const pkUnit = useMemo(() => {
    return [...skaters]
      .filter((p) => (p.avgShToi || 0) > 20)
      .sort((a, b) => (b.avgShToi || 0) - (a.avgShToi || 0))
      .slice(0, 5);
  }, [skaters]);

  const discipline = useMemo(() => {
    return [...skaters]
      .filter((p) => p.gp >= 5 && p.pim > 0)
      .map((p) => ({ ...p, pimPg: p.pim / Math.max(1, p.gp) }))
      .sort((a, b) => b.pimPg - a.pimPg)
      .slice(0, 5);
  }, [skaters]);

  if (skaters.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-[14px] font-semibold tracking-tight">Special Teams Personnel</h3>
          <p className="text-[10px] font-mono text-white/40 mt-0.5 uppercase tracking-wider">
            Average ice time per game · proxy for who plays on PP / PK
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Unit
          title="Power Play Unit"
          sub="top PP TOI/g"
          color="#FF8A4C"
          players={ppUnit}
          valueFor={(p) => p.avgPpToi}
          valueLabel="PP/g"
          formatVal={fmtMSS}
        />
        <Unit
          title="Penalty Kill Unit"
          sub="top SH TOI/g"
          color="#8AB4FF"
          players={pkUnit}
          valueFor={(p) => p.avgShToi}
          valueLabel="SH/g"
          formatVal={fmtMSS}
        />
        <Unit
          title="Discipline Watch"
          sub="highest PIM/g"
          color="#EF4444"
          players={discipline}
          valueFor={(p) => p.pimPg}
          valueLabel="PIM/g"
          formatVal={(v) => v == null ? '—' : v.toFixed(1)}
        />
      </div>
    </div>
  );
};
