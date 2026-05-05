import { useEffect, useMemo, useState } from 'react';
import { cx, OPP_FULL, fmtTime, fmtDateFull } from '../config.js';
import { FlyersMark, TeamLogo } from '../components/Logo.jsx';
import { Chip } from '../components/primitives.jsx';

// TV/broadcast view of the current game. Designed for second-screen use:
// big fonts, glanceable layout, no nav chrome competing for attention.
// Renders one of three states based on game phase:
//
//   PRE   — countdown clock + matchup record + recent form
//   LIVE  — score / period / clock at the top, side stats below, period
//           rail + recent goals + (optional) three-stars when final
//   FINAL — score with WIN/LOSS chip, three stars, period rail, goal log
//
// Pulls everything from props the App already fetches; no extra fetches.
//
// To use as a TV display, hide the sidebar via the Sidebar's mobile-style
// collapse and stretch the page to viewport height.

const PuckClock = ({ startUTC }) => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!startUTC) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [startUTC]);
  if (!startUTC) return null;
  const ms = new Date(startUTC).getTime() - now;
  if (ms <= 0) return <span className="text-white/60">starting…</span>;
  const total = Math.floor(ms / 1000);
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return (
    <div className="font-semibold tabular-nums tracking-tight text-[#FF8A4C] flex items-baseline gap-2 leading-none"
      style={{ textShadow: '0 0 32px rgba(247,73,2,0.4), 0 4px 8px rgba(0,0,0,0.6)' }}>
      {d > 0 && <><span className="text-[120px] xl:text-[160px]">{d}</span><span className="text-[40px] xl:text-[56px] text-white/40 mr-3">d</span></>}
      <span className="text-[120px] xl:text-[160px]">{String(h).padStart(2, '0')}</span>
      <span className="text-[64px] xl:text-[88px] text-white/35 mx-1">:</span>
      <span className="text-[120px] xl:text-[160px]">{String(m).padStart(2, '0')}</span>
      <span className="text-[64px] xl:text-[88px] text-white/35 mx-1">:</span>
      <span className="text-[120px] xl:text-[160px]">{String(s).padStart(2, '0')}</span>
    </div>
  );
};

const TeamBlock = ({ abbr, isHome, isUs, score }) => (
  <div className="flex flex-col items-center gap-4">
    {isUs
      ? <FlyersMark size={180} />
      : <TeamLogo abbr={abbr} size={180} />}
    <div className="text-[64px] xl:text-[80px] font-semibold tracking-tight leading-none"
      style={{ textShadow: '0 4px 8px rgba(0,0,0,0.6)' }}>{abbr}</div>
    {score != null && (
      <div className={cx('text-[200px] xl:text-[260px] font-semibold tabular-nums leading-none',
        isUs ? 'text-[#FF8A4C]' : 'text-white/85')}
        style={{ textShadow: isUs
          ? '0 0 40px rgba(247,73,2,0.4), 0 4px 8px rgba(0,0,0,0.6)'
          : '0 4px 8px rgba(0,0,0,0.6)' }}>
        {score}
      </div>
    )}
    <div className="text-[14px] xl:text-[16px] font-mono uppercase tracking-wider text-white/40">
      {isHome ? 'Home' : 'Away'}
    </div>
  </div>
);

const StatTile = ({ label, us, them, accent }) => (
  <div className="flex-1 px-6 py-4 rounded-lg border border-white/[0.06] bg-white/[0.02]">
    <div className="text-[12px] xl:text-[14px] font-mono text-white/40 uppercase tracking-wider mb-2">{label}</div>
    <div className="flex items-baseline justify-between gap-3 tabular-nums">
      <span className={cx('text-[36px] xl:text-[48px] font-semibold leading-none',
        accent === 'good' ? 'text-emerald-400' : 'text-[#FF8A4C]')}>{us ?? '—'}</span>
      <span className="text-[18px] xl:text-[20px] text-white/25">·</span>
      <span className="text-[28px] xl:text-[36px] font-semibold text-white/65 leading-none">{them ?? '—'}</span>
    </div>
  </div>
);

