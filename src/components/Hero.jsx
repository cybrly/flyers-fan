import { useEffect, useState } from 'react';
import { cx, OPP_FULL, fmtTime, fmtDateFull } from '../config.js';
import { useScoreBurst } from '../api.js';
import { Chip } from './primitives.jsx';
import { FlyersMark, TeamLogo } from './Logo.jsx';
import { WinProbability, PaceProjection, GoalCelebration } from './LiveTiles.jsx';

// Inline keyframes for the slow rink rotation + puck pulse. Kept here rather
// than in a global stylesheet because they're only used by the Hero centerpiece.
const HERO_KEYFRAMES = `
@keyframes flyersHeroSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
@keyframes flyersHeroPuckPulse {
  0%, 100% { opacity: 0.55; transform: scale(1); }
  50%      { opacity: 1;    transform: scale(1.18); }
}
`;

// Full-rink overhead graphic. Spans the entire Hero width as a stylized
// hockey rink — rounded boards, two blue lines, red center line, goal lines,
// center face-off circle, four end-zone face-off circles, and goal creases.
// Positioned in the upper band so the bottom HeroStats strip stays uncovered.
// Glowing orange puck at center ice pulses to keep the panel feeling alive.
const FullRinkMark = () => (
  <div
    aria-hidden
    className="pointer-events-none absolute inset-x-0 top-2 sm:top-3 select-none"
    style={{ height: 'calc(100% - 130px)', minHeight: 160 }}
  >
    <style>{HERO_KEYFRAMES}</style>
    <svg
      viewBox="0 0 1000 240"
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMid meet"
      style={{ opacity: 0.32 }}
    >
      <defs>
        {/* A subtle radial fade so the rink edges don't visually fight the
            Hero card border. Brightest at center ice. */}
        <radialGradient id="rinkFade" cx="50%" cy="50%" r="55%">
          <stop offset="0%"   stopColor="white" stopOpacity="1" />
          <stop offset="80%"  stopColor="white" stopOpacity="0.5" />
          <stop offset="100%" stopColor="white" stopOpacity="0.05" />
        </radialGradient>
        <mask id="rinkMask">
          <rect x="0" y="0" width="1000" height="240" fill="url(#rinkFade)" />
        </mask>
      </defs>

      <g mask="url(#rinkMask)">
        {/* Boards — rounded rectangle with rink-style ends (ry = half height) */}
        <rect
          x="14" y="14" width="972" height="212"
          rx="106" ry="106"
          fill="none" stroke="white" strokeWidth="1.6"
        />

        {/* Goal lines (red, near each end) */}
        <line x1="92"  y1="40" x2="92"  y2="200" stroke="#F87171" strokeWidth="1.4" opacity="0.85" />
        <line x1="908" y1="40" x2="908" y2="200" stroke="#F87171" strokeWidth="1.4" opacity="0.85" />

        {/* Blue lines */}
        <line x1="380" y1="14" x2="380" y2="226" stroke="#60A5FA" strokeWidth="2.4" opacity="0.85" />
        <line x1="620" y1="14" x2="620" y2="226" stroke="#60A5FA" strokeWidth="2.4" opacity="0.85" />

        {/* Center red line */}
        <line x1="500" y1="14" x2="500" y2="226" stroke="#F87171" strokeWidth="2.4" opacity="0.85" />

        {/* Center face-off circle */}
        <circle cx="500" cy="120" r="58" fill="none" stroke="white" strokeWidth="1.4" />
        <circle cx="500" cy="120" r="2.5" fill="#F74902" />

        {/* End-zone face-off circles — four corners */}
        {[
          { cx: 200, cy: 78  },
          { cx: 200, cy: 162 },
          { cx: 800, cy: 78  },
          { cx: 800, cy: 162 },
        ].map((c, i) => (
          <g key={i}>
            <circle cx={c.cx} cy={c.cy} r="32" fill="none" stroke="white" strokeWidth="1.3" />
            <circle cx={c.cx} cy={c.cy} r="2.4" fill="#F87171" opacity="0.9" />
            {/* Hash marks (the small lines outside each circle) */}
            <line x1={c.cx - 32} y1={c.cy - 14} x2={c.cx - 36} y2={c.cy - 14} stroke="white" strokeWidth="1.2" />
            <line x1={c.cx + 32} y1={c.cy - 14} x2={c.cx + 36} y2={c.cy - 14} stroke="white" strokeWidth="1.2" />
            <line x1={c.cx - 32} y1={c.cy + 14} x2={c.cx - 36} y2={c.cy + 14} stroke="white" strokeWidth="1.2" />
            <line x1={c.cx + 32} y1={c.cy + 14} x2={c.cx + 36} y2={c.cy + 14} stroke="white" strokeWidth="1.2" />
          </g>
        ))}

        {/* Neutral-zone face-off dots */}
        <circle cx="430" cy="78"  r="2.4" fill="#F87171" opacity="0.85" />
        <circle cx="430" cy="162" r="2.4" fill="#F87171" opacity="0.85" />
        <circle cx="570" cy="78"  r="2.4" fill="#F87171" opacity="0.85" />
        <circle cx="570" cy="162" r="2.4" fill="#F87171" opacity="0.85" />

        {/* Goal creases — half ellipses opening toward center */}
        <path
          d="M 92 108 A 18 12 0 0 1 92 132"
          fill="rgba(96,165,250,0.18)"
          stroke="#60A5FA" strokeWidth="1.2" opacity="0.7"
        />
        <path
          d="M 908 108 A 18 12 0 0 0 908 132"
          fill="rgba(96,165,250,0.18)"
          stroke="#60A5FA" strokeWidth="1.2" opacity="0.7"
        />

        {/* Goal nets (small rectangles behind the goal line) */}
        <rect x="84" y="112" width="6" height="16" fill="none" stroke="white" strokeWidth="1" opacity="0.7" />
        <rect x="910" y="112" width="6" height="16" fill="none" stroke="white" strokeWidth="1" opacity="0.7" />

        {/* Trapezoid behind each net (NHL goalie restricted area) */}
        <path d="M 92 108 L 78 92 L 78 148 L 92 132 Z" fill="none" stroke="white" strokeWidth="0.9" opacity="0.5" />
        <path d="M 908 108 L 922 92 L 922 148 L 908 132 Z" fill="none" stroke="white" strokeWidth="0.9" opacity="0.5" />
      </g>
    </svg>

  </div>
);

