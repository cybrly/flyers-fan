import { useEffect } from 'react';
import { X, AlertCircle, ArrowRight } from 'lucide-react';
import { cx, fmtDate } from '../config.js';
import { useNHL } from '../api.js';
import { Label, Skeleton } from './primitives.jsx';
import { TeamLogo } from './Logo.jsx';
import { navigate, playerHref } from '../router.js';

const StatCell = ({ label, value }) => (
  <div className="flex flex-col gap-0.5 px-3 py-2 border border-white/[0.05] rounded-md bg-white/[0.02]">
    <span className="text-[10px] font-mono text-white/40 uppercase tracking-wider">{label}</span>
    <span className="text-[16px] font-semibold tabular-nums">{value ?? '—'}</span>
  </div>
);

export const PlayerModal = ({ playerId, onClose }) => {
  // Modal lifts a single useNHL inside it. Path goes null when closed so the
  // hook tears down its polling.
  const path = playerId ? `v1/player/${playerId}/landing` : null;
  const { data, error, loading } = useNHL(path, 0);

  useEffect(() => {
    if (!playerId) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [playerId, onClose]);

  if (!playerId) return null;

  const isSkater = data?.position && data.position !== 'G';
  const sub = data?.featuredStats?.regularSeason?.subSeason;
  const career = data?.careerTotals?.regularSeason;
  const last5 = data?.last5Games || [];
  const fullName = data ? `${data.firstName?.default || ''} ${data.lastName?.default || ''}`.trim() : '';

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
        <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5">
          <button
            onClick={() => { onClose(); navigate(playerHref(playerId)); }}
            className="hidden sm:flex items-center gap-1.5 h-7 px-2.5 rounded-md bg-[#F74902]/15 hover:bg-[#F74902]/25 border border-[#F74902]/30 text-[#FF8A4C] text-[11px] font-mono transition-colors"
            aria-label="View full profile"
          >
            full profile <ArrowRight size={11} />
          </button>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-md bg-white/[0.04] hover:bg-white/[0.1] text-white/60 hover:text-white transition-colors"
            aria-label="Close"
          >
            <X size={14} />
          </button>
        </div>

        {loading && !data && (
          <div className="p-5 space-y-3">
            <Skeleton height={80} />
            <Skeleton height={120} />
            <Skeleton height={140} />
          </div>
        )}
        {error && !data && (
          <div className="p-8 text-center">
            <AlertCircle size={20} className="text-red-400 mx-auto mb-2" />
            <div className="text-[13px] text-white/70">Couldn't load player.</div>
            <div className="text-[11px] font-mono text-white/40 mt-1">{error}</div>
          </div>
        )}

        {data && (
          <>
            <div className="p-5 border-b border-white/[0.06] flex items-start gap-4">
              {data.headshot && (
                <img
                  src={data.headshot}
                  alt={fullName}
                  className="w-20 h-20 rounded-md bg-white/[0.04] object-cover shrink-0"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <h2 className="text-[20px] font-semibold tracking-tight truncate">{fullName}</h2>
                  {data.sweaterNumber && <span className="text-[14px] font-mono text-white/40">#{data.sweaterNumber}</span>}
                </div>
                <div className="text-[12px] font-mono text-white/55 mt-1 flex items-center gap-2 flex-wrap">
                  <TeamLogo abbr={data.currentTeamAbbrev} size={14} />
                  <span>{data.fullTeamName?.default || data.currentTeamAbbrev || '—'}</span>
                  <span className="text-white/25">·</span>
                  <span>{data.position}</span>
                  {data.shootsCatches && <><span className="text-white/25">·</span><span>{isSkater ? 'shoots' : 'catches'} {data.shootsCatches}</span></>}
                </div>
                <div className="text-[11px] font-mono text-white/40 mt-1.5">
                  {data.heightInInches ? `${Math.floor(data.heightInInches / 12)}'${data.heightInInches % 12}" · ` : ''}
                  {data.weightInPounds ? `${data.weightInPounds} lb · ` : ''}
                  {data.birthDate ? `b. ${data.birthDate}` : ''}
                  {data.birthCity?.default ? ` · ${data.birthCity.default}, ${data.birthCountry || ''}` : ''}
                </div>
              </div>
            </div>

            {sub && (
              <div className="p-5 border-b border-white/[0.06]">
                <Label className="mb-3">2025–26 Regular Season</Label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {isSkater ? (
                    <>
                      <StatCell label="GP"  value={sub.gamesPlayed} />
                      <StatCell label="G"   value={sub.goals} />
                      <StatCell label="A"   value={sub.assists} />
                      <StatCell label="P"   value={sub.points} />
                      <StatCell label="+/–" value={sub.plusMinus > 0 ? `+${sub.plusMinus}` : sub.plusMinus} />
                      <StatCell label="SOG" value={sub.shots} />
                    </>
                  ) : (
                    <>
                      <StatCell label="GP"  value={sub.gamesPlayed} />
                      <StatCell label="W"   value={sub.wins} />
                      <StatCell label="L"   value={sub.losses} />
                      <StatCell label="SV%" value={sub.savePercentage != null ? `${(sub.savePercentage * 100).toFixed(1)}%` : '—'} />
                      <StatCell label="GAA" value={sub.goalsAgainstAverage != null ? sub.goalsAgainstAverage.toFixed(2) : '—'} />
                      <StatCell label="SO"  value={sub.shutouts} />
                    </>
                  )}
                </div>
              </div>
            )}

            {last5.length > 0 && (
              <div className="p-5 border-b border-white/[0.06]">
                <Label className="mb-2">Last 5 Games</Label>
                <table className="w-full">
                  <thead>
                    <tr className="text-[10px] font-mono text-white/35 uppercase tracking-wider border-b border-white/[0.05]">
                      <th className="font-normal text-left py-1">Date</th>
                      <th className="font-normal text-left py-1">Opp</th>
                      {isSkater ? (
                        <>
                          <th className="font-normal text-right py-1 w-[36px]">G</th>
                          <th className="font-normal text-right py-1 w-[36px]">A</th>
                          <th className="font-normal text-right py-1 w-[36px]">P</th>
                          <th className="font-normal text-right py-1 w-[40px]">+/–</th>
                          <th className="font-normal text-right py-1 w-[44px]">SOG</th>
                          <th className="font-normal text-right py-1 w-[60px]">TOI</th>
                        </>
                      ) : (
                        <>
                          <th className="font-normal text-right py-1 w-[44px]">SV%</th>
                          <th className="font-normal text-right py-1 w-[44px]">SA</th>
                          <th className="font-normal text-right py-1 w-[44px]">GA</th>
                          <th className="font-normal text-right py-1 w-[60px]">TOI</th>
                          <th className="font-normal text-right py-1 w-[40px]">Dec</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {last5.map((g) => (
                      <tr key={g.gameId} className="hover:bg-white/[0.02]">
                        <td className="py-1.5 text-[11px] font-mono text-white/55">{fmtDate(g.gameDate)}</td>
                        <td className="py-1.5">
                          <span className="flex items-center gap-1.5 text-[11px] text-white/75">
                            <span className="text-white/35">{g.homeRoadFlag === 'H' ? 'vs' : '@'}</span>
                            <TeamLogo abbr={g.opponentAbbrev} size={14} />
                            <span className="font-mono">{g.opponentAbbrev}</span>
                          </span>
                        </td>
                        {isSkater ? (
                          <>
                            <td className="py-1.5 text-right text-[11px] font-mono tabular-nums">{g.goals || '—'}</td>
                            <td className="py-1.5 text-right text-[11px] font-mono tabular-nums">{g.assists || '—'}</td>
                            <td className="py-1.5 text-right text-[11px] font-mono tabular-nums font-medium">{g.points || '—'}</td>
                            <td className={cx('py-1.5 text-right text-[11px] font-mono tabular-nums',
                              g.plusMinus > 0 ? 'text-emerald-400' : g.plusMinus < 0 ? 'text-red-400' : 'text-white/55'
                            )}>{g.plusMinus > 0 ? '+' : ''}{g.plusMinus}</td>
                            <td className="py-1.5 text-right text-[11px] font-mono tabular-nums text-white/65">{g.shots}</td>
                            <td className="py-1.5 text-right text-[11px] font-mono tabular-nums text-white/55">{g.toi || '—'}</td>
                          </>
                        ) : (
                          <>
                            <td className="py-1.5 text-right text-[11px] font-mono tabular-nums">{g.savePercentage != null ? (g.savePercentage * 100).toFixed(1) + '%' : '—'}</td>
                            <td className="py-1.5 text-right text-[11px] font-mono tabular-nums text-white/65">{g.shotsAgainst ?? '—'}</td>
                            <td className="py-1.5 text-right text-[11px] font-mono tabular-nums">{g.goalsAgainst ?? '—'}</td>
                            <td className="py-1.5 text-right text-[11px] font-mono tabular-nums text-white/55">{g.toi || '—'}</td>
                            <td className="py-1.5 text-right text-[11px] font-mono">{g.decision || '—'}</td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {career && (
              <div className="p-5">
                <Label className="mb-2">Career · Regular Season</Label>
                <div className="text-[12px] font-mono text-white/65 tabular-nums flex items-center gap-3 flex-wrap">
                  <span>{career.gamesPlayed} GP</span>
                  {isSkater ? (
                    <>
                      <span>·</span><span>{career.goals}G</span>
                      <span>·</span><span>{career.assists}A</span>
                      <span>·</span><span className="text-white">{career.points}P</span>
                      {career.avgToi && <><span>·</span><span>{career.avgToi} ATOI</span></>}
                    </>
                  ) : (
                    <>
                      <span>·</span><span>{career.wins}W</span>
                      <span>·</span><span>{career.losses}L</span>
                      {career.savePercentage != null && <><span>·</span><span>{(career.savePercentage * 100).toFixed(1)}% SV</span></>}
                      {career.shutouts != null && <><span>·</span><span>{career.shutouts} SO</span></>}
                    </>
                  )}
                </div>
              </div>
            )}

            <div className="p-4 border-t border-white/[0.06] bg-white/[0.015]">
              <button
                onClick={() => { onClose(); navigate(playerHref(playerId)); }}
                className="w-full flex items-center justify-center gap-2 h-9 rounded-md bg-[#F74902]/15 hover:bg-[#F74902]/25 border border-[#F74902]/30 text-[#FF8A4C] text-[12px] font-medium transition-colors"
              >
                View full profile <ArrowRight size={13} />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
