import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  LayoutDashboard, Calendar, Trophy, Clipboard, Search,
  ArrowUp, ArrowDown, Minus, ChevronRight, Circle,
  Activity, Wifi, WifiOff, Command, Home, Plane, Flame,
  RefreshCw, MoreHorizontal, AlertCircle, Zap,
} from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════
   CONFIG
   ═══════════════════════════════════════════════════════════════ */

const TEAM_ABBR = 'PHI';
const SEASON = '20252026';

// Poll intervals (ms). Adjust if you want more or less chatter.
const POLL = {
  live: 10_000,       // when a game is in progress
  near: 30_000,       // when a game is within 30 min or just ended
  idle: 60_000,       // everything else
  standings: 300_000, // standings change slowly
};

// Proxy path. You'll deploy /api/nhl alongside this app.
// It forwards requests to https://api-web.nhle.com/ (see api/nhl.js).
const API = (path) => `/api/nhl?path=${encodeURIComponent(path)}`;

/* ═══════════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════════ */

const cx = (...a) => a.filter(Boolean).join(' ');

const OPP_FULL = {
  MTL: 'Montreal Canadiens', CAR: 'Carolina Hurricanes', WPG: 'Winnipeg Jets',
  DET: 'Detroit Red Wings', NJD: 'New Jersey Devils', NJ: 'New Jersey Devils',
  BOS: 'Boston Bruins', NYI: 'New York Islanders', WSH: 'Washington Capitals',
  DAL: 'Dallas Stars', CHI: 'Chicago Blackhawks', CBJ: 'Columbus Blue Jackets',
  SJS: 'San Jose Sharks', SJ: 'San Jose Sharks', LAK: 'LA Kings', LA: 'LA Kings',
  ANA: 'Anaheim Ducks', MIN: 'Minnesota Wild', NYR: 'New York Rangers',
  PIT: 'Pittsburgh Penguins', TBL: 'Tampa Bay Lightning', FLA: 'Florida Panthers',
  TOR: 'Toronto Maple Leafs', BUF: 'Buffalo Sabres', OTT: 'Ottawa Senators',
  COL: 'Colorado Avalanche', VGK: 'Vegas Golden Knights', EDM: 'Edmonton Oilers',
  CGY: 'Calgary Flames', SEA: 'Seattle Kraken', STL: 'St. Louis Blues',
  NSH: 'Nashville Predators', UTA: 'Utah Mammoth', VAN: 'Vancouver Canucks',
  PHI: 'Philadelphia Flyers',
};

const GAME_LIVE_STATES = ['LIVE', 'CRIT'];
const GAME_FINAL_STATES = ['OFF', 'FINAL'];
const GAME_FUTURE_STATES = ['FUT', 'PRE'];

const isLive = (s) => GAME_LIVE_STATES.includes(s);
const isFinal = (s) => GAME_FINAL_STATES.includes(s);
const isFuture = (s) => GAME_FUTURE_STATES.includes(s);

const fmtDate = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};
const fmtDateFull = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
};
const fmtTime = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
};
const fmtRelative = (ts) => {
  if (!ts) return '—';
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 5) return 'just now';
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
};

/* ═══════════════════════════════════════════════════════════════
   DATA HOOK
   ═══════════════════════════════════════════════════════════════ */

// Polls an NHL endpoint. Auto-pauses when tab is hidden.
// intervalFn can be a number or a function that returns the current interval
// based on the latest data (used to speed up during live games).
function useNHL(path, intervalFn) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [lastFetch, setLastFetch] = useState(null);
  const [loading, setLoading] = useState(true);
  const dataRef = useRef(data);
  dataRef.current = data;

  const fetchOnce = useCallback(async () => {
    if (!path) return;
    try {
      const r = await fetch(API(path), { headers: { Accept: 'application/json' } });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const d = await r.json();
      setData(d);
      setLastFetch(Date.now());
      setError(null);
    } catch (e) {
      setError(e.message || 'fetch failed');
    } finally {
      setLoading(false);
    }
  }, [path]);

  useEffect(() => {
    let cancelled = false;
    let timer;

    const tick = async () => {
      if (cancelled) return;
      if (document.visibilityState === 'visible') {
        await fetchOnce();
      }
      if (cancelled) return;
      const interval = typeof intervalFn === 'function' ? intervalFn(dataRef.current) : intervalFn;
      if (interval && interval > 0) {
        timer = setTimeout(tick, interval);
      }
    };

    tick();

    const onVis = () => {
      if (document.visibilityState === 'visible') fetchOnce();
    };
    document.addEventListener('visibilitychange', onVis);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVis);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path]);

  return { data, error, lastFetch, loading, refresh: fetchOnce };
}

// Ticks every second so relative-time labels stay fresh.
function useClockTick(ms = 1000) {
  const [, setN] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setN((n) => n + 1), ms);
    return () => clearInterval(t);
  }, [ms]);
}

/* ═══════════════════════════════════════════════════════════════
   ADAPTERS — shape raw NHL payloads into what the UI expects
   ═══════════════════════════════════════════════════════════════ */

// schedule → array of games (newest first), Flyers perspective
function adaptSchedule(raw) {
  if (!raw?.games) return { games: [], nextGame: null, liveGame: null, team: null };
  const finished = [];
  let nextGame = null;
  let liveGame = null;

  for (const g of raw.games) {
    const isHome = g.homeTeam.abbrev === TEAM_ABBR;
    const us = isHome ? g.homeTeam : g.awayTeam;
    const them = isHome ? g.awayTeam : g.homeTeam;

    const common = {
      id: g.id,
      date: g.gameDate,
      startUTC: g.startTimeUTC,
      state: g.gameState,
      gameType: g.gameType, // 2 = reg, 3 = playoffs
      home: isHome,
      opp: them.abbrev,
      oppName: them.placeName?.default ? `${them.placeName.default} ${them.commonName?.default || ''}`.trim() : them.abbrev,
      venue: g.venue?.default,
      periodType: g.periodDescriptor?.periodType,
      lastPeriodType: g.gameOutcome?.lastPeriodType,
    };

    if (isLive(g.gameState)) {
      liveGame = { ...common, us: us.score ?? 0, them: them.score ?? 0 };
    } else if (isFinal(g.gameState)) {
      const usScore = us.score ?? 0;
      const themScore = them.score ?? 0;
      finished.push({
        ...common,
        us: usScore,
        them: themScore,
        w: usScore > themScore,
        label: fmtDate(g.gameDate),
      });
    } else if (isFuture(g.gameState) && !nextGame) {
      nextGame = { ...common, us: null, them: null };
    }
  }

  // Newest first
  finished.sort((a, b) => b.date.localeCompare(a.date));

  return {
    games: finished,
    nextGame,
    liveGame,
    team: {
      gp: finished.length,
      wins: finished.filter((g) => g.w).length,
      losses: finished.filter((g) => !g.w).length,
    },
  };
}

// standings → { metro, east, league, us }
function adaptStandings(raw) {
  if (!raw?.standings) return { metro: [], east: [], us: null };
  const all = raw.standings.map((t) => ({
    team: `${t.placeName?.default || ''} ${t.teamCommonName?.default || ''}`.trim() || t.teamName?.default,
    abbr: t.teamAbbrev?.default,
    w: t.wins,
    l: t.losses,
    ot: t.otLosses,
    gp: t.gamesPlayed,
    pts: t.points,
    pct: t.pointPctg,
    gf: t.goalFor,
    ga: t.goalAgainst,
    diff: t.goalDifferential,
    l10W: t.l10Wins,
    l10L: t.l10Losses,
    streak: t.streakCode && t.streakCount ? `${t.streakCode}${t.streakCount}` : null,
    division: t.divisionName,
    conference: t.conferenceName,
    clinched: t.clinchIndicator, // 'x', 'p', 'y', 'z', 'e'
    divRank: t.divisionSequence,
    confRank: t.conferenceSequence,
    leagueRank: t.leagueSequence,
    us: t.teamAbbrev?.default === TEAM_ABBR,
  }));
  const metro = all.filter((t) => t.division === 'Metropolitan').sort((a, b) => a.divRank - b.divRank);
  const east  = all.filter((t) => t.conference === 'Eastern').sort((a, b) => a.confRank - b.confRank);
  const us = all.find((t) => t.us);
  return { metro, east, all, us };
}

