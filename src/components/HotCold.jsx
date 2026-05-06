import { useMemo } from 'react';
import { Flame, Snowflake } from 'lucide-react';
import { cx, SEASON } from '../config.js';
import { useNHL } from '../api.js';

// Hot/cold streak chip — surfaces last-5-games points pace per skater
// or save% per goalie. Each chip is a separate /game-log fetch, so use
// sparingly (top-N panels, profile headers) and not on every roster row.
//
// Skater thresholds:
//   Hot   : ≥ 1.0 PPG over last 5 games
//   Cold  : < 0.4 PPG with ≥ 5 SOG (chances but no production)
// Goalie thresholds (last 5 starts):
//   Hot   : SV% ≥ .920
//   Cold  : SV% ≤ .880

const PATH = (playerId) => playerId ? `v1/player/${playerId}/game-log/${SEASON}/2` : null;

export const useSkaterStreak = (playerId) => {
  const { data, loading } = useNHL(PATH(playerId), 0);
  return useMemo(() => {
    const log = data?.gameLog || [];
    if (log.length < 3) return null;
    const sorted = [...log].sort((a, b) => (b.gameDate || '').localeCompare(a.gameDate || ''));
    const last5 = sorted.slice(0, 5);
    const n = last5.length;
    if (n === 0) return null;
    const pts = last5.reduce((s, e) => s + (e.points || 0), 0);
    const sog = last5.reduce((s, e) => s + (e.shots || 0), 0);
    const ppg = pts / n;
    if (ppg >= 1.0 && pts >= 3) return { state: 'hot', ppg, pts, sog, n, loading };
    if (ppg < 0.4 && sog >= 5) return { state: 'cold', ppg, pts, sog, n, loading };
    return { state: 'neutral', ppg, pts, sog, n, loading };
  }, [data, loading]);
};

export const useGoalieStreak = (playerId) => {
  const { data, loading } = useNHL(PATH(playerId), 0);
  return useMemo(() => {
    const log = data?.gameLog || [];
    if (log.length < 3) return null;
    const sorted = [...log]
      .filter((e) => e.shotsAgainst != null && e.shotsAgainst > 0)
      .sort((a, b) => (b.gameDate || '').localeCompare(a.gameDate || ''));
    const last5 = sorted.slice(0, 5);
    const n = last5.length;
    if (n === 0) return null;
    const sa = last5.reduce((s, e) => s + (e.shotsAgainst || 0), 0);
    const saves = last5.reduce((s, e) => s + (e.saves || 0), 0);
    const svPct = sa > 0 ? saves / sa : null;
    if (svPct == null) return null;
    if (svPct >= 0.920) return { state: 'hot', svPct, n, loading };
    if (svPct <= 0.880) return { state: 'cold', svPct, n, loading };
    return { state: 'neutral', svPct, n, loading };
  }, [data, loading]);
};

const Chip = ({ tone, icon: Icon, label, title }) => (
  <span
    title={title}
    className={cx(
      'inline-flex items-center gap-1 px-1.5 h-4 rounded border text-[9px] font-mono font-semibold uppercase tracking-wider',
      tone === 'hot' ? 'border-amber-500/45 bg-amber-500/[0.12] text-amber-300'
      : tone === 'cold' ? 'border-sky-400/40 bg-sky-400/[0.10] text-sky-300'
      : 'border-white/[0.08] text-white/40',
    )}
  >
    {Icon && <Icon size={9} strokeWidth={2.4} />}
    <span>{label}</span>
  </span>
);

export const SkaterHotCold = ({ playerId, showNeutral = false }) => {
  const streak = useSkaterStreak(playerId);
  if (!streak || (streak.state === 'neutral' && !showNeutral)) return null;
  if (streak.state === 'hot') {
    return <Chip tone="hot" icon={Flame} label={`Hot · ${streak.ppg.toFixed(1)} P/g`}
      title={`${streak.pts} pts in last ${streak.n} games`} />;
  }
  if (streak.state === 'cold') {
    return <Chip tone="cold" icon={Snowflake} label={`Cold · ${streak.pts}P/${streak.n}`}
      title={`${streak.pts} pts on ${streak.sog} shots in last ${streak.n} games`} />;
  }
  return <Chip tone="neutral" label={`${streak.ppg.toFixed(1)} P/g · L${streak.n}`} />;
};

export const GoalieHotCold = ({ playerId, showNeutral = false }) => {
  const streak = useGoalieStreak(playerId);
  if (!streak || (streak.state === 'neutral' && !showNeutral)) return null;
  const sv3 = `.${Math.round(streak.svPct * 1000).toString().padStart(3, '0')}`;
  if (streak.state === 'hot') {
    return <Chip tone="hot" icon={Flame} label={`Hot · ${sv3} SV%`}
      title={`${sv3} save% over last ${streak.n} starts`} />;
  }
  if (streak.state === 'cold') {
    return <Chip tone="cold" icon={Snowflake} label={`Cold · ${sv3} SV%`}
      title={`${sv3} save% over last ${streak.n} starts`} />;
  }
  return <Chip tone="neutral" label={`${sv3} · L${streak.n}`} />;
};