// Centered NHL shield watermark behind the score/countdown. Loaded from the
// NHL CDN and run through grayscale + brightness filtering so the multicolor
// official mark resolves to a neutral white silhouette — no color cast on
// the dark hero surface (same technique as the team logos at the sides).
// Distinct from the team-specific watermarks because it's the league mark,
// not redundant with PHI / opponent logos. Inline SVG fallback handles the
// rare case where the CDN doesn't resolve.
const CenterShield = () => {
  const [errored, setErrored] = useState(false);
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 select-none"
      style={{ width: 260, height: 180 }}
    >
      {!errored ? (
        <img
          src="https://assets.nhle.com/logos/nhl/svg/NHL_dark.svg"
          alt=""
          className="w-full h-full object-contain"
          onError={() => setErrored(true)}
          style={{
            opacity: 0.07,
            filter: 'grayscale(1) brightness(1.7) contrast(0.9)',
          }}
        />
      ) : (
        <svg
          viewBox="0 0 260 180"
          width="100%"
          height="100%"
          style={{ opacity: 0.07, filter: 'grayscale(1) brightness(1.7)' }}
        >
          {/* Inline fallback — abstract NHL-style shield + wordmark */}
          <path
            d="M 50 30 L 200 30 L 220 50 L 215 130 L 130 160 L 45 130 L 40 50 Z"
            fill="none" stroke="white" strokeWidth="2.5"
          />
          <text
            x="130" y="105"
            textAnchor="middle"
            fontFamily="Impact, ui-sans-serif, system-ui"
            fontSize="50"
            fontWeight="900"
            fill="white"
            letterSpacing="3"
          >NHL</text>
        </svg>
      )}
    </div>
  );
};

