import React, { useState, useEffect } from 'react';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { cx, isLive } from '../config.js';
import { Chip, Section, Skeleton, ScoreReadout } from '../components/primitives.jsx';
import { FlyersMark, TeamLogo } from '../components/Logo.jsx';
import { PlayerLink } from '../components/PlayerLink.jsx';
import { Headshot } from '../components/Headshot.jsx';
import { ShotMap } from '../components/ShotMap.jsx';
import { ShiftChart } from '../components/ShiftChart.jsx';
import { LinemateAnalysis } from '../components/LinemateAnalysis.jsx';
import { FaceoffSplits } from '../components/FaceoffSplits.jsx';
import { ScoreStateSplits } from '../components/ScoreStateSplits.jsx';
import { GoalieHeatMap } from '../components/GoalieHeatMap.jsx';
import { GoalieMatchup } from '../components/GoalieMatchup.jsx';
import { LiveShotTicker } from '../components/LiveShotTicker.jsx';
import { ShareGameButton } from '../components/ShareGame.jsx';
import { TeamLogoBg } from '../components/Watermark.jsx';
import { KioskMode, KioskTrigger } from '../components/KioskMode.jsx';
import { Hero } from '../components/Hero.jsx';

// Team-comparison row, executive layout. Order from outer-edge to
// inner-center on each side:
//   [ bar fill ]  [ team value ]  [ LABEL ]  [ team value ]  [ bar fill ]
// Numbers sit immediately adjacent to the center label (so the eye
// scans left→center→right naturally), bars extend outward from the
// numbers to the row edges. PHI bar uses the team orange, OPP bar uses
// neutral slate so identity is conveyed by color, advantage by a thin
// emerald underline + chevron on the leading number.
const CompareRow = ({ label, us, them, higherBetter = true, suffix = '', format }) => {
  if (us == null || them == null) return null;
  const total = us + them;
  const usShare = total > 0 ? (us / total) * 100 : 50;
  const themShare = 100 - usShare;
  const tied = us === them;
  const usWon = !tied && (higherBetter ? us > them : us < them);
  const themWon = !tied && !usWon;
  const delta = us - them;
  // Display-only formatting. Default is the value verbatim so existing
  // integer rows keep rendering identically; pass `format` for stats
  // that need decimals preserved (e.g. faceoff%, where toFixed(2)
  // returns '52.70' but a numeric coercion would drop the trailing 0).
  const fmt = format || ((v) => v);

  // Fixed-width value cell — both sides reserve the same horizontal
  // footprint regardless of digit count so the center label column lines
  // up perfectly down the table. Right-aligned on the PHI side, left-
  // aligned on the OPP side; the chevron sits on the inboard edge so it
  // hugs the label.
  const Number = ({ value, isWinner, side }) => (
    <div className={cx(
      'flex items-baseline gap-1.5 tabular-nums w-[72px]',
      side === 'left' ? 'justify-end' : 'justify-start flex-row-reverse',
    )}>
      {isWinner && <ChevronGlyph dir={side === 'left' ? 'right' : 'left'} />}
      <span
        className={cx(
          'text-[22px] font-semibold tracking-tight leading-none transition-colors',
          tied ? 'text-white/65' : isWinner ? 'text-white' : 'text-white/55',
        )}
        style={isWinner ? { borderBottom: '1px solid #34D399', paddingBottom: '2px' } : undefined}
      >
        {fmt(value)}{suffix}
      </span>
    </div>
  );

  return (
    <div className="grid grid-cols-[1fr_72px_140px_72px_1fr] items-center gap-4 h-14 px-5 transition-colors hover:bg-white/[0.015] border-b border-white/[0.04] last:border-b-0">
      {/* Outer bar — left side, anchored to the right edge of its cell so
          it grows toward the row edge as PHI's share increases. */}
      <div className="min-w-0">
        <div className="relative h-[3px] bg-white/[0.05] rounded-full overflow-hidden">
          <div
            className="absolute right-0 h-full rounded-l-full transition-[width] duration-500 ease-out"
            style={{
              width: `${usShare}%`,
              background: tied
                ? 'rgba(255,255,255,0.20)'
                : 'linear-gradient(to left, rgba(247,73,2,0.95), rgba(247,73,2,0.55))',
            }}
          />
        </div>
      </div>

      {/* PHI value — sits right against the center label */}
      <Number value={us} isWinner={usWon} side="left" />

      {/* Center label + delta */}
      <div className="flex flex-col items-center gap-0.5">
        <span className="text-[10px] font-mono text-white/40 tracking-[0.18em] uppercase whitespace-nowrap">
          {label}
        </span>
        <span className={cx(
          'text-[10px] font-mono tabular-nums transition-colors',
          tied ? 'text-white/30' : 'text-white/35',
        )}>
          {tied ? 'EVEN' : `${delta > 0 ? '+' : ''}${fmt(delta)}${suffix}`}
        </span>
      </div>

      {/* OPP value — sits right against the center label */}
      <Number value={them} isWinner={themWon} side="right" />

      {/* Outer bar — right side, anchored to the left edge of its cell so
          it grows toward the row edge as OPP's share increases. */}
      <div className="min-w-0">
        <div className="relative h-[3px] bg-white/[0.05] rounded-full overflow-hidden">
          <div
            className="absolute left-0 h-full rounded-r-full transition-[width] duration-500 ease-out"
            style={{
              width: `${themShare}%`,
              background: tied
                ? 'rgba(255,255,255,0.20)'
                : 'linear-gradient(to right, rgba(226,232,240,0.85), rgba(148,163,184,0.45))',
            }}
          />
        </div>
      </div>
    </div>
  );
};

