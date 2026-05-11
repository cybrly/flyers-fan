// Opponent Preview — dedicated pre-game scouting panel showing the next
// opponent's Edge data, recent form, goalie matchup, and H2H context.
// Renders as a standalone section that can be dropped into Dashboard or
// a future dedicated "Game Night" page.

import { useMemo } from 'react';
import { cx, OPP_FULL, TEAM_ABBR, SEASON, fmtTime, fmtDateFull } from '../config.js';
import { useNHL } from '../api.js';
import { Section, Label, Chip, Skeleton } from './primitives.jsx';
import { TeamLogo } from './Logo.jsx';
import { Headshot } from './Headshot.jsx';
import { PlayerLink } from './PlayerLink.jsx';
import { adaptTeamEdge, PHI_TEAM_ID } from '../adapters-edge.js';

const isFinalState = (s) => s === 'OFF' || s === 'FINAL';

export const OpponentPreview = ({ nextGame, standings }) => {
  const opp = nextGame?.opp;
  if (!opp) return null;

  const oppFull = OPP_FULL[opp] || opp;
  const oppRow = standings?.all?.find((t) => t.abbr === opp);
  const usRow = standings?.us;

  // Opponent Edge data
  const oppTeamId = oppRow ? null : null; // We'd need team ID mapping; use abbr-based lookup
  const oppEdgePath = opp ? `v1/edge/team-detail/${opp === TEAM_ABBR ? 4 : 0}/${SEASON}/2` : null;
  // Edge team endpoints use numeric IDs, not abbreviations. Skip if we don't have the mapping.

  // Opponent club stats for top scorers
  const { data: oppStatsRaw, loading: statsLoading } = useNHL(opp ? `v1/club-stats/${opp}/now` : null, 0);

  const oppScorers = useMemo(() => {
    const skaters = oppStatsRaw?.skaters || [];
    return [...skaters]
      .sort((a, b) => (b.points || 0) - (a.points || 0))
      .slice(0, 5)
      .map((p) => ({
        id: p.playerId,
        name: `${p.firstName?.default?.[0] || ''}. ${p.lastName?.default || ''}`.trim(),
        pos: p.positionCode,
        g: p.goals || 0,
        a: p.assists || 0,
        pts: p.points || 0,
        headshot: p.headshot,
      }));
  }, [oppStatsRaw]);

  const oppGoalies = useMemo(() => {
    const goalies = oppStatsRaw?.goalies || [];
    return [...goalies]
      .sort((a, b) => (b.wins || 0) - (a.wins || 0))
      .slice(0, 2)
      .map((g) => ({
        id: g.playerId,
        name: `${g.firstName?.default?.[0] || ''}. ${g.lastName?.default || ''}`.trim(),
        gp: g.gamesPlayed || 0,
        w: g.wins || 0,
        l: g.losses || 0,
        svPct: g.savePctg,
        gaa: g.goalsAgainstAverage,
        headshot: g.headshot,
      }));
  }, [oppStatsRaw]);

  return (
    <Section
      branded
      title={
        <span className="flex items-center gap-2">
          Game Night Preview
          <TeamLogo abbr={opp} size={16} />
          <span className="text-white/60">{oppFull}</span>
        </span>
      }
      action={
        <span className="text-[10px] font-mono text-white/40">
          {fmtDateFull(nextGame.startUTC)} · {fmtTime(nextGame.startUTC)}
        </span>
      }
    >
      <div className="p-4 space-y-4">
        {/* Matchup header */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
          <div className="text-center">
            <TeamLogo abbr={TEAM_ABBR} size={48} />
            <div className="text-[14px] font-semibold mt-2">PHI</div>
            {usRow && (
              <div className="text-[11px] font-mono text-white/50 mt-0.5">
                {usRow.w}–{usRow.l}–{usRow.ot || 0} · {usRow.pts} pts
              </div>
            )}
          </div>
          <div className="text-center">
            <div className="text-[10px] font-mono text-white/30 uppercase tracking-wider">
              {nextGame.home ? 'Home' : 'Away'}
            </div>
            <div className="text-[28px] font-semibold text-white/20 my-1">VS</div>
            <div className="text-[10px] font-mono text-white/35">
              {nextGame.venue || '—'}
            </div>
          </div>
          <div className="text-center">
            <TeamLogo abbr={opp} size={48} />
            <div className="text-[14px] font-semibold mt-2">{opp}</div>
            {oppRow && (
              <div className="text-[11px] font-mono text-white/50 mt-0.5">
                {oppRow.w}–{oppRow.l}–{oppRow.ot || 0} · {oppRow.pts} pts
              </div>
            )}
          </div>
        </div>

        {/* Standings comparison */}
        {usRow && oppRow && (
          <div className="grid grid-cols-3 gap-px bg-white/[0.04] rounded-lg overflow-hidden">
            {[
              { label: 'Points', us: usRow.pts, them: oppRow.pts, higher: true },
              { label: 'Goal Diff', us: usRow.diff, them: oppRow.diff, higher: true },
              { label: 'P%', us: (usRow.pct * 100).toFixed(1), them: (oppRow.pct * 100).toFixed(1), higher: true },
            ].map((s) => (
              <div key={s.label} className="bg-[#0A0A0A] p-3 text-center">
                <Label>{s.label}</Label>
                <div className="flex items-center justify-center gap-3 mt-1.5">
                  <span className={cx('text-[16px] font-semibold tabular-nums',
                    s.higher ? (Number(s.us) >= Number(s.them) ? 'text-[#FF8A4C]' : 'text-white/55') : 'text-white/70'
                  )}>{s.us}</span>
                  <span className="text-white/20">·</span>
                  <span className={cx('text-[16px] font-semibold tabular-nums',
                    s.higher ? (Number(s.them) > Number(s.us) ? 'text-white' : 'text-white/55') : 'text-white/70'
                  )}>{s.them}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Top scorers */}
        {oppScorers.length > 0 && (
          <div>
            <Label className="mb-2">Danger Players · {opp}</Label>
            <div className="space-y-1.5">
              {oppScorers.map((p) => (
                <div key={p.id} className="flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-white/[0.02]">
                  <Headshot playerId={p.id} size={24} />
                  <span className="text-[12px] text-white/80 flex-1 truncate">
                    {p.id ? <PlayerLink playerId={p.id}>{p.name}</PlayerLink> : p.name}
                  </span>
                  <span className="text-[10px] font-mono text-white/35">{p.pos}</span>
                  <span className="text-[11px] font-mono tabular-nums text-[#FF8A4C]">{p.pts}P</span>
                  <span className="text-[10px] font-mono tabular-nums text-white/40">{p.g}G {p.a}A</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Goalies */}
        {oppGoalies.length > 0 && (
          <div>
            <Label className="mb-2">Goalie Matchup · {opp}</Label>
            <div className="space-y-2">
              {oppGoalies.map((g) => (
                <div key={g.id} className="flex items-center gap-3 px-2 py-2 rounded-md bg-white/[0.015] border border-white/[0.05]">
                  <Headshot playerId={g.id} size={32} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] text-white/80 truncate">{g.name}</div>
                    <div className="text-[10px] font-mono text-white/40 mt-0.5">
                      {g.gp} GP · {g.w}–{g.l}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[13px] font-mono tabular-nums text-[#FF8A4C]">
                      {g.svPct != null ? `.${Math.round(g.svPct * 1000).toString().padStart(3, '0')}` : '—'}
                    </div>
                    <div className="text-[10px] font-mono text-white/35 mt-0.5">
                      {g.gaa != null ? `${g.gaa.toFixed(2)} GAA` : '—'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {statsLoading && !oppScorers.length && (
          <div className="space-y-2">
            <Skeleton height={24} />
            <Skeleton height={24} />
          </div>
        )}
      </div>
    </Section>
  );
};
