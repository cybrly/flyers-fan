import { Section } from './primitives.jsx';
import { Headshot } from './Headshot.jsx';
import { PlayerLink } from './PlayerLink.jsx';

// "Who's not in the lineup tonight" — pulls the scratches list from the
// most recent game's right-rail gameInfo block. The NHL API doesn't tag
// healthy vs. injury vs. personal scratches, so we surface the list as-is
// and lean on the disclaimer. In practice, anyone showing up across
// multiple games is almost certainly injured; one-offs are usually
// healthy scratches or rotation calls.

export const InjuryWatch = ({ lastGame }) => {
  const scratches = lastGame?.scratches?.us || [];
  if (scratches.length === 0) return null;

  return (
    <Section
      title="Out of the Lineup"
      action={
        <span className="text-[10px] font-mono text-white/40 uppercase tracking-wider">
          last game · {lastGame?.dateLabel || 'recent'}
        </span>
      }
    >
      <div className="p-4 space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {scratches.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-2 px-2.5 py-2 rounded-md bg-white/[0.02] border border-white/[0.05]"
            >
              <Headshot playerId={p.id} num={p.num} size={32} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-[10px] font-mono text-white/35 tabular-nums shrink-0">#{p.num}</span>
                  <PlayerLink
                    playerId={p.id}
                    className="text-[12px] text-white/85 truncate hover:text-white"
                  >
                    {p.name}
                  </PlayerLink>
                </div>
                <div className="text-[9px] font-mono text-white/35 uppercase tracking-wider mt-0.5">
                  scratched
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="text-[10px] font-mono text-white/35 leading-relaxed border-t border-white/[0.05] pt-3">
          The NHL boxscore lists scratches without distinguishing injury, illness, or
          coach's decision. Players appearing across multiple recent games are typically
          injured; one-game scratches are usually rotation choices.
        </div>
      </div>
    </Section>
  );
};
