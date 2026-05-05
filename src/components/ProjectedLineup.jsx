import { useMemo } from 'react';
import { Section } from './primitives.jsx';
import { Headshot } from './Headshot.jsx';
import { PlayerLink } from './PlayerLink.jsx';

// Best-effort projected lineup before puck drop. Without coach-confirmed
// lines we use season-to-date avg-TOI/per-game + points to slot the top
// 12 forwards into 4 lines and the top 6 defensemen into 3 pairs. Goalie
// pick is the PHI goalie with the most starts. This is "likely lineup"
// not gospel — flagged as such in the section subtitle.

const splitForwards = (skaters) => {
  const fwds = (skaters || [])
    .filter((p) => ['C', 'L', 'R'].includes(p.pos))
    .sort((a, b) => (b.avgToi || 0) - (a.avgToi || 0))
    .slice(0, 12);

  // For each line, try to seat a center in the middle and wingers on
  // either side. Pick centers in TOI order from the remaining pool.
  const centers = fwds.filter((p) => p.pos === 'C');
  const wings = fwds.filter((p) => p.pos !== 'C');

  const lines = [];
  for (let i = 0; i < 4; i++) {
    const c = centers[i] || wings.shift() || null;
    const lw = wings.shift() || null;
    const rw = wings.shift() || null;
    if (!c && !lw && !rw) break;
    lines.push({ lw, c, rw });
  }
  return lines;
};

const splitDefense = (skaters) => {
  const defs = (skaters || [])
    .filter((p) => p.pos === 'D')
    .sort((a, b) => (b.avgToi || 0) - (a.avgToi || 0))
    .slice(0, 6);
  const pairs = [];
  for (let i = 0; i < defs.length; i += 2) {
    pairs.push({ ld: defs[i] || null, rd: defs[i + 1] || null });
  }
  return pairs;
};

const pickStarter = (goalies) => {
  if (!goalies?.length) return null;
  return [...goalies].sort((a, b) => (b.gp || 0) - (a.gp || 0))[0];
};

export const ProjectedLineup = ({ clubStats }) => {
  const { lines, pairs, starter } = useMemo(() => ({
    lines: splitForwards(clubStats?.skaters),
    pairs: splitDefense(clubStats?.skaters),
    starter: pickStarter(clubStats?.goalies),
  }), [clubStats]);

  if (!lines.length && !pairs.length && !starter) return null;

  return (
    <Section
      title="Projected Lineup"
      action={<span className="text-[10px] font-mono text-white/40">est. by season TOI · not coach-confirmed</span>}
    >
      <div className="p-4 space-y-5">
        {/* Forward lines — 4 lines × 3 spots */}
        {lines.length > 0 && (
          <div>
            <div className="text-[10px] font-mono text-white/40 uppercase tracking-wider mb-2">Forwards</div>
            <div className="space-y-1.5">
              {lines.map((line, i) => (
                <div key={i} className="grid grid-cols-[24px_1fr_1fr_1fr] items-center gap-2">
                  <span className="text-[10px] font-mono text-white/35">L{i + 1}</span>
                  <LineupCell p={line.lw} />
                  <LineupCell p={line.c} center />
                  <LineupCell p={line.rw} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Defense pairs — 3 pairs × 2 spots */}
        {pairs.length > 0 && (
          <div>
            <div className="text-[10px] font-mono text-white/40 uppercase tracking-wider mb-2">Defense</div>
            <div className="space-y-1.5">
              {pairs.map((pair, i) => (
                <div key={i} className="grid grid-cols-[24px_1fr_1fr] items-center gap-2">
                  <span className="text-[10px] font-mono text-white/35">D{i + 1}</span>
                  <LineupCell p={pair.ld} />
                  <LineupCell p={pair.rd} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Goalie */}
        {starter && (
          <div>
            <div className="text-[10px] font-mono text-white/40 uppercase tracking-wider mb-2">Likely Starter</div>
            <div className="grid grid-cols-[24px_1fr] items-center gap-2">
              <span className="text-[10px] font-mono text-white/35">G</span>
              <LineupCell p={starter} goalie />
            </div>
          </div>
        )}
      </div>
    </Section>
  );
};

const LineupCell = ({ p, center, goalie }) => {
  if (!p) return <span className="h-9 rounded bg-white/[0.02] border border-white/[0.04]" />;
  return (
    <div className="flex items-center gap-2 px-2 py-1.5 rounded bg-white/[0.02] border border-white/[0.04] min-w-0">
      <Headshot id={p.id} src={p.headshot} size={28} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-[10px] font-mono text-white/40 tabular-nums shrink-0">#{p.num}</span>
          <PlayerLink id={p.id} className="text-[12px] text-white/85 truncate hover:text-white">
            {p.name}
          </PlayerLink>
          {center && <span className="text-[9px] font-mono text-[#FF8A4C] uppercase tracking-wider shrink-0">C</span>}
        </div>
        {!goalie && p.pts != null && (
          <div className="text-[9px] font-mono text-white/40 tabular-nums">
            {p.g}G · {p.a}A · {p.pts}P
          </div>
        )}
        {goalie && p.savePct != null && (
          <div className="text-[9px] font-mono text-white/40 tabular-nums">
            {p.w}W–{p.l}L · {p.savePct}% SV
          </div>
        )}
      </div>
    </div>
  );
};
