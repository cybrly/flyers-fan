import { useMemo } from 'react';
import { Star, Trophy, ChevronRight } from 'lucide-react';
import { cx, TEAM_ABBR, SEASON_LABEL } from '../config.js';
import { Section } from './primitives.jsx';
import { Headshot } from './Headshot.jsx';
import { PlayerLink } from './PlayerLink.jsx';

// ─── Three Stars ───────────────────────────────────────────────────────────
//
// NHL game's three stars from the most recent finalized PHI game. lastGame
// is the adapted game object; stars is already flattened to { name, position,
// teamAbbrev, goals, assists, points }. We prefer lastGame because it's the
// most recent FINALIZED game (a live game's stars aren't named yet).

export const ThreeStarsPanel = ({ lastGame }) => {
  const stars = lastGame?.stars || [];
  if (!stars.length) return null;
  const dateLabel = lastGame.dateLabel || '';

  const tone = (n) =>
    n === 1 ? { ring: 'ring-amber-400/40', text: 'text-amber-300', bg: 'bg-amber-500/[0.08]' } :
    n === 2 ? { ring: 'ring-white/15',     text: 'text-white/85',  bg: 'bg-white/[0.03]' } :
    { ring: 'ring-orange-400/30', text: 'text-orange-300/80', bg: 'bg-[#F74902]/[0.04]' };

  return (
    <Section
      title={<span className="flex items-center gap-2"><Star size={12} className="text-amber-300" /> Three Stars</span>}
      action={<span className="text-[10px] font-mono text-white/40">{dateLabel}</span>}
    >
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-white/[0.04]">
        {stars.map((s) => {
          const t = tone(s.star);
          const isUs = s.teamAbbrev === TEAM_ABBR;
          return (
            <div key={s.star} className={cx('p-3 flex items-start gap-3 ring-1 ring-inset', t.bg, t.ring)}>
              <div className={cx(
                'shrink-0 w-9 h-9 rounded-full flex items-center justify-center font-mono font-bold text-[14px] tabular-nums',
                t.text, t.bg
              )}>
                {s.star}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-1.5 flex-wrap">
                  <span className={cx('text-[14px] font-semibold tracking-tight', isUs && 'text-[#FF8A4C]')}>
                    {s.id ? <PlayerLink playerId={s.id}>{s.name}</PlayerLink> : s.name}
                  </span>
                  {s.position && <span className="text-[10px] font-mono text-white/35">{s.position}</span>}
                </div>
                <div className="text-[10px] font-mono text-white/55 mt-0.5">
                  {s.teamAbbrev}
                  <span className="text-white/25 mx-1.5">·</span>
                  <span>{s.goals}G</span>
                  <span className="text-white/25 mx-1">·</span>
                  <span>{s.assists}A</span>
                  <span className="text-white/25 mx-1">·</span>
                  <span className="text-white">{s.points}P</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Section>
  );
};

// ─── Award Watch ───────────────────────────────────────────────────────────
//
// Major NHL individual awards with the current consensus contender field
// for 2025–26. Manually curated like the Coaches table — beat-writer-level
// guesses, refined occasionally. PHI players highlighted in brand orange.

const AWARDS = [
  {
    name: 'Hart Trophy',
    subtitle: 'Most Valuable Player',
    color: '#F59E0B',
    contenders: [
      { name: 'Connor McDavid', team: 'EDM' },
      { name: 'Nathan MacKinnon', team: 'COL' },
      { name: 'Leon Draisaitl', team: 'EDM' },
      { name: 'Nikita Kucherov', team: 'TBL' },
    ],
  },
  {
    name: 'Norris Trophy',
    subtitle: 'Top Defenseman',
    color: '#10B981',
    contenders: [
      { name: 'Cale Makar', team: 'COL' },
      { name: 'Quinn Hughes', team: 'VAN' },
      { name: 'Victor Hedman', team: 'TBL' },
      { name: 'Adam Fox', team: 'NYR' },
    ],
  },
  {
    name: 'Vezina Trophy',
    subtitle: 'Top Goaltender',
    color: '#38BDF8',
    contenders: [
      { name: 'Connor Hellebuyck', team: 'WPG' },
      { name: 'Sergei Bobrovsky', team: 'FLA' },
      { name: 'Frederik Andersen', team: 'CAR' },
      { name: 'Linus Ullmark', team: 'OTT' },
    ],
  },
  {
    name: 'Calder Trophy',
    subtitle: 'Rookie of the Year',
    color: '#A78BFA',
    contenders: [
      { name: 'Macklin Celebrini', team: 'SJS' },
      { name: 'Dustin Wolf', team: 'CGY' },
      { name: 'Cutter Gauthier', team: 'ANA' },
      { name: 'Lane Hutson', team: 'MTL' },
    ],
  },
  {
    name: 'Selke Trophy',
    subtitle: 'Best Defensive Forward',
    color: '#FF8A4C',
    contenders: [
      { name: 'Aleksander Barkov', team: 'FLA' },
      { name: 'Auston Matthews', team: 'TOR' },
      { name: 'Sebastian Aho', team: 'CAR' },
      { name: 'Anze Kopitar', team: 'LAK' },
    ],
  },
  {
    name: 'Jack Adams',
    subtitle: 'Coach of the Year',
    color: '#EF4444',
    contenders: [
      { name: 'Jared Bednar', team: 'COL' },
      { name: 'Paul Maurice', team: 'FLA' },
      { name: 'Spencer Carbery', team: 'WSH' },
      { name: 'Rod Brind\'Amour', team: 'CAR' },
    ],
  },
];

export const AwardWatchPanel = () => {
  return (
    <Section
      title={<span className="flex items-center gap-2"><Trophy size={12} className="text-amber-300" /> Award Watch · {SEASON_LABEL}</span>}
      action={<span className="text-[10px] font-mono text-white/40">consensus contenders</span>}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-white/[0.04]">
        {AWARDS.map((a) => (
          <div key={a.name} className="bg-[#0A0A0A] p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: a.color }} />
              <span className="text-[11px] font-medium" style={{ color: a.color }}>{a.name}</span>
            </div>
            <div className="text-[9px] font-mono text-white/35 uppercase tracking-wider mb-2">
              {a.subtitle}
            </div>
            <ol className="space-y-0.5">
              {a.contenders.map((c, i) => {
                const isUs = c.team === TEAM_ABBR;
                return (
                  <li key={c.name} className="flex items-center gap-1.5 text-[11px]">
                    <span className={cx('font-mono tabular-nums w-3 shrink-0',
                      i === 0 ? 'text-amber-300 font-semibold' : 'text-white/30'
                    )}>{i + 1}</span>
                    <span className={cx('truncate flex-1', isUs ? 'text-[#FF8A4C] font-medium' : 'text-white/75')}>
                      {c.name}
                    </span>
                    <span className="text-[9px] font-mono text-white/40 shrink-0">{c.team}</span>
                  </li>
                );
              })}
            </ol>
          </div>
        ))}
      </div>
    </Section>
  );
};

// ─── Records Tracker ───────────────────────────────────────────────────────
//
// PHI franchise records being chased this season. Compares hand-curated
// franchise marks against the current season leaders pulled from clubStats.
// Only displays records where someone is within striking distance OR worth
// noting.

const SINGLE_SEASON_RECORDS = [
  { stat: 'Goals (skater season)',  value: 61,  holder: 'Reggie Leach',     year: '1975–76' },
  { stat: 'Assists (skater season)', value: 89, holder: 'Bobby Clarke',     year: '1974–75' },
  { stat: 'Points (skater season)', value: 123, holder: 'Mark Recchi',      year: '1992–93' },
  { stat: 'Wins (goalie season)',   value: 47,  holder: 'Bernie Parent',    year: '1973–74' },
  { stat: 'Save % (goalie season)', value: 0.932, holder: 'Bernie Parent',  year: '1973–74' },
  { stat: 'Shutouts (goalie season)', value: 12, holder: 'Bernie Parent',   year: '1973–74' },
];

export const RecordsTrackerPanel = ({ clubStats }) => {
  const rows = useMemo(() => {
    if (!clubStats) return [];
    const skaters = clubStats.skaters || [];
    const goalies = clubStats.goalies || [];
    const topG = skaters.reduce((a, b) => ((a?.g ?? 0) > (b.g ?? 0) ? a : b), null);
    const topA = skaters.reduce((a, b) => ((a?.a ?? 0) > (b.a ?? 0) ? a : b), null);
    const topP = skaters.reduce((a, b) => ((a?.pts ?? 0) > (b.pts ?? 0) ? a : b), null);
    const topW = goalies.reduce((a, b) => ((a?.w ?? 0) > (b.w ?? 0) ? a : b), null);
    const topSV = goalies
      .filter((g) => g.gp >= 10) // need a real workload before SV% is meaningful
      .reduce((a, b) => ((a?.savePct ?? 0) > (b.savePct ?? 0) ? a : b), null);
    const topSO = goalies.reduce((a, b) => ((a?.so ?? 0) > (b.so ?? 0) ? a : b), null);

    return [
      { ...SINGLE_SEASON_RECORDS[0], current: topG?.g ?? 0, leader: topG, fmt: (v) => v },
      { ...SINGLE_SEASON_RECORDS[1], current: topA?.a ?? 0, leader: topA, fmt: (v) => v },
      { ...SINGLE_SEASON_RECORDS[2], current: topP?.pts ?? 0, leader: topP, fmt: (v) => v },
      { ...SINGLE_SEASON_RECORDS[3], current: topW?.w ?? 0, leader: topW, fmt: (v) => v },
      {
        ...SINGLE_SEASON_RECORDS[4],
        current: topSV?.savePct != null ? topSV.savePct / 100 : 0,
        leader: topSV,
        fmt: (v) => (v * 100).toFixed(1) + '%',
      },
      { ...SINGLE_SEASON_RECORDS[5], current: topSO?.so ?? 0, leader: topSO, fmt: (v) => v },
    ];
  }, [clubStats]);

  if (!rows.length) return null;

  return (
    <Section
      title="Franchise Records · Single Season"
      action={<span className="text-[10px] font-mono text-white/40">{SEASON_LABEL} leader vs all-time mark</span>}
    >
      <div className="divide-y divide-white/[0.04]">
        {rows.map((r) => {
          const pct = r.value > 0 ? Math.min(100, (r.current / r.value) * 100) : 0;
          const dist = r.value - r.current;
          const onPace = pct >= 95;
          return (
            <div key={r.stat} className="px-4 py-2.5">
              <div className="flex items-baseline justify-between flex-wrap gap-2">
                <span className="text-[11px] text-white/75">{r.stat}</span>
                <span className="text-[10px] font-mono text-white/40">
                  Record: <span className="text-white/65">{r.fmt(r.value)}</span>
                  <span className="text-white/25 mx-1.5">·</span>
                  <span className="text-amber-300/85">{r.holder}</span>
                  <span className="text-white/25 mx-1.5">·</span>
                  <span className="text-white/45">{r.year}</span>
                </span>
              </div>
              <div className="mt-1.5 grid grid-cols-[auto_1fr_auto] items-center gap-2">
                <span className={cx('text-[14px] font-mono tabular-nums font-semibold',
                  onPace ? 'text-emerald-400' : 'text-[#FF8A4C]'
                )}>
                  {r.fmt(r.current)}
                </span>
                <div className="relative h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
                  <div
                    className={cx('absolute inset-y-0 left-0 rounded-full',
                      onPace ? 'bg-emerald-500' : 'bg-[#F74902]'
                    )}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-[10px] font-mono text-white/45 tabular-nums shrink-0 min-w-[70px] text-right">
                  {r.leader ? r.leader.name : '—'}
                </span>
              </div>
              <div className="mt-1 text-[9px] font-mono text-white/35">
                {dist > 0
                  ? `${r.fmt(Math.max(0, dist))} short · ${pct.toFixed(0)}% of record`
                  : `${r.fmt(Math.abs(dist))} past record · ${pct.toFixed(0)}% of mark`}
              </div>
            </div>
          );
        })}
      </div>
    </Section>
  );
};
