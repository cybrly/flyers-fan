import { useMemo } from 'react';
import { cx, TEAM_ABBR } from '../config.js';
import { Section } from './primitives.jsx';

// Faceoff splits by zone, per-period, derived from raw play-by-play. Each
// faceoff event carries the winner's eventOwnerTeamId plus zoneCode ('O',
// 'N', 'D') given relative to the winner's perspective. To express "PHI's
// offensive-zone faceoff record" we have to flip the opponent's D-zone
// wins into PHI's O-zone losses (their defending end is our attacking end).

const ZONE_LABEL = { O: 'Offensive', N: 'Neutral', D: 'Defensive' };
const FLIP_ZONE = { O: 'D', D: 'O', N: 'N' };

export const FaceoffSplits = ({ pbpRaw }) => {
  const stats = useMemo(() => {
    if (!pbpRaw?.plays) return null;
    const usTeamId = pbpRaw.homeTeam?.abbrev === TEAM_ABBR
      ? pbpRaw.homeTeam.id
      : pbpRaw.awayTeam?.id;
    if (!usTeamId) return null;

    const byZone = { O: { w: 0, l: 0 }, N: { w: 0, l: 0 }, D: { w: 0, l: 0 } };
    const byPeriod = {}; // period → { w, l }
    let totalW = 0, totalL = 0;

    for (const p of pbpRaw.plays) {
      if (p.typeDescKey !== 'faceoff') continue;
      const d = p.details || {};
      const winnerTeamId = d.eventOwnerTeamId;
      const z = d.zoneCode;
      if (!z || !byZone[z]) continue;
      const period = p.periodDescriptor?.number ?? 0;
      if (!byPeriod[period]) byPeriod[period] = { w: 0, l: 0 };

      if (winnerTeamId === usTeamId) {
        byZone[z].w += 1;
        byPeriod[period].w += 1;
        totalW += 1;
      } else {
        // Opponent won — translate their zoneCode into PHI's frame.
        const ourZone = FLIP_ZONE[z];
        byZone[ourZone].l += 1;
        byPeriod[period].l += 1;
        totalL += 1;
      }
    }
    if (totalW + totalL === 0) return null;
    const totalPct = +((totalW / (totalW + totalL)) * 100).toFixed(1);
    return { byZone, byPeriod, totalW, totalL, totalPct };
  }, [pbpRaw]);

  if (!stats) return null;

  const zones = ['O', 'N', 'D'];
  const tone = (pct) => pct >= 55 ? 'good' : pct >= 50 ? 'warm' : pct >= 45 ? 'amber' : 'bad';

  return (
    <Section
      title="Faceoffs by Zone"
      action={
        <span className="text-[10px] font-mono text-white/40">
          overall <span className={cx('font-medium',
            stats.totalPct >= 50 ? 'text-emerald-400' : 'text-red-400'
          )}>{stats.totalPct}%</span> · {stats.totalW}–{stats.totalL}
        </span>
      }
    >
      <div className="grid grid-cols-3 gap-px bg-white/[0.04]">
        {zones.map((z) => {
          const w = stats.byZone[z].w;
          const l = stats.byZone[z].l;
          const total = w + l;
          const pct = total > 0 ? +((w / total) * 100).toFixed(1) : null;
          const t = tone(pct ?? 0);
          const tColor =
            t === 'good' ? 'text-emerald-400' :
            t === 'warm' ? 'text-[#FF8A4C]' :
            t === 'amber' ? 'text-amber-300' :
            'text-red-400';
          const barColor =
            t === 'good' ? 'bg-emerald-500/70' :
            t === 'warm' ? 'bg-[#F74902]/80' :
            t === 'amber' ? 'bg-amber-500/70' :
            'bg-red-500/70';
          return (
            <div key={z} className="bg-[#0A0A0A] px-3 py-3">
              <div className="text-[10px] font-mono text-white/40 uppercase tracking-wider">
                {ZONE_LABEL[z]} zone
              </div>
              <div className="mt-1.5 flex items-baseline gap-2">
                <span className={cx('text-[24px] font-semibold tabular-nums tracking-tight', tColor)}>
                  {pct != null ? `${pct}%` : '—'}
                </span>
                <span className="text-[11px] font-mono tabular-nums text-white/55">
                  {w}–{l}
                </span>
              </div>
              <div className="mt-2 relative h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                <div
                  className={cx('absolute inset-y-0 left-0 rounded-full', barColor)}
                  style={{ width: `${pct ?? 0}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Per-period breakdown */}
      {Object.keys(stats.byPeriod).length > 0 && (
        <div className="px-4 py-2.5 border-t border-white/[0.05] flex items-center gap-4 text-[10px] font-mono text-white/45">
          <span className="uppercase tracking-wider">Per period</span>
          {Object.entries(stats.byPeriod)
            .sort(([a], [b]) => Number(a) - Number(b))
            .map(([p, r]) => {
              const total = r.w + r.l;
              const pct = total > 0 ? +((r.w / total) * 100).toFixed(0) : null;
              return (
                <span key={p} className="flex items-center gap-1.5">
                  <span className="text-white/35">P{p}</span>
                  <span className={cx('tabular-nums font-medium',
                    pct != null && pct >= 50 ? 'text-emerald-400' : 'text-red-400'
                  )}>{pct ?? '—'}{pct != null ? '%' : ''}</span>
                  <span className="text-white/30">{r.w}–{r.l}</span>
                </span>
              );
            })}
        </div>
      )}
    </Section>
  );
};