// Aggregate footer that tallies how many categories each team leads
// (ties don't count). Single-line "PHI leads 4 · Tied 1 · OPP leads 2"
// readout that gives the boardroom takeaway in one glance.
const TeamComparisonFooter = ({ game }) => {
  const stats = [
    { us: game.stats.shots.us,        them: game.stats.shots.them,        higher: true  },
    { us: game.stats.hits.us,         them: game.stats.hits.them,         higher: true  },
    { us: game.stats.blocks.us,       them: game.stats.blocks.them,       higher: true  },
    { us: game.stats.faceoffPct.us,   them: game.stats.faceoffPct.them,   higher: true  },
    { us: game.stats.takeaways.us,    them: game.stats.takeaways.them,    higher: true  },
    { us: game.stats.giveaways.us,    them: game.stats.giveaways.them,    higher: false },
    { us: game.stats.pim.us,          them: game.stats.pim.them,          higher: false },
  ].filter((s) => s.us != null && s.them != null);

  let usWins = 0, themWins = 0, ties = 0;
  for (const s of stats) {
    if (s.us === s.them) { ties++; continue; }
    const usWon = s.higher ? s.us > s.them : s.us < s.them;
    if (usWon) usWins++; else themWins++;
  }
  if (stats.length === 0) return null;

  const edge = usWins - themWins;
  const verdict = edge > 0 ? 'PHI ahead in the box score' :
                  edge < 0 ? `${game.oppAbbr || 'Opp'} ahead in the box score` :
                  'Box score is even';

  return (
    <div className="border-t border-white/[0.05] px-5 py-3 flex items-center justify-between flex-wrap gap-3 bg-gradient-to-t from-white/[0.012] to-transparent">
      <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-wider">
        <span className="text-[#FF8A4C] font-semibold tabular-nums">PHI {usWins}</span>
        <span className="text-white/25">·</span>
        <span className="text-white/40">Tied {ties}</span>
        <span className="text-white/25">·</span>
        <span className="text-white/85 font-semibold tabular-nums">{game.oppAbbr || 'OPP'} {themWins}</span>
      </div>
      <span className="text-[11px] font-mono text-white/55">{verdict}</span>
    </div>
  );
};

