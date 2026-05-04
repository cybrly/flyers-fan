import React, { useState, useEffect } from 'react';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { cx, isLive } from '../config.js';
import { Chip, Section, Skeleton, ScoreReadout } from '../components/primitives.jsx';
import { FlyersMark, TeamLogo } from '../components/Logo.jsx';
import { PlayerLink } from '../components/PlayerLink.jsx';

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

const GoalieRow = ({ g, isUs }) => (
  <tr className="hover:bg-white/[0.02]">
    <td className="px-4 text-right text-[10px] font-mono tabular-nums text-white/30 h-9">{g.num}</td>
    <td className="px-2 text-[12px] text-white/85 h-9">
      <span className="inline-flex items-center gap-2">
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

export const GameTape = ({ game, loading, pbp, customGameId, onClearCustom }) => {
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
  const periods = Object.keys(game.periods).map(Number).sort((a, b) => a - b);

  return (
    <div className="p-4 md:p-6 space-y-5">
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
            <ScoreReadout us={game.score.us} them={game.score.them} />

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
            <TeamLogo abbr={game.oppAbbr} size={32} />
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
                  {game.skaters.map((s) => {
                    const displayName = typeof s.name === 'string' ? s.name : (s.name?.default || '—');
                    return (
                    <tr key={s.id || `${displayName}-${s.num}`} className="hover:bg-white/[0.02]">
                      <td className="px-4 text-right text-[10px] font-mono tabular-nums text-white/30 h-9">{s.num}</td>
                      <td className="px-2 text-[12px] text-white/85">
                        <PlayerLink playerId={s.id}>{displayName}</PlayerLink>
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
                    {game.goalies.us.map((g) => <GoalieRow key={`u-${g.num}`} g={g} isUs />)}
                    {game.goalies.them.length > 0 && (
                      <tr className="bg-white/[0.02]">
                        <td colSpan={7} className="px-4 h-7 text-[10px] font-mono text-white/45 uppercase tracking-wider">{game.oppAbbr}</td>
                      </tr>
                    )}
                    {game.goalies.them.map((g) => <GoalieRow key={`t-${g.num}`} g={g} isUs={false} />)}
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
                    'grid grid-cols-[36px_56px_1fr_70px] items-center gap-3 px-4 h-12',
                    g.us ? 'bg-[#F74902]/[0.04]' : 'hover:bg-white/[0.02]',
                  )}>
                    <span className="text-[10px] font-mono text-white/40 uppercase">
                      P{g.period}{g.periodType === 'OT' ? ' OT' : g.periodType === 'SO' ? ' SO' : ''}
                    </span>
                    <span className="text-[11px] font-mono text-white/55 tabular-nums">{g.time}</span>
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
                    <div className="text-right">
                      <span className="text-[11px] font-mono tabular-nums text-white/65">
                        {g.awayScore}<span className="text-white/25 mx-0.5">–</span>{g.homeScore}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}
        </div>

        <div className="lg:col-span-5 space-y-4">
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