// Big team side — logo + 3-letter abbreviation rendered at the same scale
// as the centerpiece score/countdown. Sub line (form dots / opponent record)
// optional. Used by all three Hero variants so the matchup row is uniformly
// sized and aligned: PHI on the left, centerpiece in the middle, OPP on the
// right, all at the same baseline. Replaces the old city-name + team-name
// stack which read as much smaller than the score and felt mis-aligned.
// `logoSm` and `logoLg` accept pre-rendered logo elements at distinct sizes
// so the same component can show a tight 44 px logo on mobile and an 88 px
// one on desktop without juggling responsive Tailwind classes inside an SVG
// img tag (whose width/height are baked at render time).
const TeamSide = ({ logoSm, logoLg, abbr, side, sub, tone }) => {
  const isLeft = side === 'left';
  return (
    <div className={cx('flex items-center gap-2 sm:gap-4 min-w-0', isLeft ? '' : 'justify-end')}>
      {isLeft && (
        <>
          <span className="block sm:hidden">{logoSm}</span>
          <span className="hidden sm:block">{logoLg}</span>
        </>
      )}
      <div className={cx('min-w-0', isLeft ? '' : 'text-right')}>
        <div
          className={cx(
            'text-[34px] sm:text-[76px] font-semibold tabular-nums tracking-tight leading-none',
            tone === 'muted' ? 'text-white/85' : 'text-white',
          )}
          style={{ textShadow: '0 2px 4px rgba(0,0,0,0.6)' }}
        >
          {abbr}
        </div>
        {sub && (
          <div className={cx('mt-1.5 sm:mt-2', isLeft ? '' : 'flex justify-end')}>{sub}</div>
        )}
      </div>
      {!isLeft && (
        <>
          <span className="block sm:hidden">{logoSm}</span>
          <span className="hidden sm:block">{logoLg}</span>
        </>
      )}
    </div>
  );
};

// Five-dot W/L recap. Shown under each team's name to give the matchup a
// visual "form check" without burning extra space.
const FormDots = ({ games, mutedColors = false }) => {
  const last5 = (games || []).slice(0, 5);
  if (!last5.length) return null;
  return (
    <div className="flex gap-1 mt-1.5" aria-label="recent form">
      {last5.map((g, i) => (
        <span
          key={`${g.id || i}`}
          title={`${g.w ? 'W' : 'L'} ${g.us}–${g.them} ${g.home ? 'vs' : '@'} ${g.opp}`}
          className={cx(
            'w-1.5 h-1.5 rounded-full',
            g.w
              ? (mutedColors ? 'bg-emerald-400/55' : 'bg-emerald-400/85')
              : (mutedColors ? 'bg-red-400/45' : 'bg-red-400/75'),
          )}
        />
      ))}
    </div>
  );
};

const PHI_LOGO = 'https://assets.nhle.com/logos/nhl/svg/PHI_dark.svg';
const teamLogoUrl = (abbr) => abbr ? `https://assets.nhle.com/logos/nhl/svg/${abbr}_dark.svg` : null;

function useCountdown(startUTC) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!startUTC) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [startUTC]);
  if (!startUTC) return null;
  const ms = new Date(startUTC).getTime() - now;
  if (ms <= 0) return { d: 0, h: 0, m: 0, s: 0, past: true };
  const total = Math.floor(ms / 1000);
  return {
    past: false,
    d: Math.floor(total / 86400),
    h: Math.floor((total % 86400) / 3600),
    m: Math.floor((total % 3600) / 60),
    s: total % 60,
  };
}