// Tiny advantage chevron — subtle emerald pointing toward the winning
// side. Small enough to not be loud, present enough to be glanceable.
const ChevronGlyph = ({ dir }) => (
  <svg width="9" height="9" viewBox="0 0 9 9" aria-hidden className="shrink-0 text-emerald-400/85">
    {dir === 'left' ? (
      <path d="M6 1 L2 4.5 L6 8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    ) : (
      <path d="M3 1 L7 4.5 L3 8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    )}
  </svg>
);

const KIND_ICON = {
  goal: { label: 'GOAL', tone: 'orange' },
  'shot-on-goal': { label: 'SOG', tone: 'default' },
  'missed-shot': { label: 'MISS', tone: 'muted' },
  'blocked-shot': { label: 'BLK', tone: 'muted' },
  penalty: { label: 'PEN', tone: 'amber' },
  hit: { label: 'HIT', tone: 'default' },
  giveaway: { label: 'GA', tone: 'muted' },
  takeaway: { label: 'TA', tone: 'muted' },
  'period-start': { label: 'P-START', tone: 'default' },
  'period-end': { label: 'P-END', tone: 'muted' },
  'game-end': { label: 'END', tone: 'muted' },
};

const PBPRow = ({ ev }) => {
  // Brief flash on first mount — when the ticker re-renders with new events,
  // newer rows are inserted at the top so React mounts them fresh.
  const [fresh, setFresh] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setFresh(false), 1500);
    return () => clearTimeout(t);
  }, []);
  const cfg = KIND_ICON[ev.kind] || { label: ev.kind, tone: 'default' };
  const isGoal = ev.kind === 'goal';
  return (
    <div className={cx(
      'grid grid-cols-[44px_46px_1fr] items-start gap-3 px-4 py-2 transition-colors',
      ev.us && 'bg-[#F74902]/[0.04]',
      isGoal && !ev.us && 'bg-white/[0.02]',
      fresh && 'pulse-row',
    )}>
      <div className="text-[10px] font-mono text-white/40 tabular-nums">
        P{ev.period}<br />
        <span className="text-white/30">{ev.time}</span>
      </div>
      <div>
        <Chip tone={cfg.tone}>{cfg.label}</Chip>
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <span className={cx('text-[10px] font-mono shrink-0',
            ev.us ? 'text-[#FF8A4C]' : 'text-white/40'
          )}>{ev.team}</span>
          <span className={cx('text-[12px] truncate',
            isGoal ? 'font-medium text-white' : 'text-white/80'
          )}>{ev.summary}</span>
        </div>
      </div>
    </div>
  );
};

const goalIcon = (s) => {
  if (s.modifier === 'empty-net') return <Chip tone="muted">EN</Chip>;
  if (s.strength === 'pp') return <Chip tone="orange">PP</Chip>;
  if (s.strength === 'sh') return <Chip tone="amber">SH</Chip>;
  return null;
};

const GoalieRow = ({ g, isUs, teamAbbr }) => (
  <tr className="hover:bg-white/[0.02]">
    <td className="px-4 text-right text-[10px] font-mono tabular-nums text-white/30 h-10">{g.num}</td>
    <td className="px-2 text-[12px] text-white/85 h-10">
      <span className="inline-flex items-center gap-2">
        <Headshot playerId={g.id} teamAbbrev={teamAbbr} num={g.num} size={22} />
        <PlayerLink playerId={g.id}>{g.name}</PlayerLink>
        {g.starter && <span className="text-[9px] font-mono text-white/35">START</span>}
        {g.decision && (
          <span className={cx('text-[10px] font-mono px-1 rounded',
            g.decision === 'W' ? 'bg-[#F74902]/15 text-[#FF8A4C]' :
            g.decision === 'L' ? 'bg-white/[0.04] text-white/45' :
            'bg-white/[0.04] text-white/55'
          )}>{g.decision}</span>
        )}
      </span>
    </td>
    <td className="px-2 text-right text-[11px] font-mono tabular-nums text-white/65">{g.saves ?? '—'}</td>
    <td className="px-2 text-right text-[11px] font-mono tabular-nums text-white/65">{g.sa ?? '—'}</td>
    <td className={cx('px-2 text-right text-[11px] font-mono tabular-nums',
      g.ga === 0 ? 'text-emerald-400' : g.ga >= 4 ? 'text-red-400' : 'text-white/65'
    )}>{g.ga ?? '—'}</td>
    <td className={cx('px-2 text-right text-[11px] font-mono tabular-nums',
      g.savePct >= 92 ? (isUs ? 'text-[#FF8A4C]' : 'text-emerald-400') : 'text-white/65'
    )}>{g.savePct != null ? `${g.savePct}%` : '—'}</td>
    <td className="px-4 text-right text-[11px] font-mono tabular-nums text-white/55">{g.toi}</td>
  </tr>
);

