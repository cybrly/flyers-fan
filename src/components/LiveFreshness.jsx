import { useEffect, useState } from 'react';
import { cx } from '../config.js';

// Visible proof that a page is actually receiving live data — and how
// fresh the latest snapshot is. Reads two signals:
//   • SSE `liveSnap.ts`         — fastest path (~2s when a goal/clock
//                                 changes upstream)
//   • polled `boxscoreLastFetch` — fallback when SSE is silent or the
//                                 user is on a flaky connection
//
// Picks whichever is newer and prints a ticking "updated Ns ago" label
// next to a pulsing dot. When the game isn't live, renders a quieter
// "showing FINAL" badge so users know they're looking at a recap, not
// a stale live page.
export const LiveFreshness = ({ liveGame, liveSnap, liveConnected, lastFetch }) => {
  const [, force] = useState(0);
  useEffect(() => {
    if (!liveGame) return;
    const t = setInterval(() => force((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, [liveGame]);

  if (!liveGame) {
    return (
      <span
        role="status"
        aria-label="Showing recap, game is not live"
        className="inline-flex items-center gap-1.5 text-[10px] font-mono text-white/40"
      >
        <span aria-hidden className="w-1.5 h-1.5 rounded-full bg-white/30" />
        showing recap · not live
      </span>
    );
  }

  // Most recent client-visible update across SSE + polled boxscore.
  const sseTs = liveSnap?.ts || 0;
  const pollTs = lastFetch ? new Date(lastFetch).getTime() : 0;
  const newest = Math.max(sseTs, pollTs);
  const ageMs = newest ? Date.now() - newest : null;
  const ageS = ageMs == null ? null : Math.max(0, Math.round(ageMs / 1000));

  // Health: green = SSE connected and fresh, amber = stale-ish, red =
  // nothing in 30s. Visual weight matches actual freshness so a quiet
  // game (no recent goals) still reads as "alive".
  const tone = ageS == null ? 'amber'
    : ageS < 8  ? 'green'
    : ageS < 30 ? 'amber'
    : 'red';

  const dotColor = tone === 'green' ? 'bg-emerald-400'
    : tone === 'amber' ? 'bg-amber-400'
    : 'bg-red-400';
  const textColor = tone === 'green' ? 'text-emerald-300'
    : tone === 'amber' ? 'text-amber-300'
    : 'text-red-300';
  const ringColor = tone === 'green' ? 'ring-emerald-400/50'
    : tone === 'amber' ? 'ring-amber-400/50'
    : 'ring-red-400/50';

  const channel = liveConnected ? 'stream' : 'poll';
  const ageLabel = ageS == null ? 'connecting…'
    : ageS === 0 ? 'just now'
    : `${ageS}s ago`;

  return (
    <span
      role="status"
      aria-live="polite"
      aria-label={`Live data via ${channel}, updated ${ageLabel}`}
      className={cx('inline-flex items-center gap-1.5 text-[10px] font-mono', textColor)}
    >
      <span aria-hidden className={cx('w-1.5 h-1.5 rounded-full ring-2 animate-pulse', dotColor, ringColor)} />
      <span aria-hidden>● live</span>
      <span aria-hidden className="text-white/35">·</span>
      <span aria-hidden>{channel}</span>
      <span aria-hidden className="text-white/35">·</span>
      <span aria-hidden className="tabular-nums">updated {ageLabel}</span>
    </span>
  );
};
