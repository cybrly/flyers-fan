import { ArrowLeft, AlertCircle } from 'lucide-react';
import { cx, fmtDate } from '../config.js';
import { useNHL } from '../api.js';
import { Section, Skeleton, Chip, Label } from '../components/primitives.jsx';
import { TeamLogo } from '../components/Logo.jsx';
import { Sparkline } from '../components/charts.jsx';
import { navigate } from '../router.js';

const HEIGHT = (inches) => inches ? `${Math.floor(inches / 12)}'${inches % 12}"` : '—';

const StatCell = ({ label, value, sub, accent = false }) => (
  <div className="flex flex-col gap-0.5 px-3 py-2.5 border border-white/[0.06] rounded-md bg-white/[0.02]">
    <span className="text-[10px] font-mono text-white/40 uppercase tracking-wider">{label}</span>
    <span className={cx('text-[18px] font-semibold tabular-nums', accent && 'text-[#FF8A4C]')}>
      {value ?? '—'}
    </span>
    {sub && <span className="text-[10px] font-mono text-white/35">{sub}</span>}
  </div>
);

// Extract a player's career season-by-season totals — NHL leagueAbbrev='NHL' rows
// from seasonTotals, plus AHL/junior if useful. We show NHL rows in the main
// table and tag others as "minors/junior" beneath.
const seasonsFromTotals = (totals = []) => {
  if (!totals.length) return { nhl: [], other: [] };
  const nhl = totals.filter((s) => s.leagueAbbrev === 'NHL').sort((a, b) => b.season - a.season);
  const other = totals.filter((s) => s.leagueAbbrev !== 'NHL').sort((a, b) => b.season - a.season);
  return { nhl, other };
};

const seasonLabel = (s) => {
  if (!s) return '';
  const str = String(s);
  if (str.length === 8) return `${str.slice(2, 4)}–${str.slice(6, 8)}`;
  return str;
};

