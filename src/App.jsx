import { useState, useEffect, useMemo, useCallback, lazy, Suspense } from 'react';

import { TEAM_ABBR, SEASON, POLL, isLive, isFuture } from './config.js';
import { useNHL, useClockTick } from './api.js';
import { PlayerCtx } from './context.js';
import {
  adaptSchedule, adaptStandings, adaptGame,
  adaptPlayByPlay, adaptBracket, adaptRoster, adaptClubStats,
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

export default function App() {
  const [page, setPage] = useState('dashboard');
  const [selectedGameId, setSelectedGameId] = useState(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [activePlayerId, setActivePlayerId] = useState(null);
  const [activeSeriesLetter, setActiveSeriesLetter] = useState(null);
  const playerCtx = useMemo(() => ({
    open: (id) => setActivePlayerId(id),
    close: () => setActivePlayerId(null),
  }), []);

  useClockTick(1000);

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
      if (map[e.key]) setPage(map[e.key]);
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

  // Pick game ID for Game Tape: explicit selection (clicked from a list) wins,
  // otherwise live game, otherwise most recent finished.
  const gameId = selectedGameId || schedule.liveGame?.id || schedule.games[0]?.id || null;

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

  // Roster + club stats — only fetched when on Roster page.
  const rosterPath = page === 'roster' ? `v1/roster/${TEAM_ABBR}/current` : null;
  const rosterRaw = useNHL(rosterPath, POLL.standings);
  const roster = useMemo(() => adaptRoster(rosterRaw.data), [rosterRaw.data]);
  const clubStatsPath = page === 'roster' ? `v1/club-stats/${TEAM_ABBR}/now` : null;
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

  const openGame = useCallback((id) => {
    setSelectedGameId(id);
    setPage('game');
  }, []);
  const clearSelectedGame = useCallback(() => setSelectedGameId(null), []);

  return (
    <PlayerCtx.Provider value={playerCtx}>
    <div className="min-h-screen bg-[#08090C] text-white/90 relative">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700&family=Geist+Mono:wght@400;500;600&display=swap');
        html, body { background: #08090C; }
        * { font-family: 'Geist', system-ui, -apple-system, sans-serif; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
        .font-mono, code, kbd { font-family: 'Geist Mono', ui-monospace, SF Mono, monospace !important; }
        .tabular-nums { font-variant-numeric: tabular-nums; }
        body {
          background:
            radial-gradient(ellipse 50% 30% at 100% 0%, rgba(120,140,180,0.04), transparent 65%),
            radial-gradient(ellipse 40% 25% at 0% 100%, rgba(255,255,255,0.02), transparent 65%),
            #08090C;
          background-attachment: fixed;
        }
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
                {page === 'dashboard' && <Dashboard schedule={schedule} standings={standings} loading={scheduleRaw.loading || standingsRaw.loading} onOpenGame={openGame} />}
                {page === 'schedule'  && <Schedule schedule={schedule} onOpenGame={openGame} />}
                {page === 'standings' && <Standings standings={standings} />}
                {page === 'game'      && <GameTape game={game} loading={boxscore.loading} pbp={pbp} pbpRaw={pbpRaw.data} customGameId={selectedGameId} onClearCustom={clearSelectedGame} />}
                {page === 'playoffs'  && <Playoffs bracket={bracket} onOpenSeries={setActiveSeriesLetter} />}
                {page === 'roster'    && <Roster roster={roster} clubStats={clubStats} />}
              </Suspense>
            </ErrorBoundary>
          </main>

          <Statusbar lastFetch={lastFetch} error={anyError} refresh={refresh} />
        </div>
      </div>

      <PlayerModal playerId={activePlayerId} onClose={playerCtx.close} />
      <SeriesModal letter={activeSeriesLetter} onClose={() => setActiveSeriesLetter(null)} />
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
