import { useState, useEffect, useMemo, useCallback, lazy, Suspense } from 'react';
import { SpeedInsights } from '@vercel/speed-insights/react';

import { TEAM_ABBR, SEASON, POLL, PLAYOFF_YEAR, UPCOMING_DRAFT_YEAR, PRIOR_DRAFT_YEAR, isLive, isFuture } from './config.js';
import { useNHL, useClockTick } from './api.js';
import { PlayerCtx } from './context.js';
import { useRoute, navigate, setOverlay, pageHref, gameHref } from './router.js';
import {
  adaptSchedule, adaptStandings, adaptGame,
  adaptPlayByPlay, adaptBracket, adaptRoster, adaptClubStats, adaptScoreboard,
  adaptLeagueLeaders, adaptProspects, adaptDraftPicks,
  adaptDraftRankings, adaptMonthSchedule,
} from './adapters.js';

import { Sidebar } from './components/Sidebar.jsx';
import { Topbar } from './components/Topbar.jsx';
import { Statusbar } from './components/Statusbar.jsx';
import { ErrorBoundary } from './components/ErrorBoundary.jsx';
import { PlayerModal } from './components/PlayerModal.jsx';
import { CommandPalette } from './components/CommandPalette.jsx';
import { InstallPrompt } from './components/InstallPrompt.jsx';
import { SeriesModal } from './components/SeriesModal.jsx';
import { LiveRibbon } from './components/LiveRibbon.jsx';
import { MobileBottomNav } from './components/MobileBottomNav.jsx';
import { useGoalHorn, useGoalHornEnabled } from './components/GoalHorn.jsx';
import { useGoalNotifications, useGoalNotificationsEnabled } from './components/GoalNotifications.jsx';

// Page-level code splitting — each route ships in its own chunk so the first
// paint only includes the Dashboard. Named exports get unwrapped via .then.
//
// `lazyPage` wraps React.lazy so a chunk-fetch failure (stale index.html
// pointing at a hashed JS file the CDN no longer serves after a redeploy)
// triggers a one-time hard reload instead of crashing into the ErrorBoundary.
const lazyPage = (importer, name) => lazy(async () => {
  try {
    const m = await importer();
    return { default: m[name] };
  } catch (err) {
    const msg = String(err?.message || err || '');
    const stale = /Failed to fetch dynamically imported module|Importing a module script failed|ChunkLoadError|error loading dynamically imported module/i.test(msg);
    if (stale && typeof window !== 'undefined') {
      const FLAG = 'flyersfan.chunk-reload-at';
      const last = Number(sessionStorage.getItem(FLAG) || 0);
      if (Date.now() - last > 10_000) {
        sessionStorage.setItem(FLAG, String(Date.now()));
        window.location.reload();
        return { default: () => null }; // placeholder during reload
      }
    }
    throw err;
  }
});

const Dashboard = lazyPage(() => import('./pages/Dashboard.jsx'), 'Dashboard');
const Schedule  = lazyPage(() => import('./pages/Schedule.jsx'),  'Schedule');
const Standings = lazyPage(() => import('./pages/Standings.jsx'), 'Standings');
const GameTape  = lazyPage(() => import('./pages/GameTape.jsx'),  'GameTape');
const Playoffs  = lazyPage(() => import('./pages/Playoffs.jsx'),  'Playoffs');
const Roster    = lazyPage(() => import('./pages/Roster.jsx'),    'Roster');
const PlayerProfile = lazyPage(() => import('./pages/PlayerProfile.jsx'), 'PlayerProfile');
const PlayerCompare = lazyPage(() => import('./pages/PlayerCompare.jsx'), 'PlayerCompare');
const Trends   = lazyPage(() => import('./pages/Trends.jsx'),   'Trends');
const Coaches  = lazyPage(() => import('./pages/Coaches.jsx'),  'Coaches');
const Draft    = lazyPage(() => import('./pages/Draft.jsx'),    'Draft');
const Records  = lazyPage(() => import('./pages/Records.jsx'),  'Records');
const OnIce    = lazyPage(() => import('./pages/OnIce.jsx'),    'OnIce');
const Goalies  = lazyPage(() => import('./pages/Goalies.jsx'),  'Goalies');