// boxscore + right-rail → shape for Game Tape page
function adaptGame(boxscore, rightRail, landing) {
  if (!boxscore) return null;
  const isHome = boxscore.homeTeam.abbrev === TEAM_ABBR;
  const us = isHome ? boxscore.homeTeam : boxscore.awayTeam;
  const them = isHome ? boxscore.awayTeam : boxscore.homeTeam;
  const usSide = isHome ? 'home' : 'away';
  const themSide = isHome ? 'away' : 'home';

  // Team stat comparison from right-rail
  const ts = {};
  if (rightRail?.teamGameStats) {
    for (const s of rightRail.teamGameStats) {
      ts[s.category] = { away: s.awayValue, home: s.homeValue };
    }
  }
  const stat = (cat) => {
    if (!ts[cat]) return { us: null, them: null };
    return { us: ts[cat][usSide], them: ts[cat][themSide] };
  };

  // Skater stats
  const skaters = [];
  if (boxscore.playerByGameStats?.[`${usSide}Team`]) {
    const t = boxscore.playerByGameStats[`${usSide}Team`];
    [...(t.forwards || []), ...(t.defense || [])].forEach((p) => {
      skaters.push({
        name: p.name?.default,
        num: p.sweaterNumber,
        pos: p.position,
        g: p.goals || 0,
        a: p.assists || 0,
        pts: p.points || 0,
        sog: p.sog || 0,
        hits: p.hits || 0,
        blk: p.blockedShots || 0,
        pm: p.plusMinus || 0,
        toi: p.toi || '—',
      });
    });
  }
  skaters.sort((a, b) => (b.pts - a.pts) || (b.sog - a.sog));

  // Scoring by period from landing
  const periods = {};
  if (landing?.summary?.scoring) {
    landing.summary.scoring.forEach((p) => {
      const num = p.periodDescriptor?.number;
      if (!num) return;
      let uGoals = 0, tGoals = 0;
      (p.goals || []).forEach((g) => {
        if (g.teamAbbrev?.default === TEAM_ABBR) uGoals++;
        else tGoals++;
      });
      periods[num] = [uGoals, tGoals];
    });
  }

  // Three stars
  const stars = landing?.summary?.threeStars || [];

  return {
    id: boxscore.id,
    state: boxscore.gameState,
    date: boxscore.gameDate,
    dateLabel: fmtDateFull(boxscore.gameDate),
    home: isHome,
    oppAbbr: them.abbrev,
    oppName: them.placeName?.default ? `${them.placeName.default} ${them.commonName?.default || ''}`.trim() : them.abbrev,
    usAbbr: us.abbrev,
    score: { us: us.score ?? 0, them: them.score ?? 0 },
    sog: { us: us.sog ?? null, them: them.sog ?? null },
    periods,
    clock: boxscore.clock,
    periodDescriptor: boxscore.periodDescriptor,
    stats: {
      shots: stat('sog'),
      faceoffPct: (() => {
        const s = stat('faceoffWinningPctg');
        return { us: s.us != null ? +(s.us * 100).toFixed(1) : null, them: s.them != null ? +(s.them * 100).toFixed(1) : null };
      })(),
      hits: stat('hits'),
      blocks: stat('blockedShots'),
      pim: stat('pim'),
      giveaways: stat('giveaways'),
      takeaways: stat('takeaways'),
    },
    skaters,
    stars,
  };
}

/* ═══════════════════════════════════════════════════════════════
   PRIMITIVES
   ═══════════════════════════════════════════════════════════════ */

const Kbd = ({ children }) => (
  <kbd className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 border border-white/10 bg-white/[0.03] text-white/50 text-[10px] font-mono rounded-[3px] leading-none">
    {children}
  </kbd>
);

const Chip = ({ children, tone = 'default', pulse = false }) => {
  const tones = {
    default: 'border-white/10 bg-white/[0.02] text-white/65',
    orange:  'border-[#F74902]/40 bg-[#F74902]/10 text-[#FF8A4C]',
    green:   'border-emerald-500/30 bg-emerald-500/[0.08] text-emerald-400',
    red:     'border-red-500/30 bg-red-500/[0.08] text-red-400',
    amber:   'border-amber-500/30 bg-amber-500/[0.08] text-amber-400',
    muted:   'border-white/[0.06] text-white/40',
    live:    'border-red-500/50 bg-red-500/15 text-red-300',
  };
  return (
    <span className={cx(
      'inline-flex items-center gap-1 px-1.5 py-[2px] border text-[10px] font-mono leading-none rounded-[3px]',
      tones[tone],
    )}>
      {pulse && <span className="relative flex h-1.5 w-1.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75" />
        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-current" />
      </span>}
      {children}
    </span>
  );
};

const Label = ({ children, className = '' }) => (
  <div className={cx('text-[10px] font-mono tracking-[0.06em] uppercase text-white/40', className)}>{children}</div>
);

const Section = ({ title, action, children, className = '' }) => (
  <div className={cx('border border-white/[0.06] bg-[#0C0C0C]/60 rounded-md backdrop-blur-sm', className)}>
    {(title || action) && (
      <div className="flex items-center justify-between px-4 h-10 border-b border-white/[0.05]">
        <span className="text-[11px] font-medium text-white/80 tracking-tight">{title}</span>
        {action}
      </div>
    )}
    {children}
  </div>
);

const Delta = ({ value, suffix = '', neutral = false }) => {
  const isUp = value > 0, isDown = value < 0;
  const color = neutral ? 'text-white/50' : isUp ? 'text-emerald-400' : isDown ? 'text-red-400' : 'text-white/50';
  const Icon = isUp ? ArrowUp : isDown ? ArrowDown : Minus;
  return (
    <span className={cx('inline-flex items-center gap-0.5 text-[11px] font-mono tabular-nums', color)}>
      <Icon size={10} strokeWidth={2.5} />
      {Math.abs(value)}{suffix}
    </span>
  );
};

const Skeleton = ({ className = '', height = 20 }) => (
  <div
    className={cx('rounded-[3px] bg-white/[0.04] animate-pulse', className)}
    style={{ height }}
  />
);

/* ═══════════════════════════════════════════════════════════════
   CHARTS
   ═══════════════════════════════════════════════════════════════ */

const Sparkline = ({ data, w = 120, h = 28, stroke = '#F74902' }) => {
  if (!data || data.length < 2) return <div style={{ height: h }} />;
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => [
    (i / (data.length - 1)) * w,
    h - 2 - ((v - min) / range) * (h - 4),
  ]);
  const path = pts.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(' ');
  const area = `${path} L${w},${h} L0,${h} Z`;
  const id = useMemo(() => `sg${Math.random().toString(36).slice(2, 8)}`, []);
  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="block">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.22" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} />
      <path d={path} fill="none" stroke={stroke} strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r={2} fill={stroke} />
    </svg>
  );
};

const GoalDiffBars = ({ games, h = 56 }) => {
  const diffs = [...games].reverse().map((g) => g.us - g.them);
  const maxAbs = Math.max(1, ...diffs.map(Math.abs));
  const bw = 100 / Math.max(1, diffs.length);
  return (
    <svg width="100%" height={h} viewBox={`0 0 100 ${h}`} preserveAspectRatio="none">
      <line x1="0" y1={h / 2} x2="100" y2={h / 2} stroke="rgba(255,255,255,0.08)" strokeDasharray="1 2" />
      {diffs.map((d, i) => {
        const barH = (Math.abs(d) / maxAbs) * (h / 2 - 3);
        const y = d >= 0 ? h / 2 - barH : h / 2;
        return (
          <rect
            key={i}
            x={i * bw + 0.3} y={y}
            width={bw - 0.6} height={Math.max(barH, 1)}
            fill={d > 0 ? '#F74902' : d < 0 ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.1)'}
          />
        );
      })}
    </svg>
  );
};

const FormDots = ({ games, size = 8 }) => (
  <div className="flex gap-[3px]">
    {[...games].reverse().map((g, i) => (
      <div
        key={i}
        title={`${g.label} · ${g.w ? 'W' : 'L'} ${g.home ? 'vs' : '@'} ${g.opp} ${g.us}-${g.them}`}
        className={cx('shrink-0', g.w ? 'bg-[#F74902]' : 'bg-white/15')}
        style={{ width: size, height: size, borderRadius: 1 }}
      />
    ))}
  </div>
);

const MiniBar = ({ value, max, color = '#F74902', h = 4 }) => (
  <div className="relative bg-white/[0.04] w-full" style={{ height: h }}>
    <div
      className="absolute inset-y-0 left-0 transition-all duration-500"
      style={{ width: `${Math.min(100, (value / max) * 100)}%`, background: color }}
    />
  </div>
);

/* ═══════════════════════════════════════════════════════════════
   LOGO
   ═══════════════════════════════════════════════════════════════ */

const FlyersMark = ({ size = 18 }) => (
  <div
    className="relative flex items-center justify-center shrink-0 bg-[#F74902] text-black font-black"
    style={{
      width: size, height: size,
      transform: 'skewX(-8deg)',
      fontSize: size * 0.65, fontFamily: 'Geist, sans-serif',
      borderRadius: 2, lineHeight: 1,
    }}
  >
    <span style={{ transform: 'skewX(8deg)' }}>P</span>
  </div>
);

