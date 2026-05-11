import { useMemo } from 'react';
import { cx } from '../config.js';
import { Section } from './primitives.jsx';
import { TeamLogoBg } from './Watermark.jsx';
import {
  getTeamContracts, SALARY_CAP_CEILING, fmtMillions, fmtCapPct,
} from '../data/playerContracts.js';
import { TEAM_ABBR } from '../config.js';

// Team-wide salary cap dashboard for the Roster page. Reads from the
// curated PuckPedia snapshot in playerContracts.js — TEAM_CAP for the
// headline numbers, PLAYER_CONTRACTS for the per-position breakdown.
//
// Visual: big projected cap-hit number against the $95.5M ceiling, a
// segmented bar showing F / D / G shares, and a stack of micro-stats
// (cap space, LTIR pool, retained slots, contract counts).

const POSITION_BUCKETS = {
  F: ['C', 'L', 'R', 'LW', 'RW'],
  D: ['D', 'LD', 'RD'],
  G: ['G'],
};

const inBucket = (pos, key) => POSITION_BUCKETS[key].some((p) => pos === p);

const sumByBucket = () => {
  const totals = { F: 0, D: 0, G: 0, total: 0 };
  const contracts = getTeamContracts(TEAM_ABBR);
  for (const c of contracts) {
    if (!c.capHit) continue;
    totals.total += c.capHit;
    if (inBucket(c.pos, 'F')) totals.F += c.capHit;
    else if (inBucket(c.pos, 'D')) totals.D += c.capHit;
    else if (inBucket(c.pos, 'G')) totals.G += c.capHit;
  }
  return totals;
};

const Stat = ({ label, value, sub, tone }) => (
  <div className="border border-white/[0.05] rounded bg-white/[0.02] px-3 py-2">
    <div className="text-[9px] font-mono text-white/40 uppercase tracking-wider">{label}</div>
    <div className={cx('text-[15px] font-mono tabular-nums mt-0.5 font-semibold',
      tone === 'good' ? 'text-emerald-400'
      : tone === 'warm' ? 'text-[#FF8A4C]'
      : tone === 'bad' ? 'text-red-400'
      : 'text-white/85',
    )}>{value}</div>
    {sub && <div className="text-[9px] font-mono text-white/35 mt-0.5">{sub}</div>}
  </div>
);

export const SalaryCap = ({ roster }) => {
  const totals = useMemo(() => sumByBucket(), []);
  const projectedHit = totals.total;
  const projectedSpace = SALARY_CAP_CEILING - totals.total;
  const ceiling = SALARY_CAP_CEILING;
  const usedPct = projectedHit / ceiling;
  const fPct = totals.F / ceiling;
  const dPct = totals.D / ceiling;
  const gPct = totals.G / ceiling;
  const otherPct = Math.max(0, usedPct - fPct - dPct - gPct);

  return (
    <Section
      title="2025–26 Salary Cap"
      action={<span className="text-[10px] font-mono text-white/40 uppercase tracking-wider">via PuckPedia · hand-curated</span>}
    >
      <div className="relative overflow-hidden p-4 space-y-4">

        {/* Headline: cap hit vs ceiling */}
        <div className="relative flex items-baseline gap-3 flex-wrap">
          <span className="text-[32px] font-semibold tabular-nums tracking-tight text-[#FF8A4C] leading-none">
            {fmtMillions(projectedHit)}
          </span>
          <span className="text-[12px] font-mono text-white/45">projected cap hit</span>
          <span className="ml-auto text-[12px] font-mono text-white/55 tabular-nums">
            of <span className="text-white/85">{fmtMillions(ceiling)}</span> ceiling · {fmtCapPct(usedPct)} used
          </span>
        </div>

        {/* Segmented bar — F / D / G / other */}
        <div className="relative h-3 rounded-full overflow-hidden bg-white/[0.05]">
          <div className="absolute left-0 top-0 h-full bg-[#FF8A4C]"
            style={{ width: `${fPct * 100}%` }} title={`Forwards · ${fmtMillions(totals.F)}`} />
          <div className="absolute top-0 h-full bg-sky-400/80"
            style={{ left: `${fPct * 100}%`, width: `${dPct * 100}%` }} title={`Defence · ${fmtMillions(totals.D)}`} />
          <div className="absolute top-0 h-full bg-emerald-400/80"
            style={{ left: `${(fPct + dPct) * 100}%`, width: `${gPct * 100}%` }} title={`Goaltenders · ${fmtMillions(totals.G)}`} />
          <div className="absolute top-0 h-full bg-white/15"
            style={{ left: `${(fPct + dPct + gPct) * 100}%`, width: `${otherPct * 100}%` }} title="Other (buyouts, retained, buried)" />
          {/* Ceiling marker */}
          <div className="absolute top-0 h-full w-px bg-white/40 right-0" />
        </div>
        <div className="relative flex items-center gap-4 text-[10px] font-mono text-white/55 flex-wrap">
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-[#FF8A4C]" /> Forwards · {fmtMillions(totals.F)}</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-sky-400/80" /> Defence · {fmtMillions(totals.D)}</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-emerald-400/80" /> Goaltenders · {fmtMillions(totals.G)}</span>
          {otherPct > 0 && (
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-white/15" /> Other · {fmtMillions(ceiling * otherPct)}</span>
          )}
        </div>

        {/* Micro-stats grid */}
        <div className="relative grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Stat
            label="Cap Space"
            value={fmtMillions(projectedSpace)}
            tone={projectedSpace > 5_000_000 ? 'good' : projectedSpace > 1_000_000 ? 'warm' : 'bad'}
            sub="projected"
          />
          <Stat
            label="Players"
            value={getTeamContracts(TEAM_ABBR).length}
            sub="on file"
          />
          <Stat
            label="Avg Cap Hit"
            value={totals.total && getTeamContracts(TEAM_ABBR).length ? fmtMillions(Math.round(totals.total / getTeamContracts(TEAM_ABBR).length)) : '—'}
            sub="per player"
          />
        </div>

        {/* Footer attribution */}
        <div className="relative pt-3 border-t border-white/[0.05] text-[10px] font-mono text-white/35">
          Cap snapshot hand-maintained from <a href="https://puckpedia.com/team/philadelphia-flyers" target="_blank" rel="noopener noreferrer" className="text-white/55 hover:text-white">PuckPedia</a> — refresh after major signings or trades.
        </div>
      </div>
    </Section>
  );
};
