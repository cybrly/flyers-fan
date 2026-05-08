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

export const SpecialTeams = ({ clubStats, ranks }) => {
  const skaters = clubStats?.skaters || [];

  // Team-level PP/PK aggregates from individual skater stats.
  const teamST = useMemo(() => {
    if (!skaters.length) return null;
    const ppGoals = skaters.reduce((s, p) => s + (p.ppGoals || 0), 0);
    const shGoals = skaters.reduce((s, p) => s + (p.shGoals || 0), 0);
    const ppPts = skaters.reduce((s, p) => s + (p.ppPts || 0), 0);
    const totalGoals = skaters.reduce((s, p) => s + (p.g || 0), 0);
    const ppPct = totalGoals > 0 ? ((ppGoals / totalGoals) * 100).toFixed(1) : null;
    return { ppGoals, shGoals, ppPts, ppPct };
  }, [skaters]);

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
          <h3 className="text-[14px] font-semibold tracking-tight">Power Play & Penalty Kill</h3>
          <p className="text-[10px] font-mono text-white/40 mt-0.5 uppercase tracking-wider">
            Average ice time per game · proxy for who plays on PP / PK
          </p>
        </div>
      </div>

      {/* Team-level PP/PK summary tiles */}
      {teamST && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-white/[0.05] rounded-md overflow-hidden">
          <div className="bg-[#0A0A0A] px-3 py-2.5">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FF8A4C]" />
              <span className="text-[9px] font-mono text-white/40 uppercase tracking-wider">PP Goals</span>
            </div>
            <div className="text-[18px] font-semibold tabular-nums tracking-tight text-[#FF8A4C] mt-1">{teamST.ppGoals}</div>
            {teamST.ppPct && <div className="text-[9px] font-mono text-white/35 mt-0.5">{teamST.ppPct}% of all goals</div>}
          </div>
          <div className="bg-[#0A0A0A] px-3 py-2.5">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FF8A4C]" />
              <span className="text-[9px] font-mono text-white/40 uppercase tracking-wider">PP Points</span>
            </div>
            <div className="text-[18px] font-semibold tabular-nums tracking-tight text-[#FF8A4C] mt-1">{teamST.ppPts}</div>
            <div className="text-[9px] font-mono text-white/35 mt-0.5">total PP assists + goals</div>
          </div>
          <div className="bg-[#0A0A0A] px-3 py-2.5">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#8AB4FF]" />
              <span className="text-[9px] font-mono text-white/40 uppercase tracking-wider">SH Goals</span>
            </div>
            <div className="text-[18px] font-semibold tabular-nums tracking-tight text-[#8AB4FF] mt-1">{teamST.shGoals}</div>
            <div className="text-[9px] font-mono text-white/35 mt-0.5">shorthanded goals scored</div>
          </div>
          <div className="bg-[#0A0A0A] px-3 py-2.5">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
              <span className="text-[9px] font-mono text-white/40 uppercase tracking-wider">EV Goals</span>
            </div>
            {(() => {
              const totalG = skaters.reduce((s, p) => s + (p.g || 0), 0);
              const evG = totalG - teamST.ppGoals - teamST.shGoals;
              return (
                <>
                  <div className="text-[18px] font-semibold tabular-nums tracking-tight text-[#10B981] mt-1">{evG}</div>
                  <div className="text-[9px] font-mono text-white/35 mt-0.5">even-strength goals</div>
                </>
              );
            })()}
          </div>
        </div>
      )}
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
