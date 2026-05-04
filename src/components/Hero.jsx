import { useEffect, useState } from 'react';
import { cx, OPP_FULL, fmtTime, fmtDateFull } from '../config.js';
import { Chip } from './primitives.jsx';
import { FlyersMark, TeamLogo } from './Logo.jsx';

const PHI_LOGO = 'https://assets.nhle.com/logos/nhl/svg/PHI_dark.svg';

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

const HeroLive = ({ liveGame, oppFull }) => (
  <>
    <div className="flex items-center gap-2">
      <Chip tone="live" pulse>LIVE NOW</Chip>
      <span className="text-[11px] font-mono text-white/55 uppercase tracking-wider">{liveGame.home ? 'Home' : 'Away'} · {liveGame.venue || 'TBD'}</span>
    </div>
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 sm:gap-8 mt-5">
      <div className="flex items-center gap-3 min-w-0">
        <FlyersMark size={48} />
        <div className="min-w-0">
          <div className="text-[10px] font-mono text-white/45 uppercase tracking-wider">Philadelphia</div>
          <div className="text-[18px] font-semibold tracking-tight">Flyers</div>
        </div>
      </div>
      <div className="flex items-baseline gap-3">
        <span className="text-[64px] sm:text-[84px] font-semibold tabular-nums tracking-tight text-[#FF8A4C] leading-none">{liveGame.us}</span>
        <span className="text-[36px] text-white/20">–</span>
        <span className="text-[64px] sm:text-[84px] font-semibold tabular-nums tracking-tight text-white/80 leading-none">{liveGame.them}</span>
      </div>
      <div className="flex items-center gap-3 min-w-0 justify-end">
        <div className="text-right min-w-0">
          <div className="text-[10px] font-mono text-white/45 uppercase tracking-wider">{oppFull?.split(' ').slice(0, -1).join(' ') || liveGame.opp}</div>
          <div className="text-[18px] font-semibold tracking-tight text-white/85">{oppFull?.split(' ').slice(-1) || ''}</div>
        </div>
        <TeamLogo abbr={liveGame.opp} size={48} />
      </div>
    </div>
  </>
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
      <div className="flex items-baseline gap-3">
        <span className={cx('text-[64px] sm:text-[84px] font-semibold tabular-nums tracking-tight leading-none',
          lastResult.w ? 'text-[#FF8A4C]' : 'text-white/55'
        )}>{lastResult.us}</span>
        <span className="text-[36px] text-white/20">–</span>
        <span className={cx('text-[64px] sm:text-[84px] font-semibold tabular-nums tracking-tight leading-none',
          !lastResult.w ? 'text-white/85' : 'text-white/55'
        )}>{lastResult.them}</span>
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

export const Hero = ({ liveGame, nextGame, lastResult, us }) => {
  const opp = liveGame?.opp || nextGame?.opp || lastResult?.opp;
  const oppFull = opp ? OPP_FULL[opp] : null;

  return (
    <div
      className="relative overflow-hidden rounded-md border border-white/[0.06] bg-gradient-to-br from-[#141414] via-[#101010] to-[#0A0A0A] px-5 sm:px-8 py-6 sm:py-8"
      style={{ backgroundImage: `url(${PHI_LOGO})`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right -40px center', backgroundSize: 'auto 200%' }}
    >
      {/* Neutral veil so the watermark logo doesn't fight content */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-[#0A0A0A] via-[#0A0A0A]/85 to-[#0A0A0A]/55" />
      <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(247,73,2,0.18), transparent 60%)' }} />

      <div className="relative">
        {liveGame ? <HeroLive liveGame={liveGame} oppFull={oppFull} /> :
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
          <div className="relative mt-6 pt-5 border-t border-white/[0.05] grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <div className="text-[10px] font-mono text-white/40 uppercase tracking-wider">Record</div>
              <div className="text-[18px] font-semibold tabular-nums mt-0.5">{us.w}–{us.l}{us.ot ? `–${us.ot}` : ''}</div>
            </div>
            <div>
              <div className="text-[10px] font-mono text-white/40 uppercase tracking-wider">Points</div>
              <div className="text-[18px] font-semibold tabular-nums mt-0.5">{us.pts}</div>
            </div>
            <div>
              <div className="text-[10px] font-mono text-white/40 uppercase tracking-wider">Goal Diff</div>
              <div className={cx('text-[18px] font-semibold tabular-nums mt-0.5',
                us.diff > 0 ? 'text-[#FF8A4C]' : us.diff < 0 ? 'text-red-400' : ''
              )}>{us.diff > 0 ? '+' : ''}{us.diff}</div>
            </div>
            <div>
              <div className="text-[10px] font-mono text-white/40 uppercase tracking-wider">Metro</div>
              <div className="text-[18px] font-semibold tabular-nums mt-0.5">#{us.divRank}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
