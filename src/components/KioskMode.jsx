import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Maximize2 } from 'lucide-react';
import { OPP_FULL, cx } from '../config.js';
import { FlyersMark, TeamLogo } from './Logo.jsx';
import { TeamLogoBg } from './Watermark.jsx';
import { useGoalBurst } from '../api.js';
import { useTeam } from '../teamContext.jsx';

// Short rooting nickname for the active team — the last word of the
// full name ("Philadelphia Flyers" → "Flyers", "Colorado Avalanche" →
// "Avalanche"). Used in status copy like "<short> win" / "<short> lead".
const teamShort = (fullName) => (fullName || '').trim().split(/\s+/).pop() || 'Us';

// Full-viewport "broadcast" overlay. Two modes:
//   • Live mode (Hero on Dashboard during a live PHI game): score and
//     clock update in real time via the SSE snapshot.
//   • Recap mode (GameTape header for any selected game): final score
//     plus FINAL chip, no clock animation.
//
// Designed to be readable from across the room while watching on TV.
// Renders via portal so it escapes the dashboard layout, locks body
// scroll, and traps Esc to close.

export const KioskMode = ({ liveGame, liveDetail, liveSnap, game, onClose }) => {
  // Active team identity — drives all "us" branding so a COL@DAL kiosk on
  // scumbag.hockey shows the right names/logo instead of Philadelphia.
  const { teamAbbr, teamName } = useTeam();
  const usFull = teamName;            // e.g. "Colorado Avalanche"
  const usShort = teamShort(teamName); // e.g. "Avalanche" (PHI → "Flyers")

  // Two source-of-truth shapes — Hero passes liveGame/liveDetail; GameTape
  // passes the adapted `game` object. Normalize into one set of locals.
  const isLiveMode = !!liveGame;
  const oppAbbr = isLiveMode ? liveGame.opp : game?.oppAbbr;
  const isHome = isLiveMode ? liveGame.home : game?.home;

  const snapFresh = isLiveMode && liveSnap?.ts && (Date.now() - liveSnap.ts) < 6000;
  let usScore, themScore, period, clock;
  if (isLiveMode) {
    const liveAway = snapFresh && liveSnap?.away?.score != null
      ? liveSnap.away.score
      : (liveGame.home ? liveGame.them : liveGame.us);
    const liveHome = snapFresh && liveSnap?.home?.score != null
      ? liveSnap.home.score
      : (liveGame.home ? liveGame.us : liveGame.them);
    usScore  = liveGame.home ? liveHome : liveAway;
    themScore = liveGame.home ? liveAway : liveHome;
    period = (snapFresh && liveSnap?.periodDescriptor) || liveDetail?.periodDescriptor;
    clock  = (snapFresh && liveSnap?.clock) || liveDetail?.clock;
  } else if (game?.score) {
    usScore = game.score.us;
    themScore = game.score.them;
    period = game.periodDescriptor;
    clock = game.clock;
  } else {
    usScore = 0; themScore = 0; period = null; clock = null;
  }

  const inIntermission = clock?.inIntermission;
  const isFinalState = !isLiveMode && (game?.state === 'FINAL' || game?.state === 'OFF');
  const periodLabel = period?.periodType === 'OT'
    ? 'OVERTIME'
    : period?.periodType === 'SO'
      ? 'SHOOTOUT'
      : period?.number ? `PERIOD ${period.number}` : 'PRE-GAME';
  const clockText = clock?.timeRemaining || '—:—';

  const sog = (isLiveMode ? liveDetail?.stats?.shots : game?.stats?.shots);
  const pp  = (isLiveMode ? liveDetail?.stats?.powerPlay : game?.stats?.powerPlay);
  // Team-aware goal burst — fires on either team's goal so the blast
  // can flash the scoring team's logo + tint the screen edge in their
  // colorway. Returns { team, us, scorer } during the 5s window.
  const goalEvent = useGoalBurst(isLiveMode ? liveDetail?.timeline : game?.timeline, 5000);

  // Live strength state. NHL only ships `situation` while a power play
  // is active, so the absence of this object means even strength.
  const situation = (snapFresh && liveSnap?.situation) || liveDetail?.situation || game?.situation || null;
  const homeStrength = situation?.homeTeam?.strength ?? 5;
  const awayStrength = situation?.awayTeam?.strength ?? 5;
  const ppActive = situation && homeStrength !== awayStrength;
  const homeOnPP = ppActive && homeStrength > awayStrength;
  const awayOnPP = ppActive && awayStrength > homeStrength;
  const phiOnPP = ppActive && (isHome ? homeOnPP : awayOnPP);
  const oppOnPP = ppActive && !phiOnPP;
  const ppStrength = ppActive ? `${Math.max(homeStrength, awayStrength)} on ${Math.min(homeStrength, awayStrength)}` : null;
  const ppTimeRemaining = situation?.timeRemaining || null;

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const oppFull = OPP_FULL[oppAbbr] || oppAbbr || 'Opponent';
  const phiWinning = usScore > themScore;
  const tied = usScore === themScore;

  return createPortal(
    <div
      className="fixed inset-0 z-[60] bg-[#050505] text-white overflow-hidden"
      style={{ animation: 'fadeIn 0.18s ease-out' }}
      role="dialog"
      aria-label="Broadcast view"
    >
      {/* Layered backdrop — full-bleed team-logo halves, ice-rink lines,
          center spotlight. Each layer is pointer-events-none and absolute
          so they stack behind the score without affecting interaction. */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        {/* Vertical seam — colored hairline split between the two halves. */}
        <div
          className="absolute top-0 bottom-0 left-1/2 w-px"
          style={{ background: 'linear-gradient(180deg, transparent 0%, rgba(255,255,255,0.08) 25%, rgba(255,255,255,0.08) 75%, transparent 100%)' }}
        />

        {/* Faint ice-rink line pattern — horizontal scan lines that read as
            an arena surface from a distance. Masked at the edges so the
            pattern fades into the dark frame. */}
        <div
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage: 'repeating-linear-gradient(0deg, rgba(255,255,255,0.45) 0 1px, transparent 1px 84px)',
            maskImage: 'radial-gradient(ellipse at center, black 25%, transparent 80%)',
            WebkitMaskImage: 'radial-gradient(ellipse at center, black 25%, transparent 80%)',
          }}
        />

        {/* Away half — huge logo bleeding off the left edge. The center
            stage uses away-on-left / home-on-right so the backdrop tracks
            the same convention: when our team is home, the opp logo sits
            behind the away column on the left and our logo sits on the right. */}
        <img
          src={`https://assets.nhle.com/logos/nhl/svg/${isHome ? oppAbbr : teamAbbr}_dark.svg`}
          alt=""
          className="absolute select-none"
          style={{
            top: '50%',
            left: '-12%',
            transform: 'translateY(-50%)',
            width: '70vh',
            height: '70vh',
            opacity: isHome ? 0.14 : 0.16,
          }}
          onError={(e) => { e.currentTarget.style.display = 'none'; }}
        />

        {/* Home half — same treatment, mirrored. Our team when we're home,
            otherwise the opp. */}
        <img
          src={`https://assets.nhle.com/logos/nhl/svg/${isHome ? teamAbbr : oppAbbr}_dark.svg`}
          alt=""
          className="absolute select-none"
          style={{
            top: '50%',
            right: '-12%',
            transform: 'translateY(-50%)',
            width: '70vh',
            height: '70vh',
            opacity: isHome ? 0.16 : 0.14,
          }}
          onError={(e) => { e.currentTarget.style.display = 'none'; }}
        />

        {/* Center spotlight — radial fade so the score readout has clean
            contrast against the busy logos behind it. Two layered
            gradients: a tight bright pool and a wider soft halo. */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 40% 55% at 50% 50%, rgba(0,0,0,0.55), transparent 70%), ' +
              'radial-gradient(ellipse 60% 80% at 50% 50%, rgba(0,0,0,0.30), transparent 80%)',
          }}
        />

        {/* Edge vignette — pulls focus back to center so the logos don't
            crowd the corners on wide displays. */}
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.55) 100%)',
          }}
        />

        {/* Top accent bar — broadcast-style title rule. */}
        <div className="absolute top-0 inset-x-0 h-1 bg-[var(--team-primary)]" />
      </div>

      {/* Top bar: status chip + period/clock + close */}
      <div className="absolute top-0 inset-x-0 flex items-center justify-between px-6 sm:px-12 py-5">
        <div className="flex items-center gap-3">
          {isLiveMode ? (
            <span className="flex items-center gap-2 px-3 h-8 rounded-md border border-red-500/45 bg-red-500/[0.10]">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-[12px] font-mono font-bold tracking-wider text-red-300">LIVE</span>
            </span>
          ) : (
            <span className="flex items-center gap-2 px-3 h-8 rounded-md border border-white/15 bg-white/[0.05]">
              <span className="text-[12px] font-mono font-bold tracking-wider text-white/75">
                {isFinalState ? 'FINAL' : 'GAME'}
              </span>
            </span>
          )}
          <span className="text-[14px] font-mono uppercase tracking-[0.2em] text-white/85">
            {isLiveMode ? (inIntermission ? 'INTERMISSION' : periodLabel) : (game?.dateLabel || '')}
          </span>
        </div>
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 px-3 h-8 border border-white/15 hover:border-white/40 bg-white/[0.04] rounded-md text-[11px] font-mono text-white/65 hover:text-white transition-colors"
          title="Exit broadcast view (Esc)"
        >
          <X size={12} /> Exit
        </button>
      </div>

      {/* Center stage — score readout */}
      <div className="relative h-full flex flex-col items-center justify-center px-6">
        {goalEvent && <BroadcastGoalBlast goal={goalEvent} oppAbbr={oppAbbr} oppFull={oppFull} usFull={usFull} />}

        {/* Both team identity rows */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-6 sm:gap-12 w-full max-w-6xl">
          {/* Away side */}
          <div className="flex flex-col items-center gap-3">
            <div className="text-[12px] sm:text-[14px] font-mono uppercase tracking-[0.25em] text-white/45">Away</div>
            <PPLogoFrame on={awayOnPP} forUs={!isHome}>
              {isHome
                ? <TeamLogo abbr={oppAbbr} size={120} className="sm:!w-[160px] sm:!h-[160px]" />
                : <FlyersMark size={120} className="sm:!w-[160px] sm:!h-[160px]" />}
            </PPLogoFrame>
            <div className="text-[18px] sm:text-[24px] font-semibold tracking-tight text-center">
              {isHome ? oppFull : usFull}
            </div>
            {awayOnPP && <PPMicroChip forUs={!isHome} strength={ppStrength} time={ppTimeRemaining} />}
            <span
              className={cx(
                'text-[140px] sm:text-[200px] font-bold tabular-nums tracking-tight leading-none',
                isHome ? '' : 'text-[var(--team-accent)]',
                goalEvent && 'score-flash',
              )}
              style={isHome ? undefined : { textShadow: '0 0 56px color-mix(in srgb, var(--team-primary) 50%, transparent), 0 4px 16px rgba(0,0,0,0.7)' }}
            >
              {isHome ? themScore : usScore}
            </span>
          </div>

          {/* Center — clock or final marker */}
          <div className="flex flex-col items-center gap-2 px-4 sm:px-8">
            <div className="text-[14px] sm:text-[18px] font-mono tracking-[0.25em] text-white/55 uppercase">
              {isLiveMode
                ? (inIntermission ? 'Intermission' : periodLabel.replace('PERIOD ', 'P'))
                : (isFinalState ? 'Final' : (periodLabel || 'Game'))}
            </div>
            <div className="text-[44px] sm:text-[72px] font-mono font-bold tabular-nums text-white/95 leading-none">
              {isLiveMode
                ? (inIntermission ? 'INT' : clockText)
                : (period?.periodType === 'OT' ? 'OT' : period?.periodType === 'SO' ? 'SO' : '—')}
            </div>
            <div className="text-[11px] sm:text-[12px] font-mono uppercase tracking-[0.25em] text-white/30 mt-2">vs</div>
          </div>

          {/* Home side */}
          <div className="flex flex-col items-center gap-3">
            <div className="text-[12px] sm:text-[14px] font-mono uppercase tracking-[0.25em] text-white/45">Home</div>
            <PPLogoFrame on={homeOnPP} forUs={isHome}>
              {isHome
                ? <FlyersMark size={120} className="sm:!w-[160px] sm:!h-[160px]" />
                : <TeamLogo abbr={oppAbbr} size={120} className="sm:!w-[160px] sm:!h-[160px]" />}
            </PPLogoFrame>
            <div className="text-[18px] sm:text-[24px] font-semibold tracking-tight text-center">
              {isHome ? usFull : oppFull}
            </div>
            {homeOnPP && <PPMicroChip forUs={isHome} strength={ppStrength} time={ppTimeRemaining} />}
            <span
              className={cx(
                'text-[140px] sm:text-[200px] font-bold tabular-nums tracking-tight leading-none',
                isHome ? 'text-[var(--team-accent)]' : '',
                goalEvent && 'score-flash',
              )}
              style={isHome ? { textShadow: '0 0 56px color-mix(in srgb, var(--team-primary) 50%, transparent), 0 4px 16px rgba(0,0,0,0.7)' } : undefined}
            >
              {isHome ? usScore : themScore}
            </span>
          </div>
        </div>

        {/* Status pill — who's leading / who won */}
        <div className="mt-8 sm:mt-12">
          <span className={cx(
            'px-4 h-9 inline-flex items-center text-[14px] sm:text-[16px] font-mono uppercase tracking-[0.2em] rounded-md',
            tied ? 'border border-white/15 bg-white/[0.05] text-white/75'
              : phiWinning ? 'border border-[var(--team-primary)]/40 bg-[var(--team-primary)]/[0.10] text-[var(--team-accent)]'
              : 'border border-red-500/30 bg-red-500/[0.06] text-red-300',
          )}>
            {tied ? (isFinalState ? 'Tied' : 'Tied game')
              : phiWinning ? `${usShort} ${isFinalState ? 'win' : 'lead'}`
              : `${oppAbbr} ${isFinalState ? 'wins' : 'leads'}`}
          </span>
        </div>
      </div>

      {/* Power play banner — sits above the ticker so it's always the
          first thing in the lower band when a PP is on the clock. Pulls
          focus immediately. Hidden at even strength. */}
      {ppActive && (
        <PPBanner
          phiOnPP={phiOnPP}
          usShort={usShort}
          oppAbbr={oppAbbr}
          oppFull={oppFull}
          strength={ppStrength}
          time={ppTimeRemaining}
        />
      )}

      {/* Bottom ticker — SOG / shot share / PP conversion if available.
          The conversion stat hides during an active PP since the banner
          above already owns the "power play" slot. */}
      {(sog?.us != null || pp?.us != null) && (
        <div className="absolute bottom-0 inset-x-0 border-t border-white/[0.08] bg-black/70 backdrop-blur-sm">
          <div className="px-6 sm:px-12 py-4 flex items-center justify-around text-[14px] sm:text-[18px] font-mono">
            {sog?.us != null && (
              <div className="flex items-center gap-3">
                <span className="text-white/45 uppercase tracking-[0.2em] text-[10px] sm:text-[12px]">Shots on Goal</span>
                <span className="tabular-nums text-[var(--team-accent)] font-semibold">{sog.us}</span>
                <span className="text-white/25">–</span>
                <span className="tabular-nums text-white/85 font-semibold">{sog.them}</span>
              </div>
            )}
            {pp?.us != null && !ppActive && (
              <div className="flex items-center gap-3">
                <span className="text-white/45 uppercase tracking-[0.2em] text-[10px] sm:text-[12px]">Power Play</span>
                <span className="tabular-nums text-[var(--team-accent)]">{pp.us}</span>
                <span className="text-white/25">·</span>
                <span className="tabular-nums text-white/65">{pp.them}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>,
    document.body,
  );
};

// Full-broadcast goal celebration. Triggered from the timeline-aware
// useGoalBurst hook so it fires on either team's goal and themes the
// blast around whoever scored.
//
// Three layers:
//   • A viewport-edge ring + inner shadow that pulses in team color
//     (so glance-readable from across the room)
//   • A giant team logo center-screen that flashes 3 times before
//     fading out (~5s total to match the horn duration)
//   • A 'GOAL!' banner with the team name underneath
//
// Opp goals get an amber/red treatment so the celebration registers as
// a "they scored" alert rather than a "we won" moment.
const BroadcastGoalBlast = ({ goal, oppAbbr, oppFull, usFull }) => {
  const isUs = !!goal?.us;
  const palette = isUs
    ? { color: 'var(--team-primary)', glow: 'color-mix(in srgb, var(--team-primary) 70%, transparent)', soft: 'color-mix(in srgb, var(--team-primary) 40%, transparent)', text: 'text-[var(--team-accent)]' }
    : { color: '#F59E0B', glow: 'rgba(245,158,11,0.65)', soft: 'rgba(220,38,38,0.40)', text: 'text-amber-300' };
  const teamName = isUs ? (usFull || 'Goal') : (oppFull || oppAbbr || 'Goal');
  return (
    <>
      {/* Viewport-edge ring + inset glow. Sits above everything so the
          whole screen reads as "lit up" while the burst is active. */}
      <div
        aria-hidden
        className="fixed inset-0 z-[55] pointer-events-none"
        style={{
          border: `10px solid ${palette.color}`,
          boxShadow: `inset 0 0 80px ${palette.glow}, inset 0 0 240px ${palette.soft}, 0 0 60px ${palette.glow}`,
          animation: 'goalEdgePulse 5s ease-out forwards',
        }}
      />

      {/* Center logo + GOAL banner — sits above the score readout. */}
      <div
        aria-hidden
        className="absolute inset-0 z-[56] flex flex-col items-center justify-center pointer-events-none"
        style={{ animation: 'fadeIn 0.18s ease-out' }}
      >
        <div className="relative" style={{ animation: 'goalFlash 5s steps(1, end) forwards' }}>
          {isUs
            ? <FlyersMark size={260} className="sm:!w-[360px] sm:!h-[360px]" />
            : <TeamLogo abbr={goal.team || oppAbbr} size={260} className="sm:!w-[360px] sm:!h-[360px]" />}
          <div
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{
              background: `radial-gradient(circle, ${palette.glow} 0%, transparent 65%)`,
              filter: 'blur(40px)',
              animation: 'goalAura 5s ease-out forwards',
            }}
          />
        </div>
        <div
          className={cx('text-[80px] sm:text-[140px] font-black tracking-tighter leading-none mt-6', palette.text)}
          style={{
            textShadow: `0 0 48px ${palette.glow}, 0 6px 24px rgba(0,0,0,0.7)`,
            animation: 'goalPop 1.6s cubic-bezier(0.18, 0.89, 0.32, 1.28)',
            letterSpacing: '-0.04em',
          }}
        >
          GOAL!
        </div>
        <div className="text-[20px] sm:text-[28px] font-mono uppercase tracking-[0.25em] text-white/85 mt-3">
          {teamName}
        </div>
        {goal.scorer && goal.scorer !== '—' && (
          <div className="text-[14px] sm:text-[16px] font-mono text-white/55 mt-2">
            scored by <span className="text-white/85">{goal.scorer}</span>
          </div>
        )}
      </div>

      <style>{`
        @keyframes goalEdgePulse {
          0%   { opacity: 0; }
          8%   { opacity: 1; }
          25%  { opacity: 0.55; }
          40%  { opacity: 1; }
          55%  { opacity: 0.55; }
          70%  { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes goalFlash {
          0%   { opacity: 0; transform: scale(0.6); }
          8%   { opacity: 1; transform: scale(1.05); }
          22%  { opacity: 1; transform: scale(1.0); }
          28%  { opacity: 0.15; transform: scale(0.96); }
          36%  { opacity: 1; transform: scale(1.05); }
          50%  { opacity: 0.15; transform: scale(0.96); }
          58%  { opacity: 1; transform: scale(1.05); }
          75%  { opacity: 1; transform: scale(1.0); }
          100% { opacity: 0; transform: scale(1.0); }
        }
        @keyframes goalAura {
          0%   { opacity: 0; transform: scale(0.6); }
          15%  { opacity: 1; transform: scale(1.4); }
          60%  { opacity: 0.6; transform: scale(2.2); }
          100% { opacity: 0; transform: scale(2.6); }
        }
      `}</style>
    </>
  );
};

// Pulsing ring around the on-PP team's logo — the visual cue that
// matches the broadcast banner below. Orange when PHI is on the PP,
// red-amber when the opp is (so PK reads as a threat color).
const PPLogoFrame = ({ on, forUs, children }) => {
  if (!on) return <>{children}</>;
  const ring = forUs ? 'shadow-[0_0_0_4px_rgba(247,73,2,0.55),0_0_60px_rgba(247,73,2,0.45)]'
                     : 'shadow-[0_0_0_4px_rgba(245,158,11,0.55),0_0_60px_rgba(220,38,38,0.45)]';
  return (
    <div className={cx('rounded-full animate-pulse', ring)}>
      {children}
    </div>
  );
};

// Inline tag under the team's name. Compact, keeps the column centered
// even on narrow viewports.
const PPMicroChip = ({ forUs, strength, time }) => {
  const tone = forUs
    ? 'border-[var(--team-primary)]/55 bg-[var(--team-primary)]/[0.12] text-[var(--team-accent)]'
    : 'border-amber-500/45 bg-amber-500/[0.10] text-amber-300';
  const dot = forUs ? 'bg-[var(--team-primary)]' : 'bg-amber-400';
  return (
    <span className={cx(
      'inline-flex items-center gap-2 px-2.5 h-6 rounded-md border text-[10px] sm:text-[11px] font-mono uppercase tracking-[0.2em]',
      tone,
    )}>
      <span className={cx('w-1.5 h-1.5 rounded-full animate-pulse', dot)} />
      <span className="font-semibold">PP · {strength}</span>
      {time && <span className="tabular-nums opacity-80">{time}</span>}
    </span>
  );
};

// Full-width broadcast strip. Lives in the lower band (above the SOG
// ticker) so it never fights with the score readout for attention but
// is impossible to miss when scanning the screen from across the room.
//
// Treatment shifts by side: PHI on PP reads triumphant orange, the opp
// on PP reads warning amber/red so the PK is unmistakable as risk.
const PPBanner = ({ phiOnPP, usShort, oppAbbr, oppFull, strength, time }) => {
  const palette = phiOnPP
    ? { bg: 'bg-[var(--team-primary)]/[0.14]', border: 'border-[var(--team-primary)]/55', text: 'text-[var(--team-accent)]', accent: 'bg-[var(--team-primary)]', stripe: 'from-transparent via-[var(--team-primary)]/40 to-transparent' }
    : { bg: 'bg-red-500/[0.10]',   border: 'border-amber-500/45', text: 'text-amber-200',  accent: 'bg-amber-500', stripe: 'from-transparent via-amber-500/40 to-transparent' };
  const headline = phiOnPP ? `${usShort || 'Power'} Power Play` : `${oppFull || oppAbbr || 'Opponent'} Power Play`;
  const sub      = phiOnPP ? 'capitalize · cash in' : 'penalty kill · hold the line';
  return (
    <div
      className={cx(
        'absolute left-0 right-0 z-10 border-y backdrop-blur-sm overflow-hidden',
        palette.bg, palette.border,
      )}
      style={{ bottom: '76px' }}
    >
      {/* Top accent stripe + a subtle pulsing wash so the whole strip
          feels alive without animating the actual text/numbers. */}
      <div className={cx('absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r animate-pulse', palette.stripe)} />
      <div className={cx('absolute inset-y-0 left-0 w-1', palette.accent)} />
      <div className={cx('absolute inset-y-0 right-0 w-1', palette.accent)} />

      <div className="relative px-6 sm:px-12 py-4 flex items-center justify-between gap-6">
        {/* Side identity — logo + headline + sub */}
        <div className="flex items-center gap-4 min-w-0">
          <div className="flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-md bg-black/40 border border-white/[0.08] shrink-0">
            {phiOnPP
              ? <FlyersMark size={36} />
              : <TeamLogo abbr={oppAbbr} size={36} />}
          </div>
          <div className="min-w-0">
            <div className={cx('text-[14px] sm:text-[18px] font-mono font-semibold uppercase tracking-[0.22em] truncate', palette.text)}>
              {headline}
            </div>
            <div className="text-[10px] sm:text-[11px] font-mono uppercase tracking-[0.25em] text-white/45 mt-0.5">
              {sub}
            </div>
          </div>
        </div>

        {/* Strength differential — center anchor */}
        <div className="hidden sm:flex flex-col items-center shrink-0 px-6">
          <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-white/45">Skaters</div>
          <div className={cx('text-[28px] sm:text-[36px] font-bold tabular-nums tracking-tight leading-none mt-1', palette.text)}>
            {strength}
          </div>
        </div>

        {/* Time remaining — right anchor, monospaced so the seconds
            tick in place as the SSE snaps in fresh values. */}
        {time && (
          <div className="flex flex-col items-end shrink-0">
            <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-white/45">Remaining</div>
            <div className={cx('text-[28px] sm:text-[40px] font-bold tabular-nums tracking-tight leading-none mt-1 animate-pulse', palette.text)}>
              {time}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Trigger button — tucked next to the LIVE chip on the Hero. Only
// rendered on Hero when the kiosk would actually be useful (live game).
export const KioskTrigger = ({ onClick }) => (
  <button
    onClick={onClick}
    title="Broadcast view"
    aria-label="Open broadcast view"
    className="flex items-center gap-1.5 px-2 h-6 border border-white/[0.08] hover:border-[var(--team-primary)]/40 bg-white/[0.02] rounded-md text-[10px] font-mono text-white/55 hover:text-white transition-colors"
  >
    <Maximize2 size={11} />
    <span className="hidden sm:inline">Broadcast view</span>
  </button>
);
