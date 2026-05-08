import { useMemo } from 'react';
import { cx, OPP_FULL, fmtTime, SEASON } from '../config.js';
import { useNHL } from '../api.js';
import { Section, Skeleton, Chip } from './primitives.jsx';
import { TeamLogo } from './Logo.jsx';
import { Headshot } from './Headshot.jsx';
import { PlayerLink } from './PlayerLink.jsx';
import { TeamLogoBg } from './Watermark.jsx';

// Pre-game opponent scouting. Renders only when there's a next-game on
// the schedule. Fetches opp club-stats and full season schedule, then
// derives:
//   • L5 record + goal differential (form)
//   • Top 3 point scorers
//   • Hottest goalie (highest season save % among those who've played)
//
// Pure derivation from data we already proxy — no new endpoints, no new
// adapters. Bails out cleanly during loading or when data is missing.

const isFinalState = (state) => state === 'OFF' || state === 'FINAL';

const fmtPct3 = (v) => v == null ? '—' : `.${Math.round(v * 1000).toString().padStart(3, '0')}`;

export const OpponentScout = ({ nextGame }) => {
  const opp = nextGame?.opp;
  const oppPath = opp ? `v1/club-stats/${opp}/now` : null;
  const oppSchedPath = opp ? `v1/club-schedule-season/${opp}/${SEASON}` : null;

  const oppStatsRaw = useNHL(oppPath, 0);
  const oppSchedRaw = useNHL(oppSchedPath, 0);

  const topScorers = useMemo(() => {
    const skaters = oppStatsRaw.data?.skaters || [];
    return [...skaters]
      .sort((a, b) => (b.points || 0) - (a.points || 0))
      .slice(0, 3)
      .map((p) => ({
        id: p.playerId,
        name: `${p.firstName?.default?.[0] || ''}. ${p.lastName?.default || ''}`.trim(),
        num: p.sweaterNumber,
        pos: p.positionCode,
        g: p.goals || 0,
        a: p.assists || 0,
        pts: p.points || 0,
        headshot: p.headshot,
      }));
  }, [oppStatsRaw.data]);

  // Hot goalie: highest savePct among goalies with ≥4 games played.
  const hotGoalie = useMemo(() => {
    const goalies = oppStatsRaw.data?.goalies || [];
    const candidates = goalies
      .filter((g) => (g.gamesPlayed || 0) >= 4 && g.savePercentage != null)
      .sort((a, b) => (b.savePercentage || 0) - (a.savePercentage || 0));
    if (candidates.length === 0) return null;
    const g = candidates[0];
    return {
      id: g.playerId,
      name: `${g.firstName?.default?.[0] || ''}. ${g.lastName?.default || ''}`.trim(),
      num: g.sweaterNumber,
      gp: g.gamesPlayed,
      w: g.wins,
      l: g.losses,
      otl: g.overtimeLosses ?? g.otLosses ?? 0,
      svPct: g.savePercentage,
      gaa: g.goalsAgainstAverage,
      headshot: g.headshot,
    };
  }, [oppStatsRaw.data]);

  // L5 finished games for the opponent.
  const last5 = useMemo(() => {
    const games = oppSchedRaw.data?.games || [];
    const finished = games.filter((g) => isFinalState(g.gameState));
    finished.sort((a, b) => (b.gameDate || '').localeCompare(a.gameDate || ''));
    const slice = finished.slice(0, 5);
    let w = 0, gf = 0, ga = 0;
    const decisions = slice.map((g) => {
      const isHome = g.homeTeam?.abbrev === opp;
      const us = isHome ? g.homeTeam : g.awayTeam;
      const them = isHome ? g.awayTeam : g.homeTeam;
      const usScore = us?.score ?? 0;
      const themScore = them?.score ?? 0;
      const won = usScore > themScore;
      if (won) w++;
      gf += usScore;
      ga += themScore;
      return {
        won,
        last: g.gameOutcome?.lastPeriodType,
        opp: them?.abbrev,
        score: `${usScore}-${themScore}`,
      };
    });
    // Rest situation — days since opponent's last game
    const finishedGames = all.filter((g) => g.us != null);
    const oppLastGameDate = finishedGames.length ? new Date(finishedGames[0].date) : null;
    const restDays = oppLastGameDate ? Math.floor((Date.now() - oppLastGameDate.getTime()) / 86400000) : null;

    return { n: slice.length, w, l: slice.length - w, gf, ga, decisions, restDays };
  }, [oppSchedRaw.data, opp]);

  if (!opp) return null;

  const loading = oppStatsRaw.loading || oppSchedRaw.loading;
  const hasData = topScorers.length > 0 || hotGoalie || last5.n > 0;

  return (
    <Section
      title="Opponent Scouting"
      action={
        <span className="flex items-center gap-1.5 text-[10px] font-mono text-white/40">
          <span className="uppercase tracking-wider">next:</span>
          <TeamLogo abbr={opp} size={14} />
          <span className="text-white/65">{nextGame.home ? 'vs' : '@'} {OPP_FULL[opp] || opp}</span>
          {nextGame.startUTC && <span className="text-white/30">· {fmtTime(nextGame.startUTC)}</span>}
        </span>
      }
    >
      {!hasData && loading ? (
        <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <Skeleton height={80} />
          <Skeleton height={80} />
          <Skeleton height={80} />
        </div>
      ) : !hasData ? (
        <div className="p-6 text-center text-[11px] font-mono text-white/35">No scouting data yet.</div>
      ) : (
        <div className="relative overflow-hidden">
          <TeamLogoBg abbr={opp} size={224} opacity={0.06} position="bottom-right" />
        <div className="relative grid grid-cols-1 md:grid-cols-3 gap-px bg-white/[0.04] z-10">
          {/* L5 form */}
          <div className="bg-[#0C0C0C] p-4">
            <div className="text-[9px] font-mono text-white/40 uppercase tracking-wider mb-2">Last 5</div>
            <div className="flex items-baseline gap-2">
              <span className="text-[22px] font-semibold tabular-nums tracking-tight">
                <span className="text-emerald-400">{last5.w}</span>
                <span className="text-white/30 mx-1">–</span>
                <span className="text-red-400">{last5.l}</span>
              </span>
              <span className={cx('text-[11px] font-mono tabular-nums',
                last5.gf - last5.ga > 0 ? 'text-[#FF8A4C]' : last5.gf - last5.ga < 0 ? 'text-red-400' : 'text-white/50',
              )}>
                {last5.gf - last5.ga > 0 ? '+' : ''}{last5.gf - last5.ga} diff
              </span>
            </div>
            <div className="mt-2 flex items-center gap-1">
              {last5.decisions.length === 0 && <span className="text-[10px] font-mono text-white/30">no recent games</span>}
              {last5.decisions.map((d, i) => (
                <span
                  key={i}
                  title={`${d.won ? 'W' : 'L'} ${d.score}${d.last && d.last !== 'REG' ? ` (${d.last})` : ''} vs ${d.opp || '—'}`}
                  className={cx(
                    'w-5 h-5 inline-flex items-center justify-center rounded border text-[9px] font-mono font-semibold',
                    d.won
                      ? 'border-emerald-500/45 bg-emerald-500/[0.15] text-emerald-300'
                      : 'border-red-500/40 bg-red-500/[0.10] text-red-300',
                  )}
                >
                  {d.won ? 'W' : 'L'}
                </span>
              ))}
            </div>
            <div className="mt-2 text-[10px] font-mono text-white/40 tabular-nums">
              {last5.gf} GF · {last5.ga} GA over {last5.n} GP
            </div>
            {last5.restDays != null && (
              <div className={cx(
                'mt-1.5 text-[10px] font-mono',
                last5.restDays === 0 ? 'text-red-400' : last5.restDays === 1 ? 'text-amber-400' : 'text-emerald-400',
              )}>
                {last5.restDays === 0 ? 'B2B — playing back-to-back' :
                 last5.restDays === 1 ? `1 day rest` :
                 `${last5.restDays} days rest — well rested`}
              </div>
            )}
          </div>

          {/* Top scorers */}
          <div className="bg-[#0C0C0C] p-4">
            <div className="text-[9px] font-mono text-white/40 uppercase tracking-wider mb-2">Top Scorers</div>
            {topScorers.length === 0 ? (
              <div className="text-[10px] font-mono text-white/30 mt-2">No data</div>
            ) : (
              <div className="space-y-1.5">
                {topScorers.map((p) => (
                  <div key={p.id} className="flex items-center gap-2 min-w-0">
                    <Headshot src={p.headshot} num={p.num} size={22} />
                    <div className="min-w-0 flex-1">
                      <PlayerLink playerId={p.id} className="text-[12px] truncate hover:text-white text-white/85">
                        {p.name}
                      </PlayerLink>
                      <span className="text-[9px] font-mono text-white/30 ml-1.5">{p.pos}</span>
                    </div>
                    <span className="text-[11px] font-mono tabular-nums text-white/85 shrink-0">
                      <span className="text-[#FF8A4C] font-semibold">{p.pts}</span>
                      <span className="text-white/30 mx-1">·</span>
                      <span className="text-emerald-400/80">{p.g}G</span>
                      <span className="text-white/25 mx-0.5">/</span>
                      <span className="text-sky-300/80">{p.a}A</span>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Hot goalie */}
          <div className="bg-[#0C0C0C] p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[9px] font-mono text-white/40 uppercase tracking-wider">Hot Goalie</span>
              <Chip tone="muted">likely starter</Chip>
            </div>
            {!hotGoalie ? (
              <div className="text-[10px] font-mono text-white/30 mt-2">No goalie data</div>
            ) : (
              <div className="flex items-center gap-3">
                <Headshot src={hotGoalie.headshot} num={hotGoalie.num} size={42} />
                <div className="min-w-0">
                  <PlayerLink playerId={hotGoalie.id} className="text-[13px] text-white/90 hover:text-white truncate">
                    {hotGoalie.name}
                  </PlayerLink>
                  <div className="text-[10px] font-mono text-white/40 tabular-nums mt-0.5">
                    {hotGoalie.gp} GP · {hotGoalie.w}-{hotGoalie.l}-{hotGoalie.otl}
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-[11px] font-mono tabular-nums">
                    <span className="text-[#FF8A4C]">{fmtPct3(hotGoalie.svPct)}</span>
                    <span className="text-white/30">·</span>
                    <span className="text-red-400">{hotGoalie.gaa != null ? hotGoalie.gaa.toFixed(2) : '—'} GAA</span>
                  </div>
                </div>
              </div>
            )}
            <div className="mt-2 text-[9px] font-mono text-white/30">
              Highest season SV % — projection, not confirmed
            </div>
          </div>
        </div>
        </div>
      )}
    </Section>
  );
};