// Live game card with real-time period/clock from the boxscore. `liveDetail`
// is the adapted boxscore object — when present we show period, clock, SOG,
// power play, and intermission state. Without it we fall back to the schedule
// snapshot (just scores).
const HeroLive = ({ liveGame, liveDetail, liveSnap, oppFull, recentGames, oppRow }) => {
  // Prefer live SSE snapshot for the rapidly-moving primitives (score,
  // period, clock) when the stream has emitted a 'box' event. Falls back
  // to the polled liveDetail/liveGame data the moment the stream is
  // silent. snapTs lets us drop snaps older than ~6s in case the stream
  // has stalled — better to show 5s-old polled data than 30s-old SSE.
  const snapFresh = liveSnap?.ts && (Date.now() - liveSnap.ts) < 6000;
  const liveAway = snapFresh && liveSnap?.away?.score != null ? liveSnap.away.score : (liveGame.home ? liveGame.them : liveGame.us);
  const liveHome = snapFresh && liveSnap?.home?.score != null ? liveSnap.home.score : (liveGame.home ? liveGame.us : liveGame.them);
  const usScore  = liveGame.home ? liveHome : liveAway;
  const themScore = liveGame.home ? liveAway : liveHome;

  const period = (snapFresh && liveSnap?.periodDescriptor) || liveDetail?.periodDescriptor;
  const clock  = (snapFresh && liveSnap?.clock) || liveDetail?.clock;
  const inIntermission = clock?.inIntermission;
  const periodLabel = period?.periodType === 'OT'
    ? 'OT'
    : period?.periodType === 'SO'
      ? 'SO'
      : period?.number ? `P${period.number}` : null;
  const clockText = clock?.timeRemaining || '—:—';

  // SOG/PP still come from the polled boxscore (the stream doesn't
  // surface every minor stat — only score/period/clock).
  const sog = liveDetail?.stats?.shots;
  const pp = liveDetail?.stats?.powerPlay;

  // Goal-burst overlay — fires whenever the PHI score increments, then
  // self-clears after ~2.4s. Prefer the SSE-overlay value so the burst
  // fires at sub-2s latency on goal events.
  const goalBurst = useScoreBurst(usScore);

  return (
    <>
      <div className="flex items-center gap-2 flex-wrap">
        <Chip tone="live" pulse>LIVE</Chip>
        {periodLabel && (
          <div className="flex items-center gap-1.5 px-2 h-6 border border-[#F74902]/30 bg-[#F74902]/[0.08] rounded-md">
            <span className="text-[10px] font-mono text-[#FF8A4C] uppercase tracking-wider">{periodLabel}</span>
            <span className="text-[12px] font-mono tabular-nums text-white/85">
              {inIntermission ? 'INT' : clockText}
            </span>
          </div>
        )}
        <span className="text-[11px] font-mono text-white/50 uppercase tracking-wider">
          {liveGame.home ? 'Home' : 'Away'}{liveGame.venue ? ` · ${liveGame.venue}` : ''}
        </span>
      </div>
      <div className="relative grid grid-cols-2 sm:grid-cols-[1fr_auto_1fr] items-center gap-y-4 gap-x-3 sm:gap-x-8 mt-5">
        {goalBurst && <GoalCelebration />}
        <TeamSide
          logoSm={<FlyersMark size={44} />}
          logoLg={<FlyersMark size={88} />}
          abbr="PHI"
          side="left"
          sub={<FormDots games={recentGames} />}
        />
        <TeamSide
          logoSm={<TeamLogo abbr={liveGame.opp} size={44} />}
          logoLg={<TeamLogo abbr={liveGame.opp} size={88} />}
          abbr={liveGame.opp}
          side="right"
          tone="muted"
          sub={oppRow && (
            <span className="text-[10px] font-mono text-white/45 tabular-nums">
              {oppRow.w}–{oppRow.l}{oppRow.ot ? `–${oppRow.ot}` : ''}
            </span>
          )}
        />
        {/* Score block — full width on mobile (its own row), center column
            on desktop. Sized down on mobile so the dash separator and both
            digits stay on one line. */}
        <div className="col-span-2 sm:col-span-1 sm:row-start-1 sm:col-start-2 flex items-baseline justify-center gap-3 sm:gap-4">
          <span
            className={cx(
              'text-[44px] sm:text-[76px] font-semibold tabular-nums tracking-tight text-[#FF8A4C] leading-none',
              goalBurst && 'score-flash',
            )}
            style={{ textShadow: '0 0 24px rgba(247,73,2,0.4), 0 2px 4px rgba(0,0,0,0.6)' }}
          >{usScore}</span>
          <span className="text-[28px] sm:text-[44px] text-white/20 leading-none">–</span>
          <span
            className="text-[44px] sm:text-[76px] font-semibold tabular-nums tracking-tight text-white/85 leading-none"
            style={{ textShadow: '0 2px 4px rgba(0,0,0,0.6)' }}
          >{themScore}</span>
        </div>
      </div>

      {/* Win probability + projection tiles — broadcast-feel during live play */}
      {!inIntermission && period && (
        <div className="mt-4 flex flex-wrap gap-2">
          <WinProbability
            us={usScore}
            them={themScore}
            period={period?.number}
            periodType={period?.periodType}
            clock={clock}
            isHome={liveGame.home}
          />
          <PaceProjection
            label="Goals"
            current={usScore}
            period={period?.number}
            periodType={period?.periodType}
            clock={clock}
            color="#FF8A4C"
          />
          {sog?.us != null && (
            <PaceProjection
              label="Shots"
              current={sog.us}
              period={period?.number}
              periodType={period?.periodType}
              clock={clock}
              color="#10B981"
            />
          )}
        </div>
      )}

      {/* Live stat strip — appears when boxscore data is loaded */}
      {liveDetail && (sog?.us != null || pp?.us != null) && (
        <div className="mt-4 pt-4 border-t border-white/[0.06] flex items-center justify-center gap-5 sm:gap-7 text-[11px] font-mono">
          {sog?.us != null && (
            <LiveStat label="SOG" us={sog.us} them={sog.them} />
          )}
          {pp?.us != null && (
            <LiveStat label="Power Play" us={pp.us} them={pp.them} />
          )}
          {liveDetail.stats?.faceoffPct?.us != null && (
            <LiveStat label="FO %" us={`${liveDetail.stats.faceoffPct.us}%`} them={`${liveDetail.stats.faceoffPct.them}%`} />
          )}
          {liveDetail.stats?.hits?.us != null && (
            <LiveStat label="Hits" us={liveDetail.stats.hits.us} them={liveDetail.stats.hits.them} />
          )}
        </div>
      )}
    </>
  );
};