const PeriodRail = ({ periods, isHome }) => {
  const rows = Object.entries(periods || {}).sort(([a], [b]) => Number(a) - Number(b));
  if (!rows.length) return null;
  return (
    <div className="flex items-center gap-3">
      {rows.map(([num, [uG, tG]]) => (
        <div key={num} className="flex flex-col items-center px-4 py-2.5 rounded-lg border border-white/[0.06] bg-white/[0.02]">
          <span className="text-[10px] xl:text-[12px] font-mono uppercase tracking-wider text-white/40">P{num}</span>
          <div className="flex items-center gap-2 tabular-nums">
            <span className="text-[20px] xl:text-[24px] font-semibold text-[#FF8A4C]">{uG}</span>
            <span className="text-[14px] text-white/25">·</span>
            <span className="text-[20px] xl:text-[24px] font-semibold text-white/65">{tG}</span>
          </div>
        </div>
      ))}
    </div>
  );
};

const GoalRow = ({ g }) => (
  <div className="flex items-center justify-between gap-4 px-4 py-2.5 border-b border-white/[0.04]">
    <div className="flex items-center gap-3 min-w-0">
      <span className={cx('w-1.5 h-1.5 rounded-full shrink-0',
        g.us ? 'bg-[#F74902]' : 'bg-white/55')} />
      <span className="text-[10px] xl:text-[11px] font-mono text-white/35 tabular-nums shrink-0">
        P{g.period}{g.periodType === 'OT' ? ' OT' : g.periodType === 'SO' ? ' SO' : ''} · {g.time}
      </span>
      <span className={cx('text-[14px] xl:text-[16px] truncate',
        g.us ? 'text-[#FF8A4C]' : 'text-white/85')}>
        {g.scorer}
      </span>
      {g.assists?.length > 0 && (
        <span className="text-[10px] xl:text-[12px] text-white/40 truncate">
          ({g.assists.map((a) => a.name).join(', ')})
        </span>
      )}
    </div>
    <span className="text-[14px] xl:text-[16px] font-mono tabular-nums text-white/65 shrink-0">
      {g.score?.us}–{g.score?.them}
    </span>
  </div>
);

