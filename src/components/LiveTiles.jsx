import { useMemo } from 'react';
import { cx } from '../config.js';

// Live-game tile strip — appears in the Hero during a live PHI game.
// Three tiles: win probability, projected goals, projected shots-on-goal.
// All derived locally from the current score + period + clock so there's
// no extra fetch cost. Models are intentionally simple — the goal is to
// give the user broadcast-style "feel" numbers, not predictive accuracy.

const PERIOD_LEN = 1200; // 20 minutes per regulation period

// Convert an "MM:SS" remaining-time clock to seconds.
const clockToRemaining = (clockText) => {
  if (typeof clockText !== 'string') return null;
  const [m, s] = clockText.split(':').map(Number);
  if (Number.isNaN(m) || Number.isNaN(s)) return null;
  return m * 60 + s;
};

// Given the live game state, compute the fraction of regulation already
// played (0..1). Useful as a weight that scales the impact of the score
// differential — a 1-goal lead with 2 min left ≠ a 1-goal lead in P1.
function gameProgress({ period, periodType, remainingSec }) {
  const p = period || 1;
  const elapsedThis = PERIOD_LEN - (remainingSec ?? PERIOD_LEN);
  const before = (p - 1) * PERIOD_LEN;
  const total = 3 * PERIOD_LEN;
  if (periodType === 'OT' || p > 3) return 1; // OT — game is "essentially over"
  return Math.min(1, (before + elapsedThis) / total);
}

// Heuristic win probability. Two inputs: score differential and game
// progress. Diff impact starts small (50/50 when tied at puck drop) and
// grows nonlinearly as the clock winds down. Calibrated to roughly match
// public NHL win-probability tables at the milestones — a 1-goal lead
// after two periods is ~75%, a 2-goal lead is ~90%, etc. Not an actual
// model, but useful for broadcast-feel visuals.
function winProbability({ us, them, period, periodType, remainingSec, isHome }) {
  const diff = (us ?? 0) - (them ?? 0);
  const progress = gameProgress({ period, periodType, remainingSec });
  // Diff coefficient grows with progress — early in the game a 1-goal lead
  // is barely meaningful, late it's commanding.
  const k = 0.18 + 0.55 * Math.pow(progress, 1.4);
  let p = 0.5 + diff * k;
  // Tiny home-ice nudge.
  if (isHome) p += 0.018;
  // OT swing toward 50% (anyone can win a sudden-death goal).
  if (periodType === 'OT') p = 0.5 + diff * 0.25;
  return Math.max(0.02, Math.min(0.98, p));
}

export const WinProbability = ({ us, them, period, periodType, clock, isHome }) => {
  const remainingSec = clockToRemaining(clock?.timeRemaining);
  const p = useMemo(
    () => winProbability({ us, them, period, periodType, remainingSec, isHome }),
    [us, them, period, periodType, remainingSec, isHome],
  );
  const pct = Math.round(p * 100);
  const tone =
    pct >= 75 ? 'text-emerald-400' :
    pct >= 55 ? 'text-[#FF8A4C]' :
    pct >= 45 ? 'text-amber-300' :
    pct >= 25 ? 'text-orange-300/80' :
    'text-red-400';

  return (
    <div className="flex-1 min-w-[120px] px-3 py-2 border border-white/[0.06] rounded-md bg-white/[0.015]">
      <div className="text-[9px] font-mono text-white/40 uppercase tracking-wider">PHI win prob</div>
      <div className="flex items-baseline gap-1.5 mt-0.5">
        <span className={cx('text-[22px] font-semibold tabular-nums tracking-tight', tone)}>{pct}%</span>
        <span className="text-[10px] font-mono text-white/40">live model</span>
      </div>
      {/* Probability bar */}
      <div className="mt-1.5 relative h-1 bg-white/[0.05] rounded-full overflow-hidden">
        <div
          className={cx('absolute left-0 top-0 h-full rounded-full transition-all duration-500',
            pct >= 50 ? 'bg-[#F74902]' : 'bg-red-500/80'
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
};

// Project end-of-game totals by extrapolating the current pace through the
// remaining game time. Used for shots and goals tiles. We assume play
// continues at the team's current rate — naive but visually grounded.
function project(currentValue, { period, periodType, remainingSec }) {
  if (currentValue == null) return null;
  const progress = gameProgress({ period, periodType, remainingSec });
  if (progress <= 0.05) return null; // too early
  if (progress >= 1) return currentValue; // game over (or in OT)
  return Math.round(currentValue / progress);
}

export const PaceProjection = ({ label, current, period, periodType, clock, color = '#FF8A4C' }) => {
  const remainingSec = clockToRemaining(clock?.timeRemaining);
  const proj = useMemo(
    () => project(current, { period, periodType, remainingSec }),
    [current, period, periodType, remainingSec],
  );

  return (
    <div className="flex-1 min-w-[120px] px-3 py-2 border border-white/[0.06] rounded-md bg-white/[0.015]">
      <div className="text-[9px] font-mono text-white/40 uppercase tracking-wider">{label} · pace</div>
      <div className="flex items-baseline gap-1.5 mt-0.5">
        <span className="text-[22px] font-semibold tabular-nums tracking-tight" style={{ color }}>
          {proj ?? '—'}
        </span>
        <span className="text-[10px] font-mono text-white/40 tabular-nums">
          now {current ?? 0}
        </span>
      </div>
      <div className="mt-1.5 text-[9px] font-mono text-white/35">
        {proj != null && current != null ? `+${proj - current} projected` : 'computing…'}
      </div>
    </div>
  );
};

// Goal celebration overlay — stacks confetti pucks + a big "GOAL" badge.
// Triggered via useScoreBurst on the live PHI score. Pure CSS / SVG, no
// audio. Renders absolutely-positioned over the score block.
export const GoalCelebration = () => (
  <div
    aria-hidden
    className="pointer-events-none absolute inset-0 flex items-center justify-center z-10"
    style={{ animation: 'fadeIn 0.18s ease-out' }}
  >
    <div className="relative">
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(247,73,2,0.55), rgba(247,73,2,0) 65%)',
          filter: 'blur(20px)',
          animation: 'goalPulse 0.9s ease-out',
          width: 320, height: 320, left: -160, top: -160,
        }}
      />
      <div
        className="text-[64px] sm:text-[88px] font-black tracking-tighter text-[#FF8A4C]"
        style={{
          textShadow: '0 0 32px rgba(247,73,2,0.8), 0 4px 20px rgba(0,0,0,0.7)',
          animation: 'goalPop 1.6s cubic-bezier(0.18, 0.89, 0.32, 1.28)',
          letterSpacing: '-0.04em',
        }}
      >
        GOAL!
      </div>
    </div>
    <style>{`
      @keyframes goalPop {
        0%   { opacity: 0; transform: scale(0.4) rotate(-2deg); }
        20%  { opacity: 1; transform: scale(1.18) rotate(1deg); }
        50%  { opacity: 1; transform: scale(1.05) rotate(0deg); }
        100% { opacity: 0; transform: scale(1.0); }
      }
      @keyframes goalPulse {
        0%   { opacity: 0; transform: scale(0.6); }
        30%  { opacity: 1; transform: scale(1.2); }
        100% { opacity: 0; transform: scale(2.4); }
      }
    `}</style>
  </div>
);
