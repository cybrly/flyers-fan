import { useMemo } from 'react';
import { Section } from './primitives.jsx';
import { Headshot } from './Headshot.jsx';
import { PlayerLink } from './PlayerLink.jsx';

// Surfaces PHI players approaching round-number milestones this season.
// Career milestones would need per-player landing fetches we don't have
// from /club-stats — limit ourselves to what's in the season payload:
// goals, assists, points, games played, save % for goalies. We thus
// surface "season milestones" rather than "career milestones".
//
// Threshold ladders are commonly cited fan benchmarks; we pick the next
// rung above each player's current value and rank by absolute distance,
// so the closest to a milestone show up first.

const SKATER_LADDERS = {
  pts: [25, 50, 60, 70, 80, 90, 100, 110],
  g:   [10, 15, 20, 25, 30, 35, 40, 45, 50],
  a:   [15, 25, 35, 45, 55, 65, 75],
  gp:  [40, 60, 82],
};
const GOALIE_LADDERS = {
  w:  [5, 10, 15, 20, 25, 30, 35, 40],
  so: [1, 2, 3, 5],
};

const STAT_LABEL = {
  pts: 'pts', g: 'G', a: 'A', gp: 'GP',
  w: 'W', so: 'SO',
};

const nextRung = (value, ladder) => {
  for (const rung of ladder) {
    if (value < rung) return rung;
  }
  return null;
};

export const MilestoneWatch = ({ clubStats }) => {
  const items = useMemo(() => {
    if (!clubStats) return [];
    const out = [];

    for (const p of clubStats.skaters || []) {
      // Only roster regulars — at least 5 GP keeps the list tight.
      if ((p.gp || 0) < 5) continue;
      for (const [key, ladder] of Object.entries(SKATER_LADDERS)) {
        const cur = p[key] || 0;
        const target = nextRung(cur, ladder);
        if (target == null) continue;
        const remain = target - cur;
        // Only surface "imminent" — within 5 for goals/assists/points,
        // within 10 for games. Otherwise the list is just everyone.
        const cap = key === 'gp' ? 12 : key === 'pts' ? 8 : 5;
        if (remain > cap) continue;
        out.push({
          id: p.id,
          name: p.name,
          headshot: p.headshot,
          num: p.num,
          stat: key,
          target,
          remain,
          current: cur,
          isGoalie: false,
        });
      }
    }

    for (const g of clubStats.goalies || []) {
      if ((g.gp || 0) < 3) continue;
      for (const [key, ladder] of Object.entries(GOALIE_LADDERS)) {
        const cur = g[key] || 0;
        const target = nextRung(cur, ladder);
        if (target == null) continue;
        const remain = target - cur;
        if (remain > 4) continue;
        out.push({
          id: g.id,
          name: g.name,
          headshot: g.headshot,
          num: g.num,
          stat: key,
          target,
          remain,
          current: cur,
          isGoalie: true,
        });
      }
    }

    return out
      .sort((a, b) => a.remain - b.remain)
      .slice(0, 6);
  }, [clubStats]);

  if (items.length === 0) return null;

  return (
    <Section
      title="Milestone Watch"
      action={<span className="text-[10px] font-mono text-white/40 uppercase tracking-wider">round-number season marks</span>}
    >
      <div className="divide-y divide-white/[0.04]">
        {items.map((m, i) => (
          <div key={`${m.id}-${m.stat}-${i}`} className="px-4 py-2.5 flex items-center gap-3">
            <Headshot playerId={m.id} src={m.headshot} size={28} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-[10px] font-mono text-white/35 tabular-nums shrink-0">#{m.num}</span>
                <PlayerLink playerId={m.id} className="text-[12px] text-white/85 truncate hover:text-white">
                  {m.name}
                </PlayerLink>
              </div>
              <div className="text-[10px] font-mono text-white/45 tabular-nums">
                {m.current} {STAT_LABEL[m.stat]} · {m.target} {STAT_LABEL[m.stat]} milestone
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-[20px] font-semibold text-[#FF8A4C] tabular-nums leading-none">{m.remain}</div>
              <div className="text-[9px] font-mono text-white/35 mt-0.5 uppercase tracking-wider">to go</div>
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
};