const ThreeStarsRibbon = ({ stars }) => {
  if (!stars?.length) return null;
  return (
    <div className="flex items-center gap-3 flex-wrap">
      {stars.map((s) => (
        <div key={s.star} className="flex items-center gap-3 px-4 py-2 rounded-lg border border-white/[0.06] bg-white/[0.02]">
          <span className="text-[24px] xl:text-[28px] font-semibold text-[#FF8A4C] tabular-nums">{s.star}★</span>
          <div>
            <div className="text-[14px] xl:text-[16px] text-white/85">{s.name}</div>
            <div className="text-[10px] xl:text-[11px] font-mono text-white/45 tabular-nums">
              {s.teamAbbrev}
              {s.points != null && ` · ${s.goals}G ${s.assists}A ${s.points}P`}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export const Broadcast = ({ schedule, liveDetail, lastGame }) => {
  const liveGame = schedule?.liveGame;
  const nextGame = schedule?.nextGame;
  const games = schedule?.games || [];
  const lastResult = games[0];

  // What state to render
  const phase = liveGame ? 'LIVE' : nextGame ? 'PRE' : lastResult ? 'FINAL' : 'IDLE';

  const usAbbr = 'PHI';
  const oppAbbr = liveGame?.opp || nextGame?.opp || lastResult?.opp;
  const isHome = liveGame?.home ?? nextGame?.home ?? lastResult?.home;

  const detail = phase === 'LIVE' ? liveDetail : phase === 'FINAL' ? lastGame : null;
  const period = detail?.periodDescriptor;
  const periodLabel = period?.periodType === 'OT' ? 'OT'
    : period?.periodType === 'SO' ? 'SO'
    : period?.number ? `P${period.number}` : null;

  const us = liveGame?.us ?? lastResult?.us ?? null;
  const them = liveGame?.them ?? lastResult?.them ?? null;

  const won = phase === 'FINAL' ? lastResult?.w : null;

  const sog = detail?.stats?.shots;
  const pp = detail?.stats?.powerPlay;
  const fo = detail?.stats?.faceoffPct;
  const hits = detail?.stats?.hits;
  const blocks = detail?.stats?.blocks;

  return (
    <div className="px-6 xl:px-10 py-6 xl:py-8 space-y-6 xl:space-y-8 min-h-[calc(100vh-48px)]">
      {/* TOP BAR — date / venue / phase chip */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          {phase === 'LIVE' && <Chip tone="live" pulse>LIVE</Chip>}
          {phase === 'PRE' && <Chip tone="orange">NEXT</Chip>}
          {phase === 'FINAL' && (
            <Chip tone={won ? 'orange' : 'muted'}>{won ? '● WIN' : '● LOSS'}</Chip>
          )}
          <span className="text-[14px] xl:text-[16px] font-mono uppercase tracking-wider text-white/55">
            {phase === 'LIVE' && periodLabel}
            {phase === 'LIVE' && detail?.clock?.timeRemaining && (
              <span className="ml-2 text-white/85 tabular-nums">{detail.clock.inIntermission ? 'INT' : detail.clock.timeRemaining}</span>
            )}
            {phase === 'PRE' && nextGame && `${fmtDateFull(nextGame.startUTC)} · ${fmtTime(nextGame.startUTC)}`}
            {phase === 'FINAL' && lastResult && `${fmtDateFull(lastResult.date)} · Final`}
          </span>
        </div>
        <span className="text-[14px] xl:text-[16px] font-mono uppercase tracking-wider text-white/35">
          flyers.fan · broadcast view
        </span>
      </div>

      {/* MAIN MATCHUP */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-8 xl:gap-12 py-6 xl:py-10">
        <TeamBlock abbr={usAbbr} isHome={isHome} isUs score={us} />

        <div className="flex flex-col items-center gap-4">
          {phase === 'PRE' ? (
            <>
              <div className="text-[14px] xl:text-[16px] font-mono text-white/40 uppercase tracking-wider">Puck drops in</div>
              <PuckClock startUTC={nextGame?.startUTC} />
            </>
          ) : (
            <>
              {periodLabel && (
                <div className="text-[36px] xl:text-[48px] font-semibold tracking-tight text-white/55 leading-none tabular-nums">
                  {periodLabel}
                </div>
              )}
              {detail?.clock?.timeRemaining && phase === 'LIVE' && (
                <div className="text-[60px] xl:text-[80px] font-semibold tracking-tight text-white tabular-nums leading-none">
                  {detail.clock.inIntermission ? 'INT' : detail.clock.timeRemaining}
                </div>
              )}
              {phase === 'FINAL' && (
                <div className="text-[36px] xl:text-[48px] font-mono text-white/40 leading-none">FINAL</div>
              )}
            </>
          )}
        </div>

        <TeamBlock abbr={oppAbbr} isHome={!isHome} score={them} />
      </div>

      {/* SIDE STATS — only meaningful during LIVE / FINAL */}
      {detail && (sog?.us != null || pp?.us != null) && (
        <div className="flex items-stretch gap-3 flex-wrap">
          {sog?.us != null && <StatTile label="Shots" us={sog.us} them={sog.them} />}
          {pp?.us != null && <StatTile label="Power Play" us={pp.us} them={pp.them} />}
          {fo?.us != null && <StatTile label="Faceoff %" us={`${fo.us}%`} them={`${fo.them}%`} />}
          {hits?.us != null && <StatTile label="Hits" us={hits.us} them={hits.them} />}
          {blocks?.us != null && <StatTile label="Blocks" us={blocks.us} them={blocks.them} />}
        </div>
      )}

      {/* PERIOD RAIL */}
      {detail?.periods && Object.keys(detail.periods).length > 0 && (
        <PeriodRail periods={detail.periods} isHome={isHome} />
      )}

      {/* THREE STARS — only on FINAL */}
      {phase === 'FINAL' && detail?.stars?.length > 0 && (
        <div>
          <div className="text-[12px] xl:text-[14px] font-mono uppercase tracking-wider text-white/40 mb-3">Three Stars</div>
          <ThreeStarsRibbon stars={detail.stars} />
        </div>
      )}

      {/* GOAL LOG */}
      {detail?.timeline?.length > 0 && (
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.02]">
          <div className="px-4 py-2.5 border-b border-white/[0.06] flex items-center justify-between">
            <span className="text-[12px] xl:text-[14px] font-mono uppercase tracking-wider text-white/55">Scoring Plays</span>
            <span className="text-[10px] xl:text-[12px] font-mono text-white/35 tabular-nums">{detail.timeline.length}</span>
          </div>
          {detail.timeline.map((g, i) => <GoalRow key={i} g={g} />)}
        </div>
      )}

      {/* IDLE / off-day */}
      {phase === 'IDLE' && (
        <div className="text-center py-20 text-[18px] xl:text-[24px] font-mono text-white/45">
          No game data available.
        </div>
      )}
    </div>
  );
};