export const GameTape = ({ game, loading, pbp, pbpRaw, liveSnap, schedule, standings, customGameId, onClearCustom }) => {
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
        <div className="border border-[#F74902]/[0.18] bg-[#0C0C0C]/60 rounded-md p-10 text-center relative overflow-hidden">
          <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.03), transparent 60%)' }} />
          <div className="flex justify-center"><FlyersMark size={28} /></div>
          <div className="text-[14px] text-white/85 mt-4">Between periods.</div>
          <div className="text-[11px] font-mono text-white/40 mt-1">No game in progress. Tape will populate after the next puck drop.</div>
        </div>
      </div>
    );
  }

  const liveNow = isLive(game.state);
  const periods = Object.keys(game.periods).map(Number).sort((a, b) => a - b);
  const [kioskOpen, setKioskOpen] = useState(false);

  // SSE overlay — when the live stream has emitted a fresh snapshot
  // (<6s old) prefer its score/period/clock so the header updates in
  // ~2s instead of waiting on the 5s polled boxscore. Falls back to
  // the polled `game` data the moment the stream is silent.
  const snapFresh = liveNow && liveSnap?.ts && (Date.now() - liveSnap.ts) < 6000;
  const liveScore = snapFresh && liveSnap?.away?.score != null && liveSnap?.home?.score != null
    ? {
        us:   game.home ? liveSnap.home.score : liveSnap.away.score,
        them: game.home ? liveSnap.away.score : liveSnap.home.score,
      }
    : game.score;
  const livePeriod = (snapFresh && liveSnap?.periodDescriptor) || game.periodDescriptor;
  const liveClock  = (snapFresh && liveSnap?.clock) || game.clock;

  // Adapt the boxscore-shaped game into the schedule-shape Hero expects.
  // Hero looks at three slots — liveGame / nextGame / lastResult — and
  // picks the matching layout. Route the current game into the slot that
  // matches its actual state.
  const isFinal = game.state === 'FINAL' || game.state === 'OFF';
  const gameAsScheduleRow = {
    id: game.id,
    opp: game.oppAbbr,
    oppName: game.oppName,
    home: game.home,
    state: game.state,
    venue: game.venue,
    gameType: game.gameType,
    startUTC: game.startTimeUTC,
    date: game.date,
    label: game.dateLabel,
    us: liveScore.us,
    them: liveScore.them,
    w: isFinal ? liveScore.us > liveScore.them : false,
    lastPeriodType: game.periodDescriptor?.periodType,
  };
  const heroLive = liveNow ? gameAsScheduleRow : null;
  const heroLast = !liveNow && isFinal ? gameAsScheduleRow : null;
  const heroNext = !liveNow && !isFinal ? gameAsScheduleRow : null;
  const recentForHero = (schedule?.games || []).slice(0, 10);
  const us = standings?.us;

  return (
    <div className="p-3 md:p-5 space-y-3">
      {kioskOpen && (
        <KioskMode game={game} onClose={() => setKioskOpen(false)} />
      )}
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            {customGameId && (
              <button
                onClick={onClearCustom}
                className="flex items-center gap-1 px-2 h-6 border border-white/[0.08] hover:border-white/20 bg-white/[0.02] rounded-md transition-colors text-[10px] font-mono text-white/55 hover:text-white"
              >
                <ArrowLeft size={10} /> latest
              </button>
            )}
            <h1 className="text-[20px] font-semibold tracking-tight">Game Tape</h1>
          </div>
          <p className="text-[12px] text-white/45 mt-1 font-mono">
            {liveNow ? 'Live game' : customGameId ? 'Selected game' : 'Last game'} · {game.dateLabel} · vs {game.oppName}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {liveNow ? (
            <Chip tone="live" pulse>
              LIVE · P{livePeriod?.number || '?'} {liveClock?.timeRemaining || ''}
            </Chip>
          ) : (
            <Chip tone={game.score.us > game.score.them ? 'orange' : 'muted'}>
              ● {game.score.us > game.score.them ? 'W' : 'L'} · {game.score.us}–{game.score.them}
            </Chip>
          )}
          <KioskTrigger onClick={() => setKioskOpen(true)} />
          {!liveNow && <ShareGameButton game={game} />}
        </div>
      </div>

      {/* Hero banner — same broadcast-style card the Dashboard uses,
          fed with the currently-loaded game's data. Hero handles the
          live / next / final layout switch internally based on which
          slot we populate. */}
      <Hero
        liveGame={heroLive}
        liveDetail={heroLive ? game : null}
        liveSnap={heroLive ? liveSnap : null}
        nextGame={heroNext}
        lastResult={heroLast}
        us={us}
        recentGames={recentForHero}
        standings={standings}
      />

      {/* Periods strip — kept under the Hero since it's a Game Tape
          specific surface (scoring by period across the full game) and
          doesn't live on the Dashboard Hero. */}
      <div className="border border-[#F74902]/[0.18] bg-[#0C0C0C]/60 rounded-md p-4 relative overflow-hidden">
        {periods.length > 0 && (
          <div className="relative grid grid-cols-4 gap-2">
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
                {liveScore.us}–{liveScore.them}
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <Section title="Team Comparison">
          {/* Header: team logos + abbreviations on each side, balanced
              around the centerline so the panel reads as a head-to-head
              rather than a generic table. */}
          {/* Header uses the same 5-column template as the rows so the
              center axis lines up exactly. Team identity blocks span the
              left two and right two columns respectively. */}
          <div className="grid grid-cols-[1fr_72px_140px_72px_1fr] items-center gap-4 h-16 px-5 border-b border-white/[0.05] bg-gradient-to-b from-white/[0.015] to-transparent">
            <div className="col-span-2 flex items-center justify-end gap-3">
              <div className="text-right">
                <div className="text-[18px] font-semibold tracking-tight text-[#FF8A4C] leading-none">PHI</div>
                <div className="text-[10px] font-mono text-white/35 uppercase tracking-wider mt-1">Flyers</div>
              </div>
              <FlyersMark size={36} />
            </div>
            <div className="flex flex-col items-center gap-1">
              <span className="text-[9px] font-mono text-white/30 tracking-[0.22em] uppercase">vs</span>
            </div>
            <div className="col-span-2 flex items-center gap-3">
              <TeamLogo abbr={game.oppAbbr} size={36} />
              <div>
                <div className="text-[18px] font-semibold tracking-tight text-white/90 leading-none">{game.oppAbbr}</div>
                <div className="text-[10px] font-mono text-white/35 uppercase tracking-wider mt-1">Opponent</div>
              </div>
            </div>
          </div>

          <div className="py-1">
            <CompareRow label="Shots"       us={game.stats.shots.us}       them={game.stats.shots.them} />
            <CompareRow label="Hits"        us={game.stats.hits.us}        them={game.stats.hits.them} />
            <CompareRow label="Blocks"      us={game.stats.blocks.us}      them={game.stats.blocks.them} />
            <CompareRow label="Faceoff %"   us={game.stats.faceoffPct.us}  them={game.stats.faceoffPct.them} suffix="%" format={(v) => Number(v).toFixed(2)} />
            <CompareRow label="Takeaways"   us={game.stats.takeaways.us}   them={game.stats.takeaways.them} />
            <CompareRow label="Giveaways"   us={game.stats.giveaways.us}   them={game.stats.giveaways.them}   higherBetter={false} />
            <CompareRow label="PIM"         us={game.stats.pim.us}         them={game.stats.pim.them}          higherBetter={false} />
          </div>

          {/* Footer: aggregate "edge" tally so the boardroom takeaway is
              one glance — N of M categories where each side leads. */}
          <TeamComparisonFooter game={game} />
        </Section>

        {/* Live game-state band — Shot Ticker, Live Events, Three Stars,
            Key Numbers. 2-col on tablet, 4-col on xl so each panel has
            consistent breathing room and the row doesn't end with a
            single orphan card. */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {pbpRaw && (
            <LiveShotTicker pbpRaw={pbpRaw} isLive={isLive(game.state)} oppAbbr={game.oppAbbr} />
          )}

          {pbp && pbp.events.length > 0 && (
            <Section
              title={<span className="flex items-center gap-2">Live Events {isLive(game.state) && <Chip tone="live" pulse>LIVE</Chip>}</span>}
              action={<span className="text-[10px] font-mono text-white/40">{pbp.events.length} shown</span>}
            >
              <div className="divide-y divide-white/[0.04] max-h-[480px] overflow-y-auto">
                {pbp.events.slice(0, 60).map((e) => (
                  <PBPRow key={e.id} ev={e} />
                ))}
              </div>
            </Section>
          )}

          {game.stars.length > 0 && (
            <Section title="Three Stars">
              <div className="divide-y divide-white/[0.04]">
                {game.stars.map((s) => (
                  <div key={s.star} className="flex items-center gap-3 px-4 py-3">
                    <span className="text-[22px] font-semibold tabular-nums text-[#F74902]/60 w-8">★{s.star}</span>
                    <Headshot playerId={s.id} teamAbbrev={s.teamAbbrev} size={32} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-[12px] font-medium truncate">
                          <PlayerLink playerId={s.id}>{s.name}</PlayerLink>
                        </span>
                        <span className="flex items-center gap-1.5 text-[10px] font-mono text-white/35 shrink-0">
                          <TeamLogo abbr={s.teamAbbrev} size={12} />
                          {s.teamAbbrev} · {s.position}
                        </span>
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
                { l: 'Power Play',           v: game.stats.powerPlay.us != null ? `${game.stats.powerPlay.us}${game.stats.powerPlayPctg.us != null ? ` · ${game.stats.powerPlayPctg.us}%` : ''}` : '—' },
                { l: 'PK Faced',             v: game.stats.powerPlay.them != null ? `${game.stats.powerPlay.them}` : '—' },
                { l: 'Faceoff %',            v: game.stats.faceoffPct.us != null ? `${(game.stats.faceoffPct.us).toFixed(2)}%` : '—' },
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

        <GameInfoPanel game={game} />

        {pbpRaw && (
          <Section title="Shot Map" action={<span className="text-[10px] font-mono text-white/40">offensive zone · all periods</span>}>
            <ShotMap pbpData={pbpRaw} oppAbbr={game.oppAbbr} />
          </Section>
        )}

        {pbpRaw && <ScoreStateSplits pbpRaw={pbpRaw} />}

        {pbpRaw && <GoalieHeatMap pbpRaw={pbpRaw} />}

        {game.goalies?.them?.length > 0 && (
          <GoalieMatchup goalies={game.goalies} oppAbbr={game.oppAbbr} />
        )}

        {pbpRaw && <FaceoffSplits pbpRaw={pbpRaw} />}

        {game.id && (
          <ShiftChart gameId={game.id} isPlayoff={game.gameType === 3} />
        )}

        {game.id && (
          <LinemateAnalysis gameId={game.id} />
        )}

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
                  {game.skaters.map((s) => {
                    const displayName = typeof s.name === 'string' ? s.name : (s.name?.default || '—');
                    return (
                    <tr key={s.id || `${displayName}-${s.num}`} className="hover:bg-white/[0.02]">
                      <td className="px-4 text-right text-[10px] font-mono tabular-nums text-white/30 h-10">{s.num}</td>
                      <td className="px-2 text-[12px] text-white/85">
                        <span className="flex items-center gap-2">
                          <Headshot playerId={s.id} teamAbbrev="PHI" num={s.num} size={22} />
                          <PlayerLink playerId={s.id}>{displayName}</PlayerLink>
                        </span>
                      </td>
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
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Section>

          {(game.goalies.us.length > 0 || game.goalies.them.length > 0) && (
            <Section title="Goalies">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-[10px] font-mono text-white/35 uppercase tracking-wider border-b border-white/[0.05]">
                      <th className="font-normal text-left px-4 h-8 w-[36px]">#</th>
                      <th className="font-normal text-left px-2 h-8">Goalie</th>
                      <th className="font-normal text-right px-2 h-8 w-[44px]">SV</th>
                      <th className="font-normal text-right px-2 h-8 w-[44px]">SA</th>
                      <th className="font-normal text-right px-2 h-8 w-[44px]">GA</th>
                      <th className="font-normal text-right px-2 h-8 w-[60px]">SV%</th>
                      <th className="font-normal text-right px-4 h-8 w-[60px]">TOI</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {game.goalies.us.length > 0 && (
                      <tr className="bg-[#F74902]/[0.04]">
                        <td colSpan={7} className="px-4 h-7 text-[10px] font-mono text-[#FF8A4C]/80 uppercase tracking-wider">PHI</td>
                      </tr>
                    )}
                    {game.goalies.us.map((g) => <GoalieRow key={`u-${g.num}`} g={g} isUs teamAbbr="PHI" />)}
                    {game.goalies.them.length > 0 && (
                      <tr className="bg-white/[0.02]">
                        <td colSpan={7} className="px-4 h-7 text-[10px] font-mono text-white/45 uppercase tracking-wider">{game.oppAbbr}</td>
                      </tr>
                    )}
                    {game.goalies.them.map((g) => <GoalieRow key={`t-${g.num}`} g={g} isUs={false} teamAbbr={game.oppAbbr} />)}
                  </tbody>
                </table>
              </div>
            </Section>
          )}

          {game.timeline.length > 0 && (
            <Section title="Goals" action={<span className="text-[10px] font-mono text-white/40">{game.timeline.length} total</span>}>
              <div className="divide-y divide-white/[0.04]">
                {game.timeline.map((g, i) => (
                  <div key={i} className={cx(
                    'grid grid-cols-[36px_56px_1fr_84px_28px] items-center gap-3 px-4 h-12',
                    g.us ? 'bg-[#F74902]/[0.04]' : 'hover:bg-white/[0.02]',
                  )}>
                    <span className="text-[10px] font-mono text-white/40 uppercase">
                      P{g.period}{g.periodType === 'OT' ? ' OT' : g.periodType === 'SO' ? ' SO' : ''}
                    </span>
                    <span className="text-[11px] font-mono text-white/55 tabular-nums">{g.time}</span>
                    <div className="flex items-center gap-2 min-w-0">
                      <Headshot playerId={g.scorerId} teamAbbrev={g.team} size={26} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <TeamLogo abbr={g.team} size={14} />
                          <span className={cx('text-[12px] font-medium truncate',
                            g.us ? 'text-white' : 'text-white/85'
                          )}>
                            <PlayerLink playerId={g.scorerId}>{g.scorer}</PlayerLink>
                          </span>
                          {g.scorerTotal && <span className="text-[10px] font-mono text-white/30">({g.scorerTotal})</span>}
                          {goalIcon(g)}
                        </div>
                        {g.assists.length > 0 && (
                          <div className="text-[10px] text-white/45 font-mono mt-0.5 truncate">
                            assists: {g.assists.map((a, i) => (
                              <React.Fragment key={a.id || i}>
                                {i > 0 && ', '}
                                <PlayerLink playerId={a.id} className="text-white/55 hover:text-[#FF8A4C]">{a.name}</PlayerLink>
                              </React.Fragment>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] font-mono tabular-nums text-white/65">
                        {g.awayScore}<span className="text-white/25 mx-0.5">–</span>{g.homeScore}
                      </span>
                      {g.shotType && (
                        <div className="text-[9px] font-mono text-white/35 mt-0.5">{g.shotType}</div>
                      )}
                    </div>
                    {g.highlightUrl ? (
                      <a
                        href={`https://www.${g.highlightUrl.replace(/^https?:\/\/(www\.)?/, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Watch highlight on NHL.com"
                        className="flex items-center justify-center w-6 h-6 rounded-md text-white/40 hover:text-[#FF8A4C] hover:bg-white/[0.04] transition-colors"
                        aria-label="Watch highlight"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                      </a>
                    ) : <span />}
                  </div>
                ))}
              </div>
            </Section>
          )}
      </div>
    </div>
  );
};

// Game Info — officials (referees + linesmen), head coaches, and scratches.
// All sourced from the right-rail payload's gameInfo block (see adaptGame).
// Renders only when at least one of the fields is populated; useful for
// retroactive games where right-rail data is filled in after final.
const GameInfoPanel = ({ game }) => {
  const o = game.officials || {};
  const c = game.coaches || {};
  const sc = game.scratches || {};
  const hasOfficials = (o.referees?.length || 0) + (o.linesmen?.length || 0) > 0;
  const hasCoaches = c.us || c.them;
  const hasScratches = (sc.us?.length || 0) + (sc.them?.length || 0) > 0;
  if (!hasOfficials && !hasCoaches && !hasScratches) return null;

  return (
    <Section title="Game Info" action={<span className="text-[10px] font-mono text-white/40">officials · coaches · scratches</span>}>
      <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {hasOfficials && (
          <div>
            <div className="text-[10px] font-mono text-white/40 uppercase tracking-wider mb-2">Officials</div>
            {o.referees.length > 0 && (
              <div className="space-y-1 mb-2">
                <div className="text-[10px] font-mono text-[#FF8A4C]/70">Referees</div>
                {o.referees.map((n, i) => (
                  <div key={i} className="text-[12px] text-white/85 flex items-center gap-2">
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#F74902]/15 border border-[#F74902]/30 text-[9px] font-mono text-[#FF8A4C]">R</span>
                    <span>{n}</span>
                  </div>
                ))}
              </div>
            )}
            {o.linesmen.length > 0 && (
              <div className="space-y-1">
                <div className="text-[10px] font-mono text-white/40">Linesmen</div>
                {o.linesmen.map((n, i) => (
                  <div key={i} className="text-[12px] text-white/85 flex items-center gap-2">
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-white/[0.06] border border-white/15 text-[9px] font-mono text-white/55">L</span>
                    <span>{n}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {hasCoaches && (
          <div>
            <div className="text-[10px] font-mono text-white/40 uppercase tracking-wider mb-2">Head Coaches</div>
            {c.us && (
              <div className="text-[12px] text-white/85 mb-1">
                <span className="text-[#FF8A4C] font-mono text-[10px] mr-2">PHI</span>
                {c.us}
              </div>
            )}
            {c.them && (
              <div className="text-[12px] text-white/85">
                <span className="text-white/45 font-mono text-[10px] mr-2">{game.oppAbbr}</span>
                {c.them}
              </div>
            )}
          </div>
        )}

        {hasScratches && (
          <div>
            <div className="text-[10px] font-mono text-white/40 uppercase tracking-wider mb-2">Scratches</div>
            {sc.us?.length > 0 && (
              <div className="mb-2">
                <div className="text-[10px] font-mono text-[#FF8A4C]/70 mb-1">PHI · {sc.us.length}</div>
                <div className="flex flex-wrap gap-1">
                  {sc.us.map((p) => (
                    <span key={p.id} className="inline-flex items-center gap-1 text-[11px] font-mono px-2 h-5 rounded-sm bg-white/[0.04] text-white/70">
                      {p.num != null && <span className="text-white/35">#{p.num}</span>}
                      <span>{p.name}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
            {sc.them?.length > 0 && (
              <div>
                <div className="text-[10px] font-mono text-white/45 mb-1">{game.oppAbbr} · {sc.them.length}</div>
                <div className="flex flex-wrap gap-1">
                  {sc.them.map((p) => (
                    <span key={p.id} className="inline-flex items-center gap-1 text-[11px] font-mono px-2 h-5 rounded-sm bg-white/[0.04] text-white/65">
                      {p.num != null && <span className="text-white/35">#{p.num}</span>}
                      <span>{p.name}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Section>
  );
};
