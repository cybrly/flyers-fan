import { useMemo } from 'react';
import { cx, OPP_FULL, isLive, fmtTime } from '../config.js';
import { Section, Chip } from './primitives.jsx';
import { TeamLogo } from './Logo.jsx';

// "What's worth watching tonight if PHI isn't on?" — scores every non-
// PHI game on the league scoreboard against a few signals fans care
// about and surfaces the top 3. Pure client-side; uses scoreboard,
// standings, and league leaders we already fetch on the dashboard.
//
// Score components (point values are tuned, not regressed):
//   • Game phase: live = +30, playoffs = +50
//   • Standings stakes: both teams in playoff position, close ranks,
//     or a top-3 conference team involved
//   • Closeness (live only): tight margin + late period + OT bumps
//   • Star power: any top-10 NHL points-leader on either side
const WATCHABILITY_THRESHOLD = 25;

const isLivePhase = (state) => isLive(state);

const scoreGame = (g, standingsAll, leaders) => {
  let score = 0;
  const reasons = [];

  if (isLivePhase(g.state)) {
    score += 30;
    reasons.push('LIVE');
  }
  if (g.gameType === 3) {
    score += 50;
    reasons.push('Playoffs');
  }

  const homeT = standingsAll.find((t) => t.abbr === g.home.abbr);
  const awayT = standingsAll.find((t) => t.abbr === g.away.abbr);
  if (homeT && awayT) {
    const ranks = [homeT.confRank, awayT.confRank].filter(Boolean);
    if (ranks.length === 2) {
      const minRank = Math.min(...ranks);
      const maxRank = Math.max(...ranks);
      if (maxRank <= 8) {
        score += 25;
        reasons.push('Both in playoff hunt');
      }
      if (Math.abs(ranks[0] - ranks[1]) <= 3 && maxRank <= 12) {
        score += 12;
        reasons.push('Close in standings');
      }
      if (minRank <= 3) {
        score += 10;
        reasons.push('Top-3 conference team');
      }
    }
  }

  if (isLivePhase(g.state)) {
    const margin = Math.abs((g.home.score || 0) - (g.away.score || 0));
    if (margin === 0) {
      score += 25;
      reasons.push('Tied');
    } else if (margin === 1) {
      score += 15;
      reasons.push('One-goal game');
    }
    if (g.period?.periodType === 'OT' || g.period?.periodType === 'SO') {
      score += 30;
      reasons.push('Overtime');
    } else if (g.period?.number >= 3) {
      score += 12;
      reasons.push('3rd period');
    }
  }

  // Star power — top-10 NHL points leaders. leagueLeaders.skaterPts has
  // { name, team, value }.
  const stars = (leaders?.skaterPts || []).slice(0, 10);
  const starTeams = new Set(stars.map((p) => p.team));
  if (starTeams.has(g.home.abbr) || starTeams.has(g.away.abbr)) {
    score += 8;
    const star = stars.find((p) => p.team === g.home.abbr || p.team === g.away.abbr);
    if (star) reasons.push(`${star.name.split(' ').slice(-1)[0]} on ice`);
  }

  return { score, reasons };
};

export const WatchabilityPanel = ({ scoreboard, standings, leagueLeaders, ourTeamAbbr }) => {
  const top = useMemo(() => {
    if (!scoreboard?.games?.length || !standings?.all?.length) return [];
    const standingsAll = standings.all;
    const candidates = scoreboard.games
      .filter((g) => g.home.abbr !== ourTeamAbbr && g.away.abbr !== ourTeamAbbr)
      .filter((g) => g.state !== 'OFF' && g.state !== 'FINAL') // ignore finished games
      .map((g) => ({ ...g, ...scoreGame(g, standingsAll, leagueLeaders) }))
      .filter((g) => g.score >= WATCHABILITY_THRESHOLD)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
    return candidates;
  }, [scoreboard, standings, leagueLeaders, ourTeamAbbr]);

  if (top.length === 0) return null;

  return (
    <Section
      title="On the Other Sheets"
      action={<span className="text-[10px] font-mono text-white/40 uppercase tracking-wider">around the league tonight</span>}
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-white/[0.04]">
        {top.map((g) => {
          const live = isLivePhase(g.state);
          const periodLabel = g.period?.periodType === 'OT' ? 'OT'
            : g.period?.periodType === 'SO' ? 'SO'
            : g.period?.number ? `P${g.period.number}` : null;
          return (
            <div key={g.id} className="bg-[#0A0A0A] p-4 flex flex-col gap-2.5">
              <div className="flex items-center justify-between gap-2">
                {live ? (
                  <Chip tone="live" pulse>LIVE</Chip>
                ) : (
                  <span className="text-[10px] font-mono text-white/45 uppercase tracking-wider">
                    {fmtTime(g.startUTC)}
                  </span>
                )}
                {periodLabel && live && (
                  <span className="text-[10px] font-mono text-white/55 tabular-nums">
                    {periodLabel} {g.clock?.timeRemaining || ''}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
                <TeamLogo abbr={g.away.abbr} size={28} />
                <div className="min-w-0">
                  <div className="text-[13px] text-white/85 truncate">
                    {OPP_FULL[g.away.abbr] || g.away.abbr}
                  </div>
                  <div className="text-[10px] font-mono text-white/35">{g.away.abbr}</div>
                </div>
                <span className="text-[20px] font-semibold tabular-nums tracking-tight text-white/85">
                  {live ? g.away.score : '—'}
                </span>
              </div>
              <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
                <TeamLogo abbr={g.home.abbr} size={28} />
                <div className="min-w-0">
                  <div className="text-[13px] text-white/85 truncate">
                    {OPP_FULL[g.home.abbr] || g.home.abbr}
                  </div>
                  <div className="text-[10px] font-mono text-white/35">{g.home.abbr}</div>
                </div>
                <span className="text-[20px] font-semibold tabular-nums tracking-tight text-white/85">
                  {live ? g.home.score : '—'}
                </span>
              </div>
              <div className="flex items-center flex-wrap gap-1.5 pt-2 border-t border-white/[0.05]">
                {g.reasons.slice(0, 3).map((r) => (
                  <span key={r} className={cx(
                    'text-[9px] font-mono px-1.5 py-0.5 rounded border uppercase tracking-wider',
                    r === 'LIVE' ? 'border-red-500/40 bg-red-500/[0.08] text-red-300'
                    : r === 'Playoffs' ? 'border-[#F74902]/40 bg-[#F74902]/[0.08] text-[#FF8A4C]'
                    : r === 'Overtime' ? 'border-amber-500/40 bg-amber-500/[0.08] text-amber-300'
                    : 'border-white/[0.08] text-white/55'
                  )}>{r}</span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </Section>
  );
};
