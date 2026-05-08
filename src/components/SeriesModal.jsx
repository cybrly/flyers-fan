import { useEffect, useMemo } from 'react';
import { X } from 'lucide-react';
import { cx, fmtDate, fmtTime, SEASON } from '../config.js';
import { useNHL } from '../api.js';
import { adaptSeries } from '../adapters.js';
import { Chip, Label, Section, Skeleton } from './primitives.jsx';
import { TeamLogo } from './Logo.jsx';
import { navigate, gameHref } from '../router.js';

export const SeriesModal = ({ letter, onClose }) => {
  const path = letter ? `v1/schedule/playoff-series/${SEASON}/${letter.toLowerCase()}` : null;
  const { data, error, loading } = useNHL(path, 0);
  const series = useMemo(() => adaptSeries(data), [data]);

  useEffect(() => {
    if (!letter) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [letter, onClose]);

  if (!letter) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
      style={{ animation: 'fadeIn 0.15s ease-out' }}
    >
      <div
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-white/10 bg-[#0C0D11] rounded-lg shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-7 h-7 flex items-center justify-center rounded-md bg-white/[0.04] hover:bg-white/[0.1] text-white/60 hover:text-white transition-colors"
          aria-label="Close"
        >
          <X size={14} />
        </button>

        {loading && !data && (
          <div className="p-5 space-y-3">
            <Skeleton height={60} />
            <Skeleton height={300} />
          </div>
        )}
        {error && !data && (
          <div className="p-8 text-center text-[12px] font-mono text-red-300">{error}</div>
        )}

        {series && (
          <>
            <div className="p-5 border-b border-white/[0.06]">
              <div className="flex items-center gap-2">
                <Label>{series.label || `Round ${series.round}`}</Label>
                <span className="text-[10px] font-mono text-white/35 uppercase tracking-wider">Series {series.letter}</span>
                <span className="text-[10px] font-mono text-white/35">Best of {series.length || 7}</span>
              </div>
              <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <TeamLogo abbr={series.top.abbr} size={36} />
                  <div className="min-w-0">
                    <div className="text-[10px] font-mono text-white/45 uppercase">Top seed</div>
                    <div className="text-[14px] font-medium truncate">{series.top.name || series.top.abbr}</div>
                  </div>
                </div>
                <div className="flex items-baseline gap-2 justify-center">
                  <span className={cx('text-[36px] font-semibold tabular-nums tracking-tight',
                    series.top.wins > series.bottom.wins ? 'text-[#FF8A4C]' : 'text-white/65'
                  )}>{series.top.wins}</span>
                  <span className="text-[18px] text-white/20">–</span>
                  <span className={cx('text-[36px] font-semibold tabular-nums tracking-tight',
                    series.bottom.wins > series.top.wins ? 'text-[#FF8A4C]' : 'text-white/65'
                  )}>{series.bottom.wins}</span>
                </div>
                <div className="flex items-center gap-3 min-w-0 justify-end">
                  <div className="text-right min-w-0">
                    <div className="text-[10px] font-mono text-white/45 uppercase">Lower seed</div>
                    <div className="text-[14px] font-medium truncate">{series.bottom.name || series.bottom.abbr}</div>
                  </div>
                  <TeamLogo abbr={series.bottom.abbr} size={36} />
                </div>
              </div>
            </div>

            <div className="p-5">
              <Label className="mb-3">Game by Game</Label>
              <div className="divide-y divide-white/[0.04] border border-white/[0.06] rounded-md overflow-hidden">
                {series.games.map((g) => {
                  const played = g.final;
                  const winner = played
                    ? (g.home.score > g.away.score ? 'home' : 'away')
                    : null;
                  return (
                    <div
                      key={g.id}
                      role={played ? 'button' : undefined}
                      tabIndex={played ? 0 : undefined}
                      onClick={played ? () => { onClose(); navigate(gameHref(g.id)); } : undefined}
                      onKeyDown={played ? (e) => { if (e.key === 'Enter') { onClose(); navigate(gameHref(g.id)); } } : undefined}
                      className={cx(
                        'grid grid-cols-[44px_1fr_auto] items-center gap-3 px-4 h-12',
                        played && 'cursor-pointer hover:bg-white/[0.04] transition-colors',
                      )}
                    >
                      <div className="text-[11px] font-mono text-white/55">G{g.number}</div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 text-[12px]">
                          <TeamLogo abbr={g.away.abbr} size={16} />
                          <span className={cx('truncate',
                            winner === 'away' ? 'text-white font-medium' : 'text-white/70'
                          )}>{g.away.abbr}</span>
                          <span className={cx('font-mono tabular-nums shrink-0',
                            winner === 'away' ? 'text-[#FF8A4C] font-semibold' : 'text-white/55'
                          )}>{g.away.score ?? ''}</span>
                          <span className="text-white/20 mx-1">@</span>
                          <span className={cx('font-mono tabular-nums shrink-0',
                            winner === 'home' ? 'text-[#FF8A4C] font-semibold' : 'text-white/55'
                          )}>{g.home.score ?? ''}</span>
                          <span className={cx('truncate',
                            winner === 'home' ? 'text-white font-medium' : 'text-white/70'
                          )}>{g.home.abbr}</span>
                          <TeamLogo abbr={g.home.abbr} size={16} />
                        </div>
                        <div className="text-[10px] font-mono text-white/35 mt-0.5">
                          {fmtDate(g.date)} · {fmtTime(g.date)}{g.venue ? ` · ${g.venue}` : ''}
                          {played && g.lastPeriodType && g.lastPeriodType !== 'REG' && ` · ${g.lastPeriodType}`}
                        </div>
                      </div>
                      <div className="text-right flex items-center gap-2">
                        {!played
                          ? (g.ifNecessary ? <Chip tone="muted">If nec.</Chip> : <Chip tone="default">Upcoming</Chip>)
                          : <>
                              <Chip tone={winner === 'home' || winner === 'away' ? 'orange' : 'muted'}>FINAL</Chip>
                              <span className="text-[9px] font-mono text-white/30 hidden sm:inline">open tape →</span>
                            </>
                        }
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Series momentum: tiny squares per played game */}
              {series.games.some((g) => g.final) && (
                <div className="mt-4">
                  <Label className="mb-2">Momentum</Label>
                  <div className="flex gap-1.5">
                    {series.games.map((g) => {
                      if (!g.final) return <div key={g.id} className="w-6 h-6 rounded-sm bg-white/[0.03] border border-white/[0.06]" />;
                      const homeWon = g.home.score > g.away.score;
                      const winnerAbbr = homeWon ? g.home.abbr : g.away.abbr;
                      const isTop = winnerAbbr === series.top.abbr;
                      return (
                        <div
                          key={g.id}
                          title={`G${g.number} · ${winnerAbbr} ${Math.max(g.home.score, g.away.score)}-${Math.min(g.home.score, g.away.score)}`}
                          className={cx(
                            'w-6 h-6 rounded-sm flex items-center justify-center text-[9px] font-bold font-mono',
                            isTop ? 'bg-[#F74902]/20 text-[#FF8A4C] border border-[#F74902]/40' : 'bg-white/[0.08] text-white/75 border border-white/[0.1]',
                          )}
                        >
                          {winnerAbbr}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
