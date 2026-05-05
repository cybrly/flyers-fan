import { useState } from 'react';
import { Home, Plane } from 'lucide-react';
import { cx, OPP_FULL, fmtDate, fmtDateFull, fmtTime } from '../config.js';
import { Chip, Section, SectionBand, Skeleton } from '../components/primitives.jsx';
import { GoalDiffBars, FormDots, MiniBar } from '../components/charts.jsx';
import { FlyersMark, TeamLogo } from '../components/Logo.jsx';
import { KPI } from '../components/KPI.jsx';
import { Hero } from '../components/Hero.jsx';
import { Scoreboard } from '../components/Scoreboard.jsx';
import { Headshot } from '../components/Headshot.jsx';
import { PlayerLink } from '../components/PlayerLink.jsx';
import { SeriesTracker } from '../components/SeriesTracker.jsx';
import { HeadToHead } from '../components/HeadToHead.jsx';
import { LeagueLeaders } from '../components/LeagueLeaders.jsx';
import { ThreeStarsPanel, AwardWatchPanel, RecordsTrackerPanel } from '../components/EngagementPanels.jsx';
import { PredictionsPanel } from '../components/PredictionsPanel.jsx';

// Dashboard is laid out as a single linear flow split into named bands
// (Tonight / Season / Recent / Offense / Roster / Reference). Each band
// has a colored header rule so the user can tell at a glance *what* zone
// they are reading. Within a band, content uses internal grids — the
// permanent 8/4 split was confusing because related cards weren't always
// adjacent. KPI tiles use semantic tones (green/red/warm) so good and bad
// numbers pop without having to read the values.

// Helpers for KPI semantic coloring -------------------------------------------
const recordTone = (us) => {
  if (!us) return 'default';
  const pct = us.pts / Math.max(1, us.gp * 2);
  if (pct >= 0.6) return 'good';
  if (pct <= 0.45) return 'bad';
  return 'warm';
};
const paceTone = (pace) => pace >= 95 ? 'good' : pace >= 88 ? 'warm' : pace <= 75 ? 'bad' : 'default';
const diffTone = (diff) => diff >= 10 ? 'good' : diff <= -10 ? 'bad' : diff > 0 ? 'warm' : diff < 0 ? 'amber' : 'default';
const streakTone = (s) => !s ? 'default' : s.type === 'W' && s.count >= 3 ? 'good' : s.type === 'L' && s.count >= 3 ? 'bad' : s.type === 'W' ? 'warm' : 'amber';
const l10Tone = (w, l) => w >= 7 ? 'good' : w >= 5 ? 'warm' : l >= 7 ? 'bad' : 'amber';
const divTone = (rank) => !rank ? 'default' : rank <= 3 ? 'good' : rank >= 6 ? 'bad' : 'amber';
const ptsPctTone = (pct) => pct >= 0.6 ? 'good' : pct >= 0.5 ? 'warm' : pct <= 0.45 ? 'bad' : 'amber';

