import { ChevronRight, Home, Plane } from 'lucide-react';
import { cx, OPP_FULL, fmtDate, fmtDateFull, fmtTime } from '../config.js';
import { Chip, Section, Skeleton } from '../components/primitives.jsx';
import { GoalDiffBars, FormDots, MiniBar } from '../components/charts.jsx';
import { FlyersMark, TeamLogo } from '../components/Logo.jsx';
import { KPI } from '../components/KPI.jsx';
import { Hero } from '../components/Hero.jsx';
import { Scoreboard } from '../components/Scoreboard.jsx';
import { Headshot } from '../components/Headshot.jsx';
import { PlayerLink } from '../components/PlayerLink.jsx';
import { SeriesTracker } from '../components/SeriesTracker.jsx';
import { HeadToHead } from '../components/HeadToHead.jsx';

export const Dashboard = ({ schedule, standings, scoreboard, clubStats, roster, liveDetail, lastGame, loading, onOpenGame }) => {
  const games = schedule?.games?.slice(0, 20) || [];
  const chronGames = [...games].reverse();
  const l10 = games.slice(0, 10);

  const l10Record = {
    w: l10.filter((g) => g.w).length,
    l: l10.filter((g) => !g.w).length,
  };

  const { gf, ga } = games.reduce((a, g) => ({ gf: a.gf + g.us, ga: a.ga + g.them }), { gf: 0, ga: 0 });

  const running = (() => {
    const gfArr = []; let gfA = 0;
    const gaArr = []; let gaA = 0;
    const diffArr = []; let dA = 0;
    const winPctArr = []; let w = 0;
    chronGames.forEach((g, i) => {
      gfA += g.us; gaA += g.them; dA += (g.us - g.them);
      if (g.w) w++;
      gfArr.push(gfA); gaArr.push(gaA); diffArr.push(dA);
      winPctArr.push(w / (i + 1) * 100);
    });
    return { gfArr, gaArr, diffArr, winPctArr };
  })();

  const streak = (() => {
    if (!games.length) return null;
    const type = games[0].w; let n = 0;
    for (const g of games) { if (g.w === type) n++; else break; }
    return { type: type ? 'W' : 'L', count: n };
  })();

  const us = standings?.us;
  const nextGame = schedule?.nextGame;
  const liveGame = schedule?.liveGame;
  const lastResult = games[0];

  const topScorers = clubStats?.skaters
    ? [...clubStats.skaters].sort((a, b) => b.pts - a.pts).slice(0, 6)
    : [];
  const lastGameGoals = lastGame?.timeline || [];

  return (
    <div className="p-3 md:p-5 space-y-3">
      <Hero liveGame={liveGame} liveDetail={liveDetail} nextGame={nextGame} lastResult={lastResult} us={us} />

      <SeriesTracker scoreboard={scoreboard} schedule={schedule} onOpenGame={onOpenGame} />

      {scoreboard?.games?.length > 0 && <Scoreboard data={scoreboard} />}

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {us?.clinched === 'x' && <Chip tone="orange">● Clinched Playoff Spot</Chip>}
          {us?.clinched === 'y' && <Chip tone="amber">● Clinched Division</Chip>}
          {us?.clinched === 'z' && <Chip tone="amber">● Clinched Conference</Chip>}
          {us?.clinched === 'p' && <Chip tone="orange">● Playoff Bound</Chip>}
          {us?.clinched === 'e' && <Chip tone="red">● Eliminated</Chip>}
          {us && <span className="text-[12px] text-white/45 font-mono">{us.gp} of 82 games · 2025–26</span>}
        </div>
        <div className="flex items-center gap-2 text-[11px] font-mono text-white/40">
          <span>Showing</span><span className="text-white/70">Last 20 games</span>
          <ChevronRight size={11} />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <KPI label="Record" value={us ? `${us.w}–${us.l}${us.ot ? `–${us.ot}` : ''}` : '—'} sub={us ? `${us.gp} GP` : ''} sparkData={running.winPctArr} loading={loading && !us} />
        <KPI label="Points" value={us?.pts ?? '—'} sub={us ? `${(us.pct * 100).toFixed(1)}%` : ''} sparkData={running.winPctArr} loading={loading && !us} />
        <KPI label="82-game Pace" value={us?.gp ? Math.round((us.pts / us.gp) * 82) : '—'} sub="pts" loading={loading && !us} trendColor="#F74902" />
        <KPI label="Goal Diff" value={us ? `${us.diff >= 0 ? '+' : ''}${us.diff}` : '—'} sub="season" sparkData={running.diffArr} trendColor={(us?.diff ?? 0) >= 0 ? '#F74902' : '#EF4444'} loading={loading && !us} />
        <KPI label="Streak" value={streak ? `${streak.type}${streak.count}` : '—'} sub={streak?.type === 'W' ? 'hot' : 'cold'} sparkData={running.winPctArr} loading={!streak} />
        <KPI label="Last 10" value={games.length ? `${l10Record.w}–${l10Record.l}` : '—'} sub="recent" sparkData={l10.map((g) => g.w ? 1 : 0).reverse()} loading={!games.length} />
        <KPI label="Division" value={us ? `#${us.divRank}` : '—'} sub="Metro" loading={!us} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-8 2xl:col-span-9 space-y-4">
          <Section
            title="Recent Games"
            action={<span className="text-[10px] font-mono text-white/40">Last 10 · live</span>}
          >
            <div className="divide-y divide-white/[0.04]">
              {/* grid template: Res | Date | Opp | Score | Diff | Site | OT/SO | Type | Distribution */}
              <div className="grid grid-cols-[44px_60px_1fr_72px_50px_56px_44px_42px_120px] gap-2 items-center px-4 h-8 text-[10px] font-mono text-white/35 uppercase tracking-wider">
                <span>Res</span>
                <span>Date</span>
                <span>Opponent</span>
                <span className="text-right">Score</span>
                <span className="text-right">Diff</span>
                <span className="text-center">Site</span>
                <span className="text-center">End</span>
                <span className="text-center">Type</span>
                <span className="text-center">Goals</span>
              </div>
              {!games.length && Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="px-4 h-10 flex items-center"><Skeleton className="w-full" height={16} /></div>
              ))}
              {games.slice(0, 10).map((g) => {
                const max = Math.max(g.us, g.them);
                const diff = g.us - g.them;
                const endTag = g.lastPeriodType === 'OT' ? 'OT' : g.lastPeriodType === 'SO' ? 'SO' : 'REG';
                const typeTag = g.gameType === 3 ? 'PO' : 'REG';
                return (
                  <button
                    key={g.id}
                    onClick={() => onOpenGame?.(g.id)}
                    className="w-full text-left grid grid-cols-[44px_60px_1fr_72px_50px_56px_44px_42px_120px] gap-2 items-center px-4 h-10 hover:bg-white/[0.03] transition-colors cursor-pointer"
                  >
                    <span className={cx(
                      'inline-flex items-center justify-center w-[22px] h-[18px] text-[10px] font-mono font-semibold rounded-[3px]',
                      g.w ? 'bg-[#F74902]/15 text-[#FF8A4C] border border-[#F74902]/30'
                          : 'bg-white/[0.03] text-white/40 border border-white/10'
                    )}>{g.w ? 'W' : 'L'}</span>
                    <span className="text-[11px] font-mono text-white/50 tabular-nums">{g.label}</span>
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[10px] font-mono text-white/35 uppercase shrink-0">{g.home ? 'vs' : '@'}</span>
                      <TeamLogo abbr={g.opp} size={16} />
                      <span className="text-[12px] text-white/85 truncate">{OPP_FULL[g.opp] || g.oppName}</span>
                      <span className="text-[10px] font-mono text-white/35">{g.opp}</span>
                    </div>
                    <div className="text-right font-mono tabular-nums text-[13px]">
                      <span className={g.w ? 'text-[#FF8A4C] font-medium' : 'text-white/80'}>{g.us}</span>
                      <span className="text-white/30 mx-1">–</span>
                      <span className={g.w ? 'text-white/50' : 'text-white/80 font-medium'}>{g.them}</span>
                    </div>
                    <span className={cx('text-right text-[11px] font-mono tabular-nums',
                      diff > 0 ? 'text-emerald-400' : diff < 0 ? 'text-red-400' : 'text-white/40'
                    )}>{diff > 0 ? '+' : ''}{diff}</span>
                    <span className="flex items-center justify-center text-[10px] font-mono text-white/45">
                      {g.home ? <Home size={11} /> : <Plane size={11} />}
                    </span>
                    <span className={cx('text-center text-[10px] font-mono',
                      endTag === 'OT' ? 'text-amber-400' : endTag === 'SO' ? 'text-amber-400/80' : 'text-white/30'
                    )}>{endTag}</span>
                    <span className={cx('text-center text-[10px] font-mono',
                      typeTag === 'PO' ? 'text-[#FF8A4C]' : 'text-white/30'
                    )}>{typeTag}</span>
                    <div className="flex items-center justify-center gap-0.5">
                      {Array.from({ length: max }).map((_, i) => (
                        <div key={`u${i}`} className={cx('w-1 h-3', i < g.us ? 'bg-[#F74902]' : 'bg-white/[0.06]')} />
                      ))}
                      <div className="w-1" />
                      {Array.from({ length: max }).map((_, i) => (
                        <div key={`t${i}`} className={cx('w-1 h-3', i < g.them ? 'bg-white/40' : 'bg-white/[0.06]')} />
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </Section>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Section title="Goal Differential · L20">
              <div className="p-4 space-y-3">
                <div className="flex items-baseline justify-between">
                  <div>
                    <div className="text-[22px] font-semibold tabular-nums tracking-tight">
                      <span className={gf - ga >= 0 ? 'text-[#FF8A4C]' : 'text-red-400'}>
                        {gf - ga >= 0 ? '+' : ''}{gf - ga}
                      </span>
                    </div>
                    <div className="text-[10px] font-mono text-white/40 mt-0.5 uppercase">running total</div>
                  </div>
                  <div className="flex gap-4 text-[11px] font-mono">
                    <div><div className="text-[9px] text-white/35 uppercase">GF</div><div className="text-[#FF8A4C] tabular-nums">{gf}</div></div>
                    <div><div className="text-[9px] text-white/35 uppercase">GA</div><div className="text-white/70 tabular-nums">{ga}</div></div>
                  </div>
                </div>
                {games.length ? <GoalDiffBars games={games} h={60} /> : <Skeleton height={60} />}
              </div>
            </Section>

            <Section title="Form · Last 20">
              <div className="p-4 space-y-3">
                <div className="flex items-baseline justify-between">
                  <div>
                    <div className="text-[22px] font-semibold tabular-nums tracking-tight">
                      {games.filter((g) => g.w).length}<span className="text-white/30">–</span>{games.filter((g) => !g.w).length}
                    </div>
                    <div className="text-[10px] font-mono text-white/40 mt-0.5 uppercase">win–loss split</div>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] font-mono text-white/50">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 bg-[#F74902]" /> W</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 bg-white/15" /> L</span>
                  </div>
                </div>
                <div className="py-2">
                  {games.length ? <FormDots games={games} size={13} /> : <Skeleton height={13} />}
                </div>
              </div>
            </Section>
          </div>

          {/* Splits + Upcoming + Scoring averages — fills the left column to
              keep parity with the right column's mix of widgets. */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SplitsPanel games={games} us={us} />
            <UpcomingPanel upcoming={schedule?.upcoming || []} />
          </div>

          <ScoringPanel games={games} us={us} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <YoungGunsPanel roster={roster} clubStats={clubStats} />
            <HonorsPanel />
          </div>
        </div>

        <div className="lg:col-span-4 2xl:col-span-3 space-y-4">
          {liveGame ? (
            <Section title={<span className="flex items-center gap-2">Live Now <Chip tone="live" pulse>LIVE</Chip></span>}>
              <div className="p-4 space-y-3">
                {/* Period + clock strip — pulled from the boxscore so it
                    refreshes on the live polling interval. */}
                {liveDetail?.periodDescriptor && (
                  <div className="flex items-center justify-between px-2.5 h-9 border border-[#F74902]/25 bg-[#F74902]/[0.06] rounded-md">
                    <span className="text-[10px] font-mono text-[#FF8A4C] uppercase tracking-wider">
                      {liveDetail.periodDescriptor.periodType === 'OT' ? 'Overtime'
                        : liveDetail.periodDescriptor.periodType === 'SO' ? 'Shootout'
                        : `Period ${liveDetail.periodDescriptor.number}`}
                    </span>
                    <span className="text-[18px] font-semibold font-mono tabular-nums text-white">
                      {liveDetail.clock?.inIntermission ? 'INT' : (liveDetail.clock?.timeRemaining || '—:—')}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between py-1">
                  <div className="flex items-center gap-2">
                    <FlyersMark size={18} />
                    <span className="text-[13px] font-medium">PHI</span>
                  </div>
                  <span className="text-[28px] font-semibold tabular-nums text-[#FF8A4C]">{liveGame.us}</span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <div className="flex items-center gap-2">
                    <TeamLogo abbr={liveGame.opp} size={18} />
                    <span className="text-[13px] text-white/70">{liveGame.oppName}</span>
                  </div>
                  <span className="text-[28px] font-semibold tabular-nums text-white/70">{liveGame.them}</span>
                </div>
                {/* Live stat row */}
                {liveDetail?.stats && (
                  <div className="pt-3 border-t border-white/[0.05] grid grid-cols-3 gap-2 text-center">
                    {liveDetail.stats.shots?.us != null && (
                      <div>
                        <div className="text-[9px] font-mono text-white/40 uppercase tracking-wider">SOG</div>
                        <div className="text-[12px] font-mono tabular-nums mt-0.5">
                          <span className="text-[#FF8A4C]">{liveDetail.stats.shots.us}</span>
                          <span className="text-white/25 mx-1">·</span>
                          <span className="text-white/70">{liveDetail.stats.shots.them}</span>
                        </div>
                      </div>
                    )}
                    {liveDetail.stats.powerPlay?.us != null && (
                      <div>
                        <div className="text-[9px] font-mono text-white/40 uppercase tracking-wider">PP</div>
                        <div className="text-[12px] font-mono tabular-nums mt-0.5">
                          <span className="text-[#FF8A4C]">{liveDetail.stats.powerPlay.us}</span>
                          <span className="text-white/25 mx-1">·</span>
                          <span className="text-white/70">{liveDetail.stats.powerPlay.them}</span>
                        </div>
                      </div>
                    )}
                    {liveDetail.stats.faceoffPct?.us != null && (
                      <div>
                        <div className="text-[9px] font-mono text-white/40 uppercase tracking-wider">FO%</div>
                        <div className="text-[12px] font-mono tabular-nums mt-0.5 text-white/85">
                          {liveDetail.stats.faceoffPct.us}%
                        </div>
                      </div>
                    )}
                  </div>
                )}
                <div className="pt-2 border-t border-white/[0.05] text-[10px] font-mono text-white/50 flex items-center justify-between">
                  <span>{liveGame.home ? 'HOME' : 'AWAY'} · {liveGame.venue || 'TBD'}</span>
                  <button
                    onClick={() => onOpenGame?.(liveGame.id)}
                    className="text-[#FF8A4C] hover:text-white transition-colors"
                  >
                    open game tape →
                  </button>
                </div>
              </div>
            </Section>
          ) : nextGame ? (
            <Section title="Next Game">
              <div className="p-4 space-y-3">
                <div className="text-[11px] font-mono text-white/50">
                  {fmtDateFull(nextGame.startUTC)} · {fmtTime(nextGame.startUTC)}
                </div>
                <div className="flex items-center justify-between py-1">
                  <div className="flex items-center gap-2">
                    <FlyersMark size={18} />
                    <span className="text-[13px] font-medium">PHI</span>
                  </div>
                  <span className="text-[11px] font-mono text-white/40">{nextGame.home ? 'HOME' : 'AWAY'}</span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <div className="flex items-center gap-2">
                    <TeamLogo abbr={nextGame.opp} size={18} />
                    <span className="text-[13px] text-white/70">{OPP_FULL[nextGame.opp] || nextGame.oppName}</span>
                  </div>
                </div>
                <div className="pt-3 border-t border-white/[0.05] text-[10px] font-mono text-white/45 flex items-center justify-between">
                  <span>{nextGame.venue || '—'}</span>
                  {nextGame.gameType === 3 && <Chip tone="amber">PLAYOFFS</Chip>}
                </div>
              </div>
            </Section>
          ) : null}

          {lastResult && (
            <Section title="Latest Result">
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <Chip tone={lastResult.w ? 'orange' : 'muted'}>● Final · {lastResult.w ? 'W' : 'L'}</Chip>
                  <span className="text-[10px] font-mono text-white/40">{lastResult.label}</span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <div className="flex items-center gap-2">
                    <FlyersMark size={18} />
                    <span className="text-[13px] font-medium">PHI</span>
                  </div>
                  <span className={cx('text-[22px] font-semibold tabular-nums',
                    lastResult.w ? 'text-[#FF8A4C]' : 'text-white/70'
                  )}>{lastResult.us}</span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <div className="flex items-center gap-2">
                    <TeamLogo abbr={lastResult.opp} size={18} />
                    <span className="text-[13px] text-white/70">{OPP_FULL[lastResult.opp] || lastResult.oppName}</span>
                  </div>
                  <span className={cx('text-[22px] font-semibold tabular-nums',
                    !lastResult.w ? 'text-white' : 'text-white/70'
                  )}>{lastResult.them}</span>
                </div>
              </div>
            </Section>
          )}

          <HeadToHead schedule={schedule} onOpenGame={onOpenGame} />

          <Section title="Metro Standings" action={<ChevronRight size={12} className="text-white/30" />}>
            <div className="divide-y divide-white/[0.04]">
              {!standings?.metro?.length && Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="px-3.5 h-7 flex items-center"><Skeleton className="w-full" height={10} /></div>
              ))}
              {standings?.metro?.slice(0, 6).map((t, i) => (
                <div key={t.abbr} className={cx(
                  'grid grid-cols-[18px_32px_1fr_auto] gap-2 items-center px-3.5 h-7',
                  t.us ? 'bg-[#F74902]/[0.06]' : 'hover:bg-white/[0.02]',
                )}>
                  <span className={cx('text-[10px] font-mono tabular-nums',
                    t.us ? 'text-[#FF8A4C]' : i < 3 ? 'text-white/55' : 'text-white/25'
                  )}>{i + 1}</span>
                  <span className="text-[11px] font-mono font-medium text-white/75">{t.abbr}</span>
                  <MiniBar value={t.w} max={standings.metro[0].w} color={t.us ? '#F74902' : '#666'} h={3} />
                  <span className="text-[11px] font-mono tabular-nums text-white/60 shrink-0">{t.w}–{t.l}</span>
                </div>
              ))}
            </div>
          </Section>

          {topScorers.length > 0 && (
            <Section title="Top Scorers · PHI" action={<span className="text-[10px] font-mono text-white/40">season</span>}>
              <div className="divide-y divide-white/[0.04]">
                {topScorers.map((p, i) => (
                  <div key={p.id} className="grid grid-cols-[18px_1fr_auto] gap-2 items-center px-3 h-9 hover:bg-white/[0.02]">
                    <span className={cx('text-[10px] font-mono tabular-nums',
                      i === 0 ? 'text-[#FF8A4C]' : i < 3 ? 'text-white/55' : 'text-white/25'
                    )}>{i + 1}</span>
                    <span className="flex items-center gap-2 min-w-0">
                      <Headshot src={p.headshot} num={p.num} size={20} />
                      <PlayerLink playerId={p.id}>
                        <span className="text-[12px] truncate">{p.name}</span>
                      </PlayerLink>
                      {p.pos && <span className="text-[9px] font-mono text-white/30">{p.pos}</span>}
                    </span>
                    <span className="flex items-center gap-2 text-[10px] font-mono tabular-nums shrink-0">
                      <span className="text-white/50">{p.g}<span className="text-white/30">G</span></span>
                      <span className="text-white/50">{p.a}<span className="text-white/30">A</span></span>
                      <span className="text-[12px] font-medium text-[#FF8A4C]">{p.pts}</span>
                    </span>
                  </div>
                ))}
              </div>
            </Section>
          )}

          <MilestoneWatch clubStats={clubStats} />

          {lastGameGoals.length > 0 && (
            <Section title="Last Game · Goals" action={<span className="text-[10px] font-mono text-white/40">{lastGame?.dateLabel || ''}</span>}>
              <div className="divide-y divide-white/[0.04]">
                {lastGameGoals.slice(-6).reverse().map((g, i) => (
                  <div key={i} className={cx(
                    'grid grid-cols-[40px_1fr_auto] items-center gap-2 px-3 h-9',
                    g.us ? 'bg-[#F74902]/[0.04]' : '',
                  )}>
                    <span className="text-[9px] font-mono text-white/40 tabular-nums">
                      P{g.period}{g.periodType === 'OT' ? ' OT' : ''}<br />
                      <span className="text-white/30">{g.time}</span>
                    </span>
                    <span className="flex items-center gap-1.5 min-w-0">
                      <Headshot playerId={g.scorerId} teamAbbrev={g.team} size={20} />
                      <PlayerLink playerId={g.scorerId}>
                        <span className={cx('text-[11px] truncate',
                          g.us ? 'text-white font-medium' : 'text-white/75'
                        )}>{g.scorer}</span>
                      </PlayerLink>
                    </span>
                    <span className="text-[10px] font-mono tabular-nums text-white/60 shrink-0">
                      {g.awayScore}<span className="text-white/25 mx-0.5">–</span>{g.homeScore}
                    </span>
                  </div>
                ))}
              </div>
            </Section>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Auxiliary panels for the left column ──────────────────────────────────

// Win/loss breakdowns derived from the games array — home, away, OT/SO,
// 1-goal games, and the standings-supplied L10. Compact 2-column layout.
const SplitsPanel = ({ games, us }) => {
  const home = games.filter((g) => g.home);
  const away = games.filter((g) => !g.home);
  const otGames = games.filter((g) => g.lastPeriodType === 'OT' || g.lastPeriodType === 'SO');
  const oneGoal = games.filter((g) => Math.abs(g.us - g.them) === 1);
  const wl = (arr) => `${arr.filter((g) => g.w).length}–${arr.filter((g) => !g.w).length}`;
  const rows = [
    { l: 'Home',          v: wl(home),    sub: home.length    ? `${(home.filter((g)=>g.w).length / home.length * 100).toFixed(0)}%` : '—' },
    { l: 'Away',          v: wl(away),    sub: away.length    ? `${(away.filter((g)=>g.w).length / away.length * 100).toFixed(0)}%` : '—' },
    { l: 'Last 10',       v: us ? `${us.l10W ?? '—'}–${us.l10L ?? '—'}` : '—', sub: 'recent' },
    { l: 'OT / SO',       v: wl(otGames), sub: `${otGames.length} games` },
    { l: '1-goal games',  v: wl(oneGoal), sub: `${oneGoal.length} games` },
    { l: 'Streak',        v: us?.streak || '—', sub: 'current' },
  ];
  return (
    <Section title="Splits" action={<span className="text-[10px] font-mono text-white/40">{games.length} GP</span>}>
      <div className="divide-y divide-white/[0.04]">
        {rows.map((r) => (
          <div key={r.l} className="grid grid-cols-[1fr_auto_60px] items-center gap-2 px-3.5 h-8">
            <span className="text-[11px] text-white/55">{r.l}</span>
            <span className="text-[12px] font-mono tabular-nums text-white">{r.v}</span>
            <span className="text-[10px] font-mono text-white/35 text-right">{r.sub}</span>
          </div>
        ))}
      </div>
    </Section>
  );
};

const UpcomingPanel = ({ upcoming }) => {
  if (!upcoming?.length) {
    return (
      <Section title="Upcoming">
        <div className="px-4 py-6 text-center text-[11px] font-mono text-white/30">
          No scheduled games.
        </div>
      </Section>
    );
  }
  return (
    <Section title="Upcoming" action={<span className="text-[10px] font-mono text-white/40">next {Math.min(upcoming.length, 5)}</span>}>
      <div className="divide-y divide-white/[0.04]">
        {upcoming.slice(0, 5).map((g) => (
          <div key={g.id} className="grid grid-cols-[60px_1fr_auto] items-center gap-2 px-3.5 h-8">
            <span className="text-[10px] font-mono text-white/45 tabular-nums">{fmtDate(g.startUTC)}</span>
            <span className="flex items-center gap-2 min-w-0">
              <span className="text-[10px] font-mono text-white/35 shrink-0">{g.home ? 'vs' : '@'}</span>
              <TeamLogo abbr={g.opp} size={14} />
              <span className="text-[11px] text-white/80 truncate">{OPP_FULL[g.opp] || g.oppName}</span>
            </span>
            <span className="text-[10px] font-mono text-white/45 tabular-nums">{fmtTime(g.startUTC)}</span>
          </div>
        ))}
      </div>
    </Section>
  );
};

// Scoring averages + advanced rate stats per game. Simple but useful.
const ScoringPanel = ({ games, us }) => {
  if (!games.length) return null;
  const gf = games.reduce((a, g) => a + g.us, 0);
  const ga = games.reduce((a, g) => a + g.them, 0);
  const gpf = (gf / games.length).toFixed(2);
  const gpa = (ga / games.length).toFixed(2);
  const shutoutsFor = games.filter((g) => g.them === 0).length;
  const shutoutsAg  = games.filter((g) => g.us === 0).length;
  const blowouts    = games.filter((g) => Math.abs(g.us - g.them) >= 3).length;
  const comebacks   = games.filter((g) => g.w && g.them >= 3).length; // won despite allowing 3+

  const tiles = [
    { l: 'GF/Gm',   v: gpf,                     accent: true },
    { l: 'GA/Gm',   v: gpa },
    { l: 'Diff',    v: us ? `${us.diff >= 0 ? '+' : ''}${us.diff}` : '—', tone: (us?.diff ?? 0) >= 0 ? 'up' : 'down' },
    { l: 'SO For',  v: shutoutsFor },
    { l: 'SO Ag.',  v: shutoutsAg },
    { l: '3+ wins', v: blowouts },
    { l: 'Comebacks', v: comebacks, sub: 'won down 3+' },
    { l: 'Pts %',   v: us ? `${(us.pct * 100).toFixed(1)}%` : '—' },
  ];
  return (
    <Section title="Scoring & Rate Stats" action={<span className="text-[10px] font-mono text-white/40">season</span>}>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-white/[0.05]">
        {tiles.map((t) => (
          <div key={t.l} className="bg-[#0A0A0A] px-3 py-2.5">
            <div className="text-[9px] font-mono text-white/40 uppercase tracking-wider">{t.l}</div>
            <div className={cx('text-[18px] font-semibold tabular-nums tracking-tight mt-0.5',
              t.accent ? 'text-[#FF8A4C]' : t.tone === 'up' ? 'text-[#FF8A4C]' : t.tone === 'down' ? 'text-red-400' : 'text-white'
            )}>{t.v}</div>
            {t.sub && <div className="text-[9px] font-mono text-white/30 mt-0.5">{t.sub}</div>}
          </div>
        ))}
      </div>
    </Section>
  );
};

// Players within striking distance of a round-number milestone — fun engagement
// content. Computes from clubStats season totals; only shows if there's at
// least one player within ~5 of a milestone.
const MilestoneWatch = ({ clubStats }) => {
  if (!clubStats) return null;
  const list = [];

  const skaterChecks = [
    { key: 'g',   step: 10, abbr: 'G',   label: 'goals' },
    { key: 'a',   step: 10, abbr: 'A',   label: 'assists' },
    { key: 'pts', step: 25, abbr: 'PTS', label: 'points' },
  ];
  for (const p of clubStats.skaters || []) {
    for (const c of skaterChecks) {
      const v = p[c.key];
      if (v == null || v < c.step / 2) continue;
      const next = Math.ceil((v + 1) / c.step) * c.step;
      const away = next - v;
      if (away <= 4) list.push({ id: p.id, name: p.name, num: p.num, headshot: p.headshot, abbr: c.abbr, current: v, target: next, away });
    }
  }
  const goalieChecks = [
    { key: 'w',     step: 10,  abbr: 'W',  label: 'wins' },
    { key: 'so',    step: 1,   abbr: 'SO', label: 'shutouts' },
    { key: 'saves', step: 250, abbr: 'SV', label: 'saves' },
  ];
  for (const p of clubStats.goalies || []) {
    for (const c of goalieChecks) {
      const v = p[c.key];
      if (v == null) continue;
      if (c.key === 'so' && v < 1) continue;
      if (c.key === 'w' && v < 5) continue;
      if (c.key === 'saves' && v < 100) continue;
      const next = Math.ceil((v + 1) / c.step) * c.step;
      const away = next - v;
      if (away <= (c.key === 'saves' ? 50 : c.key === 'so' ? 1 : 4)) {
        list.push({ id: p.id, name: p.name, headshot: p.headshot, abbr: c.abbr, current: v, target: next, away });
      }
    }
  }
  list.sort((a, b) => a.away - b.away);
  if (!list.length) return null;
  return (
    <Section title="Milestone Watch" action={<span className="text-[10px] font-mono text-white/40">approaching</span>}>
      <div className="divide-y divide-white/[0.04]">
        {list.slice(0, 5).map((m, i) => (
          <div key={`${m.id}-${m.abbr}`} className="grid grid-cols-[1fr_auto] items-center gap-2 px-3 h-9">
            <span className="flex items-center gap-2 min-w-0">
              <Headshot src={m.headshot} num={m.num} size={20} />
              <PlayerLink playerId={m.id}>
                <span className="text-[12px] truncate">{m.name}</span>
              </PlayerLink>
            </span>
            <span className="flex items-baseline gap-1 text-[10px] font-mono tabular-nums shrink-0">
              <span className="text-white/55">{m.current}</span>
              <span className="text-white/25">→</span>
              <span className="text-[#FF8A4C] font-medium">{m.target}</span>
              <span className="text-[9px] text-white/40 ml-1">{m.abbr}</span>
              <span className="text-[9px] text-white/35 ml-1">·</span>
              <span className="text-[10px] text-white/65">{m.away} away</span>
            </span>
          </div>
        ))}
      </div>
    </Section>
  );
};

// Players age 23 or younger, joined with their season stats. Crosses roster
// (which has age) with clubStats (which has season totals).
const YoungGunsPanel = ({ roster, clubStats }) => {
  if (!roster || !clubStats) return null;
  const all = [...(roster.forwards || []), ...(roster.defense || []), ...(roster.goalies || [])];
  const young = all
    .filter((p) => p.age != null && p.age <= 23)
    .map((p) => {
      const sk = clubStats.skaters?.find((s) => s.id === p.id);
      const g  = clubStats.goalies?.find((s) => s.id === p.id);
      return { ...p, sk, g };
    })
    .sort((a, b) => {
      const aPts = a.sk?.pts ?? a.g?.w ?? 0;
      const bPts = b.sk?.pts ?? b.g?.w ?? 0;
      return bPts - aPts;
    })
    .slice(0, 6);
  if (!young.length) return null;
  return (
    <Section title="Young Guns" action={<span className="text-[10px] font-mono text-white/40">23 & under</span>}>
      <div className="divide-y divide-white/[0.04]">
        {young.map((p) => (
          <div key={p.id} className="grid grid-cols-[1fr_auto] items-center gap-2 px-3 h-9">
            <span className="flex items-center gap-2 min-w-0">
              <Headshot src={p.headshot} num={p.num} size={20} />
              <PlayerLink playerId={p.id}>
                <span className="text-[12px] truncate">{p.name}</span>
              </PlayerLink>
              <span className="text-[9px] font-mono text-white/30 shrink-0">{p.pos} · {p.age}</span>
            </span>
            <span className="flex items-baseline gap-1 text-[10px] font-mono tabular-nums shrink-0">
              {p.sk ? (
                <>
                  <span className="text-white/55">{p.sk.gp ?? 0}<span className="text-white/30">GP</span></span>
                  <span className="text-white/55 ml-1">{p.sk.g ?? 0}<span className="text-white/30">G</span></span>
                  <span className="text-white/55 ml-1">{p.sk.a ?? 0}<span className="text-white/30">A</span></span>
                  <span className="text-[12px] text-[#FF8A4C] font-medium ml-1">{p.sk.pts ?? 0}</span>
                </>
              ) : p.g ? (
                <>
                  <span className="text-white/55">{p.g.gp ?? 0}<span className="text-white/30">GP</span></span>
                  <span className="text-[#FF8A4C] font-medium ml-1">{p.g.w ?? 0}<span className="text-white/30 font-normal">W</span></span>
                  <span className="text-white/55 ml-1">{p.g.savePct ?? '—'}<span className="text-white/30">%</span></span>
                </>
              ) : (
                <span className="text-white/35">no stats yet</span>
              )}
            </span>
          </div>
        ))}
      </div>
    </Section>
  );
};

// Static franchise pride content — Stanley Cups, retired numbers, hall-of-fame
// alumni. Doesn't change between requests so it's safe to hard-code.
const HonorsPanel = () => {
  const cups = [
    { year: 1974, vs: 'BOS', result: '4–2' },
    { year: 1975, vs: 'BUF', result: '4–2' },
  ];
  const retired = [
    { num: 1,  name: 'Bernie Parent',   year: 1979 },
    { num: 2,  name: 'Mark Howe',       year: 2012 },
    { num: 4,  name: 'Barry Ashbee',    year: 1977 },
    { num: 7,  name: 'Bill Barber',     year: 1990 },
    { num: 16, name: 'Bobby Clarke',    year: 1984 },
    { num: 88, name: 'Eric Lindros',    year: 2018 },
  ];
  return (
    <Section title="Franchise Honors" action={<span className="text-[10px] font-mono text-white/40">since 1967</span>}>
      <div className="p-3.5 space-y-3">
        <div>
          <div className="text-[10px] font-mono text-white/40 uppercase tracking-wider mb-1.5">Stanley Cups</div>
          <div className="flex items-center gap-2">
            {cups.map((c) => (
              <div key={c.year} className="flex-1 border border-[#F74902]/30 bg-[#F74902]/[0.06] rounded-md px-3 py-2">
                <div className="text-[18px] font-semibold tabular-nums tracking-tight text-[#FF8A4C]">{c.year}</div>
                <div className="text-[10px] font-mono text-white/55 mt-0.5">def. {c.vs} · {c.result}</div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="text-[10px] font-mono text-white/40 uppercase tracking-wider mb-1.5">Retired Numbers</div>
          <div className="grid grid-cols-3 gap-1.5">
            {retired.map((r) => (
              <div key={r.num} className="flex items-center gap-1.5 px-2 py-1.5 border border-white/[0.06] bg-white/[0.02] rounded-md">
                <span className="text-[14px] font-semibold tabular-nums text-[#FF8A4C] shrink-0 w-6">#{r.num}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[10px] text-white/85 truncate">{r.name}</span>
                  <span className="block text-[9px] font-mono text-white/35">{r.year}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Section>
  );
};
