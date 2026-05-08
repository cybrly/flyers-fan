// Season Awards Tracker — dedicated panel showing the current Hart, Norris,
// Vezina, Calder, Selke, and Jack Adams races with community consensus
// picks and where PHI players stand. Uses curated data from the existing
// EngagementPanels AwardWatchPanel but in a richer, standalone layout.

import { cx, TEAM_ABBR } from '../config.js';
import { Section, Label, Chip } from './primitives.jsx';
import { Headshot } from './Headshot.jsx';
import { TeamLogo } from './Logo.jsx';
import { PlayerLink } from './PlayerLink.jsx';

const AWARDS = [
  {
    name: 'Hart Trophy',
    desc: 'Most Valuable Player',
    icon: '🏆',
  },
  {
    name: 'Norris Trophy',
    desc: 'Top Defenseman',
    icon: '🛡️',
  },
  {
    name: 'Vezina Trophy',
    desc: 'Top Goaltender',
    icon: '🥅',
  },
  {
    name: 'Calder Trophy',
    desc: 'Rookie of the Year',
    icon: '⭐',
  },
  {
    name: 'Selke Trophy',
    desc: 'Best Defensive Forward',
    icon: '🔒',
  },
  {
    name: 'Jack Adams Award',
    desc: 'Coach of the Year',
    icon: '📋',
  },
];

/**
 * AwardsTracker — renders award races from curated contenders.
 * @param {object[]} awardContenders - array of { trophy, contenders: [{ id, name, team, stat }] }
 */
export const AwardsTracker = ({ awardContenders }) => {
  if (!awardContenders?.length) return null;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-[16px] font-semibold tracking-tight">Award Races</h2>
        <p className="text-[11px] font-mono text-white/40 mt-0.5">consensus contenders · current season</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {awardContenders.map((award) => {
          const meta = AWARDS.find((a) => award.trophy?.includes(a.name.split(' ')[0])) || {};
          const hasPHI = award.contenders?.some((c) => c.team === TEAM_ABBR);
          return (
            <Section
              key={award.trophy}
              branded={hasPHI}
              title={
                <span className="flex items-center gap-2">
                  {award.trophy}
                  {hasPHI && <Chip tone="orange">PHI</Chip>}
                </span>
              }
              action={meta.desc ? <span className="text-[9px] font-mono text-white/30">{meta.desc}</span> : null}
            >
              <div className="divide-y divide-white/[0.04]">
                {(award.contenders || []).slice(0, 5).map((c, i) => {
                  const isPHI = c.team === TEAM_ABBR;
                  return (
                    <div key={c.id || i} className={cx(
                      'flex items-center gap-3 px-4 py-2.5',
                      isPHI && 'bg-[#F74902]/[0.04]',
                    )}>
                      <span className={cx(
                        'text-[14px] font-semibold tabular-nums w-6 shrink-0',
                        i === 0 ? 'text-[#FF8A4C]' : 'text-white/35',
                      )}>{i + 1}</span>
                      <Headshot playerId={c.id} teamAbbrev={c.team} size={28} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className={cx('text-[12px] truncate', isPHI ? 'text-white font-medium' : 'text-white/80')}>
                            {c.id ? <PlayerLink playerId={c.id}>{c.name}</PlayerLink> : c.name}
                          </span>
                          <TeamLogo abbr={c.team} size={14} />
                        </div>
                        {c.stat && <div className="text-[10px] font-mono text-white/40 mt-0.5">{c.stat}</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Section>
          );
        })}
      </div>
    </div>
  );
};