export const Dashboard = ({ schedule, standings, scoreboard, clubStats, roster, liveDetail, lastGame, leagueLeaders, loading, onOpenGame }) => {
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
  const pace = us?.gp ? Math.round((us.pts / us.gp) * 82) : null;

  const topScorers = clubStats?.skaters
    ? [...clubStats.skaters].sort((a, b) => b.pts - a.pts).slice(0, 6)
    : [];
  const lastGameGoals = lastGame?.timeline || [];

  return (
    <div className="p-3 md:p-5 space-y-4">
      {/* ─── HERO ─────────────────────────────────────────────────────────── */}
      <Hero
        liveGame={liveGame}
        liveDetail={liveDetail}
        nextGame={nextGame}
        lastResult={lastResult}
        us={us}
        recentGames={games}
        standings={standings}
      />

      {/* ─── BAND · TONIGHT ───────────────────────────────────────────────── */}
      <SectionBand
        label="Tonight"
        color="orange"
        sub={liveGame ? 'live' : nextGame ? 'next up' : 'recent'}
        count={scoreboard?.games?.length || null}
      />

      <SeriesTracker scoreboard={scoreboard} schedule={schedule} onOpenGame={onOpenGame} />

      {/* Live / Next / Latest result side-by-side */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <LiveOrNextCard
          liveGame={liveGame}
          liveDetail={liveDetail}
          nextGame={nextGame}
          onOpenGame={onOpenGame}
        />
        <LatestResultCard lastResult={lastResult} lastGame={lastGame} onOpenGame={onOpenGame} />
        <HeadToHead schedule={schedule} onOpenGame={onOpenGame} />
      </div>

      {nextGame && !liveGame && (
        <PredictionsPanel nextGame={nextGame} recentGames={games} />
      )}

      {/* ─── BAND · SEASON OVERVIEW ───────────────────────────────────────── */}
      <SectionBand label="Season Overview" color="warm" sub="2025–26 · all 82" />

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {us?.clinched === 'x' && <Chip tone="orange">● Clinched Playoff Spot</Chip>}
          {us?.clinched === 'y' && <Chip tone="amber">● Clinched Division</Chip>}
          {us?.clinched === 'z' && <Chip tone="amber">● Clinched Conference</Chip>}
          {us?.clinched === 'p' && <Chip tone="orange">● Playoff Bound</Chip>}
          {us?.clinched === 'e' && <Chip tone="red">● Eliminated</Chip>}
          {us && <span className="text-[13px] text-white/45 font-mono">{us.gp} of 82 games · 2025–26</span>}
        </div>
        <div className="flex items-center gap-2 text-[12px] font-mono text-white/40">
          <span>good</span><span className="w-2 h-2 bg-emerald-400 rounded-full" />
          <span className="ml-2">brand</span><span className="w-2 h-2 bg-[#F74902] rounded-full" />
          <span className="ml-2">caution</span><span className="w-2 h-2 bg-amber-400 rounded-full" />
          <span className="ml-2">trouble</span><span className="w-2 h-2 bg-red-400 rounded-full" />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <KPI
          label="Record"
          value={us ? `${us.w}–${us.l}${us.ot ? `–${us.ot}` : ''}` : '—'}
          sub={us ? `${us.gp} GP` : ''}
          sparkData={running.winPctArr}
          tone={recordTone(us)}
          loading={loading && !us}
        />
        <KPI
          label="Points"
          value={us?.pts ?? '—'}
          sub={us ? `${(us.pct * 100).toFixed(1)}%` : ''}
          sparkData={running.winPctArr}
          tone="warm"
          loading={loading && !us}
        />
        <KPI
          label="82-game Pace"
          value={pace ?? '—'}
          sub="pts"
          tone={pace ? paceTone(pace) : 'default'}
          loading={loading && !us}
        />
        <KPI
          label="Goal Diff"
          value={us ? `${us.diff >= 0 ? '+' : ''}${us.diff}` : '—'}
          sub="season"
          sparkData={running.diffArr}
          tone={us ? diffTone(us.diff) : 'default'}
          loading={loading && !us}
        />
        <KPI
          label="Streak"
          value={streak ? `${streak.type}${streak.count}` : '—'}
          sub={streak?.type === 'W' ? 'hot' : 'cold'}
          sparkData={running.winPctArr}
          tone={streakTone(streak)}
          loading={!streak}
        />
        <KPI
          label="Last 10"
          value={games.length ? `${l10Record.w}–${l10Record.l}` : '—'}
          sub="recent"
          sparkData={l10.map((g) => g.w ? 1 : 0).reverse()}
          tone={games.length ? l10Tone(l10Record.w, l10Record.l) : 'default'}
          loading={!games.length}
        />
        <KPI
          label="Division"
          value={us ? `#${us.divRank}` : '—'}
          sub="Metro"
          tone={us ? divTone(us.divRank) : 'default'}
          loading={!us}
        />
      </div>

      {/* ─── BAND · RECENT FORM ───────────────────────────────────────────── */}
      <SectionBand label="Recent Form" color="emerald" sub="Last 20 games" count={games.length} />

      <Section
        title="Recent Games"
        action={<span className="text-[10px] font-mono text-white/40">Last 10 · click any row</span>}
      >
        <div className="divide-y divide-white/[0.04]">
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
                  g.w ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                      : 'bg-red-500/10 text-red-300 border border-red-500/25'
                )}>{g.w ? 'W' : 'L'}</span>
                <span className="text-[12px] font-mono text-white/50 tabular-nums">{g.label}</span>
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[10px] font-mono text-white/35 uppercase shrink-0">{g.home ? 'vs' : '@'}</span>
                  <TeamLogo abbr={g.opp} size={16} />
                  <span className="text-[13px] text-white/85 truncate">{OPP_FULL[g.opp] || g.oppName}</span>
                  <span className="text-[10px] font-mono text-white/35">{g.opp}</span>
                </div>
                <div className="text-right font-mono tabular-nums text-[14px]">
                  <span className={g.w ? 'text-[#FF8A4C] font-medium' : 'text-white/80'}>{g.us}</span>
                  <span className="text-white/30 mx-1">–</span>
                  <span className={g.w ? 'text-white/50' : 'text-white/80 font-medium'}>{g.them}</span>
                </div>
                <span className={cx('text-right text-[12px] font-mono tabular-nums',
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

      <OutcomeSplitsPanel games={games} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Section title="Goal Differential · L20">
          <div className="p-4 space-y-3">
            <div className="flex items-baseline justify-between">
              <div>
                <div className={cx('text-[22px] font-semibold tabular-nums tracking-tight',
                  gf - ga > 0 ? 'text-emerald-400' : gf - ga < 0 ? 'text-red-400' : 'text-white'
                )}>
                  {gf - ga >= 0 ? '+' : ''}{gf - ga}
                </div>
                <div className="text-[10px] font-mono text-white/40 mt-0.5 uppercase">running total</div>
              </div>
              <div className="flex gap-4 text-[12px] font-mono">
                <div><div className="text-[9px] text-white/35 uppercase">GF</div><div className="text-emerald-400 tabular-nums">{gf}</div></div>
                <div><div className="text-[9px] text-white/35 uppercase">GA</div><div className="text-red-300 tabular-nums">{ga}</div></div>
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
                  <span className="text-emerald-400">{games.filter((g) => g.w).length}</span>
                  <span className="text-white/30">–</span>
                  <span className="text-red-400">{games.filter((g) => !g.w).length}</span>
                </div>
                <div className="text-[10px] font-mono text-white/40 mt-0.5 uppercase">win–loss split</div>
              </div>
              <div className="flex items-center gap-3 text-[10px] font-mono text-white/50">
                <span className="flex items-center gap-1"><span className="w-2 h-2 bg-[#F74902] rounded-sm" /> W</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 bg-white/15 rounded-sm" /> L</span>
              </div>
            </div>
            <div className="py-2">
              {games.length ? <FormDots games={games} size={13} /> : <Skeleton height={13} />}
            </div>
          </div>
        </Section>

        <SplitsPanel games={games} us={us} />
      </div>

      {/* ─── BAND · OFFENSE & SCORING ─────────────────────────────────────── */}
      <SectionBand label="Offense & Scoring" color="orange" sub="rate · top scorers · goals" />

      <ScoringPanel games={games} us={us} />

      {/* Three Stars from latest finalized game */}
      {lastGame?.stars?.length > 0 && <ThreeStarsPanel lastGame={lastGame} />}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {topScorers.length > 0 && (
          <Section title="Top Scorers · PHI" action={<span className="text-[10px] font-mono text-white/40">season</span>}>
            <div className="divide-y divide-white/[0.04]">
              {topScorers.map((p, i) => (
                <div key={p.id} className="grid grid-cols-[18px_1fr_auto] gap-2 items-center px-3 h-9 hover:bg-white/[0.02]">
                  <span className={cx('text-[10px] font-mono tabular-nums',
                    i === 0 ? 'text-amber-300 font-semibold' : i === 1 ? 'text-white/60' : i === 2 ? 'text-orange-300/70' : 'text-white/30'
                  )}>{i + 1}</span>
                  <span className="flex items-center gap-2 min-w-0">
                    <Headshot src={p.headshot} num={p.num} size={20} />
                    <PlayerLink playerId={p.id}>
                      <span className="text-[13px] truncate">{p.name}</span>
                    </PlayerLink>
                    {p.pos && <span className="text-[9px] font-mono text-white/30">{p.pos}</span>}
                  </span>
                  <span className="flex items-center gap-2 text-[10px] font-mono tabular-nums shrink-0">
                    <span className="text-emerald-400/80">{p.g}<span className="text-white/30">G</span></span>
                    <span className="text-sky-300/80">{p.a}<span className="text-white/30">A</span></span>
                    <span className="text-[13px] font-medium text-[#FF8A4C]">{p.pts}</span>
                  </span>
                </div>
              ))}
            </div>
          </Section>
        )}

        {lastGameGoals.length > 0 && (
          <Section title="Last Game · Goals" action={<span className="text-[10px] font-mono text-white/40">{lastGame?.dateLabel || ''}</span>}>
            <div className="divide-y divide-white/[0.04]">
              {lastGameGoals.slice(-6).reverse().map((g, i) => (
                <div key={i} className={cx(
                  'grid grid-cols-[40px_1fr_auto_22px] items-center gap-2 px-3 h-9',
                  g.us ? 'bg-[#F74902]/[0.04]' : '',
                )}>
                  <span className="text-[9px] font-mono text-white/40 tabular-nums">
                    P{g.period}{g.periodType === 'OT' ? ' OT' : ''}<br />
                    <span className="text-white/30">{g.time}</span>
                  </span>
                  <span className="flex items-center gap-1.5 min-w-0">
                    <Headshot playerId={g.scorerId} teamAbbrev={g.team} size={20} />
                    <PlayerLink playerId={g.scorerId}>
                      <span className={cx('text-[12px] truncate',
                        g.us ? 'text-[#FF8A4C] font-medium' : 'text-white/75'
                      )}>{g.scorer}</span>
                    </PlayerLink>
                  </span>
                  <span className="text-[10px] font-mono tabular-nums text-white/60 shrink-0">
                    <span className={g.us ? 'text-emerald-400' : 'text-white/65'}>{g.awayScore}</span>
                    <span className="text-white/25 mx-0.5">–</span>
                    <span className={g.us ? 'text-emerald-400' : 'text-white/65'}>{g.homeScore}</span>
                  </span>
                  {g.highlightUrl ? (
                    <a
                      href={`https://www.${g.highlightUrl.replace(/^https?:\/\/(www\.)?/, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Watch highlight"
                      aria-label="Watch highlight"
                      className="flex items-center justify-center w-5 h-5 rounded text-white/40 hover:text-[#FF8A4C] hover:bg-white/[0.04] transition-colors"
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                    </a>
                  ) : <span />}
                </div>
              ))}
            </div>
          </Section>
        )}

        <MilestoneWatch clubStats={clubStats} />
      </div>

      {/* League leaders panel — full-width pivot from PHI to NHL-wide. */}
      <LeagueLeaders data={leagueLeaders} />

      <RecordsTrackerPanel clubStats={clubStats} />

      <AwardWatchPanel />

      {/* ─── BAND · ROSTER & FRANCHISE ────────────────────────────────────── */}
      <SectionBand label="Roster & Franchise" color="amber" sub="young guns · honors" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <YoungGunsPanel roster={roster} clubStats={clubStats} />
        <HonorsPanel />
      </div>

      {/* ─── BAND · REFERENCE ─────────────────────────────────────────────── */}
      <SectionBand label="Reference" color="sky" sub="standings · upcoming" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StandingsPanel standings={standings} />
        <UpcomingPanel upcoming={schedule?.upcoming || []} />
      </div>

      {/* League ticker — relegated to the bottom so league-wide scores don't
          crowd Flyers content at the top of the dashboard. */}
      {scoreboard?.games?.length > 0 && (
        <div className="pt-2">
          <Scoreboard data={scoreboard} />
        </div>
      )}
    </div>
  );
};

// ─── Tonight cards ─────────────────────────────────────────────────────────

const LiveOrNextCard = ({ liveGame, liveDetail, nextGame, onOpenGame }) => {
  if (liveGame) {
    return (
      <Section title={<span className="flex items-center gap-2">Live Now <Chip tone="live" pulse>LIVE</Chip></span>}>
        <div className="p-4 space-y-3">
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
              <span className="text-[14px] font-medium">PHI</span>
            </div>
            <span className="text-[28px] font-semibold tabular-nums text-[#FF8A4C]">{liveGame.us}</span>
          </div>
          <div className="flex items-center justify-between py-1">
            <div className="flex items-center gap-2">
              <TeamLogo abbr={liveGame.opp} size={18} />
              <span className="text-[14px] text-white/70">{liveGame.oppName}</span>
            </div>
            <span className="text-[28px] font-semibold tabular-nums text-white/70">{liveGame.them}</span>
          </div>
          {liveDetail?.stats && (
            <div className="pt-3 border-t border-white/[0.05] grid grid-cols-3 gap-2 text-center">
              {liveDetail.stats.shots?.us != null && (
                <div>
                  <div className="text-[9px] font-mono text-white/40 uppercase tracking-wider">SOG</div>
                  <div className="text-[13px] font-mono tabular-nums mt-0.5">
                    <span className="text-[#FF8A4C]">{liveDetail.stats.shots.us}</span>
                    <span className="text-white/25 mx-1">·</span>
                    <span className="text-white/70">{liveDetail.stats.shots.them}</span>
                  </div>
                </div>
              )}
              {liveDetail.stats.powerPlay?.us != null && (
                <div>
                  <div className="text-[9px] font-mono text-white/40 uppercase tracking-wider">PP</div>
                  <div className="text-[13px] font-mono tabular-nums mt-0.5">
                    <span className="text-[#FF8A4C]">{liveDetail.stats.powerPlay.us}</span>
                    <span className="text-white/25 mx-1">·</span>
                    <span className="text-white/70">{liveDetail.stats.powerPlay.them}</span>
                  </div>
                </div>
              )}
              {liveDetail.stats.faceoffPct?.us != null && (
                <div>
                  <div className="text-[9px] font-mono text-white/40 uppercase tracking-wider">FO%</div>
                  <div className="text-[13px] font-mono tabular-nums mt-0.5 text-white/85">
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
    );
  }
  if (nextGame) {
    return (
      <Section title="Next Game">
        <div className="p-4 space-y-3">
          <div className="text-[12px] font-mono text-white/50">
            {fmtDateFull(nextGame.startUTC)} · {fmtTime(nextGame.startUTC)}
          </div>
          <div className="flex items-center justify-between py-1">
            <div className="flex items-center gap-2">
              <FlyersMark size={18} />
              <span className="text-[14px] font-medium">PHI</span>
            </div>
            <span className="text-[12px] font-mono text-white/40">{nextGame.home ? 'HOME' : 'AWAY'}</span>
          </div>
          <div className="flex items-center justify-between py-1">
            <div className="flex items-center gap-2">
              <TeamLogo abbr={nextGame.opp} size={18} />
              <span className="text-[14px] text-white/70">{OPP_FULL[nextGame.opp] || nextGame.oppName}</span>
            </div>
          </div>
          <div className="pt-3 border-t border-white/[0.05] text-[10px] font-mono text-white/45 flex items-center justify-between">
            <span>{nextGame.venue || '—'}</span>
            {nextGame.gameType === 3 && <Chip tone="amber">PLAYOFFS</Chip>}
          </div>
        </div>
      </Section>
    );
  }
  // No live, no scheduled next — offseason or scheduling gap. Fill the card
  // with countdowns to the next league milestones so it's not dead space.
  return <NoGameCard />;
};

// Static league milestones for offseason / scheduling-gap fallback. Dates
// are best-effort approximations for the 2025–26 → 2026–27 cycle; if the
// schedule resumes before any of these, the regular Live/Next card takes
// over and this is never shown.
const LEAGUE_MILESTONES = [
  { date: '2026-06-26', label: 'NHL Draft · Round 1' },
  { date: '2026-07-01', label: 'Free Agency Opens' },
  { date: '2026-09-21', label: 'Training Camp Opens' },
  { date: '2026-09-26', label: 'Preseason Begins' },
  { date: '2026-10-07', label: 'Regular Season Starts' },
];

const NoGameCard = () => {
  const now = Date.now();
  const upcoming = LEAGUE_MILESTONES
    .map((m) => ({ ...m, ms: new Date(m.date + 'T12:00:00Z').getTime() - now }))
    .filter((m) => m.ms > 0)
    .slice(0, 3);
  return (
    <Section title="Off Day · Looking Ahead">
      <div className="p-4 space-y-3">
        <div className="text-[12px] font-mono text-white/55">
          No live game and no scheduled next game right now. Catching breath.
        </div>
        {upcoming.length > 0 && (
          <div className="space-y-1.5 pt-2 border-t border-white/[0.05]">
            <div className="text-[10px] font-mono text-white/40 uppercase tracking-wider">Next league events</div>
            {upcoming.map((m) => {
              const days = Math.ceil(m.ms / 86400000);
              return (
                <div key={m.date} className="flex items-center justify-between gap-2">
                  <span className="text-[12px] text-white/75 truncate">{m.label}</span>
                  <span className="text-[11px] font-mono tabular-nums shrink-0">
                    <span className="text-[#FF8A4C]">{days}</span>
                    <span className="text-white/35"> day{days === 1 ? '' : 's'}</span>
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Section>
  );
};

const LatestResultCard = ({ lastResult, lastGame, onOpenGame }) => {
  if (!lastResult) {
    return (
      <Section title="Latest Result">
        <div className="px-4 py-8 text-center text-[12px] font-mono text-white/30">Season hasn't started yet.</div>
      </Section>
    );
  }
  // PHI scorers from the timeline — unique names, in score order, capped at 4.
  const phiScorers = (() => {
    const tl = lastGame?.timeline || [];
    const seen = new Set();
    const out = [];
    for (const g of tl) {
      if (!g.us) continue;
      if (seen.has(g.scorerId)) continue;
      seen.add(g.scorerId);
      out.push(g);
      if (out.length >= 4) break;
    }
    return out;
  })();

  // Period scoring breakdown (e.g., "1–0, 2–1, 1–2") — pulled from the
  // adapted lastGame.periods map { 1: [us, them], 2: [...], ... }
  const periodLine = (() => {
    if (!lastGame?.periods) return null;
    const parts = [];
    for (const k of Object.keys(lastGame.periods).sort((a, b) => a - b)) {
      const [u, t] = lastGame.periods[k];
      parts.push(`${u}–${t}`);
    }
    return parts.length ? parts.join(' · ') : null;
  })();

  const endTag =
    lastResult.lastPeriodType === 'OT' ? 'OT' :
    lastResult.lastPeriodType === 'SO' ? 'SO' :
    null;

  return (
    <Section title="Latest Result">
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <Chip tone={lastResult.w ? 'green' : 'red'}>● Final{endTag ? ` · ${endTag}` : ''} · {lastResult.w ? 'WIN' : 'LOSS'}</Chip>
          <span className="text-[10px] font-mono text-white/40">{lastResult.label}</span>
        </div>
        <div className="flex items-center justify-between py-1">
          <div className="flex items-center gap-2">
            <FlyersMark size={18} />
            <span className="text-[14px] font-medium">PHI</span>
          </div>
          <span className={cx('text-[22px] font-semibold tabular-nums',
            lastResult.w ? 'text-emerald-400' : 'text-white/55'
          )}>{lastResult.us}</span>
        </div>
        <div className="flex items-center justify-between py-1">
          <div className="flex items-center gap-2">
            <TeamLogo abbr={lastResult.opp} size={18} />
            <span className="text-[14px] text-white/70">{OPP_FULL[lastResult.opp] || lastResult.oppName}</span>
          </div>
          <span className={cx('text-[22px] font-semibold tabular-nums',
            !lastResult.w ? 'text-red-400' : 'text-white/55'
          )}>{lastResult.them}</span>
        </div>

        {/* Venue + per-period line score */}
        {(lastResult.venue || periodLine) && (
          <div className="pt-2 border-t border-white/[0.05] flex items-center justify-between text-[11px] font-mono text-white/50">
            <span className="truncate">{lastResult.home ? '' : '@ '}{lastResult.venue || ''}</span>
            {periodLine && <span className="tabular-nums text-white/65">{periodLine}</span>}
          </div>
        )}

        {/* PHI scorers */}
        {phiScorers.length > 0 && (
          <div className="pt-2 border-t border-white/[0.05]">
            <div className="text-[10px] font-mono text-white/40 uppercase tracking-wider mb-1.5">PHI Goals</div>
            <div className="flex flex-wrap gap-1.5">
              {phiScorers.map((g) => (
                <span key={`${g.scorerId}-${g.time}`}
                  className="inline-flex items-center gap-1 px-2 h-6 rounded-md bg-[#F74902]/10 border border-[#F74902]/25 text-[11px] font-mono text-[#FF8A4C]">
                  <span className="text-[#F74902]">●</span>
                  <span className="truncate max-w-[120px]">{g.scorer}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Open game tape link */}
        <div className="pt-2 border-t border-white/[0.05] flex items-center justify-between text-[11px] font-mono">
          <span className="text-white/40">{lastResult.home ? 'HOME' : 'AWAY'}</span>
          <button
            onClick={() => onOpenGame?.(lastResult.id)}
            className="text-[#FF8A4C] hover:text-white transition-colors"
          >
            open game tape →
          </button>
        </div>
      </div>
    </Section>
  );
};

// ─── Auxiliary panels ──────────────────────────────────────────────────────

const SplitsPanel = ({ games, us }) => {
  const home = games.filter((g) => g.home);
  const away = games.filter((g) => !g.home);
  const otGames = games.filter((g) => g.lastPeriodType === 'OT' || g.lastPeriodType === 'SO');
  const oneGoal = games.filter((g) => Math.abs(g.us - g.them) === 1);
  const wl = (arr) => `${arr.filter((g) => g.w).length}–${arr.filter((g) => !g.w).length}`;
  const winPct = (arr) => arr.length ? (arr.filter((g)=>g.w).length / arr.length) : null;
  const toneFor = (pct) => pct == null ? 'text-white/55' : pct >= 0.6 ? 'text-emerald-400' : pct >= 0.5 ? 'text-[#FF8A4C]' : pct >= 0.4 ? 'text-amber-300' : 'text-red-400';
  const rows = [
    { l: 'Home',          v: wl(home),    pct: winPct(home),    sub: home.length    ? `${(winPct(home) * 100).toFixed(0)}%` : '—' },
    { l: 'Away',          v: wl(away),    pct: winPct(away),    sub: away.length    ? `${(winPct(away) * 100).toFixed(0)}%` : '—' },
    { l: 'Last 10',       v: us ? `${us.l10W ?? '—'}–${us.l10L ?? '—'}` : '—', pct: us?.l10W != null && us?.l10L != null ? us.l10W / Math.max(1, us.l10W + us.l10L) : null, sub: 'recent' },
    { l: 'OT / SO',       v: wl(otGames), pct: winPct(otGames), sub: `${otGames.length} games` },
    { l: '1-goal games',  v: wl(oneGoal), pct: winPct(oneGoal), sub: `${oneGoal.length} games` },
    { l: 'Streak',        v: us?.streak || '—', pct: null, sub: 'current', highlight: us?.streak?.[0] === 'W' ? 'good' : us?.streak?.[0] === 'L' ? 'bad' : null },
  ];
  return (
    <Section title="Splits" action={<span className="text-[10px] font-mono text-white/40">{games.length} GP</span>}>
      <div className="divide-y divide-white/[0.04]">
        {rows.map((r) => (
          <div key={r.l} className="grid grid-cols-[1fr_auto_60px] items-center gap-2 px-3.5 h-8">
            <span className="text-[12px] text-white/55">{r.l}</span>
            <span className={cx('text-[13px] font-mono tabular-nums',
              r.highlight === 'good' ? 'text-emerald-400'
              : r.highlight === 'bad' ? 'text-red-400'
              : toneFor(r.pct)
            )}>{r.v}</span>
            <span className="text-[10px] font-mono text-white/35 text-right">{r.sub}</span>
          </div>
        ))}
      </div>
    </Section>
  );
};

// Mini-standings on the dashboard with Metro / East / League tabs. Each view
// pulls a different slice from the adapted standings ({ metro, east, all }).
// Metro shows top 8 with a 3/3 playoff-line color split (top 3 emerald,
// bottom 2 red, middle amber). East/League just show top 10 with no color
// split since "playoff line" is more nuanced beyond the division.
const StandingsPanel = ({ standings }) => {
  const [tab, setTab] = useState('metro');
  const tabs = [
    { id: 'metro', l: 'Metro' },
    { id: 'east',  l: 'East' },
    { id: 'all',   l: 'NHL' },
  ];
  const rows = (() => {
    if (tab === 'metro') return (standings?.metro || []).slice(0, 8);
    if (tab === 'east')  return (standings?.east  || []).slice(0, 10);
    return (standings?.all || []).slice(0, 10);
  })();
  const usIdx = rows.findIndex((t) => t.us);
  const max = rows[0]?.w || 1;

  return (
    <Section
      title={tab === 'metro' ? 'Metro Standings' : tab === 'east' ? 'Eastern Conference' : 'NHL · League'}
      action={
        <div className="flex items-center gap-0.5 p-0.5 border border-white/[0.08] rounded-md bg-white/[0.02]">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={cx('px-2.5 h-6 text-[10px] font-mono font-medium rounded-[3px] transition-colors',
                tab === t.id ? 'bg-white/[0.08] text-white' : 'text-white/45 hover:text-white/85'
              )}>{t.l}</button>
          ))}
        </div>
      }
    >
      <div className="divide-y divide-white/[0.04]">
        {!rows.length && Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="px-3.5 h-7 flex items-center"><Skeleton className="w-full" height={10} /></div>
        ))}
        {rows.map((t, i) => {
          const isMetro = tab === 'metro';
          const inPlayoffs = isMetro ? i < 3 : false;
          const outOfPlayoffs = isMetro ? i >= 6 : false;
          return (
            <div key={t.abbr} className={cx(
              'grid grid-cols-[20px_36px_1fr_auto] gap-2 items-center px-3.5 h-7',
              t.us ? 'bg-[#F74902]/[0.06]' : 'hover:bg-white/[0.02]',
            )}>
              <span className={cx('text-[10px] font-mono tabular-nums',
                t.us ? 'text-[#FF8A4C] font-semibold'
                  : inPlayoffs ? 'text-emerald-400/80'
                  : outOfPlayoffs ? 'text-red-400/70'
                  : 'text-white/45'
              )}>{i + 1}</span>
              <span className="text-[12px] font-mono font-medium text-white/75">{t.abbr}</span>
              <MiniBar
                value={t.w}
                max={max}
                color={t.us ? '#F74902' : inPlayoffs ? '#10B981' : outOfPlayoffs ? '#EF4444' : '#666'}
                h={3}
              />
              <span className="text-[12px] font-mono tabular-nums text-white/60 shrink-0">{t.w}–{t.l}</span>
            </div>
          );
        })}
      </div>
      {tab !== 'metro' && usIdx === -1 && (standings?.us) && (
        <div className="px-3.5 py-2 border-t border-white/[0.04] text-[10px] font-mono text-white/40 flex items-center justify-between">
          <span>PHI rank</span>
          <span className="text-white/65 tabular-nums">
            #{tab === 'east' ? standings.us.confRank : (standings.all?.findIndex((t) => t.us) ?? -1) + 1 || '—'}
          </span>
        </div>
      )}
    </Section>
  );
};

const UpcomingPanel = ({ upcoming }) => {
  if (!upcoming?.length) {
    return (
      <Section title="Upcoming">
        <div className="px-4 py-6 text-center text-[12px] font-mono text-white/30">
          No scheduled games.
        </div>
      </Section>
    );
  }
  return (
    <Section title="Upcoming" action={<span className="text-[10px] font-mono text-white/40">next {Math.min(upcoming.length, 8)}</span>}>
      <div className="divide-y divide-white/[0.04]">
        {upcoming.slice(0, 8).map((g) => (
          <div key={g.id} className="grid grid-cols-[60px_1fr_auto] items-center gap-2 px-3.5 h-8">
            <span className="text-[10px] font-mono text-sky-300/80 tabular-nums">{fmtDate(g.startUTC)}</span>
            <span className="flex items-center gap-2 min-w-0">
              <span className="text-[10px] font-mono text-white/35 shrink-0">{g.home ? 'vs' : '@'}</span>
              <TeamLogo abbr={g.opp} size={14} />
              <span className="text-[12px] text-white/80 truncate">{OPP_FULL[g.opp] || g.oppName}</span>
            </span>
            <span className="text-[10px] font-mono text-white/45 tabular-nums">{fmtTime(g.startUTC)}</span>
          </div>
        ))}
      </div>
    </Section>
  );
};

// Margin and end-state breakdowns. Computed from the schedule games array
// so no extra fetch — we just reduce by victory margin and ending period.
// Two rows of tiles: by-margin (1G / 2G / 3+G W-L), by-end-state (REG / OT
// / SO W-L). Each cell color-coded so wins read green and losses red.
const OutcomeSplitsPanel = ({ games }) => {
  if (!games?.length) return null;

  const margin = (g) => Math.abs(g.us - g.them);
  const isOT = (g) => g.lastPeriodType === 'OT';
  const isSO = (g) => g.lastPeriodType === 'SO';
  const isREG = (g) => !isOT(g) && !isSO(g);

  const split = (filterFn) => {
    const sub = games.filter(filterFn);
    return {
      w: sub.filter((g) => g.w).length,
      l: sub.filter((g) => !g.w).length,
      n: sub.length,
    };
  };

  // Longest current win/loss streak across the L20 (chronological scan).
  const streaks = (() => {
    if (!games.length) return { maxW: 0, maxL: 0 };
    let maxW = 0; let maxL = 0; let curW = 0; let curL = 0;
    // games is newest-first; iterate chronologically (oldest → newest).
    [...games].reverse().forEach((g) => {
      if (g.w) { curW++; curL = 0; if (curW > maxW) maxW = curW; }
      else { curL++; curW = 0; if (curL > maxL) maxL = curL; }
    });
    return { maxW, maxL };
  })();

  const oneGoal = split((g) => margin(g) === 1);
  const twoGoal = split((g) => margin(g) === 2);
  const threePlus = split((g) => margin(g) >= 3);
  const reg = split(isREG);
  const ot = split(isOT);
  const so = split(isSO);
  const highScore = split((g) => g.us + g.them >= 7);
  const lowScore = split((g) => g.us + g.them <= 3);

  const Tile = ({ l, sub, w, l_, accent, n }) => (
    <div className="bg-[#0A0A0A] px-3 py-3 border-r border-b border-white/[0.04]">
      <div className="flex items-center justify-between gap-1">
        <div className="text-[9px] font-mono text-white/40 uppercase tracking-wider">{l}</div>
        {n != null && <div className="text-[9px] font-mono text-white/30 tabular-nums">{n}G</div>}
      </div>
      <div className="flex items-baseline gap-1.5 mt-1">
        <span className={cx('text-[18px] font-semibold tabular-nums tracking-tight',
          accent === 'good' ? 'text-emerald-400'
          : accent === 'bad' ? 'text-red-400'
          : 'text-white'
        )}>{w}</span>
        <span className="text-[13px] font-mono text-white/30">–</span>
        <span className="text-[14px] font-mono tabular-nums text-white/55">{l_}</span>
      </div>
      {sub && <div className="text-[9px] font-mono text-white/30 mt-0.5">{sub}</div>}
    </div>
  );

  return (
    <Section
      title="Outcome Splits"
      action={<span className="text-[10px] font-mono text-white/40">L{games.length} · margin · end-state</span>}
    >
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-white/[0.04]">
        <Tile l="1-Goal Games"  w={oneGoal.w}   l_={oneGoal.l}   n={oneGoal.n}   accent={oneGoal.w > oneGoal.l ? 'good' : oneGoal.w < oneGoal.l ? 'bad' : null} />
        <Tile l="2-Goal Games"  w={twoGoal.w}   l_={twoGoal.l}   n={twoGoal.n}   accent={twoGoal.w > twoGoal.l ? 'good' : twoGoal.w < twoGoal.l ? 'bad' : null} />
        <Tile l="3+ Goal Games" w={threePlus.w} l_={threePlus.l} n={threePlus.n} accent={threePlus.w > threePlus.l ? 'good' : threePlus.w < threePlus.l ? 'bad' : null} />
        <Tile l="High Score 7+" w={highScore.w} l_={highScore.l} n={highScore.n} sub="combined goals" />
        <Tile l="Regulation"    w={reg.w}       l_={reg.l}       n={reg.n}       accent={reg.w > reg.l ? 'good' : reg.w < reg.l ? 'bad' : null} />
        <Tile l="Overtime"      w={ot.w}        l_={ot.l}        n={ot.n}        accent={ot.n === 0 ? null : ot.w >= ot.l ? 'good' : 'bad'} />
        <Tile l="Shootout"      w={so.w}        l_={so.l}        n={so.n}        accent={so.n === 0 ? null : so.w >= so.l ? 'good' : 'bad'} />
        <Tile l="Low Score ≤3"  w={lowScore.w}  l_={lowScore.l}  n={lowScore.n}  sub="defensive grinds" />
      </div>
      <div className="px-4 py-2.5 border-t border-white/[0.05] flex items-center gap-5 text-[10px] font-mono">
        <span className="text-white/40 uppercase tracking-wider">Streaks</span>
        <span className="flex items-center gap-1.5">
          <span className="text-white/35">longest W</span>
          <span className="text-emerald-400 font-semibold tabular-nums">{streaks.maxW}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="text-white/35">longest L</span>
          <span className="text-red-400 font-semibold tabular-nums">{streaks.maxL}</span>
        </span>
      </div>
    </Section>
  );
};

const ScoringPanel = ({ games, us }) => {
  if (!games.length) return null;
  const gf = games.reduce((a, g) => a + g.us, 0);
  const ga = games.reduce((a, g) => a + g.them, 0);
  const gpf = (gf / games.length).toFixed(2);
  const gpa = (ga / games.length).toFixed(2);
  const shutoutsFor = games.filter((g) => g.them === 0).length;
  const shutoutsAg  = games.filter((g) => g.us === 0).length;
  const blowouts    = games.filter((g) => Math.abs(g.us - g.them) >= 3).length;
  const comebacks   = games.filter((g) => g.w && g.them >= 3).length;

  const tiles = [
    { l: 'GF / Game',      v: gpf,                                       color: '#10B981' },
    { l: 'GA / Game',      v: gpa,                                       color: '#EF4444' },
    { l: 'Goal Diff',      v: us ? `${us.diff >= 0 ? '+' : ''}${us.diff}` : '—', color: (us?.diff ?? 0) >= 0 ? '#10B981' : '#EF4444' },
    { l: 'Points %',       v: us ? `${(us.pct * 100).toFixed(1)}%` : '—',  color: us ? (us.pct >= 0.6 ? '#10B981' : us.pct >= 0.5 ? '#F74902' : us.pct >= 0.4 ? '#F59E0B' : '#EF4444') : '#888' },
    { l: 'Shutouts For',   v: shutoutsFor,                               color: '#10B981' },
    { l: 'Shutouts Ag.',   v: shutoutsAg,                                color: '#EF4444' },
    { l: '3+ Goal Wins',   v: blowouts,                                  color: '#FF8A4C' },
    { l: 'Comebacks',      v: comebacks, sub: 'won down 3+',             color: '#A78BFA' },
  ];
  return (
    <Section title="Scoring & Rate Stats" action={<span className="text-[10px] font-mono text-white/40">season</span>}>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-white/[0.05]">
        {tiles.map((t) => (
          <div key={t.l} className="bg-[#0A0A0A] px-3 py-3">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: t.color }} />
              <span className="text-[9px] font-mono text-white/40 uppercase tracking-wider">{t.l}</span>
            </div>
            <div className="text-[20px] font-semibold tabular-nums tracking-tight mt-1" style={{ color: t.color }}>
              {t.v}
            </div>
            {t.sub && <div className="text-[9px] font-mono text-white/30 mt-0.5">{t.sub}</div>}
          </div>
        ))}
      </div>
    </Section>
  );
};

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
  if (!list.length) {
    return (
      <Section title="Milestone Watch" action={<span className="text-[10px] font-mono text-white/40">approaching</span>}>
        <div className="px-4 py-6 text-center text-[12px] font-mono text-white/30">No close milestones.</div>
      </Section>
    );
  }
  return (
    <Section title="Milestone Watch" action={<span className="text-[10px] font-mono text-white/40">approaching</span>}>
      <div className="divide-y divide-white/[0.04]">
        {list.slice(0, 6).map((m) => (
          <div key={`${m.id}-${m.abbr}`} className="grid grid-cols-[1fr_auto] items-center gap-2 px-3 h-9">
            <span className="flex items-center gap-2 min-w-0">
              <Headshot src={m.headshot} num={m.num} size={20} />
              <PlayerLink playerId={m.id}>
                <span className="text-[13px] truncate">{m.name}</span>
              </PlayerLink>
            </span>
            <span className="flex items-baseline gap-1 text-[10px] font-mono tabular-nums shrink-0">
              <span className="text-white/55">{m.current}</span>
              <span className="text-white/25">→</span>
              <span className="text-emerald-400 font-medium">{m.target}</span>
              <span className="text-[9px] text-white/40 ml-1">{m.abbr}</span>
              <span className="text-[9px] text-white/35 ml-1">·</span>
              <span className="text-[10px] text-amber-300/85">{m.away} away</span>
            </span>
          </div>
        ))}
      </div>
    </Section>
  );
};

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
                <span className="text-[13px] truncate">{p.name}</span>
              </PlayerLink>
              <span className="text-[9px] font-mono text-amber-300/70 shrink-0">{p.pos} · {p.age}</span>
            </span>
            <span className="flex items-baseline gap-1 text-[10px] font-mono tabular-nums shrink-0">
              {p.sk ? (
                <>
                  <span className="text-white/55">{p.sk.gp ?? 0}<span className="text-white/30">GP</span></span>
                  <span className="text-emerald-400/80 ml-1">{p.sk.g ?? 0}<span className="text-white/30">G</span></span>
                  <span className="text-sky-300/80 ml-1">{p.sk.a ?? 0}<span className="text-white/30">A</span></span>
                  <span className="text-[13px] text-[#FF8A4C] font-medium ml-1">{p.sk.pts ?? 0}</span>
                </>
              ) : p.g ? (
                <>
                  <span className="text-white/55">{p.g.gp ?? 0}<span className="text-white/30">GP</span></span>
                  <span className="text-emerald-400/80 font-medium ml-1">{p.g.w ?? 0}<span className="text-white/30 font-normal">W</span></span>
                  <span className="text-sky-300/80 ml-1">{p.g.savePct ?? '—'}<span className="text-white/30">%</span></span>
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
          <div className="text-[10px] font-mono text-amber-300/70 uppercase tracking-wider mb-1.5">Stanley Cups</div>
          <div className="flex items-center gap-2">
            {cups.map((c) => (
              <div key={c.year} className="flex-1 border border-amber-500/30 bg-amber-500/[0.06] rounded-md px-3 py-2">
                <div className="text-[18px] font-semibold tabular-nums tracking-tight text-amber-300">{c.year}</div>
                <div className="text-[10px] font-mono text-white/55 mt-0.5">def. {c.vs} · {c.result}</div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="text-[10px] font-mono text-[#FF8A4C]/80 uppercase tracking-wider mb-1.5">Retired Numbers</div>
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