const LiveStat = ({ label, us, them }) => (
  <div className="text-center">
    <div className="text-[9px] font-mono text-white/40 uppercase tracking-wider mb-1">{label}</div>
    <div className="flex items-center gap-1.5 tabular-nums">
      <span className="text-[#FF8A4C]">{us}</span>
      <span className="text-white/25">·</span>
      <span className="text-white/65">{them}</span>
    </div>
  </div>
);

const HeroNext = ({ nextGame, oppFull, recentGames, oppRow }) => {
  const cd = useCountdown(nextGame?.startUTC);
  return (
    <>
      <div className="flex items-center gap-2 flex-wrap">
        <Chip tone="orange">NEXT GAME</Chip>
        <span className="text-[11px] font-mono text-white/55 uppercase tracking-wider">
          {fmtDateFull(nextGame.startUTC)} · {fmtTime(nextGame.startUTC)} · {nextGame.venue || (nextGame.home ? 'Wells Fargo Center' : 'Away')}
        </span>
        {nextGame.gameType === 3 && <Chip tone="amber">PLAYOFFS</Chip>}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-[1fr_auto_1fr] items-center gap-y-4 gap-x-3 sm:gap-x-8 mt-5">
        <TeamSide
          logoSm={<FlyersMark size={44} />}
          logoLg={<FlyersMark size={88} />}
          abbr="PHI"
          side="left"
          sub={<FormDots games={recentGames} />}
        />
        <TeamSide
          logoSm={<TeamLogo abbr={nextGame.opp} size={44} />}
          logoLg={<TeamLogo abbr={nextGame.opp} size={88} />}
          abbr={nextGame.opp}
          side="right"
          tone="muted"
          sub={oppRow && (
            <span className="text-[10px] font-mono text-white/45 tabular-nums">
              {oppRow.w}–{oppRow.l}{oppRow.ot ? `–${oppRow.ot}` : ''}
            </span>
          )}
        />
        {/* Countdown — full width on its own row on mobile, center column on
            desktop. Mobile drops to text-[36px] so HH:MM:SS fits a phone. */}
        <div className="col-span-2 sm:col-span-1 sm:row-start-1 sm:col-start-2 text-center">
          {cd && !cd.past ? (
            <>
              <div className="text-[10px] font-mono text-white/40 uppercase tracking-wider mb-1.5 flex items-center justify-center gap-1.5">
                <PuckIcon size={9} />
                Puck drops in
              </div>
              <div className="flex items-baseline gap-1 justify-center font-semibold tabular-nums tracking-tight text-[#FF8A4C] leading-none whitespace-nowrap"
                style={{ textShadow: '0 0 22px rgba(247,73,2,0.4), 0 2px 4px rgba(0,0,0,0.6)' }}>
                {cd.d > 0 && (
                  <>
                    <span className="text-[36px] sm:text-[76px]">{cd.d}</span>
                    <span className="text-[14px] sm:text-[28px] text-white/40 font-mono mr-1.5 sm:mr-2">d</span>
                  </>
                )}
                <span className="text-[36px] sm:text-[76px]">{String(cd.h).padStart(2, '0')}</span>
                <span className="text-[18px] sm:text-[40px] text-white/35 mx-0.5">:</span>
                <span className="text-[36px] sm:text-[76px]">{String(cd.m).padStart(2, '0')}</span>
                <span className="text-[18px] sm:text-[40px] text-white/35 mx-0.5">:</span>
                <span className="text-[36px] sm:text-[76px]">{String(cd.s).padStart(2, '0')}</span>
              </div>
            </>
          ) : (
            <div className="text-[44px] sm:text-[76px] font-semibold tabular-nums tracking-tight text-white/40 leading-none">VS</div>
          )}
        </div>
      </div>
    </>
  );
};