/* ═══════════════════════════════════════════════════════════════
   GLOBAL STATUS — live across all pages
   ═══════════════════════════════════════════════════════════════ */

const connStatus = (lastFetch, error) => {
  if (error) return { tone: 'red', label: 'disconnected' };
  if (!lastFetch) return { tone: 'amber', label: 'connecting' };
  const age = (Date.now() - lastFetch) / 1000;
  if (age < 90) return { tone: 'green', label: 'live' };
  if (age < 300) return { tone: 'amber', label: 'stale' };
  return { tone: 'red', label: 'stale' };
};

/* ═══════════════════════════════════════════════════════════════
   SIDEBAR
   ═══════════════════════════════════════════════════════════════ */

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, kbd: '1' },
  { id: 'schedule',  label: 'Schedule',  icon: Calendar,        kbd: '2' },
  { id: 'standings', label: 'Standings', icon: Trophy,          kbd: '3' },
  { id: 'game',      label: 'Game Tape', icon: Clipboard,       kbd: '4' },
];

const Sidebar = ({ page, setPage, team, liveGame, metro, lastFetch, error }) => {
  const status = connStatus(lastFetch, error);
  const streak = team?.streak;

  return (
    <aside className="hidden lg:flex flex-col w-[244px] shrink-0 h-screen sticky top-0 border-r border-white/[0.06] bg-[#0A0A0A]/80 backdrop-blur-md">
      <div className="h-12 px-4 flex items-center justify-between border-b border-white/[0.05]">
        <div className="flex items-center gap-2">
          <FlyersMark size={20} />
          <div className="flex items-baseline gap-1">
            <span className="text-[13px] font-semibold tracking-tight">flyers</span>
            <span className="text-[13px] text-[#F74902] font-semibold">.fan</span>
          </div>
        </div>
        <button className="text-white/30 hover:text-white/70 transition-colors"><MoreHorizontal size={14} /></button>
      </div>

      <div className="px-3 py-3 border-b border-white/[0.05]">
        <button className="w-full group flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-white/[0.03] transition-colors">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-5 h-5 bg-gradient-to-br from-[#F74902] to-[#A82E00] rounded-sm flex items-center justify-center shrink-0">
              <span className="text-[9px] font-bold text-black font-mono">PHI</span>
            </div>
            <div className="min-w-0 text-left">
              <div className="text-[11px] font-medium truncate">2025–26 Season</div>
              <div className="text-[10px] text-white/40 font-mono">
                {team ? `${team.w}–${team.l} · Metro #${team.divRank}` : <span className="text-white/30">loading…</span>}
              </div>
            </div>
          </div>
          <ChevronRight size={12} className="text-white/30 shrink-0" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3">
        <div className="px-2 mb-2"><Label>Workspace</Label></div>
        <div className="space-y-0.5">
          {NAV_ITEMS.map(({ id, label, icon: Icon, kbd }) => {
            const active = page === id;
            const liveBadge = id === 'game' && liveGame;
            return (
              <button
                key={id}
                onClick={() => setPage(id)}
                className={cx(
                  'w-full group flex items-center justify-between px-2 h-7 rounded-md transition-all',
                  active ? 'bg-white/[0.06] text-white' : 'text-white/55 hover:text-white hover:bg-white/[0.03]',
                )}
              >
                <div className="flex items-center gap-2">
                  <Icon size={13} strokeWidth={active ? 2 : 1.75} className={active ? 'text-[#F74902]' : ''} />
                  <span className="text-[12px] font-medium tracking-tight">{label}</span>
                  {liveBadge && <Chip tone="live" pulse>LIVE</Chip>}
                </div>
                {!liveBadge && <Kbd>{kbd}</Kbd>}
              </button>
            );
          })}
        </div>

        <div className="px-2 mt-6 mb-2"><Label>Analysis</Label></div>
        <div className="space-y-0.5">
          {[
            { label: 'Roster',   kbd: '5' },
            { label: 'Advanced', kbd: '6' },
            { label: 'Playoffs', kbd: '7' },
          ].map((item) => (
            <button
              key={item.label}
              disabled
              className="w-full flex items-center justify-between px-2 h-7 rounded-md text-white/35"
            >
              <div className="flex items-center gap-2">
                <Circle size={5} fill="currentColor" className="text-white/20" />
                <span className="text-[12px] font-medium tracking-tight">{item.label}</span>
                <Chip tone="muted">Soon</Chip>
              </div>
              <Kbd>{item.kbd}</Kbd>
            </button>
          ))}
        </div>

        <div className="mt-6 px-2">
          <div className="flex items-center justify-between mb-2">
            <Label>Metro · Top 4</Label>
            <ChevronRight size={10} className="text-white/30" />
          </div>
          <div className="space-y-[2px]">
            {metro ? metro.slice(0, 4).map((t, i) => (
              <div
                key={t.abbr}
                className={cx(
                  'flex items-center gap-2 px-2 h-6 rounded-sm',
                  t.us ? 'bg-[#F74902]/[0.08]' : 'hover:bg-white/[0.02]',
                )}
              >
                <span className={cx('text-[10px] font-mono tabular-nums w-3',
                  t.us ? 'text-[#F74902]' : i < 3 ? 'text-white/50' : 'text-white/25'
                )}>{i + 1}</span>
                <span className={cx('text-[11px] font-mono font-medium',
                  t.us ? 'text-white' : 'text-white/70'
                )}>{t.abbr}</span>
                <span className="flex-1 text-right text-[10px] font-mono tabular-nums text-white/40">
                  {t.w}–{t.l}
                </span>
              </div>
            )) : (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="px-2 h-6 flex items-center"><Skeleton className="w-full" height={12} /></div>
              ))
            )}
          </div>
        </div>
      </nav>

      <div className="border-t border-white/[0.05] p-3 space-y-2">
        <div className="flex items-center justify-between text-[10px] font-mono">
          <div className={cx('flex items-center gap-1.5',
            status.tone === 'green' ? 'text-emerald-400' :
            status.tone === 'amber' ? 'text-amber-400' : 'text-red-400'
          )}>
            <span className="relative flex h-1.5 w-1.5">
              {status.tone === 'green' && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
              )}
              <span className={cx('relative inline-flex rounded-full h-1.5 w-1.5',
                status.tone === 'green' ? 'bg-emerald-400' :
                status.tone === 'amber' ? 'bg-amber-400' : 'bg-red-400'
              )} />
            </span>
            <span className="uppercase">{status.label}</span>
          </div>
          <span className="text-white/30">{fmtRelative(lastFetch)}</span>
        </div>
        {streak && (
          <div className="flex items-center justify-between text-[10px] font-mono text-white/40">
            <span className="flex items-center gap-1.5"><Flame size={9} className="text-[#F74902]" />Streak</span>
            <span className="text-[#FF8A4C] font-medium">{streak}</span>
          </div>
        )}
      </div>
    </aside>
  );
};

/* ═══════════════════════════════════════════════════════════════
   TOPBAR + STATUSBAR
   ═══════════════════════════════════════════════════════════════ */

