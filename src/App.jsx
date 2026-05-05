import { useState, useEffect, useMemo, useCallback, lazy, Suspense } from 'react';

import { TEAM_ABBR, SEASON, POLL, isLive, isFuture } from './config.js';
import { useNHL, useClockTick } from './api.js';
import { PlayerCtx } from './context.js';
import { useRoute, navigate, setOverlay, pageHref, gameHref } from './router.js';
import {
  adaptSchedule, adaptStandings, adaptGame,
  adaptPlayByPlay, adaptBracket, adaptRoster, adaptClubStats, adaptScoreboard,
} from './adapters.js';

import { Sidebar } from './components/Sidebar.jsx';
import { Topbar } from './components/Topbar.jsx';
import { Statusbar } from './components/Statusbar.jsx';
import { ErrorBoundary } from './components/ErrorBoundary.jsx';
import { PlayerModal } from './components/PlayerModal.jsx';
import { CommandPalette } from './components/CommandPalette.jsx';
import { SeriesModal } from './components/SeriesModal.jsx';
import { useGoalHorn, useGoalHornEnabled } from './components/GoalHorn.jsx';

// Page-level code splitting — each route ships in its own chunk so the first
// paint only includes the Dashboard. Named exports get unwrapped via .then.
const Dashboard = lazy(() => import('./pages/Dashboard.jsx').then((m) => ({ default: m.Dashboard })));
const Schedule  = lazy(() => import('./pages/Schedule.jsx').then((m) => ({ default: m.Schedule })));
const Standings = lazy(() => import('./pages/Standings.jsx').then((m) => ({ default: m.Standings })));
const GameTape  = lazy(() => import('./pages/GameTape.jsx').then((m) => ({ default: m.GameTape })));
const Playoffs  = lazy(() => import('./pages/Playoffs.jsx').then((m) => ({ default: m.Playoffs })));
const Roster    = lazy(() => import('./pages/Roster.jsx').then((m) => ({ default: m.Roster })));
const PlayerProfile = lazy(() => import('./pages/PlayerProfile.jsx').then((m) => ({ default: m.PlayerProfile })));

export default function App() {
  // Route-derived state — URL is the source of truth. /game/123, ?player=8478,
  // ?series=A all survive refresh and become shareable links.
  const { page, gameId: routeGameId, profileId, playerId, seriesLetter } = useRoute();
  const [paletteOpen, setPaletteOpen] = useState(false);

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
      const map = {
        '1': 'dashboard', '2': 'schedule', '3': 'standings',
        '4': 'game', '5': 'playoffs', '6': 'roster',
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

  // Live play-by-play — only fetched when on the Game Tape page (saves quota).
  const pbpPath = (page === 'game' && gameId) ? `v1/gamecenter/${gameId}/play-by-play` : null;
  const pbpRaw = useNHL(pbpPath, (d) => isLive(d?.gameState) ? POLL.live / 2 : POLL.idle);
  const pbp = useMemo(() => adaptPlayByPlay(pbpRaw.data), [pbpRaw.data]);

  // Playoff bracket — only fetched when on Playoffs page.
  const bracketPath = page === 'playoffs' ? 'v1/playoff-bracket/2026' : null;
  const bracketRaw = useNHL(bracketPath, POLL.standings);
  const bracket = useMemo(() => adaptBracket(bracketRaw.data), [bracketRaw.data]);

  // Roster + club stats — fetched on Roster (full table) and Dashboard (Young
  // Guns + Top Scorers panels). Roster has a 1h CDN TTL so this is cheap.
  const rosterPath = (page === 'roster' || page === 'dashboard') ? `v1/roster/${TEAM_ABBR}/current` : null;
  const rosterRaw = useNHL(rosterPath, POLL.standings);
  const roster = useMemo(() => adaptRoster(rosterRaw.data), [rosterRaw.data]);
  const clubStatsPath = (page === 'roster' || page === 'dashboard') ? `v1/club-stats/${TEAM_ABBR}/now` : null;
  const clubStatsRaw = useNHL(clubStatsPath, POLL.standings);
  const clubStats = useMemo(() => adaptClubStats(clubStatsRaw.data), [clubStatsRaw.data]);

  // Sidebar team summary (combines record + clinch + streak).
  const teamCombined = useMemo(() => {
    if (!standings.us) return null;
    return {
      w: standings.us.w, l: standings.us.l, ot: standings.us.ot,
      gp: standings.us.gp, pts: standings.us.pts, pct: standings.us.pct,
      divRank: standings.us.divRank, confRank: standings.us.confRank,
      clinched: standings.us.clinched, diff: standings.us.diff,
      streak: standings.us.streak,
    };
  }, [standings.us]);

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
    <div className="min-h-screen bg-[#0A0A0A] text-white/90 relative">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700&family=Geist+Mono:wght@400;500;600&display=swap');
        html, body { background: #0A0A0A; }
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
        /* Sticky table headers sit just below the 48px Topbar. */
        thead.sticky th { position: sticky; top: 48px; background: rgba(10,10,12,0.92); z-index: 1; backdrop-filter: blur(6px); }
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
          lastFetch={lastFetch}
          error={anyError}
          refresh={refresh}
        />

        <div className="flex-1 min-w-0 flex flex-col min-h-screen">
          <Topbar
            page={page}
            setPage={setPage}
            liveGame={schedule.liveGame}
            lastFetch={lastFetch}
            error={anyError}
            onOpenPalette={() => setPaletteOpen(true)}
          />

          <main
            key={page}
            className="flex-1 min-w-0"
            style={{ animation: 'fadeIn 0.25s ease-out' }}
          >
            <ErrorBoundary resetKey={page}>
              <Suspense fallback={
                <div className="p-6 text-[12px] font-mono text-white/35">loading…</div>
              }>
                {page === 'dashboard' && <Dashboard schedule={schedule} standings={standings} scoreboard={scoreboard} clubStats={clubStats} roster={roster} liveDetail={isLive(boxscore.data?.gameState) ? game : null} lastGame={game} loading={scheduleRaw.loading || standingsRaw.loading} onOpenGame={openGame} />}
                {page === 'schedule'  && <Schedule schedule={schedule} onOpenGame={openGame} />}
                {page === 'standings' && <Standings standings={standings} />}
                {page === 'game'      && <GameTape game={game} loading={boxscore.loading} pbp={pbp} pbpRaw={pbpRaw.data} customGameId={routeGameId} onClearCustom={clearSelectedGame} />}
                {page === 'playoffs'  && <Playoffs bracket={bracket} onOpenSeries={onOpenSeries} />}
                {page === 'roster'    && <Roster roster={roster} clubStats={clubStats} />}
                {page === 'player'    && <PlayerProfile playerId={profileId} />}
              </Suspense>
            </ErrorBoundary>
          </main>

          <Statusbar lastFetch={lastFetch} error={anyError} refresh={refresh} />
        </div>
      </div>

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
    </div>
    </PlayerCtx.Provider>
  );
}
