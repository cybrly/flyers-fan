import { useEffect, useState } from 'react';
import { cx, OPP_FULL, fmtTime, fmtDateFull } from '../config.js';
import { Chip } from './primitives.jsx';
import { FlyersMark, TeamLogo } from './Logo.jsx';

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
const HeroLive = ({ liveGame, liveDetail, oppFull }) => {
  const period = liveDetail?.periodDescriptor;
  const clock = liveDetail?.clock;
  const inIntermission = clock?.inIntermission;
  const periodLabel = period?.periodType === 'OT'
    ? 'OT'
    : period?.periodType === 'SO'
      ? 'SO'
      : period?.number ? `P${period.number}` : null;
  const clockText = clock?.timeRemaining || '—:—';

  const sog = liveDetail?.stats?.shots;
  const pp = liveDetail?.stats?.powerPlay;

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
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 sm:gap-8 mt-5">
        <div className="flex items-center gap-3 min-w-0">
          <FlyersMark size={48} />
          <div className="min-w-0">
            <div className="text-[10px] font-mono text-white/45 uppercase tracking-wider">Philadelphia</div>
            <div className="text-[18px] font-semibold tracking-tight">Flyers</div>
          </div>
        </div>
        <div className="flex items-baseline gap-3 px-4 sm:px-6 py-2 rounded-md bg-black/40 border border-white/[0.06] shadow-[0_8px_24px_-8px_rgba(0,0,0,0.6),0_1px_0_rgba(255,255,255,0.04)_inset]">
          <span
            className="text-[64px] sm:text-[84px] font-semibold tabular-nums tracking-tight text-[#FF8A4C] leading-none"
            style={{ textShadow: '0 0 24px rgba(247,73,2,0.4), 0 2px 4px rgba(0,0,0,0.6)' }}
          >{liveGame.us}</span>
          <span className="text-[36px] text-white/20">–</span>
          <span
            className="text-[64px] sm:text-[84px] font-semibold tabular-nums tracking-tight text-white/85 leading-none"
            style={{ textShadow: '0 2px 4px rgba(0,0,0,0.6)' }}
          >{liveGame.them}</span>
        </div>
        <div className="flex items-center gap-3 min-w-0 justify-end">
          <div className="text-right min-w-0">
            <div className="text-[10px] font-mono text-white/45 uppercase tracking-wider">{oppFull?.split(' ').slice(0, -1).join(' ') || liveGame.opp}</div>
            <div className="text-[18px] font-semibold tracking-tight text-white/85">{oppFull?.split(' ').slice(-1) || ''}</div>
          </div>
          <TeamLogo abbr={liveGame.opp} size={48} />
        </div>
      </div>

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

const HeroNext = ({ nextGame, oppFull }) => {
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
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 sm:gap-8 mt-5">
        <div className="flex items-center gap-3 min-w-0">
          <FlyersMark size={48} />
          <div className="min-w-0">
            <div className="text-[10px] font-mono text-white/45 uppercase tracking-wider">Philadelphia</div>
            <div className="text-[18px] font-semibold tracking-tight">Flyers</div>
          </div>
        </div>
        {cd && !cd.past ? (
          <div className="text-center">
            <div className="text-[10px] font-mono text-white/40 uppercase tracking-wider mb-1">Puck drops in</div>
            <div className="flex items-baseline gap-2 justify-center font-semibold tabular-nums tracking-tight text-[#FF8A4C]">
              {cd.d > 0 && <><span className="text-[36px] sm:text-[44px] leading-none">{cd.d}</span><span className="text-[14px] text-white/40 font-mono">d</span></>}
              <span className="text-[36px] sm:text-[44px] leading-none">{String(cd.h).padStart(2, '0')}</span>
              <span className="text-[14px] text-white/40 font-mono">h</span>
              <span className="text-[36px] sm:text-[44px] leading-none">{String(cd.m).padStart(2, '0')}</span>
              <span className="text-[14px] text-white/40 font-mono">m</span>
              <span className="text-[36px] sm:text-[44px] leading-none">{String(cd.s).padStart(2, '0')}</span>
              <span className="text-[14px] text-white/40 font-mono">s</span>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <div className="text-[28px] font-semibold tabular-nums tracking-tight text-white/40">VS</div>
          </div>
        )}
        <div className="flex items-center gap-3 min-w-0 justify-end">
          <div className="text-right min-w-0">
            <div className="text-[10px] font-mono text-white/45 uppercase tracking-wider">{oppFull?.split(' ').slice(0, -1).join(' ') || nextGame.opp}</div>
            <div className="text-[18px] font-semibold tracking-tight text-white/85">{oppFull?.split(' ').slice(-1) || ''}</div>
          </div>
          <TeamLogo abbr={nextGame.opp} size={48} />
        </div>
      </div>
    </>
  );
};

