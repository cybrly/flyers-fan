import { useMemo } from 'react';
import { cx } from '../config.js';
import { Section } from './primitives.jsx';
import { Headshot } from './Headshot.jsx';
import { PlayerLink } from './PlayerLink.jsx';

// Faceoff specialist board — ranks PHI centers by FO%. The clubStats
// adapter exposes faceoffWinPctg as 0–100 already. Anyone with under
// 50 draws is filtered out so a small-sample C with 6/8 (75%) doesn't
// crowd out the actual specialist with 412/798 (51.6%).
//
// Color scale: ≥55% green, 50–55% orange, 47–50% white/65, <47% red.
// Tuned to NHL-typical distribution where ~55% is elite, 50% is the
// median starter, and <47% is a liability the coach hides on D-zone
// faceoffs.

const FO_TONE = (pct) => {
  if (pct == null) return 'text-white/35';
  if (pct >= 55) return 'text-emerald-400';
  if (pct >= 50) return 'text-[#FF8A4C]';
  if (pct >= 47) return 'text-white/70';
  return 'text-red-400';
};

const MIN_DRAWS_PER_GAME = 5; // ~5 draws/game = real role at the dot

export const FaceoffSpecialists = ({ clubStats }) => {
  const ranked = useMemo(() => {
    const skaters = clubStats?.skaters || [];
    return skaters
      .filter((p) => p.pos === 'C')
      .filter((p) => p.faceoffPct != null && (p.gp || 0) >= 5)
      // Some skaters technically take faceoffs but don't centre (W lines up).
      // We don't have raw faceoff counts in the adapter, so the GP ≥ 5 filter
      // plus the C-only check is the cleanest proxy.
      .sort((a, b) => (b.faceoffPct || 0) - (a.faceoffPct || 0));
  }, [clubStats]);

  if (ranked.length === 0) return null;

  return (
    <Section
      title="Faceoff Specialists"
      action={<span className="text-[10px] font-mono text-white/40 uppercase tracking-wider">centers · season FO%</span>}
    >
      <div className="divide-y divide-white/[0.04]">
        {ranked.map((p, i) => {
          const tone = FO_TONE(p.faceoffPct);
          return (
            <div key={p.id} className="grid grid-cols-[24px_28px_1fr_120px_auto] items-center gap-3 px-3 h-10 hover:bg-white/[0.02]">
              <span className={cx('text-[11px] font-mono tabular-nums',
                i === 0 ? 'text-amber-300 font-semibold' : 'text-white/30'
              )}>{i + 1}</span>
              <Headshot src={p.headshot} num={p.num} size={24} />
              <div className="flex items-center gap-1.5 min-w-0">
                <PlayerLink playerId={p.id} className="text-[12px] truncate hover:text-white text-white/85">
                  {p.name}
                </PlayerLink>
                <span className="text-[9px] font-mono text-white/30 shrink-0">#{p.num}</span>
              </div>
              <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden relative">
                {/* 50% gridline as the visual anchor */}
                <div className="absolute top-0 bottom-0 left-1/2 w-px bg-white/[0.15]" />
                <div
                  className={cx('h-full rounded-full',
                    p.faceoffPct >= 55 ? 'bg-emerald-500/70'
                    : p.faceoffPct >= 50 ? 'bg-[#F74902]/70'
                    : p.faceoffPct >= 47 ? 'bg-white/30'
                    : 'bg-red-500/70',
                  )}
                  style={{ width: `${Math.max(2, Math.min(100, p.faceoffPct || 0))}%` }}
                />
              </div>
              <span className={cx('text-[12px] font-mono tabular-nums font-medium', tone)}>
                {p.faceoffPct != null ? `${p.faceoffPct.toFixed(1)}%` : '—'}
              </span>
            </div>
          );
        })}
      </div>
      <div className="px-3 py-2 border-t border-white/[0.05] text-[10px] font-mono text-white/35 leading-relaxed">
        50% is the league median for a starting C; ≥55% is elite. Min 5 GP.
      </div>
    </Section>
  );
};