const Topbar = ({ page, setPage, liveGame, lastFetch, error }) => {
  const current = NAV_ITEMS.find((n) => n.id === page) || NAV_ITEMS[0];
  const Icon = current.icon;
  const status = connStatus(lastFetch, error);

  return (
    <header className="h-12 border-b border-white/[0.06] bg-[#0A0A0A]/90 backdrop-blur-md sticky top-0 z-30">
      <div className="h-full px-4 md:px-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 min-w-0">
          <div className="lg:hidden flex items-center gap-2 mr-2">
            <FlyersMark size={18} />
            <span className="text-[12px] font-semibold">flyers<span className="text-[#F74902]">.fan</span></span>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-[11px] font-mono text-white/40">
            <span>PHI</span>
            <ChevronRight size={11} />
            <span className="text-white/80 flex items-center gap-1.5"><Icon size={11} strokeWidth={2} />{current.label}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="lg:hidden flex items-center gap-0.5">
            {NAV_ITEMS.map(({ id, icon: I }) => (
              <button
                key={id}
                onClick={() => setPage(id)}
                className={cx(
                  'w-8 h-8 flex items-center justify-center rounded-md transition-colors relative',
                  page === id ? 'bg-white/[0.06] text-[#F74902]' : 'text-white/50 hover:text-white'
                )}
              >
                <I size={14} strokeWidth={2} />
                {id === 'game' && liveGame && (
                  <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                )}
              </button>
            ))}
          </div>

          <button className="hidden md:flex items-center gap-2 h-7 pl-2 pr-1.5 border border-white/[0.08] hover:border-white/20 bg-white/[0.02] rounded-md transition-colors">
            <Search size={12} strokeWidth={2} className="text-white/40" />
            <span className="text-[11px] text-white/40 font-mono">Search or jump to</span>
            <div className="flex items-center gap-0.5 ml-2">
              <Kbd><Command size={9} strokeWidth={2.5} /></Kbd>
              <Kbd>K</Kbd>
            </div>
          </button>

          <div className="h-4 w-px bg-white/[0.08] hidden md:block" />

          {liveGame ? (
            <Chip tone="live" pulse>LIVE · {liveGame.us}–{liveGame.them} {liveGame.home ? 'vs' : '@'} {liveGame.opp}</Chip>
          ) : (
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-1.5 w-1.5">
                {status.tone === 'green' && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />}
                <span className={cx('relative inline-flex rounded-full h-1.5 w-1.5',
                  status.tone === 'green' ? 'bg-emerald-400' : status.tone === 'amber' ? 'bg-amber-400' : 'bg-red-400'
                )} />
              </span>
              <span className="text-[11px] font-mono text-white/60 hidden sm:inline">
                {error ? 'OFFLINE' : 'SEASON LIVE'}
              </span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

const Statusbar = ({ lastFetch, error, refresh }) => {
  const status = connStatus(lastFetch, error);
  return (
    <div className="h-7 border-t border-white/[0.06] bg-[#080808] flex items-center justify-between px-4 md:px-6 text-[10px] font-mono text-white/45">
      <div className="flex items-center gap-4">
        <span className={cx('flex items-center gap-1.5',
          status.tone === 'red' && 'text-red-400',
          status.tone === 'amber' && 'text-amber-400'
        )}>
          {error ? <WifiOff size={10} /> : <Wifi size={10} />}
          <span>api-web.nhle.com · {status.label}</span>
        </span>
        <button onClick={refresh} className="hidden sm:flex items-center gap-1.5 hover:text-white/70 transition-colors">
          <RefreshCw size={10} />
          <span>refresh {fmtRelative(lastFetch)}</span>
        </button>
      </div>
      <div className="flex items-center gap-4">
        <span className="hidden md:inline">2025–26 Season</span>
        <span>v0.2</span>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════
   KPI TILE
   ═══════════════════════════════════════════════════════════════ */

const KPI = ({ label, value, sub, delta, sparkData, trendColor, loading }) => (
  <div className="flex-1 min-w-[150px] border border-white/[0.06] bg-[#0C0C0C]/60 backdrop-blur-sm rounded-md p-3 hover:border-white/[0.12] transition-colors">
    <div className="flex items-start justify-between mb-2">
      <Label>{label}</Label>
      {delta !== undefined && !loading && <Delta value={delta} />}
    </div>
    {loading ? (
      <>
        <Skeleton className="w-20" height={24} />
        <div className="mt-3"><Skeleton className="w-full" height={24} /></div>
      </>
    ) : (
      <>
        <div className="flex items-baseline gap-1.5">
          <span className="text-[24px] font-semibold tracking-tight tabular-nums leading-none">{value}</span>
          {sub && <span className="text-[11px] text-white/40 font-mono">{sub}</span>}
        </div>
        {sparkData && (
          <div className="mt-3 -mx-0.5">
            <Sparkline data={sparkData} h={24} stroke={trendColor || '#F74902'} />
          </div>
        )}
      </>
    )}
  </div>
);

/* ═══════════════════════════════════════════════════════════════
   PAGE: DASHBOARD
   ═══════════════════════════════════════════════════════════════ */

const Dashboard = ({ schedule, standings, loading }) => {
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

  const home = games.filter((g) => g.home);
  const away = games.filter((g) => !g.home);

  const us = standings?.us;
  const nextGame = schedule?.nextGame;
  const liveGame = schedule?.liveGame;
  const lastResult = games[0];

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-[20px] font-semibold tracking-tight">Dashboard</h1>
            {us?.clinched === 'x' && <Chip tone="orange">● Clinched Playoff Spot</Chip>}
            {us?.clinched === 'y' && <Chip tone="amber">● Clinched Division</Chip>}
            {us?.clinched === 'z' && <Chip tone="amber">● Clinched Conference</Chip>}
            {us?.clinched === 'p' && <Chip tone="orange">● Playoff Bound</Chip>}
            {us?.clinched === 'e' && <Chip tone="red">● Eliminated</Chip>}
          </div>
          <p className="text-[12px] text-white/45 mt-1 font-mono">
            {us ? `Season snapshot · Philadelphia Flyers · ${us.gp} games played of 82` : 'Loading season data…'}
          </p>
        </div>
        <div className="flex items-center gap-2 text-[11px] font-mono text-white/40">
          <span>Showing</span><span className="text-white/70">Last 20 games</span>
          <ChevronRight size={11} />
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <KPI
          label="Record"
          value={us ? `${us.w}–${us.l}${us.ot ? `–${us.ot}` : ''}` : '—'}
          sub={us ? `${us.gp} GP` : ''}
          sparkData={running.winPctArr}
          loading={loading && !us}
        />
        <KPI
          label="Points %"
          value={us ? (us.pct * 100).toFixed(1) : '—'}
          sub="%"
          sparkData={running.winPctArr}
          loading={loading && !us}
        />
        <KPI
          label="Goal Diff"
          value={us ? `${us.diff >= 0 ? '+' : ''}${us.diff}` : '—'}
          sub="season"
          sparkData={running.diffArr}
          trendColor={(us?.diff ?? 0) >= 0 ? '#F74902' : '#EF4444'}
          loading={loading && !us}
        />
        <KPI
          label="Streak"
          value={streak ? `${streak.type}${streak.count}` : '—'}
          sub={streak?.type === 'W' ? 'hot' : 'cold'}
          sparkData={running.winPctArr}
          loading={!streak}
        />
        <KPI
          label="Last 10"
          value={games.length ? `${l10Record.w}–${l10Record.l}` : '—'}
          sub="recent"
          sparkData={l10.map((g) => g.w ? 1 : 0).reverse()}
          loading={!games.length}
        />
        <KPI
          label="Division"
          value={us ? `#${us.divRank}` : '—'}
          sub="Metro"
          loading={!us}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-8 space-y-4">
          <Section
            title="Recent Games"
            action={<span className="text-[10px] font-mono text-white/40">Last 10 · live</span>}
          >
            <div className="divide-y divide-white/[0.04]">
              <div className="grid grid-cols-[44px_56px_1fr_80px_120px_60px] gap-3 items-center px-4 h-8 text-[10px] font-mono text-white/35 uppercase tracking-wider">
                <span>Res</span><span>Date</span><span>Opponent</span>
                <span className="text-right">Score</span>
                <span className="text-center">Distribution</span>
                <span className="text-right">Site</span>
              </div>
              {!games.length && Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="px-4 h-10 flex items-center"><Skeleton className="w-full" height={16} /></div>
              ))}
              {games.slice(0, 10).map((g) => {
                const max = Math.max(g.us, g.them);
                return (
                  <div key={g.id} className="grid grid-cols-[44px_56px_1fr_80px_120px_60px] gap-3 items-center px-4 h-10 hover:bg-white/[0.02] transition-colors">
                    <span className={cx(
                      'inline-flex items-center justify-center w-[22px] h-[18px] text-[10px] font-mono font-semibold rounded-[3px]',
                      g.w ? 'bg-[#F74902]/15 text-[#FF8A4C] border border-[#F74902]/30'
                          : 'bg-white/[0.03] text-white/40 border border-white/10'
                    )}>{g.w ? 'W' : 'L'}</span>
                    <span className="text-[11px] font-mono text-white/50 tabular-nums">{g.label}</span>
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[10px] font-mono text-white/35 uppercase shrink-0">{g.home ? 'vs' : '@'}</span>
                      <span className="text-[12px] text-white/85 truncate">{OPP_FULL[g.opp] || g.oppName}</span>
                      <span className="text-[10px] font-mono text-white/35">{g.opp}</span>
                    </div>
                    <div className="text-right font-mono tabular-nums text-[13px]">
                      <span className={g.w ? 'text-[#FF8A4C] font-medium' : 'text-white/80'}>{g.us}</span>
                      <span className="text-white/30 mx-1">–</span>
                      <span className={g.w ? 'text-white/50' : 'text-white/80 font-medium'}>{g.them}</span>
                    </div>
                    <div className="flex items-center justify-center gap-0.5">
                      {Array.from({ length: max }).map((_, i) => (
                        <div key={`u${i}`} className={cx('w-1 h-3', i < g.us ? 'bg-[#F74902]' : 'bg-white/[0.06]')} />
                      ))}
                      <div className="w-1" />
                      {Array.from({ length: max }).map((_, i) => (
                        <div key={`t${i}`} className={cx('w-1 h-3', i < g.them ? 'bg-white/40' : 'bg-white/[0.06]')} />
                      ))}
                    </div>
                    <div className="text-right">
                      <Chip tone="muted">
                        {g.home ? <><Home size={9} /> HOME</> : <><Plane size={9} /> AWAY</>}
                      </Chip>
                    </div>
                  </div>
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
        </div>

        <div className="lg:col-span-4 space-y-4">
          {liveGame ? (
            <Section title={<span className="flex items-center gap-2">Live Now <Chip tone="live" pulse>LIVE</Chip></span>}>
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between py-1">
                  <div className="flex items-center gap-2">
                    <FlyersMark size={18} />
                    <span className="text-[13px] font-medium">PHI</span>
                  </div>
                  <span className="text-[28px] font-semibold tabular-nums text-[#FF8A4C]">{liveGame.us}</span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <div className="flex items-center gap-2">
                    <div className="w-[18px] h-[18px] rounded-sm bg-white/[0.08] flex items-center justify-center text-[9px] font-bold font-mono">{liveGame.opp}</div>
                    <span className="text-[13px] text-white/70">{liveGame.oppName}</span>
                  </div>
                  <span className="text-[28px] font-semibold tabular-nums text-white/70">{liveGame.them}</span>
                </div>
                <div className="pt-3 border-t border-white/[0.05] text-[10px] font-mono text-white/50 flex items-center justify-between">
                  <span>{liveGame.home ? 'HOME' : 'AWAY'} · {liveGame.venue || 'TBD'}</span>
                  <span className="text-red-400">● IN PROGRESS</span>
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
                    <div className="w-[18px] h-[18px] rounded-sm bg-white/[0.08] flex items-center justify-center text-[9px] font-bold font-mono">{nextGame.opp}</div>
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
                    <div className="w-[18px] h-[18px] rounded-sm bg-white/[0.08] flex items-center justify-center text-[9px] font-bold font-mono">{lastResult.opp}</div>
                    <span className="text-[13px] text-white/70">{OPP_FULL[lastResult.opp] || lastResult.oppName}</span>
                  </div>
                  <span className={cx('text-[22px] font-semibold tabular-nums',
                    !lastResult.w ? 'text-white' : 'text-white/70'
                  )}>{lastResult.them}</span>
                </div>
              </div>
            </Section>
          )}

          <Section title="Metro Standings" action={<ChevronRight size={12} className="text-white/30" />}>
            <div className="divide-y divide-white/[0.04]">
              {!standings?.metro?.length && Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="px-4 h-8 flex items-center"><Skeleton className="w-full" height={10} /></div>
              ))}
              {standings?.metro?.slice(0, 6).map((t, i) => (
                <div key={t.abbr} className={cx(
                  'grid grid-cols-[18px_32px_1fr_auto] gap-2 items-center px-4 h-8',
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
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════
   PAGE: SCHEDULE
   ═══════════════════════════════════════════════════════════════ */

const Schedule = ({ schedule }) => {
  const [filter, setFilter] = useState('all');
  const [scope, setScope] = useState('l20'); // 'l20' | 'all'

  const all = schedule?.games || [];
  const base = scope === 'l20' ? all.slice(0, 20) : all;

  const filtered = base.filter((g) => {
    if (filter === 'home')   return g.home;
    if (filter === 'away')   return !g.home;
    if (filter === 'wins')   return g.w;
    if (filter === 'losses') return !g.w;
    return true;
  });

  const { gf, ga } = filtered.reduce((a, g) => ({ gf: a.gf + g.us, ga: a.ga + g.them }), { gf: 0, ga: 0 });
  const wins = filtered.filter((g) => g.w).length;

  const FILTERS = [
    { id: 'all', label: 'All' }, { id: 'wins', label: 'Wins' }, { id: 'losses', label: 'Losses' },
    { id: 'home', label: 'Home' }, { id: 'away', label: 'Away' },
  ];

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[20px] font-semibold tracking-tight">Schedule</h1>
          <p className="text-[12px] text-white/45 mt-1 font-mono">Game log · {scope === 'l20' ? 'last 20 games' : `full season (${all.length})`} · live data</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0.5 p-0.5 border border-white/[0.08] rounded-md bg-white/[0.02]">
            {[{ id: 'l20', l: 'L20' }, { id: 'all', l: 'Season' }].map((s) => (
              <button key={s.id} onClick={() => setScope(s.id)}
                className={cx('px-2.5 h-6 text-[11px] font-medium rounded-[4px] transition-colors',
                  scope === s.id ? 'bg-white/[0.08] text-white' : 'text-white/50 hover:text-white'
                )}>{s.l}</button>
            ))}
          </div>
          <div className="flex items-center gap-0.5 p-0.5 border border-white/[0.08] rounded-md bg-white/[0.02]">
            {FILTERS.map((f) => (
              <button key={f.id} onClick={() => setFilter(f.id)}
                className={cx('px-2.5 h-6 text-[11px] font-medium rounded-[4px] transition-colors',
                  filter === f.id ? 'bg-white/[0.08] text-white' : 'text-white/50 hover:text-white'
                )}>{f.label}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { l: 'Games', v: filtered.length },
          { l: 'Record', v: `${wins}–${filtered.length - wins}` },
          { l: 'Goals For', v: gf, sub: filtered.length ? (gf / filtered.length).toFixed(2) + ' /gm' : '', tone: 'orange' },
          { l: 'Goals Ag.', v: ga, sub: filtered.length ? (ga / filtered.length).toFixed(2) + ' /gm' : '' },
          { l: 'Diff', v: `${gf - ga >= 0 ? '+' : ''}${gf - ga}`, tone: gf - ga >= 0 ? 'up' : 'down' },
        ].map((s) => (
          <div key={s.l} className="border border-white/[0.06] bg-[#0C0C0C]/60 rounded-md p-3">
            <Label>{s.l}</Label>
            <div className={cx('text-[20px] font-semibold mt-1 tabular-nums',
              s.tone === 'orange' ? 'text-[#FF8A4C]' : s.tone === 'up' ? 'text-[#FF8A4C]' : s.tone === 'down' ? 'text-red-400' : ''
            )}>{s.v}</div>
            {s.sub && <div className="text-[10px] font-mono text-white/40 mt-0.5">{s.sub}</div>}
          </div>
        ))}
      </div>

      <Section>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-[10px] font-mono text-white/35 uppercase tracking-wider border-b border-white/[0.05]">
                <th className="font-normal text-left px-4 h-9 w-[44px]">Res</th>
                <th className="font-normal text-left px-2 h-9 w-[80px]">Date</th>
                <th className="font-normal text-left px-2 h-9">Opponent</th>
                <th className="font-normal text-center px-2 h-9 w-[60px]">Site</th>
                <th className="font-normal text-right px-2 h-9 w-[90px]">Score</th>
                <th className="font-normal text-right px-2 h-9 w-[80px]">Diff</th>
                <th className="font-normal text-center px-2 h-9 w-[120px]">Goals</th>
                <th className="font-normal text-right px-4 h-9 w-[50px]">Type</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {!all.length && Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}><td colSpan={8} className="px-4 h-11"><Skeleton className="w-full" height={18} /></td></tr>
              ))}
              {filtered.map((g) => {
                const diff = g.us - g.them;
                const max = Math.max(g.us, g.them);
                return (
                  <tr key={g.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 h-11">
                      <span className={cx(
                        'inline-flex items-center justify-center w-[22px] h-[18px] text-[10px] font-mono font-semibold rounded-[3px]',
                        g.w ? 'bg-[#F74902]/15 text-[#FF8A4C] border border-[#F74902]/30'
                            : 'bg-white/[0.03] text-white/40 border border-white/10'
                      )}>{g.w ? 'W' : 'L'}</span>
                    </td>
                    <td className="px-2 text-[11px] font-mono text-white/55 tabular-nums">{g.label}</td>
                    <td className="px-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[12px] text-white/85">{OPP_FULL[g.opp] || g.oppName}</span>
                        <span className="text-[10px] font-mono text-white/30">{g.opp}</span>
                      </div>
                    </td>
                    <td className="px-2 text-center text-[10px] font-mono text-white/45">{g.home ? 'HOME' : 'AWAY'}</td>
                    <td className="px-2 text-right font-mono tabular-nums text-[13px]">
                      <span className={g.w ? 'text-[#FF8A4C] font-medium' : 'text-white/80'}>{g.us}</span>
                      <span className="text-white/25 mx-1">–</span>
                      <span className={g.w ? 'text-white/50' : 'text-white/80 font-medium'}>{g.them}</span>
                    </td>
                    <td className="px-2 text-right">
                      <span className={cx('text-[11px] font-mono tabular-nums',
                        diff > 0 ? 'text-emerald-400' : diff < 0 ? 'text-red-400' : 'text-white/40'
                      )}>{diff > 0 ? '+' : ''}{diff}</span>
                    </td>
                    <td className="px-2">
                      <div className="flex items-center justify-center gap-[2px]">
                        {Array.from({ length: max }).map((_, idx) => (
                          <div key={`u${idx}`} className={cx('w-1 h-3', idx < g.us ? 'bg-[#F74902]' : 'bg-white/[0.06]')} />
                        ))}
                        <div className="w-1.5" />
                        {Array.from({ length: max }).map((_, idx) => (
                          <div key={`t${idx}`} className={cx('w-1 h-3', idx < g.them ? 'bg-white/40' : 'bg-white/[0.06]')} />
                        ))}
                      </div>
                    </td>
                    <td className="px-4 text-right">
                      <span className="text-[10px] font-mono text-white/35">{g.gameType === 3 ? 'PO' : 'REG'}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {all.length > 0 && filtered.length === 0 && (
            <div className="py-12 text-center text-[12px] font-mono text-white/35">No games match.</div>
          )}
        </div>
      </Section>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════
   PAGE: STANDINGS
   ═══════════════════════════════════════════════════════════════ */

const clinchChip = (c) => {
  if (c === 'z') return <Chip tone="amber">PRES</Chip>;
  if (c === 'y') return <Chip tone="amber">DIV</Chip>;
  if (c === 'p') return <Chip tone="green">PLAYOFFS</Chip>;
  if (c === 'x') return <Chip tone="green">PLAYOFFS</Chip>;
  if (c === 'e') return <Chip tone="muted">OUT</Chip>;
  return null;
};

const Standings = ({ standings }) => {
  const [view, setView] = useState('metro');
  const rows = view === 'metro'
    ? standings?.metro
    : view === 'east'
      ? standings?.east
      : standings?.all;

  const us = standings?.us;
  const data = rows || [];
  const maxWins = Math.max(1, ...data.map((t) => t.w));

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[20px] font-semibold tracking-tight">Standings</h1>
          <p className="text-[12px] text-white/45 mt-1 font-mono">Live standings · refreshed from NHL every 5 min</p>
        </div>
        <div className="flex items-center gap-0.5 p-0.5 border border-white/[0.08] rounded-md bg-white/[0.02]">
          {[
            { id: 'metro', l: 'Metro' },
            { id: 'east',  l: 'East' },
            { id: 'all',   l: 'League' },
          ].map((t) => (
            <button key={t.id} onClick={() => setView(t.id)}
              className={cx('px-3 h-6 text-[11px] font-medium rounded-[4px] transition-colors',
                view === t.id ? 'bg-white/[0.08] text-white' : 'text-white/50 hover:text-white'
              )}>{t.l}</button>
          ))}
        </div>
      </div>

      {us && view === 'metro' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-1 border border-[#F74902]/30 bg-[#F74902]/[0.05] rounded-md p-4 relative overflow-hidden">
            <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full pointer-events-none"
              style={{ background: 'radial-gradient(circle, rgba(247,73,2,0.2), transparent 70%)' }} />
            <div className="relative flex items-center gap-2 mb-3">
              <FlyersMark size={16} />
              <span className="text-[11px] font-medium">Philadelphia Flyers</span>
              <Chip tone="orange">YOU</Chip>
            </div>
            <div className="relative flex items-baseline gap-2">
              <span className="text-[38px] font-semibold tabular-nums tracking-tight text-[#FF8A4C]">#{us.divRank}</span>
              <span className="text-[11px] font-mono text-white/50">of {standings.metro.length}</span>
            </div>
            <div className="relative mt-2 text-[11px] font-mono text-white/55">{us.w}–{us.l} · {us.pts} pts</div>
            <div className="relative mt-3 pt-3 border-t border-white/[0.08] flex items-center justify-between text-[10px] font-mono">
              <span className="text-white/40">GAMES BACK FROM #1</span>
              <span className="text-white/80 tabular-nums">{standings.metro[0].pts - us.pts}</span>
            </div>
          </div>

          <div className="md:col-span-3 border border-white/[0.06] bg-[#0C0C0C]/60 rounded-md p-4 space-y-3">
            <div className="flex items-center justify-between">
              <Label>Playoff Picture · Metro</Label>
              <span className="text-[10px] font-mono text-white/40">Top 3 auto-qualify</span>
            </div>
            <div className="flex items-center gap-1">
              {standings.metro.map((t, i) => {
                const inside = i < 3;
                return (
                  <div key={t.abbr} className={cx('flex-1 flex flex-col items-center gap-1 py-2 rounded-sm transition-colors',
                    t.us ? 'bg-[#F74902]/[0.1]' : 'hover:bg-white/[0.02]',
                  )}>
                    <span className={cx('text-[10px] font-mono tabular-nums',
                      t.us ? 'text-[#FF8A4C]' : inside ? 'text-white/60' : 'text-white/25'
                    )}>{i + 1}</span>
                    <div className={cx('w-6 h-6 rounded-sm flex items-center justify-center text-[9px] font-bold font-mono',
                      t.us ? 'bg-[#F74902] text-black'
                           : inside ? 'bg-white/[0.08] text-white/75'
                                    : 'bg-white/[0.03] text-white/40'
                    )}>{t.abbr}</div>
                    <div className="text-[10px] font-mono tabular-nums text-white/40">{t.pts}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <Section title={view === 'metro' ? 'Metropolitan Division' : view === 'east' ? 'Eastern Conference' : 'Full League'}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-[10px] font-mono text-white/35 uppercase tracking-wider border-b border-white/[0.05]">
                <th className="font-normal text-left px-4 h-9 w-[36px]">#</th>
                <th className="font-normal text-left px-2 h-9">Team</th>
                <th className="font-normal text-right px-2 h-9 w-[44px]">GP</th>
                <th className="font-normal text-right px-2 h-9 w-[44px]">W</th>
                <th className="font-normal text-right px-2 h-9 w-[44px]">L</th>
                <th className="font-normal text-right px-2 h-9 w-[44px]">OT</th>
                <th className="font-normal text-right px-2 h-9 w-[54px]">PTS</th>
                <th className="font-normal text-right px-2 h-9 w-[60px]">P%</th>
                <th className="font-normal text-right px-2 h-9 w-[50px]">DIFF</th>
                <th className="font-normal text-center px-2 h-9 w-[120px]">Points Share</th>
                <th className="font-normal text-right px-4 h-9 w-[110px]">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {!data.length && Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}><td colSpan={11} className="px-4 h-11"><Skeleton className="w-full" height={16} /></td></tr>
              ))}
              {data.map((t, i) => {
                const isUs = t.us;
                const inPlayoffs = view === 'metro' ? i < 3 : false;
                const maxPts = Math.max(1, ...data.map((x) => x.pts));
                return (
                  <tr key={t.abbr} className={cx('transition-colors',
                    isUs ? 'bg-[#F74902]/[0.06] hover:bg-[#F74902]/[0.1]' : 'hover:bg-white/[0.02]',
                  )}>
                    <td className={cx('px-4 h-11 text-[12px] font-mono tabular-nums',
                      isUs ? 'text-[#FF8A4C] font-semibold' : inPlayoffs ? 'text-white/70' : 'text-white/30'
                    )}>{i + 1}</td>
                    <td className="px-2">
                      <div className="flex items-center gap-2.5">
                        <div className={cx('w-5 h-5 rounded-sm flex items-center justify-center text-[9px] font-bold font-mono shrink-0',
                          isUs ? 'bg-[#F74902] text-black' : 'bg-white/[0.06] text-white/60'
                        )}>{t.abbr}</div>
                        <span className={cx('text-[12px]', isUs ? 'text-white font-medium' : 'text-white/80')}>{t.team}</span>
                      </div>
                    </td>
                    <td className="px-2 text-right text-[11px] font-mono tabular-nums text-white/50">{t.gp}</td>
                    <td className="px-2 text-right text-[12px] font-mono tabular-nums font-medium">{t.w}</td>
                    <td className="px-2 text-right text-[12px] font-mono tabular-nums text-white/55">{t.l}</td>
                    <td className="px-2 text-right text-[11px] font-mono tabular-nums text-white/45">{t.ot || 0}</td>
                    <td className="px-2 text-right text-[12px] font-mono tabular-nums font-semibold">{t.pts}</td>
                    <td className="px-2 text-right text-[11px] font-mono tabular-nums text-white/70">{(t.pct * 100).toFixed(1)}</td>
                    <td className={cx('px-2 text-right text-[11px] font-mono tabular-nums',
                      t.diff > 0 ? 'text-emerald-400' : t.diff < 0 ? 'text-red-400' : 'text-white/50'
                    )}>{t.diff > 0 ? '+' : ''}{t.diff}</td>
                    <td className="px-2">
                      <div className="flex items-center gap-2">
                        <MiniBar value={t.pts} max={maxPts} color={isUs ? '#F74902' : inPlayoffs ? '#B0B0B0' : '#3F3F3F'} h={4} />
                      </div>
                    </td>
                    <td className="px-4 text-right">{clinchChip(t.clinched)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════
   PAGE: GAME TAPE
   ═══════════════════════════════════════════════════════════════ */

const CompareRow = ({ label, us, them, higherBetter = true, suffix = '' }) => {
  if (us == null || them == null) return null;
  const total = us + them;
  const usPct = total > 0 ? (us / total) * 100 : 50;
  const usWon = higherBetter ? us > them : us < them;
  return (
    <div className="grid grid-cols-[60px_1fr_90px_1fr_60px] items-center gap-3 h-9 px-4 hover:bg-white/[0.02] transition-colors">
      <span className={cx('text-right text-[12px] font-mono tabular-nums',
        usWon ? 'text-[#FF8A4C]' : 'text-white/55'
      )}>{us}{suffix}</span>
      <div className="relative h-1 bg-white/[0.04] rounded-full overflow-hidden">
        <div className="absolute right-1/2 h-full bg-[#F74902]/70" style={{ width: `${usPct / 2}%` }} />
      </div>
      <span className="text-center text-[10px] font-mono text-white/45 tracking-wider uppercase">{label}</span>
      <div className="relative h-1 bg-white/[0.04] rounded-full overflow-hidden">
        <div className="absolute left-1/2 h-full bg-white/50" style={{ width: `${(100 - usPct) / 2}%` }} />
      </div>
      <span className={cx('text-left text-[12px] font-mono tabular-nums',
        !usWon ? 'text-white font-medium' : 'text-white/50'
      )}>{them}{suffix}</span>
    </div>
  );
};

const GameTape = ({ game, loading }) => {
  if (loading && !game) {
    return (
      <div className="p-4 md:p-6 space-y-5">
        <Skeleton height={24} className="w-64" />
        <Skeleton height={120} />
        <Skeleton height={400} />
      </div>
    );
  }
  if (!game) {
    return (
      <div className="p-4 md:p-6">
        <div className="border border-white/[0.06] bg-[#0C0C0C]/60 rounded-md p-8 text-center">
          <AlertCircle size={20} className="text-white/30 mx-auto mb-2" />
          <div className="text-[13px] text-white/70">No recent game data available.</div>
          <div className="text-[11px] font-mono text-white/40 mt-1">Check back after the next game.</div>
        </div>
      </div>
    );
  }

  const liveNow = isLive(game.state);
  const periods = Object.keys(game.periods).map(Number).sort();

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[20px] font-semibold tracking-tight">Game Tape</h1>
          <p className="text-[12px] text-white/45 mt-1 font-mono">
            {liveNow ? 'Live game' : 'Last game'} · {game.dateLabel} · vs {game.oppName}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {liveNow ? (
            <Chip tone="live" pulse>
              LIVE · P{game.periodDescriptor?.number || '?'} {game.clock?.timeRemaining || ''}
            </Chip>
          ) : (
            <Chip tone={game.score.us > game.score.them ? 'orange' : 'muted'}>
              ● {game.score.us > game.score.them ? 'W' : 'L'} · {game.score.us}–{game.score.them}
            </Chip>
          )}
        </div>
      </div>

      <div className="border border-white/[0.06] bg-[#0C0C0C]/60 rounded-md p-5 relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full pointer-events-none opacity-60"
          style={{ background: 'radial-gradient(circle, rgba(247,73,2,0.15), transparent 70%)' }} />
        <div className="relative grid grid-cols-[1fr_auto_1fr] items-center gap-6">
          <div className="flex items-center gap-3">
            <FlyersMark size={32} />
            <div>
              <div className="text-[10px] font-mono text-white/40 uppercase tracking-wider">{game.home ? 'Home' : 'Away'}</div>
              <div className="text-[14px] font-medium">Philadelphia Flyers</div>
            </div>
          </div>
          <div className="text-center">
            <div className="flex items-baseline gap-3">
              <span className={cx('text-[44px] font-semibold tabular-nums tracking-tight',
                game.score.us >= game.score.them ? 'text-[#FF8A4C]' : 'text-white/70'
              )}>{game.score.us}</span>
              <span className="text-[24px] text-white/25">–</span>
              <span className={cx('text-[44px] font-semibold tabular-nums tracking-tight',
                game.score.them > game.score.us ? 'text-white' : 'text-white/70'
              )}>{game.score.them}</span>
            </div>
            <div className="text-[10px] font-mono text-white/40 uppercase tracking-wider mt-1">
              {liveNow
                ? `P${game.periodDescriptor?.number || '?'} · ${game.clock?.timeRemaining || 'live'}`
                : `Final${game.periodDescriptor?.periodType === 'OT' ? ' · OT' : game.periodDescriptor?.periodType === 'SO' ? ' · SO' : ''}`}
            </div>
          </div>
          <div className="flex items-center gap-3 justify-end">
            <div className="text-right">
              <div className="text-[10px] font-mono text-white/40 uppercase tracking-wider">{game.home ? 'Away' : 'Home'}</div>
              <div className="text-[14px] font-medium text-white/75">{game.oppName}</div>
            </div>
            <div className="w-8 h-8 bg-white/[0.08] rounded-sm flex items-center justify-center">
              <span className="text-[11px] font-bold font-mono">{game.oppAbbr}</span>
            </div>
          </div>
        </div>

        {periods.length > 0 && (
          <div className="relative mt-5 pt-4 border-t border-white/[0.05] grid grid-cols-4 gap-2">
            {periods.map((p) => {
              const [u, t] = game.periods[p];
              return (
                <div key={p} className="flex items-center justify-between bg-white/[0.02] border border-white/[0.04] rounded-sm px-3 h-9">
                  <span className="text-[10px] font-mono text-white/40 uppercase">P{p}</span>
                  <span className="font-mono tabular-nums text-[13px]">
                    <span className={u > t ? 'text-[#FF8A4C] font-medium' : 'text-white/60'}>{u}</span>
                    <span className="text-white/20 mx-1">–</span>
                    <span className={t > u ? 'text-white font-medium' : 'text-white/60'}>{t}</span>
                  </span>
                </div>
              );
            })}
            <div className="flex items-center justify-between bg-[#F74902]/[0.08] border border-[#F74902]/20 rounded-sm px-3 h-9">
              <span className="text-[10px] font-mono text-[#FF8A4C]/70 uppercase">{liveNow ? 'Now' : 'Final'}</span>
              <span className="font-mono tabular-nums text-[13px] text-[#FF8A4C] font-medium">
                {game.score.us}–{game.score.them}
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-7 space-y-4">
          <Section title="Team Comparison">
            <div className="py-2">
              <div className="grid grid-cols-[60px_1fr_90px_1fr_60px] items-center gap-3 px-4 h-8 text-[10px] font-mono text-white/35 uppercase tracking-wider">
                <span className="text-right text-[#FF8A4C]/80">PHI</span>
                <span /><span className="text-center">Metric</span><span />
                <span className="text-left text-white/55">{game.oppAbbr}</span>
              </div>
              <CompareRow label="Shots"       us={game.stats.shots.us}       them={game.stats.shots.them} />
              <CompareRow label="Hits"        us={game.stats.hits.us}        them={game.stats.hits.them} />
              <CompareRow label="Blocks"      us={game.stats.blocks.us}      them={game.stats.blocks.them} />
              <CompareRow label="Faceoff %"   us={game.stats.faceoffPct.us}  them={game.stats.faceoffPct.them} suffix="%" />
              <CompareRow label="Takeaways"   us={game.stats.takeaways.us}   them={game.stats.takeaways.them} />
              <CompareRow label="Giveaways"   us={game.stats.giveaways.us}   them={game.stats.giveaways.them}   higherBetter={false} />
              <CompareRow label="PIM"         us={game.stats.pim.us}         them={game.stats.pim.them}          higherBetter={false} />
            </div>
          </Section>

          <Section title="Skater Box Score · PHI">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-[10px] font-mono text-white/35 uppercase tracking-wider border-b border-white/[0.05]">
                    <th className="font-normal text-left px-4 h-8 w-[36px]">#</th>
                    <th className="font-normal text-left px-2 h-8">Player</th>
                    <th className="font-normal text-center px-2 h-8 w-[38px]">Pos</th>
                    <th className="font-normal text-right px-2 h-8 w-[36px]">G</th>
                    <th className="font-normal text-right px-2 h-8 w-[36px]">A</th>
                    <th className="font-normal text-right px-2 h-8 w-[36px]">P</th>
                    <th className="font-normal text-right px-2 h-8 w-[40px]">SOG</th>
                    <th className="font-normal text-right px-2 h-8 w-[40px]">HIT</th>
                    <th className="font-normal text-right px-2 h-8 w-[40px]">BLK</th>
                    <th className="font-normal text-right px-2 h-8 w-[40px]">+/–</th>
                    <th className="font-normal text-right px-4 h-8 w-[60px]">TOI</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {game.skaters.map((s) => (
                    <tr key={s.name} className="hover:bg-white/[0.02]">
                      <td className="px-4 text-right text-[10px] font-mono tabular-nums text-white/30 h-9">{s.num}</td>
                      <td className="px-2 text-[12px] text-white/85">{s.name}</td>
                      <td className="px-2 text-center text-[10px] font-mono text-white/45">{s.pos}</td>
                      <td className={cx('px-2 text-right text-[12px] font-mono tabular-nums',
                        s.g > 0 ? 'text-[#FF8A4C] font-medium' : 'text-white/35'
                      )}>{s.g || '—'}</td>
                      <td className={cx('px-2 text-right text-[12px] font-mono tabular-nums',
                        s.a > 0 ? 'text-white/85' : 'text-white/35'
                      )}>{s.a || '—'}</td>
                      <td className={cx('px-2 text-right text-[12px] font-mono tabular-nums',
                        s.pts > 0 ? 'text-white/90 font-medium' : 'text-white/35'
                      )}>{s.pts || '—'}</td>
                      <td className="px-2 text-right text-[11px] font-mono tabular-nums text-white/65">{s.sog}</td>
                      <td className="px-2 text-right text-[11px] font-mono tabular-nums text-white/65">{s.hits}</td>
                      <td className={cx('px-2 text-right text-[11px] font-mono tabular-nums',
                        s.blk >= 3 ? 'text-[#FF8A4C]' : 'text-white/65'
                      )}>{s.blk}</td>
                      <td className={cx('px-2 text-right text-[11px] font-mono tabular-nums',
                        s.pm > 0 ? 'text-emerald-400' : s.pm < 0 ? 'text-red-400' : 'text-white/45'
                      )}>{s.pm > 0 ? '+' : ''}{s.pm}</td>
                      <td className="px-4 text-right text-[11px] font-mono tabular-nums text-white/55">{s.toi}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
        </div>

        <div className="lg:col-span-5 space-y-4">
          {game.stars.length > 0 && (
            <Section title="Three Stars">
              <div className="divide-y divide-white/[0.04]">
                {game.stars.map((s) => (
                  <div key={s.star} className="flex items-center gap-3 px-4 py-3">
                    <span className="text-[22px] font-semibold tabular-nums text-[#F74902]/60 w-8">★{s.star}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-[12px] font-medium truncate">{s.name}</span>
                        <span className="text-[10px] font-mono text-white/35 shrink-0">{s.teamAbbrev} · {s.position}</span>
                      </div>
                      <div className="text-[11px] text-white/55 mt-1 font-mono">
                        {s.goals ? `${s.goals}G ` : ''}
                        {s.assists ? `${s.assists}A ` : ''}
                        {s.points ? `${s.points}P` : ''}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          <Section title="Key Numbers">
            <div className="divide-y divide-white/[0.04]">
              {[
                { l: 'Shots on Goal',        v: game.stats.shots.us != null ? `${game.stats.shots.us} / ${game.stats.shots.them}` : '—' },
                { l: 'Faceoff %',            v: game.stats.faceoffPct.us != null ? `${game.stats.faceoffPct.us}%` : '—' },
                { l: 'Blocks vs Opp',        v: game.stats.blocks.us != null ? `${game.stats.blocks.us} / ${game.stats.blocks.them}` : '—' },
                { l: 'Hits Differential',    v: game.stats.hits.us != null ? (game.stats.hits.us - game.stats.hits.them) : '—' },
                { l: 'Giveaways',            v: game.stats.giveaways.us ?? '—' },
                { l: 'Penalty Minutes',      v: game.stats.pim.us ?? '—' },
              ].map((r) => (
                <div key={r.l} className="flex items-center justify-between px-4 h-10">
                  <span className="text-[11px] text-white/55">{r.l}</span>
                  <span className="text-[12px] font-mono tabular-nums">{r.v}</span>
                </div>
              ))}
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════
   APP
   ═══════════════════════════════════════════════════════════════ */

export default function App() {
  const [page, setPage] = useState('dashboard');

  useClockTick(1000);

  useEffect(() => {
    const h = (e) => {
      if (e.metaKey || e.ctrlKey) return;
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      const map = { '1': 'dashboard', '2': 'schedule', '3': 'standings', '4': 'game' };
      if (map[e.key]) setPage(map[e.key]);
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  // Fetch schedule — interval speeds up when a game is live or close
  const scheduleRaw = useNHL(`v1/club-schedule-season/${TEAM_ABBR}/${SEASON}`, (d) => {
    if (!d?.games) return POLL.idle;
    const hasLive = d.games.some((g) => isLive(g.gameState));
    if (hasLive) return POLL.live;
    // within 30 min of start, poll faster
    const soon = d.games.some((g) => {
      if (!isFuture(g.gameState)) return false;
      const t = new Date(g.startTimeUTC).getTime();
      const diff = t - Date.now();
      return diff > 0 && diff < 30 * 60 * 1000;
    });
    return soon ? POLL.near : POLL.idle;
  });
  const schedule = useMemo(() => adaptSchedule(scheduleRaw.data), [scheduleRaw.data]);

  // Fetch standings — lower cadence
  const standingsRaw = useNHL('v1/standings/now', POLL.standings);
  const standings = useMemo(() => adaptStandings(standingsRaw.data), [standingsRaw.data]);

  // Pick game ID to show on Game Tape: live > most recent finished
  const gameId = schedule.liveGame?.id || schedule.games[0]?.id || null;

  // Game detail endpoints
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

  // Merge team data from standings into schedule.team for sidebar display
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

  // Most recent refresh timestamp across all feeds
  const lastFetch = Math.max(
    scheduleRaw.lastFetch || 0,
    standingsRaw.lastFetch || 0,
    boxscore.lastFetch || 0
  ) || null;
  const anyError = scheduleRaw.error || standingsRaw.error;
  const refresh = useCallback(() => {
    scheduleRaw.refresh();
    standingsRaw.refresh();
    boxscore.refresh();
    rightRail.refresh();
    landing.refresh();
  }, [scheduleRaw, standingsRaw, boxscore, rightRail, landing]);

  return (
    <div className="min-h-screen bg-[#080808] text-white/90 relative">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700&family=Geist+Mono:wght@400;500;600&display=swap');
        html, body { background: #080808; }
        * { font-family: 'Geist', system-ui, -apple-system, sans-serif; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
        .font-mono, code, kbd { font-family: 'Geist Mono', ui-monospace, SF Mono, monospace !important; }
        .tabular-nums { font-variant-numeric: tabular-nums; }
        body {
          background:
            radial-gradient(ellipse 60% 40% at 100% 0%, rgba(247,73,2,0.04), transparent 60%),
            radial-gradient(ellipse 40% 30% at 0% 100%, rgba(247,73,2,0.03), transparent 60%),
            #080808;
          background-attachment: fixed;
        }
        ::selection { background: #F74902; color: #000; }
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.06); border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.12); }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
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
        />

        <div className="flex-1 min-w-0 flex flex-col min-h-screen">
          <Topbar
            page={page}
            setPage={setPage}
            liveGame={schedule.liveGame}
            lastFetch={lastFetch}
            error={anyError}
          />

          <main
            key={page}
            className="flex-1 min-w-0"
            style={{ animation: 'fadeIn 0.25s ease-out' }}
          >
            {page === 'dashboard' && <Dashboard schedule={schedule} standings={standings} loading={scheduleRaw.loading || standingsRaw.loading} />}
            {page === 'schedule'  && <Schedule schedule={schedule} />}
            {page === 'standings' && <Standings standings={standings} />}
            {page === 'game'      && <GameTape game={game} loading={boxscore.loading} />}
          </main>

          <Statusbar lastFetch={lastFetch} error={anyError} refresh={refresh} />
        </div>
      </div>
    </div>
  );
}
