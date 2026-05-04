import { ChevronRight, Home, Plane } from 'lucide-react';
import { cx, OPP_FULL, fmtDateFull, fmtTime } from '../config.js';
import { Chip, Section, Skeleton } from '../components/primitives.jsx';
import { GoalDiffBars, FormDots, MiniBar } from '../components/charts.jsx';
import { FlyersMark, TeamLogo } from '../components/Logo.jsx';
import { KPI } from '../components/KPI.jsx';
import { Hero } from '../components/Hero.jsx';

export const Dashboard = ({ schedule, standings, loading, onOpenGame }) => {
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

  const us = standings?.us;
  const nextGame = schedule?.nextGame;
  const liveGame = schedule?.liveGame;
  const lastResult = games[0];

  return (
    <div className="p-4 md:p-6 space-y-5">
      <Hero liveGame={liveGame} nextGame={nextGame} lastResult={lastResult} us={us} />

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {us?.clinched === 'x' && <Chip tone="orange">● Clinched Playoff Spot</Chip>}
          {us?.clinched === 'y' && <Chip tone="amber">● Clinched Division</Chip>}
          {us?.clinched === 'z' && <Chip tone="amber">● Clinched Conference</Chip>}
          {us?.clinched === 'p' && <Chip tone="orange">● Playoff Bound</Chip>}
          {us?.clinched === 'e' && <Chip tone="red">● Eliminated</Chip>}
          {us && <span className="text-[12px] text-white/45 font-mono">{us.gp} of 82 games · 2025–26</span>}
        </div>
        <div className="flex items-center gap-2 text-[11px] font-mono text-white/40">
          <span>Showing</span><span className="text-white/70">Last 20 games</span>
          <ChevronRight size={11} />
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <KPI label="Record" value={us ? `${us.w}–${us.l}${us.ot ? `–${us.ot}` : ''}` : '—'} sub={us ? `${us.gp} GP` : ''} sparkData={running.winPctArr} loading={loading && !us} />
        <KPI label="Points %" value={us ? (us.pct * 100).toFixed(1) : '—'} sub="%" sparkData={running.winPctArr} loading={loading && !us} />
        <KPI label="Goal Diff" value={us ? `${us.diff >= 0 ? '+' : ''}${us.diff}` : '—'} sub="season" sparkData={running.diffArr} trendColor={(us?.diff ?? 0) >= 0 ? '#F74902' : '#EF4444'} loading={loading && !us} />
        <KPI label="Streak" value={streak ? `${streak.type}${streak.count}` : '—'} sub={streak?.type === 'W' ? 'hot' : 'cold'} sparkData={running.winPctArr} loading={!streak} />
        <KPI label="Last 10" value={games.length ? `${l10Record.w}–${l10Record.l}` : '—'} sub="recent" sparkData={l10.map((g) => g.w ? 1 : 0).reverse()} loading={!games.length} />
        <KPI label="Division" value={us ? `#${us.divRank}` : '—'} sub="Metro" loading={!us} />
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
                  <button
                    key={g.id}
                    onClick={() => onOpenGame?.(g.id)}
                    className="w-full text-left grid grid-cols-[44px_56px_1fr_80px_120px_60px] gap-3 items-center px-4 h-10 hover:bg-white/[0.03] transition-colors cursor-pointer"
                  >
                    <span className={cx(
                      'inline-flex items-center justify-center w-[22px] h-[18px] text-[10px] font-mono font-semibold rounded-[3px]',
                      g.w ? 'bg-[#F74902]/15 text-[#FF8A4C] border border-[#F74902]/30'
                          : 'bg-white/[0.03] text-white/40 border border-white/10'
                    )}>{g.w ? 'W' : 'L'}</span>
                    <span className="text-[11px] font-mono text-white/50 tabular-nums">{g.label}</span>
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[10px] font-mono text-white/35 uppercase shrink-0">{g.home ? 'vs' : '@'}</span>
                      <TeamLogo abbr={g.opp} size={16} />
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
                  </button>
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
                    <TeamLogo abbr={liveGame.opp} size={18} />
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
                    <TeamLogo abbr={nextGame.opp} size={18} />
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
                    <TeamLogo abbr={lastResult.opp} size={18} />
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