export default function App() {
  // Route-derived state — URL is the source of truth. /game/123, ?player=8478,
  // ?series=A all survive refresh and become shareable links.
  const { page, gameId: routeGameId, profileId, playerId, seriesLetter } = useRoute();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);

  const setPage = useCallback((p) => navigate(pageHref(p)), []);
  const playerCtx = useMemo(() => ({
    open: (id) => setOverlay('player', id),
    close: () => setOverlay('player', null),
  }), []);

  useClockTick(1000);

  // Per-page document title — meaningful tabs and history entries.
  useEffect(() => {
    const titles = {
      dashboard: 'flyers.fan',
      schedule: 'Schedule · flyers.fan',
      standings: 'Standings · flyers.fan',
      game: 'Game Tape · flyers.fan',
      playoffs: 'Playoffs · flyers.fan',
      roster: 'Roster · flyers.fan',
      player: 'Player · flyers.fan',
      compare: 'Compare · flyers.fan',
      trends: 'Trends · flyers.fan',
      coaches: 'Coaches · flyers.fan',
      draft: 'Draft Rankings · flyers.fan',
      records: 'Records · flyers.fan',
      'on-ice': 'On Ice · flyers.fan',
      goalies: 'Goalies · flyers.fan',
    };
    document.title = titles[page] || 'flyers.fan';
  }, [page]);

  useEffect(() => {
    const h = (e) => {
      // Cmd+K / Ctrl+K opens the command palette regardless of focus.
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen(true);
        return;
      }
      if (e.metaKey || e.ctrlKey) return;
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      // Keep this in sync with NAV_ITEMS kbd properties in nav.js.
      const map = {
        '1': 'dashboard', '2': 'on-ice', '3': 'game',
        '4': 'schedule', '5': 'standings', '6': 'playoffs',
        '7': 'roster', '8': 'compare', '9': 'trends', '0': 'coaches',
      };
      if (map[e.key]) navigate(pageHref(map[e.key]));
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  // Schedule — interval speeds up when a game is live or close.
  const scheduleRaw = useNHL(`v1/club-schedule-season/${TEAM_ABBR}/${SEASON}`, (d) => {
    if (!d?.games) return POLL.idle;
    const hasLive = d.games.some((g) => isLive(g.gameState));
    if (hasLive) return POLL.live;
    const soon = d.games.some((g) => {
      if (!isFuture(g.gameState)) return false;
      const t = new Date(g.startTimeUTC).getTime();
      const diff = t - Date.now();
      return diff > 0 && diff < 30 * 60 * 1000;
    });
    return soon ? POLL.near : POLL.idle;
  });
  const schedule = useMemo(() => adaptSchedule(scheduleRaw.data), [scheduleRaw.data]);

  // Standings — lower cadence.
  const standingsRaw = useNHL('v1/standings/now', POLL.standings);
  const standings = useMemo(() => adaptStandings(standingsRaw.data), [standingsRaw.data]);

  // Around-the-league scoreboard — only fetched on Dashboard. Polls on POLL.live
  // when any game is live so scores stay fresh.
  const scoreboardPath = page === 'dashboard' ? 'v1/score/now' : null;
  const scoreboardRaw = useNHL(scoreboardPath, (d) => {
    const games = d?.games || [];
    return games.some((g) => isLive(g.gameState)) ? POLL.live : POLL.near;
  });
  const scoreboard = useMemo(() => adaptScoreboard(scoreboardRaw.data), [scoreboardRaw.data]);

  // Pick game ID for Game Tape: explicit selection (URL /game/:id) wins,
  // otherwise live game, otherwise most recent finished.
  const gameId = routeGameId || schedule.liveGame?.id || schedule.games[0]?.id || null;

  const boxscore = useNHL(gameId ? `v1/gamecenter/${gameId}/boxscore` : null,
    (d) => (d && isLive(d.gameState)) ? POLL.live : POLL.idle);
  const rightRail = useNHL(gameId ? `v1/gamecenter/${gameId}/right-rail` : null,
    (d) => (boxscore.data && isLive(boxscore.data.gameState)) ? POLL.live : POLL.idle);
  const landing = useNHL(gameId ? `v1/gamecenter/${gameId}/landing` : null,
    (d) => (boxscore.data && isLive(boxscore.data.gameState)) ? POLL.live : POLL.idle);

  const game = useMemo(
    () => adaptGame(boxscore.data, rightRail.data, landing.data),
    [boxscore.data, rightRail.data, landing.data]
  );

  // Goal horn — fires when the live game's goal timeline grows.
  const hornOn = useGoalHornEnabled();
  useGoalHorn(game?.timeline, hornOn);

  // Browser desktop notifications for PHI goals — independent toggle.
  const notifyOn = useGoalNotificationsEnabled();
  useGoalNotifications(game?.timeline, notifyOn);

  // Live play-by-play — only fetched when on the Game Tape page (saves quota).
  const pbpPath = (page === 'game' && gameId) ? `v1/gamecenter/${gameId}/play-by-play` : null;
  const pbpRaw = useNHL(pbpPath, (d) => isLive(d?.gameState) ? POLL.live / 2 : POLL.idle);
  const pbp = useMemo(() => adaptPlayByPlay(pbpRaw.data), [pbpRaw.data]);

  // Playoff bracket — only fetched when on Playoffs page.
  const bracketPath = page === 'playoffs' ? `v1/playoff-bracket/${PLAYOFF_YEAR}` : null;
  const bracketRaw = useNHL(bracketPath, POLL.standings);
  const bracket = useMemo(() => adaptBracket(bracketRaw.data), [bracketRaw.data]);

  // Roster — fetched on every page so the sidebar can render the full team
  // list (cheap with 1h CDN TTL). Club stats stay scoped to pages that
  // actually surface them.
  const rosterPath = `v1/roster/${TEAM_ABBR}/current`;
  const rosterRaw = useNHL(rosterPath, POLL.standings);
  const roster = useMemo(() => adaptRoster(rosterRaw.data), [rosterRaw.data]);
  const clubStatsPath = (page === 'roster' || page === 'dashboard' || page === 'goalies') ? `v1/club-stats/${TEAM_ABBR}/now` : null;
  const clubStatsRaw = useNHL(clubStatsPath, POLL.standings);
  const clubStats = useMemo(() => adaptClubStats(clubStatsRaw.data), [clubStatsRaw.data]);

  // League leaders — split across multiple categories so we paginate each
  // and merge. Pulled on Dashboard only. Updates slowly, so the standings
  // poll cadence is plenty.
  const onDash = page === 'dashboard';
  const llSkaterPts  = useNHL(onDash ? 'v1/skater-stats-leaders/current?categories=points&limit=5' : null, POLL.standings);
  const llSkaterG    = useNHL(onDash ? 'v1/skater-stats-leaders/current?categories=goals&limit=5' : null, POLL.standings);
  const llSkaterA    = useNHL(onDash ? 'v1/skater-stats-leaders/current?categories=assists&limit=5' : null, POLL.standings);
  const llSkaterPM   = useNHL(onDash ? 'v1/skater-stats-leaders/current?categories=plusMinus&limit=5' : null, POLL.standings);
  const llGoalieSV   = useNHL(onDash ? 'v1/goalie-stats-leaders/current?categories=savePctg&limit=5' : null, POLL.standings);
  const llGoalieGAA  = useNHL(onDash ? 'v1/goalie-stats-leaders/current?categories=goalsAgainstAverage&limit=5' : null, POLL.standings);
  const llGoalieWins = useNHL(onDash ? 'v1/goalie-stats-leaders/current?categories=wins&limit=5' : null, POLL.standings);
  const leagueLeaders = useMemo(() => adaptLeagueLeaders([
    llSkaterPts.data, llSkaterG.data, llSkaterA.data, llSkaterPM.data,
    llGoalieSV.data, llGoalieGAA.data, llGoalieWins.data,
  ]), [llSkaterPts.data, llSkaterG.data, llSkaterA.data, llSkaterPM.data, llGoalieSV.data, llGoalieGAA.data, llGoalieWins.data]);

  // Prospects — only fetched on Roster page. Cached aggressively (1h TTL).
  const prospectsPath = page === 'roster' ? `v1/prospects/${TEAM_ABBR}` : null;
  const prospectsRaw = useNHL(prospectsPath, POLL.standings);
  const prospects = useMemo(() => adaptProspects(prospectsRaw.data), [prospectsRaw.data]);

  // Recent draft (current year R1 + R2). Light enough to grab on Roster page
  // for a "Recent draft picks" panel. Filtered down to PHI selections.
  const draftYear = PRIOR_DRAFT_YEAR;
  const draftR1 = useNHL(page === 'roster' ? `v1/draft/picks/${draftYear}/1` : null, POLL.standings);
  const draftR2 = useNHL(page === 'roster' ? `v1/draft/picks/${draftYear}/2` : null, POLL.standings);
  const draftPicks = useMemo(() => {
    const r1 = adaptDraftPicks(draftR1.data, TEAM_ABBR) || [];
    const r2 = adaptDraftPicks(draftR2.data, TEAM_ABBR) || [];
    return [...r1, ...r2];
  }, [draftR1.data, draftR2.data]);

  // Draft rankings — pre-draft NHL Central Scouting list. Four categories,
  // fetched only when the Draft tab is active. Cheap CDN cache (rankings
  // refresh midterm + final per year).
  const onDraft = page === 'draft';
  const drYear = UPCOMING_DRAFT_YEAR;
  const drNAS = useNHL(onDraft ? `v1/draft/rankings/${drYear}/1` : null, POLL.standings);
  const drIS  = useNHL(onDraft ? `v1/draft/rankings/${drYear}/2` : null, POLL.standings);
  const drNAG = useNHL(onDraft ? `v1/draft/rankings/${drYear}/3` : null, POLL.standings);
  const drIG  = useNHL(onDraft ? `v1/draft/rankings/${drYear}/4` : null, POLL.standings);
  const draftRankings = useMemo(
    () => adaptDraftRankings([drNAS.data, drIS.data, drNAG.data, drIG.data]),
    [drNAS.data, drIS.data, drNAG.data, drIG.data],
  );

  // Month schedule for the Calendar view on the Schedule page. Fetched only
  // when calendar view is active — Schedule already pulls the full season
  // by default, so this is opt-in.
  const monthSchedRaw = useNHL(page === 'schedule' ? `v1/club-schedule/${TEAM_ABBR}/month/now` : null, POLL.standings);
  const monthSchedule = useMemo(() => adaptMonthSchedule(monthSchedRaw.data), [monthSchedRaw.data]);

  // Sidebar team summary (combines record + clinch + streak). Streak is
  // recomputed from the schedule games array because the standings endpoint
  // freezes its streakCode at the regular-season finale — during playoffs
  // it would happily report "W3" while the team is dropping playoff games.
  // Schedule.games includes playoff results, so the derived streak stays
  // honest year-round.
  const teamCombined = useMemo(() => {
    if (!standings.us) return null;
    let streak = standings.us.streak;
    const games = schedule.games || [];
    if (games.length > 0) {
      const type = games[0].w;
      let n = 0;
      for (const g of games) {
        if (g.w === type) n++;
        else break;
      }
      streak = `${type ? 'W' : 'L'}${n}`;
    }
    return {
      w: standings.us.w, l: standings.us.l, ot: standings.us.ot,
      gp: standings.us.gp, pts: standings.us.pts, pct: standings.us.pct,
      divRank: standings.us.divRank, confRank: standings.us.confRank,
      clinched: standings.us.clinched, diff: standings.us.diff,
      streak,
    };
  }, [standings.us, schedule.games]);

  // Most recent refresh timestamp across all feeds.
  const lastFetch = Math.max(
    scheduleRaw.lastFetch || 0,
    standingsRaw.lastFetch || 0,
    boxscore.lastFetch || 0
  ) || null;
  const anyError = scheduleRaw.error || standingsRaw.error;

  // useCallback's deps must be stable refs to keep the memo useful — pull
  // each .refresh out so the deps aren't whole hook-return objects.
  const scheduleRefresh = scheduleRaw.refresh;
  const standingsRefresh = standingsRaw.refresh;
  const boxscoreRefresh = boxscore.refresh;
  const rightRailRefresh = rightRail.refresh;
  const landingRefresh = landing.refresh;
  const refresh = useCallback(() => {
    scheduleRefresh();
    standingsRefresh();
    boxscoreRefresh();
    rightRailRefresh();
    landingRefresh();
  }, [scheduleRefresh, standingsRefresh, boxscoreRefresh, rightRailRefresh, landingRefresh]);

  const openGame = useCallback((id) => navigate(gameHref(id)), []);
  const clearSelectedGame = useCallback(() => navigate(gameHref(null)), []);
  const onOpenSeries = useCallback((letter) => setOverlay('series', letter), []);
  const closeSeries = useCallback(() => setOverlay('series', null), []);

  return (
    <PlayerCtx.Provider value={playerCtx}>
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:px-3 focus:py-1.5 focus:bg-[#F74902] focus:text-black focus:rounded-md focus:text-[12px] focus:font-medium"
    >
      Skip to main content
    </a>
    <div
      className="min-h-screen bg-[#0A0A0A] text-white/90 relative"
      style={{ '--header-offset': schedule.liveGame && page !== 'game' ? '84px' : '48px' }}
    >
      {/* Page-top Flyers watermark — only on the dashboard. Other pages
          stay on a flat charcoal surface with no logo wash so dense data
          panels (Game Tape, Trends, Roster, etc.) read cleaner. */}
      {page === 'dashboard' && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-[420px] overflow-hidden select-none z-0"
        >
          <img
            src="https://assets.nhle.com/logos/nhl/svg/PHI_dark.svg"
            alt=""
            className="absolute left-1/2 -translate-x-1/2 -top-[100px] w-[1100px] max-w-[140vw] h-[640px] object-contain"
            style={{
              opacity: 0.05,
              filter: 'grayscale(1) brightness(1.7) contrast(0.9) blur(0.5px)',
              maskImage: 'radial-gradient(ellipse 70% 60% at 50% 40%, black 30%, transparent 80%)',
              WebkitMaskImage: 'radial-gradient(ellipse 70% 60% at 50% 40%, black 30%, transparent 80%)',
            }}
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
        </div>
      )}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700&family=Geist+Mono:wght@400;500;600&display=swap');
        html, body { background: #0A0A0A; color-scheme: dark; }
        select option { background: #0E0E0E; color: rgba(255,255,255,0.85); }
        select optgroup { background: #0A0A0A; color: rgba(255,255,255,0.45); font-weight: 500; }
        * { font-family: 'Geist', system-ui, -apple-system, sans-serif; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
        .font-mono, code, kbd { font-family: 'Geist Mono', ui-monospace, SF Mono, monospace !important; }
        .tabular-nums { font-variant-numeric: tabular-nums; }
        /* Flat neutral charcoal — no color tints, no radial gradients. Matches
           the sidebar/topbar surface so panels disappear into the background
           without seams. Any colored overlay shifts perception (blue → navy,
           orange → brown), so we keep it pure. */
        body { background: #0A0A0A; background-attachment: fixed; }
        ::selection { background: #F74902; color: #000; }
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.06); border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.12); }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulseRow { 0% { background-color: rgba(247,73,2,0.18); } 100% { background-color: transparent; } }
        .pulse-row { animation: pulseRow 1.4s ease-out; }
        @keyframes scoreFlash {
          0%   { color: #FF8A4C; transform: scale(1.18); }
          60%  { color: #FF8A4C; transform: scale(1.05); }
          100% { transform: scale(1); }
        }
        .score-flash { animation: scoreFlash 0.7s ease-out; }
        /* Sticky table headers sit just below the Topbar. The offset is
           48px (Topbar) by default, 84px when the LiveRibbon is showing. */
        thead.sticky th { position: sticky; top: var(--header-offset, 48px); background: rgba(10,10,12,0.92); z-index: 1; backdrop-filter: blur(6px); }
        /* A11y — visible focus ring for keyboard nav, mouse clicks stay clean. */
        :focus { outline: none; }
        :focus-visible { outline: 2px solid #FF8A4C; outline-offset: 2px; border-radius: 3px; }
        button:focus-visible, a:focus-visible, [role="button"]:focus-visible { outline: 2px solid #FF8A4C; outline-offset: 2px; }
        /* Respect users who opt out of motion. */
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after { animation-duration: 0.001ms !important; animation-iteration-count: 1 !important; transition-duration: 0.001ms !important; scroll-behavior: auto !important; }
        }
      `}</style>

      <div className="flex">
        <Sidebar
          page={page}
          setPage={setPage}
          team={teamCombined}
          liveGame={schedule.liveGame}
          metro={standings.metro}
          roster={roster}
          lastFetch={lastFetch}
          error={anyError}
          refresh={refresh}
          mobileOpen={navOpen}
          onCloseMobile={() => setNavOpen(false)}
        />

        <div className="flex-1 min-w-0 flex flex-col min-h-screen pb-14 sm:pb-0">
          <Topbar
            page={page}
            liveGame={schedule.liveGame}
            lastFetch={lastFetch}
            error={anyError}
            onOpenPalette={() => setPaletteOpen(true)}
            onOpenNav={() => setNavOpen(true)}
          />

          <LiveRibbon
            liveGame={schedule.liveGame}
            liveDetail={isLive(boxscore.data?.gameState) ? game : null}
            currentPage={page}
            onOpenGame={openGame}
          />

          <main
            id="main-content"
            tabIndex={-1}
            key={page}
            className="flex-1 min-w-0 outline-none"
            style={{ animation: 'fadeIn 0.25s ease-out' }}
          >
            <ErrorBoundary resetKey={page}>
              <Suspense fallback={
                <div className="p-6 text-[12px] font-mono text-white/35">loading…</div>
              }>
                {page === 'dashboard' && <Dashboard schedule={schedule} standings={standings} scoreboard={scoreboard} clubStats={clubStats} roster={roster} liveDetail={isLive(boxscore.data?.gameState) ? game : null} lastGame={game} leagueLeaders={leagueLeaders} loading={scheduleRaw.loading || standingsRaw.loading} onOpenGame={openGame} />}
                {page === 'schedule'  && <Schedule schedule={schedule} monthSchedule={monthSchedule} onOpenGame={openGame} scoreboard={scoreboard} standings={standings} leagueLeaders={leagueLeaders} />}
                {page === 'standings' && <Standings standings={standings} />}
                {page === 'game'      && <GameTape game={game} loading={boxscore.loading} pbp={pbp} pbpRaw={pbpRaw.data} customGameId={routeGameId} onClearCustom={clearSelectedGame} />}
                {page === 'playoffs'  && <Playoffs bracket={bracket} onOpenSeries={onOpenSeries} />}
                {page === 'roster'    && <Roster roster={roster} clubStats={clubStats} prospects={prospects} draftPicks={draftPicks} />}
                {page === 'player'    && <PlayerProfile playerId={profileId} />}
                {page === 'compare'   && <PlayerCompare schedule={schedule} />}
                {page === 'trends'    && <Trends schedule={schedule} standings={standings} roster={roster} />}
                {page === 'coaches'   && <Coaches />}
                {page === 'draft'     && <Draft rankings={draftRankings} loading={drNAS.loading} />}
                {page === 'records'   && <Records />}
                {page === 'on-ice'    && <OnIce game={game} gameId={gameId} />}
                {page === 'goalies'   && <Goalies clubStats={clubStats} schedule={schedule} />}
              </Suspense>
            </ErrorBoundary>
          </main>

          <Statusbar lastFetch={lastFetch} error={anyError} refresh={refresh} />
        </div>
      </div>

      <MobileBottomNav
        page={page}
        setPage={setPage}
        onOpenMore={() => setNavOpen(true)}
        liveGame={schedule.liveGame}
      />

      <PlayerModal playerId={playerId} onClose={playerCtx.close} />
      <SeriesModal letter={seriesLetter} onClose={closeSeries} />
      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        setPage={setPage}
        schedule={schedule}
        roster={roster}
        clubStats={clubStats}
        onOpenGame={openGame}
        onOpenPlayer={playerCtx.open}
      />
      {/* Vercel Speed Insights — Core Web Vitals beacon. Renders nothing
          visible; ships LCP/CLS/INP measurements to Vercel for the
          performance dashboard once the deploy is live. */}
      <SpeedInsights />
      <InstallPrompt />
    </div>
    </PlayerCtx.Provider>
  );
}