const HeroLatest = ({ lastResult, oppFull, recentGames, oppRow }) => (
  <>
    <div className="flex items-center gap-2">
      <Chip tone={lastResult.w ? 'orange' : 'muted'}>{lastResult.w ? '● WIN' : '● LOSS'}</Chip>
      <span className="text-[11px] font-mono text-white/55 uppercase tracking-wider">{fmtDateFull(lastResult.date)} · Final</span>
    </div>
    <div className="grid grid-cols-2 sm:grid-cols-[1fr_auto_1fr] items-center gap-y-4 gap-x-3 sm:gap-x-8 mt-5">
      <TeamSide
        logoSm={<FlyersMark size={44} />}
        logoLg={<FlyersMark size={88} />}
        abbr="PHI"
        side="left"
        sub={<FormDots games={recentGames} />}
      />
      <TeamSide
        logoSm={<TeamLogo abbr={lastResult.opp} size={44} />}
        logoLg={<TeamLogo abbr={lastResult.opp} size={88} />}
        abbr={lastResult.opp}
        side="right"
        tone="muted"
        sub={oppRow && (
          <span className="text-[10px] font-mono text-white/45 tabular-nums">
            {oppRow.w}–{oppRow.l}{oppRow.ot ? `–${oppRow.ot}` : ''}
          </span>
        )}
      />
      <div className="col-span-2 sm:col-span-1 sm:row-start-1 sm:col-start-2 flex items-baseline justify-center gap-3 sm:gap-4">
        <span
          className={cx('text-[44px] sm:text-[76px] font-semibold tabular-nums tracking-tight leading-none',
            lastResult.w ? 'text-emerald-400' : 'text-white/55'
          )}
          style={{ textShadow: lastResult.w
            ? '0 0 22px rgba(16,185,129,0.35), 0 2px 4px rgba(0,0,0,0.6)'
            : '0 2px 4px rgba(0,0,0,0.6)' }}
        >{lastResult.us}</span>
        <span className="text-[28px] sm:text-[44px] text-white/20 leading-none">–</span>
        <span
          className={cx('text-[44px] sm:text-[76px] font-semibold tabular-nums tracking-tight leading-none',
            !lastResult.w ? 'text-red-400' : 'text-white/55'
          )}
          style={{ textShadow: !lastResult.w
            ? '0 0 22px rgba(239,68,68,0.32), 0 2px 4px rgba(0,0,0,0.6)'
            : '0 2px 4px rgba(0,0,0,0.6)' }}
        >{lastResult.them}</span>
      </div>
    </div>
  </>
);

// Walk recentGames in newest-first order to find the current streak.
// Returns { type: 'W'|'L', count } or null if there's no clear streak.
// W3+ counts as "hot", L4+ as "cold" — anything less is normal noise.
const computeStreak = (games) => {
  if (!games || games.length === 0) return null;
  const first = games[0].w;
  let n = 0;
  for (const g of games) {
    if (g.w === first) n++;
    else break;
  }
  if (first && n >= 3) return { type: 'W', count: n };
  if (!first && n >= 4) return { type: 'L', count: n };
  return null;
};