const HeroLatest = ({ lastResult, oppFull }) => (
  <>
    <div className="flex items-center gap-2">
      <Chip tone={lastResult.w ? 'orange' : 'muted'}>{lastResult.w ? '● WIN' : '● LOSS'}</Chip>
      <span className="text-[11px] font-mono text-white/55 uppercase tracking-wider">{fmtDateFull(lastResult.date)} · Final</span>
    </div>
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 sm:gap-8 mt-5">
      <div className="flex items-center gap-3 min-w-0">
        <FlyersMark size={48} />
        <div className="min-w-0">
          <div className="text-[10px] font-mono text-white/45 uppercase tracking-wider">Philadelphia</div>
          <div className="text-[18px] font-semibold tracking-tight">Flyers</div>
        </div>
      </div>
      <div className="flex items-baseline gap-3 px-4 sm:px-6 py-2 rounded-md bg-black/40 border border-white/[0.06] shadow-[0_8px_24px_-8px_rgba(0,0,0,0.6),0_1px_0_rgba(255,255,255,0.04)_inset]">
        <span
          className={cx('text-[64px] sm:text-[84px] font-semibold tabular-nums tracking-tight leading-none',
            lastResult.w ? 'text-emerald-400' : 'text-white/55'
          )}
          style={{ textShadow: lastResult.w
            ? '0 0 22px rgba(16,185,129,0.35), 0 2px 4px rgba(0,0,0,0.6)'
            : '0 2px 4px rgba(0,0,0,0.6)' }}
        >{lastResult.us}</span>
        <span className="text-[36px] text-white/20">–</span>
        <span
          className={cx('text-[64px] sm:text-[84px] font-semibold tabular-nums tracking-tight leading-none',
            !lastResult.w ? 'text-red-400' : 'text-white/55'
          )}
          style={{ textShadow: !lastResult.w
            ? '0 0 22px rgba(239,68,68,0.32), 0 2px 4px rgba(0,0,0,0.6)'
            : '0 2px 4px rgba(0,0,0,0.6)' }}
        >{lastResult.them}</span>
      </div>
      <div className="flex items-center gap-3 min-w-0 justify-end">
        <div className="text-right min-w-0">
          <div className="text-[10px] font-mono text-white/45 uppercase tracking-wider">{oppFull?.split(' ').slice(0, -1).join(' ') || lastResult.opp}</div>
          <div className="text-[18px] font-semibold tracking-tight text-white/85">{oppFull?.split(' ').slice(-1) || ''}</div>
        </div>
        <TeamLogo abbr={lastResult.opp} size={48} />
      </div>
    </div>
  </>
);

export const Hero = ({ liveGame, liveDetail, nextGame, lastResult, us }) => {
  const opp = liveGame?.opp || nextGame?.opp || lastResult?.opp;
  const oppFull = opp ? OPP_FULL[opp] : null;

  return (
    <div className="relative overflow-hidden rounded-lg border border-white/[0.08] bg-[#0A0A0A] px-5 sm:px-8 py-6 sm:py-8 shadow-[0_0_0_1px_rgba(255,255,255,0.02)_inset,0_24px_48px_-24px_rgba(0,0,0,0.9),0_2px_0_rgba(255,255,255,0.04)_inset]">
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
        {/* Large featured team logos — flanking the panel, properly contained
            so they don't tint the surface. Each logo gets a neutral white
            radial halo behind it for separation. */}
        <FeatureLogo abbr="PHI" url={PHI_LOGO} side="left" />
        <FeatureLogo abbr={opp} url={teamLogoUrl(opp)} side="right" />
        {/* Top edge highlight + bottom shadow for the "raised card" feel. */}
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
        <div aria-hidden className="pointer-events-none absolute inset-x-8 bottom-0 h-12 bg-gradient-to-t from-black/60 to-transparent" />

      <div className="relative">
        {liveGame ? <HeroLive liveGame={liveGame} liveDetail={liveDetail} oppFull={oppFull} /> :
          nextGame ? <HeroNext nextGame={nextGame} oppFull={oppFull} /> :
          lastResult ? <HeroLatest lastResult={lastResult} oppFull={oppFull} /> :
          (
            <div className="flex items-center gap-3">
              <FlyersMark size={48} />
              <div>
                <div className="text-[20px] font-semibold tracking-tight">Philadelphia Flyers</div>
                <div className="text-[12px] font-mono text-white/45">Loading season data…</div>
              </div>
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

// Featured team logo — large, soft-glow halo behind, lifts off the surface
// with a subtle drop shadow. Sits behind text content but above the
// background gradients. We tuck it slightly off-screen on the inside edge so
// the score block has room to breathe.
const FeatureLogo = ({ abbr, url, side }) => {
  if (!url || !abbr) return null;
  const isLeft = side === 'left';
  return (
    <div
      aria-hidden
      className={cx(
        'pointer-events-none absolute top-1/2 -translate-y-1/2 hidden md:block',
        isLeft ? 'left-[-18px]' : 'right-[-18px]',
      )}
    >
      <div
        className="absolute inset-0 m-auto w-[200px] h-[200px] rounded-full"
        style={{
          background: 'radial-gradient(closest-side, rgba(255,255,255,0.06), transparent 70%)',
          filter: 'blur(8px)',
        }}
      />
      <img
        src={url}
        alt=""
        className="relative w-[180px] h-[180px] lg:w-[210px] lg:h-[210px] object-contain"
        style={{
          opacity: 0.9,
          filter: 'drop-shadow(0 18px 24px rgba(0,0,0,0.6)) drop-shadow(0 0 1px rgba(255,255,255,0.08))',
        }}
        onError={(e) => { e.currentTarget.style.display = 'none'; }}
      />
    </div>
  );
};

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