export const PlayerProfile = ({ playerId }) => {
  const { data, error, loading } = useNHL(playerId ? `v1/player/${playerId}/landing` : null, 0);

  if (!playerId) {
    return (
      <div className="p-4 md:p-6">
        <div className="text-[12px] font-mono text-white/40">No player selected.</div>
      </div>
    );
  }

  if (loading && !data) {
    return (
      <div className="p-4 md:p-6 space-y-4">
        <Skeleton height={28} className="w-48" />
        <Skeleton height={140} />
        <Skeleton height={300} />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="p-4 md:p-6">
        <div className="border border-white/[0.06] bg-[#0C0C0C]/60 rounded-md p-10 text-center">
          <AlertCircle size={20} className="text-red-400 mx-auto mb-2" />
          <div className="text-[13px] text-white/70">Couldn't load player.</div>
          <div className="text-[11px] font-mono text-white/40 mt-1">{error}</div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const isSkater = data.position && data.position !== 'G';
  const fullName = `${data.firstName?.default || ''} ${data.lastName?.default || ''}`.trim();
  const teamFull = data.fullTeamName?.default || data.currentTeamAbbrev || '—';
  const sub = data.featuredStats?.regularSeason?.subSeason;
  const seasonAvg = data.featuredStats?.regularSeason?.career;
  const career = data.careerTotals?.regularSeason;
  const last5 = data.last5Games || [];
  const { nhl: nhlSeasons, other: otherSeasons } = seasonsFromTotals(data.seasonTotals);
  const awards = data.awards || [];
  const draft = data.draftDetails;

  // Sparkline trend across the listed seasons (most recent on the right).
  const ptsTrend = isSkater
    ? [...nhlSeasons].reverse().map((s) => s.points || 0)
    : [];
  const savePctTrend = !isSkater
    ? [...nhlSeasons].reverse().map((s) => s.savePctg ?? 0)
    : [];

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center gap-3">
        <button
          onClick={() => window.history.length > 1 ? window.history.back() : navigate('/roster')}
          className="flex items-center gap-1 px-2 h-7 border border-white/[0.08] hover:border-white/20 bg-white/[0.02] rounded-md transition-colors text-[11px] font-mono text-white/55 hover:text-white"
        >
          <ArrowLeft size={11} /> back
        </button>
        <h1 className="text-[18px] font-semibold tracking-tight text-white/55">Player Profile</h1>
      </div>

      {/* Hero — headshot, name, bio, draft */}
      <div className="border border-white/[0.06] bg-gradient-to-br from-[#141414] via-[#101010] to-[#0A0A0A] rounded-md p-5 sm:p-6 relative overflow-hidden">
        <div className="absolute -top-16 -right-16 w-72 h-72 rounded-full pointer-events-none opacity-50"
          style={{ background: 'radial-gradient(circle, rgba(247,73,2,0.10), transparent 65%)' }} />
        <div className="relative flex flex-col sm:flex-row gap-5">
          {data.headshot && (
            <img
              src={data.headshot}
              alt={fullName}
              className="w-28 h-28 sm:w-32 sm:h-32 rounded-md bg-white/[0.04] object-cover shrink-0 border border-white/[0.06]"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline flex-wrap gap-2">
              <h2 className="text-[28px] sm:text-[32px] font-semibold tracking-tight">{fullName}</h2>
              {data.sweaterNumber && (
                <span className="text-[18px] font-mono text-white/35">#{data.sweaterNumber}</span>
              )}
              {data.isActive === false && <Chip tone="muted">RETIRED</Chip>}
            </div>
            <div className="text-[13px] font-mono text-white/65 mt-2 flex items-center gap-2 flex-wrap">
              <TeamLogo abbr={data.currentTeamAbbrev} size={16} />
              <span>{teamFull}</span>
              <span className="text-white/25">·</span>
              <span>{data.position}</span>
              {data.shootsCatches && (
                <><span className="text-white/25">·</span>
                  <span>{isSkater ? 'shoots' : 'catches'} {data.shootsCatches}</span>
                </>
              )}
            </div>
            <div className="text-[12px] font-mono text-white/45 mt-1.5 flex items-center gap-2 flex-wrap">
              {HEIGHT(data.heightInInches) !== '—' && <span>{HEIGHT(data.heightInInches)}</span>}
              {data.weightInPounds && <><span className="text-white/25">·</span><span>{data.weightInPounds} lb</span></>}
              {data.birthDate && <><span className="text-white/25">·</span><span>b. {fmtDate(data.birthDate)}</span></>}
              {data.birthCity?.default && (
                <><span className="text-white/25">·</span>
                  <span>{data.birthCity.default}{data.birthCountry ? `, ${data.birthCountry}` : ''}</span>
                </>
              )}
            </div>
            {draft && (
              <div className="text-[11px] font-mono text-white/45 mt-2">
                <span className="text-white/35 uppercase tracking-wider">Draft · </span>
                {draft.year} · Round {draft.round} · #{draft.overallPick} overall
                {draft.teamAbbrev && <> by <span className="text-white/65">{draft.teamAbbrev}</span></>}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Featured stats — current season big numbers */}
      {sub && (
        <Section title="2025–26 · Regular Season"
          action={isSkater
            ? <span className="text-[10px] font-mono text-white/40">{sub.gamesPlayed || 0} GP</span>
            : <span className="text-[10px] font-mono text-white/40">{sub.gamesPlayed || 0} GP</span>}>
          <div className="p-4 grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-8 gap-2">
            {isSkater ? (
              <>
                <StatCell label="GP"   value={sub.gamesPlayed} />
                <StatCell label="G"    value={sub.goals} accent />
                <StatCell label="A"    value={sub.assists} />
                <StatCell label="P"    value={sub.points} accent />
                <StatCell label="+/–"  value={sub.plusMinus > 0 ? `+${sub.plusMinus}` : sub.plusMinus} />
                <StatCell label="PIM"  value={sub.pim} />
                <StatCell label="SOG"  value={sub.shots} />
                <StatCell label="S%"   value={sub.shootingPctg != null ? `${(sub.shootingPctg * 100).toFixed(1)}%` : '—'} />
                <StatCell label="PPG"  value={sub.powerPlayGoals} />
                <StatCell label="PPP"  value={sub.powerPlayPoints} />
                <StatCell label="SHG"  value={sub.shorthandedGoals} />
                <StatCell label="GWG"  value={sub.gameWinningGoals} />
                <StatCell label="OTG"  value={sub.otGoals} />
                <StatCell label="FO%"  value={sub.faceoffWinningPctg != null ? `${(sub.faceoffWinningPctg * 100).toFixed(1)}%` : '—'} />
                <StatCell label="ATOI" value={sub.avgToi || '—'} />
                <StatCell label="GP/82" value={sub.gamesPlayed && sub.points != null ? ((sub.points / sub.gamesPlayed) * 82).toFixed(0) : '—'} sub="P pace" />
              </>
            ) : (
              <>
                <StatCell label="GP"   value={sub.gamesPlayed} />
                <StatCell label="W"    value={sub.wins} accent />
                <StatCell label="L"    value={sub.losses} />
                <StatCell label="OTL"  value={sub.otLosses ?? sub.overtimeLosses} />
                <StatCell label="SV%"  value={sub.savePercentage != null ? (sub.savePercentage * 100).toFixed(1) + '%' : '—'} accent />
                <StatCell label="GAA"  value={sub.goalsAgainstAverage != null ? sub.goalsAgainstAverage.toFixed(2) : '—'} />
                <StatCell label="SO"   value={sub.shutouts} />
                <StatCell label="SA"   value={sub.shotsAgainst} />
                <StatCell label="SV"   value={sub.saves} />
                <StatCell label="GA"   value={sub.goalsAgainst} />
                <StatCell label="QS%"  value={sub.qualityStartsPctg != null ? (sub.qualityStartsPctg * 100).toFixed(1) + '%' : '—'} />
                <StatCell label="ATOI" value={sub.avgToi || '—'} />
              </>
            )}
          </div>
        </Section>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        {/* Career season-by-season */}
        <div className="xl:col-span-8 space-y-4">
          {nhlSeasons.length > 0 && (
            <Section
              title="NHL · Season by Season"
              action={
                isSkater && ptsTrend.length > 1 ? (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-white/40">PTS trend</span>
                    <Sparkline data={ptsTrend} w={80} h={18} />
                  </div>
                ) : !isSkater && savePctTrend.length > 1 ? (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-white/40">SV% trend</span>
                    <Sparkline data={savePctTrend} w={80} h={18} />
                  </div>
                ) : null
              }
            >
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-[10px] font-mono text-white/35 uppercase tracking-wider border-b border-white/[0.05]">
                      <th className="font-normal text-left px-4 h-8 w-[64px]">Season</th>
                      <th className="font-normal text-left px-2 h-8">Team</th>
                      <th className="font-normal text-right px-2 h-8 w-[44px]">GP</th>
                      {isSkater ? (
                        <>
                          <th className="font-normal text-right px-2 h-8 w-[44px]">G</th>
                          <th className="font-normal text-right px-2 h-8 w-[44px]">A</th>
                          <th className="font-normal text-right px-2 h-8 w-[44px]">P</th>
                          <th className="font-normal text-right px-2 h-8 w-[44px]">+/–</th>
                          <th className="font-normal text-right px-2 h-8 w-[48px]">PIM</th>
                          <th className="font-normal text-right px-2 h-8 w-[48px]">SOG</th>
                          <th className="font-normal text-right px-4 h-8 w-[60px]">ATOI</th>
                        </>
                      ) : (
                        <>
                          <th className="font-normal text-right px-2 h-8 w-[44px]">W</th>
                          <th className="font-normal text-right px-2 h-8 w-[44px]">L</th>
                          <th className="font-normal text-right px-2 h-8 w-[44px]">OTL</th>
                          <th className="font-normal text-right px-2 h-8 w-[56px]">SV%</th>
                          <th className="font-normal text-right px-2 h-8 w-[56px]">GAA</th>
                          <th className="font-normal text-right px-2 h-8 w-[44px]">SO</th>
                          <th className="font-normal text-right px-4 h-8 w-[56px]">SA</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {nhlSeasons.map((s, i) => (
                      <tr key={`${s.season}-${s.teamName?.default || i}`} className="hover:bg-white/[0.02]">
                        <td className="px-4 text-[11px] font-mono tabular-nums text-white/65 h-9">{seasonLabel(s.season)}</td>
                        <td className="px-2">
                          <div className="flex items-center gap-2 text-[12px] text-white/80">
                            {s.teamName?.default && <TeamLogo abbr={s.teamName?.default} size={14} />}
                            <span className="truncate">{s.teamName?.default || s.teamCommonName?.default || '—'}</span>
                          </div>
                        </td>
                        <td className="px-2 text-right text-[11px] font-mono tabular-nums text-white/55">{s.gamesPlayed ?? '—'}</td>
                        {isSkater ? (
                          <>
                            <td className="px-2 text-right text-[11px] font-mono tabular-nums text-white/85">{s.goals ?? '—'}</td>
                            <td className="px-2 text-right text-[11px] font-mono tabular-nums text-white/85">{s.assists ?? '—'}</td>
                            <td className="px-2 text-right text-[12px] font-mono tabular-nums font-medium text-[#FF8A4C]">{s.points ?? '—'}</td>
                            <td className={cx('px-2 text-right text-[11px] font-mono tabular-nums',
                              s.plusMinus > 0 ? 'text-emerald-400' : s.plusMinus < 0 ? 'text-red-400' : 'text-white/55'
                            )}>{s.plusMinus != null ? (s.plusMinus > 0 ? `+${s.plusMinus}` : s.plusMinus) : '—'}</td>
                            <td className="px-2 text-right text-[11px] font-mono tabular-nums text-white/55">{s.pim ?? '—'}</td>
                            <td className="px-2 text-right text-[11px] font-mono tabular-nums text-white/55">{s.shots ?? '—'}</td>
                            <td className="px-4 text-right text-[11px] font-mono tabular-nums text-white/55">{s.avgToi || '—'}</td>
                          </>
                        ) : (
                          <>
                            <td className="px-2 text-right text-[11px] font-mono tabular-nums text-white/85">{s.wins ?? '—'}</td>
                            <td className="px-2 text-right text-[11px] font-mono tabular-nums text-white/55">{s.losses ?? '—'}</td>
                            <td className="px-2 text-right text-[11px] font-mono tabular-nums text-white/55">{s.otLosses ?? s.overtimeLosses ?? '—'}</td>
                            <td className="px-2 text-right text-[12px] font-mono tabular-nums font-medium text-[#FF8A4C]">{s.savePctg != null ? (s.savePctg * 100).toFixed(1) : '—'}</td>
                            <td className="px-2 text-right text-[11px] font-mono tabular-nums text-white/85">{s.goalsAgainstAvg != null ? s.goalsAgainstAvg.toFixed(2) : '—'}</td>
                            <td className="px-2 text-right text-[11px] font-mono tabular-nums text-white/55">{s.shutouts ?? '—'}</td>
                            <td className="px-4 text-right text-[11px] font-mono tabular-nums text-white/55">{s.shotsAgainst ?? '—'}</td>
                          </>
                        )}
                      </tr>
                    ))}
                    {career && (
                      <tr className="border-t-2 border-white/[0.08] bg-white/[0.02]">
                        <td className="px-4 h-9 text-[11px] font-mono text-white/85 uppercase tracking-wider">Career</td>
                        <td className="px-2 text-[11px] font-mono text-white/45">NHL totals</td>
                        <td className="px-2 text-right text-[11px] font-mono tabular-nums text-white/85">{career.gamesPlayed}</td>
                        {isSkater ? (
                          <>
                            <td className="px-2 text-right text-[11px] font-mono tabular-nums text-white/85">{career.goals}</td>
                            <td className="px-2 text-right text-[11px] font-mono tabular-nums text-white/85">{career.assists}</td>
                            <td className="px-2 text-right text-[12px] font-mono tabular-nums font-semibold text-[#FF8A4C]">{career.points}</td>
                            <td className="px-2 text-right text-[11px] font-mono tabular-nums text-white/55">—</td>
                            <td className="px-2 text-right text-[11px] font-mono tabular-nums text-white/55">{career.pim ?? '—'}</td>
                            <td className="px-2 text-right text-[11px] font-mono tabular-nums text-white/55">{career.shots ?? '—'}</td>
                            <td className="px-4 text-right text-[11px] font-mono tabular-nums text-white/55">{career.avgToi || '—'}</td>
                          </>
                        ) : (
                          <>
                            <td className="px-2 text-right text-[11px] font-mono tabular-nums text-white/85">{career.wins}</td>
                            <td className="px-2 text-right text-[11px] font-mono tabular-nums text-white/55">{career.losses}</td>
                            <td className="px-2 text-right text-[11px] font-mono tabular-nums text-white/55">{career.otLosses ?? '—'}</td>
                            <td className="px-2 text-right text-[12px] font-mono tabular-nums font-semibold text-[#FF8A4C]">{career.savePercentage != null ? (career.savePercentage * 100).toFixed(1) : '—'}</td>
                            <td className="px-2 text-right text-[11px] font-mono tabular-nums text-white/85">{career.goalsAgainstAverage != null ? career.goalsAgainstAverage.toFixed(2) : '—'}</td>
                            <td className="px-2 text-right text-[11px] font-mono tabular-nums text-white/55">{career.shutouts ?? '—'}</td>
                            <td className="px-4 text-right text-[11px] font-mono tabular-nums text-white/55">{career.shotsAgainst ?? '—'}</td>
                          </>
                        )}
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Section>
          )}

          {/* Last 5 games */}
          {last5.length > 0 && (
            <Section title="Recent Games">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-[10px] font-mono text-white/35 uppercase tracking-wider border-b border-white/[0.05]">
                      <th className="font-normal text-left px-4 h-8 w-[80px]">Date</th>
                      <th className="font-normal text-left px-2 h-8">Opp</th>
                      {isSkater ? (
                        <>
                          <th className="font-normal text-right px-2 h-8 w-[36px]">G</th>
                          <th className="font-normal text-right px-2 h-8 w-[36px]">A</th>
                          <th className="font-normal text-right px-2 h-8 w-[36px]">P</th>
                          <th className="font-normal text-right px-2 h-8 w-[40px]">+/–</th>
                          <th className="font-normal text-right px-2 h-8 w-[44px]">SOG</th>
                          <th className="font-normal text-right px-2 h-8 w-[44px]">PIM</th>
                          <th className="font-normal text-right px-4 h-8 w-[60px]">TOI</th>
                        </>
                      ) : (
                        <>
                          <th className="font-normal text-right px-2 h-8 w-[44px]">SV%</th>
                          <th className="font-normal text-right px-2 h-8 w-[44px]">SA</th>
                          <th className="font-normal text-right px-2 h-8 w-[44px]">GA</th>
                          <th className="font-normal text-right px-2 h-8 w-[44px]">SO</th>
                          <th className="font-normal text-right px-2 h-8 w-[60px]">TOI</th>
                          <th className="font-normal text-right px-4 h-8 w-[44px]">Dec</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {last5.map((g) => (
                      <tr key={g.gameId} className="hover:bg-white/[0.02]">
                        <td className="px-4 h-9 text-[11px] font-mono text-white/55 tabular-nums">{fmtDate(g.gameDate)}</td>
                        <td className="px-2">
                          <span className="flex items-center gap-1.5 text-[11px] text-white/80">
                            <span className="text-white/35">{g.homeRoadFlag === 'H' ? 'vs' : '@'}</span>
                            <TeamLogo abbr={g.opponentAbbrev} size={14} />
                            <span className="font-mono">{g.opponentAbbrev}</span>
                          </span>
                        </td>
                        {isSkater ? (
                          <>
                            <td className="px-2 text-right text-[11px] font-mono tabular-nums">{g.goals || '—'}</td>
                            <td className="px-2 text-right text-[11px] font-mono tabular-nums">{g.assists || '—'}</td>
                            <td className="px-2 text-right text-[12px] font-mono tabular-nums font-medium">{g.points || '—'}</td>
                            <td className={cx('px-2 text-right text-[11px] font-mono tabular-nums',
                              g.plusMinus > 0 ? 'text-emerald-400' : g.plusMinus < 0 ? 'text-red-400' : 'text-white/55'
                            )}>{g.plusMinus > 0 ? '+' : ''}{g.plusMinus}</td>
                            <td className="px-2 text-right text-[11px] font-mono tabular-nums text-white/65">{g.shots ?? '—'}</td>
                            <td className="px-2 text-right text-[11px] font-mono tabular-nums text-white/55">{g.pim ?? '—'}</td>
                            <td className="px-4 text-right text-[11px] font-mono tabular-nums text-white/55">{g.toi || '—'}</td>
                          </>
                        ) : (
                          <>
                            <td className="px-2 text-right text-[11px] font-mono tabular-nums">{g.savePercentage != null ? (g.savePercentage * 100).toFixed(1) : '—'}</td>
                            <td className="px-2 text-right text-[11px] font-mono tabular-nums text-white/65">{g.shotsAgainst ?? '—'}</td>
                            <td className="px-2 text-right text-[11px] font-mono tabular-nums">{g.goalsAgainst ?? '—'}</td>
                            <td className="px-2 text-right text-[11px] font-mono tabular-nums">{g.shutouts ? '1' : '—'}</td>
                            <td className="px-2 text-right text-[11px] font-mono tabular-nums text-white/55">{g.toi || '—'}</td>
                            <td className="px-4 text-right text-[11px] font-mono">{g.decision || '—'}</td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>
          )}
        </div>

        {/* Side panel — career totals + awards + minor leagues */}
        <div className="xl:col-span-4 space-y-4">
          {career && (
            <Section title="Career · NHL Totals">
              <div className="p-4 space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-center">
                    <div className="text-[10px] font-mono text-white/40 uppercase tracking-wider">GP</div>
                    <div className="text-[20px] font-semibold tabular-nums mt-1">{career.gamesPlayed}</div>
                  </div>
                  {isSkater ? (
                    <>
                      <div className="text-center">
                        <div className="text-[10px] font-mono text-white/40 uppercase tracking-wider">G</div>
                        <div className="text-[20px] font-semibold tabular-nums mt-1 text-[#FF8A4C]">{career.goals}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-[10px] font-mono text-white/40 uppercase tracking-wider">P</div>
                        <div className="text-[20px] font-semibold tabular-nums mt-1 text-[#FF8A4C]">{career.points}</div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="text-center">
                        <div className="text-[10px] font-mono text-white/40 uppercase tracking-wider">W</div>
                        <div className="text-[20px] font-semibold tabular-nums mt-1 text-[#FF8A4C]">{career.wins}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-[10px] font-mono text-white/40 uppercase tracking-wider">SO</div>
                        <div className="text-[20px] font-semibold tabular-nums mt-1">{career.shutouts}</div>
                      </div>
                    </>
                  )}
                </div>
                <div className="pt-3 border-t border-white/[0.05] space-y-1.5">
                  {isSkater ? (
                    <>
                      <Stat row="Assists" v={career.assists} />
                      <Stat row="PIM" v={career.pim} />
                      <Stat row="Shots" v={career.shots} />
                      <Stat row="Shooting %" v={career.shootingPctg != null ? (career.shootingPctg * 100).toFixed(1) + '%' : '—'} />
                      <Stat row="PPG" v={career.powerPlayGoals} />
                      <Stat row="GWG" v={career.gameWinningGoals} />
                      <Stat row="Avg TOI" v={career.avgToi} />
                    </>
                  ) : (
                    <>
                      <Stat row="Losses" v={career.losses} />
                      <Stat row="OT Losses" v={career.otLosses ?? career.overtimeLosses} />
                      <Stat row="SV%" v={career.savePercentage != null ? (career.savePercentage * 100).toFixed(1) + '%' : '—'} />
                      <Stat row="GAA" v={career.goalsAgainstAverage != null ? career.goalsAgainstAverage.toFixed(2) : '—'} />
                      <Stat row="Shots Ag." v={career.shotsAgainst} />
                      <Stat row="Saves" v={career.saves} />
                    </>
                  )}
                </div>
              </div>
            </Section>
          )}

          {awards.length > 0 && (
            <Section title="Awards & Honors">
              <div className="divide-y divide-white/[0.04]">
                {awards.map((a, i) => (
                  <div key={`${a.trophy?.default || i}`} className="px-4 py-2.5">
                    <div className="text-[12px] font-medium text-white/85">{a.trophy?.default || '—'}</div>
                    {a.seasons?.length > 0 && (
                      <div className="text-[10px] font-mono text-white/45 mt-0.5">
                        {a.seasons.map((s) => seasonLabel(s.seasonId || s.season)).join(' · ')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {otherSeasons.length > 0 && (
            <Section title="Pre-NHL · Junior / Minors">
              <div className="divide-y divide-white/[0.04] max-h-[280px] overflow-y-auto">
                {otherSeasons.map((s, i) => (
                  <div key={i} className="px-4 py-2 flex items-center justify-between text-[11px] font-mono">
                    <div className="min-w-0 flex-1">
                      <span className="text-white/55 tabular-nums">{seasonLabel(s.season)}</span>
                      <span className="text-white/30 mx-1.5">·</span>
                      <span className="text-white/65 truncate">{s.leagueAbbrev}</span>
                      <span className="text-white/30 mx-1.5">·</span>
                      <span className="text-white/45 truncate">{s.teamName?.default || '—'}</span>
                    </div>
                    <span className="text-white/65 tabular-nums shrink-0 ml-2">
                      {isSkater
                        ? `${s.gamesPlayed || 0} GP · ${s.points ?? 0} P`
                        : `${s.gamesPlayed || 0} GP · ${s.wins ?? 0} W`}
                    </span>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {seasonAvg && isSkater && (
            <Section title="Per-Game Averages · Career">
              <div className="p-4 grid grid-cols-2 gap-2">
                <StatCell label="G/GP" value={seasonAvg.gamesPlayed ? (seasonAvg.goals / seasonAvg.gamesPlayed).toFixed(2) : '—'} />
                <StatCell label="A/GP" value={seasonAvg.gamesPlayed ? (seasonAvg.assists / seasonAvg.gamesPlayed).toFixed(2) : '—'} />
                <StatCell label="P/GP" value={seasonAvg.gamesPlayed ? (seasonAvg.points / seasonAvg.gamesPlayed).toFixed(2) : '—'} accent />
                <StatCell label="SOG/GP" value={seasonAvg.gamesPlayed && seasonAvg.shots ? (seasonAvg.shots / seasonAvg.gamesPlayed).toFixed(2) : '—'} />
              </div>
            </Section>
          )}
        </div>
      </div>
    </div>
  );
};

const Stat = ({ row, v }) => (
  <div className="flex items-center justify-between">
    <span className="text-[11px] font-mono text-white/45">{row}</span>
    <span className="text-[12px] font-mono tabular-nums text-white/85">{v ?? '—'}</span>
  </div>
);
