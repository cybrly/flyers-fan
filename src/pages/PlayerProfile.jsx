import { useMemo, useState } from 'react';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { cx, fmtDate, SEASON, SEASON_LABEL, NAME_TO_ABBR } from '../config.js';
import { useNHL } from '../api.js';
import { Section, Skeleton, Chip, Label } from '../components/primitives.jsx';
import { TeamLogo } from '../components/Logo.jsx';
import { Sparkline } from '../components/charts.jsx';
import { navigate, gameHref } from '../router.js';
import { PLAYER_SOCIALS } from '../data/playerSocials.js';
import { SkaterHotCold, GoalieHotCold } from '../components/HotCold.jsx';
import { TeamLogoBg } from '../components/Watermark.jsx';
import { SignaturePanel } from '../components/SignaturePanel.jsx';
import { ContractPanel } from '../components/ContractPanel.jsx';
import { GearPanel } from '../components/GearPanel.jsx';
import { SkaterEdgePanel, GoalieEdgePanel } from '../components/EdgeStats.jsx';

// Inline SVGs for Instagram + X. Drawn small and monochrome so they live
// quietly in the player hero. Lucide-react v1.8 doesn't ship Instagram or
// Twitter icons, hence the inline paths.
const IGIcon = ({ size = 14 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <rect x="3" y="3" width="18" height="18" rx="5" ry="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" />
  </svg>
);
const XIcon = ({ size = 14 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden>
    <path d="M17.53 3H21l-7.31 8.36L22 21h-6.71l-5.06-6.18L4.46 21H1l7.82-8.95L1.5 3h6.86l4.58 5.61L17.53 3zm-1.18 16h1.81L7.78 4.92H5.85L16.35 19z" />
  </svg>
);

// Render a small social-link block for a player. If a curated handle exists
// in PLAYER_SOCIALS the link goes directly to the profile; otherwise it
// falls back to a platform search for the player's name so visitors can
// still find the official account without leaving the site.
const SocialLinks = ({ playerId, fullName }) => {
  const curated = PLAYER_SOCIALS[playerId] || {};
  const igHref = curated.instagram
    ? `https://www.instagram.com/${curated.instagram}/`
    : `https://www.instagram.com/explore/search/keyword/?q=${encodeURIComponent(fullName)}`;
  const xHref = curated.x
    ? `https://x.com/${curated.x}`
    : `https://x.com/search?q=${encodeURIComponent(fullName + ' NHL')}&f=user`;
  const link = (href, Icon, label, direct) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={direct ? `${label} · @${direct}` : `Search ${label} for ${fullName}`}
      className={cx(
        'inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md border text-[11px] font-mono transition-colors',
        direct
          ? 'border-[#F74902]/30 bg-[#F74902]/[0.06] text-[#FF8A4C] hover:bg-[#F74902]/[0.12]'
          : 'border-white/[0.08] bg-white/[0.02] text-white/55 hover:text-white hover:border-white/20'
      )}
    >
      <Icon size={12} />
      <span>{label}</span>
      {direct && <span className="text-white/45">·</span>}
      {direct && <span className="text-white/85 truncate max-w-[120px]">@{direct}</span>}
    </a>
  );
  return (
    <div className="flex items-center gap-2 flex-wrap mt-3">
      {link(igHref, IGIcon, 'Instagram', curated.instagram)}
      {link(xHref,  XIcon,  'X',         curated.x)}
    </div>
  );
};

const HEIGHT = (inches) => inches ? `${Math.floor(inches / 12)}'${inches % 12}"` : '—';

const StatCell = ({ label, value, sub, accent = false }) => (
  <div className="flex flex-col gap-0.5 px-3 py-2.5 border border-[#F74902]/[0.18] rounded-md bg-white/[0.02]">
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
//
// NHL ships regular season (gameTypeId=2) and playoffs (gameTypeId=3) as
// separate rows for the same season-team combination. Without filtering
// the table renders the same season twice. We surface regular-season
// rows only — playoff totals get their own toggle in PlayerGameLog.
const seasonsFromTotals = (totals = []) => {
  if (!totals.length) return { nhl: [], other: [] };
  const regOnly = totals.filter((s) => s.gameTypeId == null || s.gameTypeId === 2);
  const nhl = regOnly.filter((s) => s.leagueAbbrev === 'NHL').sort((a, b) => b.season - a.season);
  const other = regOnly.filter((s) => s.leagueAbbrev !== 'NHL').sort((a, b) => b.season - a.season);
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
      <div className="p-3 md:p-5 space-y-3">
        <Skeleton height={28} className="w-48" />
        <Skeleton height={140} />
        <Skeleton height={300} />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="p-4 md:p-6">
        <div className="border border-[#F74902]/[0.18] bg-[#0C0C0C]/60 rounded-md p-10 text-center">
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
    <div className="p-3 md:p-5 space-y-3">
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
      <div className="border border-[#F74902]/[0.20] bg-gradient-to-br from-[#141414] via-[#101010] to-[#0A0A0A] rounded-md p-5 sm:p-6 relative overflow-hidden">
        <div className="absolute -top-16 -right-16 w-72 h-72 rounded-full pointer-events-none opacity-50"
          style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.03), transparent 65%)' }} />
        <TeamLogoBg abbr={data.currentTeamAbbrev} size={260} opacity={0.06} position="top-right" />
        <div className="relative flex flex-col sm:flex-row gap-5 items-start">
          {data.headshot && (
            <img
              src={data.headshot}
              alt={fullName}
              className="w-32 h-32 sm:w-40 sm:h-40 rounded-md bg-white/[0.04] object-cover shrink-0 border border-white/[0.06]"
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
              {data.isActive !== false && (
                isSkater
                  ? <SkaterHotCold playerId={playerId} showNeutral />
                  : <GoalieHotCold playerId={playerId} showNeutral />
              )}
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
            <SocialLinks playerId={playerId} fullName={fullName} />
          </div>
        </div>
      </div>

      {/* Contract + gear sit in their own row beneath the hero. Signature
          lives further down with the game log — the autograph is more of a
          memorabilia reference than a stat, so it doesn't need top billing. */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <ContractPanel playerId={playerId} fullName={fullName} />
        <GearPanel playerId={playerId} />
      </div>

      {/* NHL Edge tracking data — speed, distance, shot speed, zone time */}
      {playerId && data.position !== 'G' && <SkaterEdgePanel playerId={playerId} />}
      {playerId && data.position === 'G' && <GoalieEdgePanel playerId={playerId} />}

      {/* Featured stats — current season big numbers */}
      {sub && (
        <Section title={`${SEASON_LABEL} · Regular Season`}
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
          {nhlSeasons.length > 1 && (
            <CareerArc seasons={nhlSeasons} isSkater={isSkater} />
          )}

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
                    {nhlSeasons.map((s, i) => {
                      const teamName = s.teamName?.default || s.teamCommonName?.default || '';
                      // Prefer an explicit teamAbbrev, then fall back to the
                      // name → abbrev lookup so TeamLogo can actually find
                      // the SVG instead of falling back to the abbr-as-text
                      // tile (which caused "Philadelphia Flyers" to render
                      // twice on every row).
                      const abbr = s.teamAbbrev || NAME_TO_ABBR[teamName] || null;
                      return (
                      <tr key={`${s.season}-${teamName || i}`} className="hover:bg-white/[0.02]">
                        <td className="px-4 text-[11px] font-mono tabular-nums text-white/65 h-9">{seasonLabel(s.season)}</td>
                        <td className="px-2">
                          <div className="flex items-center gap-2 text-[12px] text-white/80">
                            {abbr && <TeamLogo abbr={abbr} size={14} />}
                            <span className="truncate">{teamName || '—'}</span>
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
                      );
                    })}
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

          {/* Full season game log — every game, scrollable, with reg-season /
              playoffs toggle. Replaces the prior Last-5 panel with full data
              from /v1/player/{id}/game-log/{season}/{type}. Click a row to
              jump to that game's Game Tape page. */}
          <PlayerGameLog playerId={playerId} isSkater={isSkater} />

          <SignaturePanel playerId={playerId} fullName={fullName} />
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

// SVG career arc chart. For skaters it stacks G + A bars per season with a
// points-line overlay; for goalies it draws a SV% line with a reference at
// .910 (league baseline). Each x-axis tick is a season label, e.g. 17–18.
//
// Hover or click on a season slot — invisible hit-rects covering each
// column trigger a custom HTML tooltip with the full stat line, so users
// don't have to rely on the cramped native <title> attribute.
const CareerArc = ({ seasons, isSkater }) => {
  const [hoverIdx, setHoverIdx] = useState(null);
  const [stickyIdx, setStickyIdx] = useState(null);
  const [containerW, setContainerW] = useState(0);
  const [tipPos, setTipPos] = useState({ x: 0, y: 0 });
  // Aggregate by season — players traded mid-year produce two rows per
  // season; we sum them so the chart isn't visually duplicated.
  const byYear = {};
  for (const s of seasons) {
    const key = s.season;
    if (!byYear[key]) byYear[key] = { season: key, gp: 0, g: 0, a: 0, p: 0, savePctg: null, sv: 0, sa: 0 };
    const r = byYear[key];
    r.gp += s.gamesPlayed || 0;
    r.g  += s.goals || 0;
    r.a  += s.assists || 0;
    r.p  += s.points || 0;
    if (s.savePctg != null) {
      const sa = s.shotsAgainst || 0;
      r.sv += sa - (s.goalsAgainst || 0);
      r.sa += sa;
    }
  }
  const rows = Object.values(byYear)
    .sort((a, b) => a.season - b.season)
    .map((r) => ({
      ...r,
      savePctg: r.sa > 0 ? r.sv / r.sa : null,
    }));
  if (rows.length < 2) return null;

  const W = 1000, H = 220;
  const PAD = { top: 16, right: 24, bottom: 36, left: 36 };
  const PW = W - PAD.left - PAD.right;
  const PH = H - PAD.top - PAD.bottom;

  const maxY = isSkater
    ? Math.max(20, ...rows.map((r) => r.p)) * 1.08
    : 1.0;
  const minY = isSkater ? 0 : 0.85;

  const x = (i) => PAD.left + (rows.length === 1 ? PW / 2 : (i / (rows.length - 1)) * PW);
  const y = (v) => PAD.top + PH - ((v - minY) / (maxY - minY)) * PH;

  const linePath = (key) => rows.map((r, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(r[key]).toFixed(1)}`).join(' ');

  const ticksY = (() => {
    if (isSkater) {
      const step = Math.ceil(maxY / 5 / 5) * 5 || 5;
      const out = [];
      for (let v = 0; v <= maxY; v += step) out.push(v);
      return out;
    }
    return [0.85, 0.88, 0.91, 0.94, 0.97, 1.0];
  })();

  return (
    <Section
      title="Career Arc"
      action={<span className="text-[10px] font-mono text-white/40">{isSkater ? 'goals · assists · points' : 'save % per season'}</span>}
    >
      <div className="p-3 relative">
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="auto" className="block">
          {/* Y grid + labels */}
          {ticksY.map((t) => (
            <g key={t}>
              <line x1={PAD.left} y1={y(t)} x2={PAD.left + PW} y2={y(t)}
                stroke="rgba(255,255,255,0.05)" strokeDasharray="2 4" />
              <text x={PAD.left - 6} y={y(t) + 3} textAnchor="end"
                fontSize="9" fill="rgba(255,255,255,0.35)" fontFamily="ui-monospace, monospace">
                {isSkater ? Math.round(t) : (t * 100).toFixed(0) + '%'}
              </text>
            </g>
          ))}

          {/* Reference line for goalies at .910 */}
          {!isSkater && (
            <line x1={PAD.left} x2={PAD.left + PW} y1={y(0.910)} y2={y(0.910)}
              stroke="rgba(247,73,2,0.35)" strokeWidth="1" strokeDasharray="3 3" />
          )}

          {isSkater ? (
            <>
              {/* Stacked G / A bars per season */}
              {rows.map((r, i) => {
                const cx = x(i);
                const barW = Math.max(8, Math.min(38, PW / rows.length - 4));
                const gH = ((r.g) / (maxY - minY)) * PH;
                const aH = ((r.a) / (maxY - minY)) * PH;
                return (
                  <g key={r.season}>
                    <rect
                      x={cx - barW / 2}
                      y={y(r.p)}
                      width={barW}
                      height={gH}
                      fill="#10B981"
                      opacity="0.7"
                    >
                      <title>{seasonLabel(r.season)} · {r.g} goals</title>
                    </rect>
                    <rect
                      x={cx - barW / 2}
                      y={y(r.p) + gH}
                      width={barW}
                      height={aH}
                      fill="#38BDF8"
                      opacity="0.55"
                    >
                      <title>{seasonLabel(r.season)} · {r.a} assists</title>
                    </rect>
                  </g>
                );
              })}
              {/* Points line on top */}
              <path d={linePath('p')} fill="none" stroke="#F74902" strokeWidth="2.4" strokeLinejoin="round" />
              {rows.map((r, i) => (
                <g key={`pt-${r.season}`}>
                  <circle cx={x(i)} cy={y(r.p)} r="3.2" fill="#F74902" stroke="#0A0A0A" strokeWidth="1.5">
                    <title>{seasonLabel(r.season)} · {r.p} pts in {r.gp} GP</title>
                  </circle>
                </g>
              ))}
            </>
          ) : (
            <>
              <path d={linePath('savePctg')} fill="none" stroke="#F74902" strokeWidth="2.4" strokeLinejoin="round" />
              {rows.map((r, i) => r.savePctg != null && (
                <circle key={`sv-${r.season}`} cx={x(i)} cy={y(r.savePctg)} r="3.2" fill="#F74902" stroke="#0A0A0A" strokeWidth="1.5">
                  <title>{seasonLabel(r.season)} · SV% {(r.savePctg * 100).toFixed(1)}</title>
                </circle>
              ))}
            </>
          )}

          {/* X-axis season labels */}
          {rows.map((r, i) => (
            <g key={`x-${r.season}`}>
              <line x1={x(i)} y1={PAD.top + PH} x2={x(i)} y2={PAD.top + PH + 4} stroke="rgba(255,255,255,0.15)" />
              <text x={x(i)} y={PAD.top + PH + 16} textAnchor="middle"
                fontSize="9" fill="rgba(255,255,255,0.45)" fontFamily="ui-monospace, monospace">
                {seasonLabel(r.season)}
              </text>
            </g>
          ))}

          {/* Hover/click hit-rects per season — full-height transparent
              columns make every season equally easy to target, even where
              the bar is short or absent. Hover shows the tooltip; click
              pins it so it stays open after the cursor leaves. */}
          {rows.map((r, i) => {
            const colW = rows.length === 1 ? PW : PW / (rows.length - 1);
            const hitX = i === 0 ? PAD.left : x(i) - colW / 2;
            const hitW = i === 0 || i === rows.length - 1 ? colW / 2 : colW;
            const isActive = stickyIdx === i || hoverIdx === i;
            return (
              <g key={`hit-${r.season}`}>
                {isActive && (
                  <line
                    x1={x(i)} x2={x(i)} y1={PAD.top} y2={PAD.top + PH}
                    stroke="rgba(247,73,2,0.4)" strokeWidth="1" strokeDasharray="3 3"
                  />
                )}
                <rect
                  x={hitX}
                  y={PAD.top}
                  width={hitW}
                  height={PH}
                  fill="transparent"
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={() => setHoverIdx(i)}
                  onMouseMove={(e) => {
                    const wrap = e.currentTarget.ownerSVGElement?.parentElement;
                    if (!wrap) return;
                    const rect = wrap.getBoundingClientRect();
                    setContainerW(rect.width);
                    setTipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
                  }}
                  onMouseLeave={() => setHoverIdx(null)}
                  onClick={() => setStickyIdx((cur) => (cur === i ? null : i))}
                />
              </g>
            );
          })}
        </svg>
        {(() => {
          const idx = stickyIdx ?? hoverIdx;
          if (idx == null || idx < 0 || idx >= rows.length) return null;
          const r = rows[idx];
          const TIP_W = 220;
          const flip = tipPos.x + 14 + TIP_W > (containerW || Infinity);
          const left = flip ? Math.max(8, tipPos.x - 14 - TIP_W) : tipPos.x + 14;
          const top = Math.max(8, tipPos.y - 8);
          return (
            <div
              className="absolute pointer-events-none rounded-md border border-white/[0.12] bg-[#0C0D11]/96 backdrop-blur-md shadow-2xl"
              style={{ left, top, width: TIP_W, zIndex: 5 }}
            >
              <div className="px-3 py-2 border-b border-white/[0.06] flex items-center justify-between">
                <span className="text-[11px] font-mono text-white/85 font-semibold tabular-nums">{seasonLabel(r.season)}</span>
                <span className="text-[10px] font-mono text-white/45 tabular-nums">{r.gp} GP</span>
              </div>
              <div className="px-3 py-2 space-y-1">
                {isSkater ? (
                  <>
                    <CareerArcRow label="Goals" value={r.g} dotClass="bg-emerald-400/80" />
                    <CareerArcRow label="Assists" value={r.a} dotClass="bg-sky-400/70" />
                    <CareerArcRow label="Points" value={r.p} dotClass="bg-[#F74902]" highlight />
                    {r.gp > 0 && (
                      <div className="text-[10px] font-mono text-white/45 pt-1.5 mt-1.5 border-t border-white/[0.05] tabular-nums">
                        {(r.p / r.gp).toFixed(2)} PPG
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <CareerArcRow label="Save %" value={r.savePctg != null ? `${(r.savePctg * 100).toFixed(2)}%` : '—'} dotClass="bg-[#F74902]" highlight />
                    <CareerArcRow label="Saves" value={r.sv} />
                    <CareerArcRow label="Shots Ag" value={r.sa} />
                  </>
                )}
              </div>
              {stickyIdx === idx && (
                <div className="px-3 py-1.5 border-t border-white/[0.05] text-[9px] font-mono text-white/35 uppercase tracking-wider">
                  click again to dismiss
                </div>
              )}
            </div>
          );
        })()}
        {isSkater && (
          <div className="flex items-center gap-4 px-2 mt-1 text-[10px] font-mono text-white/45">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 bg-emerald-400/70 rounded-sm" /> goals</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 bg-sky-400/70 rounded-sm" /> assists</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 bg-[#F74902] rounded-sm" /> points</span>
            <span className="text-white/30 ml-2">hover or click a year</span>
          </div>
        )}
      </div>
    </Section>
  );
};

// One row in the CareerArc tooltip. Highlight is the points/save% line so
// it pops above goals/assists.
const CareerArcRow = ({ label, value, dotClass, highlight }) => (
  <div className="flex items-center justify-between text-[11px] font-mono">
    <span className="flex items-center gap-1.5 text-white/55">
      {dotClass && <span className={`w-1.5 h-1.5 rounded-full ${dotClass}`} />}
      {label}
    </span>
    <span className={cx('tabular-nums', highlight ? 'text-[#FF8A4C]' : 'text-white/85')}>
      {value}
    </span>
  </div>
);

// Convert "MM:SS" to total seconds for trend calculations.
const toiToSec = (toi) => {
  if (!toi || typeof toi !== 'string') return 0;
  const [m, s] = toi.split(':').map(Number);
  return (m || 0) * 60 + (s || 0);
};
const secToToi = (sec) => {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
};

// Full season game log. NHL endpoint:
//   /v1/player/{id}/game-log/{season}/{gameType}
// gameType 2 = regular season, 3 = playoffs. We default to 2 and offer a
// toggle when playoff data exists.
const PlayerGameLog = ({ playerId, isSkater }) => {
  const [gameType, setGameType] = useState(2);
  const path = playerId ? `v1/player/${playerId}/game-log/${SEASON}/${gameType}` : null;
  const { data, loading, error } = useNHL(path, 0);

  const games = data?.gameLog || [];
  const hasPlayoffData = data?.playerStatsSeasons?.some(
    (s) => s.season === Number(SEASON) && s.gameTypes?.includes(3)
  );

  // Aggregate footer + TOI trend numbers.
  const totals = useMemo(() => {
    if (!games.length) return null;
    if (isSkater) {
      return games.reduce((a, g) => ({
        gp: a.gp + 1,
        g: a.g + (g.goals || 0),
        a: a.a + (g.assists || 0),
        p: a.p + (g.points || 0),
        plus: a.plus + (g.plusMinus || 0),
        sog: a.sog + (g.shots || 0),
        pim: a.pim + (g.pim || 0),
        toi: a.toi + toiToSec(g.toi),
      }), { gp: 0, g: 0, a: 0, p: 0, plus: 0, sog: 0, pim: 0, toi: 0 });
    }
    return games.reduce((a, g) => ({
      gp: a.gp + 1,
      sa: a.sa + (g.shotsAgainst || 0),
      ga: a.ga + (g.goalsAgainst || 0),
      sv: a.sv + ((g.shotsAgainst || 0) - (g.goalsAgainst || 0)),
      so: a.so + (g.shutouts ? 1 : 0),
      toi: a.toi + toiToSec(g.toi),
    }), { gp: 0, sa: 0, ga: 0, sv: 0, so: 0, toi: 0 });
  }, [games, isSkater]);

  // TOI trend points — chronological (oldest left, newest right).
  const toiTrend = useMemo(() => {
    if (!games.length) return [];
    return [...games].reverse().map((g) => toiToSec(g.toi));
  }, [games]);

  return (
    <Section
      title={`${SEASON_LABEL} · Game Log`}
      action={
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-white/40">{games.length} games</span>
          {hasPlayoffData && (
            <div className="flex border border-white/[0.08] rounded-md overflow-hidden">
              <button
                onClick={() => setGameType(2)}
                className={cx(
                  'px-2 h-6 text-[10px] font-mono transition-colors',
                  gameType === 2 ? 'bg-[#F74902]/15 text-[#FF8A4C]' : 'text-white/45 hover:text-white/75',
                )}
              >REG</button>
              <button
                onClick={() => setGameType(3)}
                className={cx(
                  'px-2 h-6 text-[10px] font-mono border-l border-white/[0.08] transition-colors',
                  gameType === 3 ? 'bg-amber-500/15 text-amber-300' : 'text-white/45 hover:text-white/75',
                )}
              >PLAYOFFS</button>
            </div>
          )}
        </div>
      }
    >
      {loading && !data && (
        <div className="p-6"><Skeleton height={120} /></div>
      )}
      {error && !data && (
        <div className="p-6 text-center text-[11px] font-mono text-red-400">{error}</div>
      )}
      {!loading && games.length === 0 && (
        <div className="p-6 text-center text-[11px] font-mono text-white/35">
          No {gameType === 3 ? 'playoff ' : ''}games yet this season.
        </div>
      )}
      {games.length > 0 && (
        <>
          {/* TOI trend strip — shows ice-time arc across the season at a
              glance, with avg + min/max labels. Only meaningful for skaters. */}
          {isSkater && toiTrend.length > 1 && (
            <div className="px-4 py-3 border-b border-white/[0.05] flex items-center gap-4">
              <div>
                <div className="text-[10px] font-mono text-white/40 uppercase tracking-wider">TOI / Game</div>
                <div className="text-[14px] font-mono tabular-nums mt-0.5">
                  <span className="text-[#FF8A4C]">{secToToi(Math.round(totals.toi / totals.gp))}</span>
                  <span className="text-white/30 mx-1.5">avg</span>
                </div>
              </div>
              <div className="flex-1">
                <Sparkline data={toiTrend} h={28} stroke="#F74902" />
              </div>
              <div className="text-right">
                <div className="text-[10px] font-mono text-white/40 uppercase tracking-wider">Range</div>
                <div className="text-[11px] font-mono tabular-nums mt-0.5 text-white/65">
                  {secToToi(Math.min(...toiTrend))} – {secToToi(Math.max(...toiTrend))}
                </div>
              </div>
            </div>
          )}
          <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
            <table className="w-full">
              <thead className="sticky top-0 bg-[#0C0C0C]/95 backdrop-blur-sm z-[1]">
                <tr className="text-[10px] font-mono text-white/35 uppercase tracking-wider border-b border-white/[0.06]">
                  <th className="font-normal text-left px-4 h-8 w-[40px]">#</th>
                  <th className="font-normal text-left px-2 h-8 w-[80px]">Date</th>
                  <th className="font-normal text-left px-2 h-8">Opponent</th>
                  {isSkater ? (
                    <>
                      <th className="font-normal text-right px-2 h-8 w-[36px]">G</th>
                      <th className="font-normal text-right px-2 h-8 w-[36px]">A</th>
                      <th className="font-normal text-right px-2 h-8 w-[36px]">P</th>
                      <th className="font-normal text-right px-2 h-8 w-[40px]">+/–</th>
                      <th className="font-normal text-right px-2 h-8 w-[44px]">SOG</th>
                      <th className="font-normal text-right px-2 h-8 w-[44px]">PIM</th>
                      <th className="font-normal text-right px-2 h-8 w-[44px]">PPP</th>
                      <th className="font-normal text-right px-2 h-8 w-[44px]">SHF</th>
                      <th className="font-normal text-right px-4 h-8 w-[60px]">TOI</th>
                    </>
                  ) : (
                    <>
                      <th className="font-normal text-right px-2 h-8 w-[44px]">Dec</th>
                      <th className="font-normal text-right px-2 h-8 w-[52px]">SV%</th>
                      <th className="font-normal text-right px-2 h-8 w-[44px]">SA</th>
                      <th className="font-normal text-right px-2 h-8 w-[44px]">SV</th>
                      <th className="font-normal text-right px-2 h-8 w-[44px]">GA</th>
                      <th className="font-normal text-right px-2 h-8 w-[40px]">SO</th>
                      <th className="font-normal text-right px-4 h-8 w-[60px]">TOI</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {games.map((g, idx) => {
                  const num = games.length - idx; // newest first → highest number
                  const decision = g.decision;
                  const decTone =
                    decision === 'W' ? 'text-emerald-400' :
                    decision === 'L' ? 'text-red-400' :
                    decision === 'O' ? 'text-amber-400' : 'text-white/45';
                  const svPct = g.shotsAgainst
                    ? (((g.shotsAgainst - (g.goalsAgainst || 0)) / g.shotsAgainst) * 100).toFixed(1)
                    : null;
                  return (
                    <tr
                      key={g.gameId}
                      onClick={() => navigate(gameHref(g.gameId))}
                      className="hover:bg-white/[0.03] cursor-pointer transition-colors"
                    >
                      <td className="px-4 h-9 text-[10px] font-mono text-white/30 tabular-nums">{num}</td>
                      <td className="px-2 text-[11px] font-mono text-white/55 tabular-nums">{fmtDate(g.gameDate)}</td>
                      <td className="px-2">
                        <span className="flex items-center gap-1.5 text-[11px] text-white/80">
                          <span className="text-white/35 w-4">{g.homeRoadFlag === 'H' ? 'vs' : '@'}</span>
                          <TeamLogo abbr={g.opponentAbbrev} size={14} />
                          <span className="font-mono">{g.opponentAbbrev}</span>
                          <span className="truncate text-white/55 hidden sm:inline">
                            {g.opponentCommonName?.default || ''}
                          </span>
                        </span>
                      </td>
                      {isSkater ? (
                        <>
                          <td className={cx('px-2 text-right text-[11px] font-mono tabular-nums',
                            g.goals > 0 ? 'text-emerald-400' : 'text-white/45'
                          )}>{g.goals || '—'}</td>
                          <td className={cx('px-2 text-right text-[11px] font-mono tabular-nums',
                            g.assists > 0 ? 'text-sky-300' : 'text-white/45'
                          )}>{g.assists || '—'}</td>
                          <td className={cx('px-2 text-right text-[12px] font-mono tabular-nums font-medium',
                            g.points > 0 ? 'text-[#FF8A4C]' : 'text-white/45'
                          )}>{g.points || '—'}</td>
                          <td className={cx('px-2 text-right text-[11px] font-mono tabular-nums',
                            g.plusMinus > 0 ? 'text-emerald-400' : g.plusMinus < 0 ? 'text-red-400' : 'text-white/55'
                          )}>{g.plusMinus > 0 ? '+' : ''}{g.plusMinus ?? '—'}</td>
                          <td className="px-2 text-right text-[11px] font-mono tabular-nums text-white/65">{g.shots ?? '—'}</td>
                          <td className="px-2 text-right text-[11px] font-mono tabular-nums text-white/45">{g.pim ?? '—'}</td>
                          <td className="px-2 text-right text-[11px] font-mono tabular-nums text-white/55">{g.powerPlayPoints ?? 0}</td>
                          <td className="px-2 text-right text-[11px] font-mono tabular-nums text-white/45">{g.shifts ?? '—'}</td>
                          <td className="px-4 text-right text-[11px] font-mono tabular-nums text-white/65">{g.toi || '—'}</td>
                        </>
                      ) : (
                        <>
                          <td className={cx('px-2 text-right text-[11px] font-mono font-semibold', decTone)}>
                            {decision || '—'}
                          </td>
                          <td className={cx('px-2 text-right text-[11px] font-mono tabular-nums',
                            svPct != null && +svPct >= 91.5 ? 'text-emerald-400'
                            : svPct != null && +svPct >= 89 ? 'text-amber-300'
                            : svPct != null ? 'text-red-400' : 'text-white/45'
                          )}>{svPct ?? '—'}</td>
                          <td className="px-2 text-right text-[11px] font-mono tabular-nums text-white/65">{g.shotsAgainst ?? '—'}</td>
                          <td className="px-2 text-right text-[11px] font-mono tabular-nums text-white/65">
                            {g.shotsAgainst != null && g.goalsAgainst != null ? g.shotsAgainst - g.goalsAgainst : '—'}
                          </td>
                          <td className="px-2 text-right text-[11px] font-mono tabular-nums text-red-300/80">{g.goalsAgainst ?? '—'}</td>
                          <td className="px-2 text-right text-[11px] font-mono tabular-nums">
                            {g.shutouts ? <span className="text-amber-300">1</span> : <span className="text-white/35">—</span>}
                          </td>
                          <td className="px-4 text-right text-[11px] font-mono tabular-nums text-white/65">{g.toi || '—'}</td>
                        </>
                      )}
                    </tr>
                  );
                })}
                {totals && (
                  <tr className="bg-white/[0.025] border-t-2 border-white/[0.08] sticky bottom-0">
                    <td className="px-4 h-9 text-[10px] font-mono text-white/55 uppercase tracking-wider" colSpan={2}>Totals</td>
                    <td className="px-2 text-[11px] font-mono text-white/55 tabular-nums">{totals.gp} GP</td>
                    {isSkater ? (
                      <>
                        <td className="px-2 text-right text-[11px] font-mono tabular-nums text-emerald-400">{totals.g}</td>
                        <td className="px-2 text-right text-[11px] font-mono tabular-nums text-sky-300">{totals.a}</td>
                        <td className="px-2 text-right text-[12px] font-mono tabular-nums font-semibold text-[#FF8A4C]">{totals.p}</td>
                        <td className={cx('px-2 text-right text-[11px] font-mono tabular-nums',
                          totals.plus > 0 ? 'text-emerald-400' : totals.plus < 0 ? 'text-red-400' : 'text-white/55'
                        )}>{totals.plus > 0 ? '+' : ''}{totals.plus}</td>
                        <td className="px-2 text-right text-[11px] font-mono tabular-nums text-white/85">{totals.sog}</td>
                        <td className="px-2 text-right text-[11px] font-mono tabular-nums text-white/55">{totals.pim}</td>
                        <td className="px-2" />
                        <td className="px-2" />
                        <td className="px-4 text-right text-[11px] font-mono tabular-nums text-white/65">
                          avg {secToToi(Math.round(totals.toi / totals.gp))}
                        </td>
                      </>
                    ) : (
                      <>
                        <td />
                        <td className="px-2 text-right text-[11px] font-mono tabular-nums text-[#FF8A4C]">
                          {totals.sa ? ((totals.sv / totals.sa) * 100).toFixed(1) : '—'}
                        </td>
                        <td className="px-2 text-right text-[11px] font-mono tabular-nums text-white/85">{totals.sa}</td>
                        <td className="px-2 text-right text-[11px] font-mono tabular-nums text-white/85">{totals.sv}</td>
                        <td className="px-2 text-right text-[11px] font-mono tabular-nums text-red-300">{totals.ga}</td>
                        <td className="px-2 text-right text-[11px] font-mono tabular-nums text-amber-300">{totals.so}</td>
                        <td className="px-4 text-right text-[11px] font-mono tabular-nums text-white/65">
                          avg {secToToi(Math.round(totals.toi / totals.gp))}
                        </td>
                      </>
                    )}
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Section>
  );
};
