import { useMemo } from 'react';
import { cx, SEASON } from '../config.js';
import { Section } from './primitives.jsx';
import { Headshot } from './Headshot.jsx';
import { PlayerLink } from './PlayerLink.jsx';
import { useNHL } from '../api.js';

// "When the stars do their job" — answers the question every fan asks
// during a slump: "are we any better when [player] actually shows up?"
//
// For each of PHI's top 3 scorers, cross-references their game-log
// against the team schedule and computes record splits:
//   • when they score 1+ goal
//   • when they record 1+ point
//   • when they get 3+ shots on goal (chances translate to points later)
//
// All three can fire silently when sample sizes are tiny — we hide rows
// with fewer than 3 qualifying games to avoid 1-0 (1.000) noise that
// would dominate visually.

const MIN_SAMPLE = 3;

const PlayerSplits = ({ player, games }) => {
  const path = player?.id ? `v1/player/${player.id}/game-log/${SEASON}/2` : null;
  const { data, loading } = useNHL(path, 0);

  const splits = useMemo(() => {
    const log = data?.gameLog || [];
    if (!log.length || !games.length) return null;

    const byId = new Map(log.map((e) => [e.gameId, e]));

    // Each split is a predicate over the player's log entry. We walk the
    // team's regular-season games and bucket each one as W or L when the
    // predicate fires for that game.
    const cuts = [
      { key: 'goal',  label: 'Goal',     test: (e) => (e.goals || 0) >= 1 },
      { key: 'point', label: '1+ point', test: (e) => (e.points || 0) >= 1 },
      { key: 'shots', label: '3+ shots', test: (e) => (e.shots || 0) >= 3 },
    ];

    const out = cuts.map((c) => {
      let w = 0, l = 0;
      for (const g of games) {
        if (g.gameType === 3) continue; // regular season only
        const e = byId.get(g.id);
        if (!e || !c.test(e)) continue;
        if (g.w) w++; else l++;
      }
      return { ...c, w, l, n: w + l };
    });

    // Sit-out split: how does PHI fare without him in the lineup?
    let outW = 0, outL = 0;
    for (const g of games) {
      if (g.gameType === 3) continue;
      if (byId.has(g.id)) continue;
      if (g.w) outW++; else outL++;
    }
    out.push({ key: 'absent', label: 'Without him', w: outW, l: outL, n: outW + outL });

    return out;
  }, [data, games]);

  return (
    <div className="grid grid-cols-[44px_1fr_auto] gap-3 items-start px-3.5 py-3 border-b border-white/[0.04] last:border-b-0">
      <Headshot src={player.headshot} num={player.num} size={44} />
      <div className="min-w-0">
        <div className="flex items-baseline gap-1.5 flex-wrap">
          <PlayerLink playerId={player.id} className="text-[13px] font-medium text-white/90 hover:text-white truncate">
            {player.name}
          </PlayerLink>
          <span className="text-[10px] font-mono text-white/35">#{player.num} · {player.pos}</span>
          <span className="text-[10px] font-mono text-[var(--team-accent)] tabular-nums ml-auto sm:ml-0">{player.pts} pts</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
          {loading && !splits && Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-12 rounded bg-white/[0.03] animate-pulse" />
          ))}
          {splits?.filter((s) => s.n >= MIN_SAMPLE).map((s) => {
            const pct = s.n ? s.w / s.n : 0;
            const tone =
              pct >= 0.65 ? 'text-emerald-400'
              : pct >= 0.5 ? 'text-[var(--team-accent)]'
              : pct >= 0.4 ? 'text-amber-300'
              : 'text-red-400';
            return (
              <div key={s.key} className="rounded bg-white/[0.02] border border-white/[0.05] px-2 py-1.5">
                <div className="text-[9px] font-mono text-white/40 uppercase tracking-wider truncate">{s.label}</div>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className={cx('text-[15px] font-semibold tabular-nums', tone)}>
                    {s.w}–{s.l}
                  </span>
                  <span className="text-[9px] font-mono text-white/35 tabular-nums">
                    .{Math.round(pct * 1000).toString().padStart(3, '0')}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export const ConditionalStats = ({ clubStats, schedule }) => {
  const players = useMemo(() => {
    const skaters = clubStats?.skaters || [];
    return [...skaters]
      .filter((p) => p.pos !== 'G')
      .sort((a, b) => (b.pts || 0) - (a.pts || 0))
      .slice(0, 3);
  }, [clubStats]);

  const games = schedule?.games || [];
  if (players.length === 0 || games.length === 0) return null;

  return (
    <Section
      title="When the Stars Do Their Job"
      action={<span className="text-[10px] font-mono text-white/40 uppercase tracking-wider">team record · split by player game</span>}
    >
      <div>
        {players.map((p) => (
          <PlayerSplits key={p.id} player={p} games={games} />
        ))}
      </div>
      <div className="px-3.5 py-2 border-t border-white/[0.05] text-[10px] font-mono text-white/35 leading-relaxed">
        Rows with fewer than {MIN_SAMPLE} qualifying games are hidden to keep small-sample noise out of the read.
      </div>
    </Section>
  );
};