export const Hero = ({ liveGame, liveDetail, liveSnap, nextGame, lastResult, us, recentGames, standings }) => {
  const opp = liveGame?.opp || nextGame?.opp || lastResult?.opp;
  const oppFull = opp ? OPP_FULL[opp] : null;
  // Find the opponent's full standings row so we can show their record next
  // to their name. league has every team; us is just PHI so we skip it.
  const oppRow = opp && standings?.league ? standings.league.find((t) => t.abbr === opp) : null;
  const streak = computeStreak(recentGames);

  return (
    <div className="relative overflow-hidden rounded-lg border border-[#F74902]/[0.25] bg-[#0A0A0A] px-5 sm:px-8 py-6 sm:py-8 shadow-[0_0_0_1px_rgba(255,255,255,0.02)_inset,0_24px_48px_-24px_rgba(0,0,0,0.9),0_2px_0_rgba(255,255,255,0.04)_inset]">
        {/* ── Layered background for depth ──────────────────────────────────
            Three stacked passes: (1) base dark gradient with a faint vertical
            light fall-off, (2) two large neutral radial spotlights pinned to
            where each team logo sits — they make the logos feel "lit" without
            adding any color, (3) a subtle ice-rink line pattern at very low
            opacity. None of these layers carry orange / blue tint, so the
            panel reads as pure charcoal. */}
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#181818] via-[#0E0E0E] to-[#070707]" />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background: 'radial-gradient(closest-side at 12% 50%, rgba(255,255,255,0.05), transparent 70%), radial-gradient(closest-side at 88% 50%, rgba(255,255,255,0.045), transparent 70%)',
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              'repeating-linear-gradient(90deg, rgba(255,255,255,0.5) 0 1px, transparent 1px 64px), repeating-linear-gradient(0deg, rgba(255,255,255,0.5) 0 1px, transparent 1px 64px)',
            maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 75%)',
            WebkitMaskImage: 'radial-gradient(ellipse at center, black 30%, transparent 75%)',
          }}
        />
        {/* Large transparent team-logo watermarks — artistically scaled to
            fill the left and right halves of the hero. Critically, we run
            them through `grayscale(1) brightness(1.5)` so the orange and
            opponent colors are flattened to neutral white silhouettes. This
            preserves the dramatic background presence the user wants while
            avoiding the brown / tinted-surface problem that solid-color
            watermarks always cause on a dark panel. */}
        <Watermark url={PHI_LOGO} side="left" />
        <Watermark url={teamLogoUrl(opp)} side="right" />
        {/* Page-width hockey-rink graphic + skating sweep — adds motion and a
            hockey-themed centerpiece to the otherwise empty middle band. The
            rink is clipped to the upper portion so the bottom HeroStats row
            stays clean. */}
        <FullRinkMark />
        <CenterShield />
        {/* Top edge highlight + bottom shadow for the "raised card" feel. */}
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
        <div aria-hidden className="pointer-events-none absolute inset-x-8 bottom-0 h-12 bg-gradient-to-t from-black/60 to-transparent" />

      <div className="relative">
        {liveGame ? <HeroLive liveGame={liveGame} liveDetail={liveDetail} liveSnap={liveSnap} oppFull={oppFull} recentGames={recentGames} oppRow={oppRow} /> :
          nextGame ? <HeroNext nextGame={nextGame} oppFull={oppFull} recentGames={recentGames} oppRow={oppRow} /> :
          lastResult ? <HeroLatest lastResult={lastResult} oppFull={oppFull} recentGames={recentGames} oppRow={oppRow} /> :
          (
            <div className="flex items-center gap-3">
              <FlyersMark size={48} />
              <div>
                <div className="text-[20px] font-semibold tracking-tight">Philadelphia Flyers</div>
                <div className="text-[12px] font-mono text-white/45">Loading season data…</div>
              </div>
            </div>
          )}

        {streak && (
          <div className={cx(
            'relative mt-5 mx-auto max-w-fit px-4 py-1.5 rounded-md border flex items-center gap-2 text-[12px] font-mono uppercase tracking-wider',
            streak.type === 'W'
              ? 'border-[#F74902]/40 bg-[#F74902]/[0.08] text-[#FF8A4C]'
              : 'border-red-500/30 bg-red-500/[0.08] text-red-300',
          )}>
            <span className={cx('w-1.5 h-1.5 rounded-full',
              streak.type === 'W' ? 'bg-[#F74902]' : 'bg-red-400')} />
            <span className="font-semibold tabular-nums">{streak.count}-game {streak.type === 'W' ? 'win streak' : 'losing skid'}</span>
            {streak.type === 'W' && streak.count >= 5 && <span className="text-[#FF8A4C]">· heating up</span>}
            {streak.type === 'L' && streak.count >= 6 && <span className="text-red-300/80">· need a spark</span>}
          </div>
        )}

        {us && (
          <div className="relative mt-6 pt-5 border-t border-white/[0.06] grid grid-cols-2 sm:grid-cols-4 gap-4">
            <HeroStat label="Record" value={`${us.w}–${us.l}${us.ot ? `–${us.ot}` : ''}`} />
            <HeroStat label="Points" value={us.pts} accent="warm" />
            <HeroStat
              label="Goal Diff"
              value={`${us.diff > 0 ? '+' : ''}${us.diff}`}
              accent={us.diff > 0 ? 'good' : us.diff < 0 ? 'bad' : null}
            />
            <HeroStat label="Metro" value={`#${us.divRank}`} accent={us.divRank <= 3 ? 'good' : us.divRank >= 6 ? 'bad' : null} />
          </div>
        )}
      </div>
    </div>
  );
};

// Large transparent watermark — sits in the background, scaled big to fill
// the side of the hero. The grayscale + brightness filter is the key bit:
// it strips the brand color out of the SVG so the watermark is a pure white
// silhouette, which never tints the dark surface (the bug the user has
// flagged repeatedly when orange watermarks were used at low opacity).
const Watermark = ({ url, side }) => {
  if (!url) return null;
  const isLeft = side === 'left';
  return (
    <div
      aria-hidden
      className={cx(
        // Anchored to the top third of the Hero rather than the dead center —
        // that way the watermark's vertical center sits in the same band as
        // the matchup row (logos + score / countdown / abbreviations) instead
        // of drifting halfway down the panel under the HeroStats tiles.
        'pointer-events-none absolute top-[32%] -translate-y-1/2 hidden md:block select-none',
        isLeft ? '-left-[40px]' : '-right-[40px]',
      )}
      style={{ width: 360, height: 360 }}
    >
      <img
        src={url}
        alt=""
        className="w-full h-full object-contain"
        style={{
          opacity: 0.07,
          filter: 'grayscale(1) brightness(1.6) contrast(0.9) blur(0.4px)',
          transform: isLeft ? 'translateX(-12%)' : 'translateX(12%)',
        }}
        onError={(e) => { e.currentTarget.style.display = 'none'; }}
      />
    </div>
  );
};

// Tiny puck glyph for label decoration.
const PuckIcon = ({ size = 10 }) => (
  <svg width={size} height={size * 0.55} viewBox="0 0 20 11" aria-hidden>
    <ellipse cx="10" cy="5.5" rx="9" ry="4" fill="#F74902" opacity="0.85" />
    <ellipse cx="10" cy="4" rx="9" ry="4" fill="none" stroke="#FF8A4C" strokeWidth="1" opacity="0.9" />
  </svg>
);

const HeroStat = ({ label, value, accent }) => {
  const valueClass =
    accent === 'good' ? 'text-emerald-400' :
    accent === 'bad'  ? 'text-red-400' :
    accent === 'warm' ? 'text-[#FF8A4C]' :
    'text-white';
  return (
    <div className="relative px-3 py-2 rounded-md bg-white/[0.015] border border-white/[0.04]">
      <div className="text-[10px] font-mono text-white/40 uppercase tracking-wider">{label}</div>
      <div className={cx('text-[20px] font-semibold tabular-nums mt-0.5 leading-none', valueClass)}>
        {value}
      </div>
    </div>
  );
};
