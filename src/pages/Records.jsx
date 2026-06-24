import { useState } from 'react';
import { cx } from '../config.js';
import { Section, SectionBand } from '../components/primitives.jsx';
import { getHostScope } from '../host.js';

// All-time franchise records — curated, hand-maintained list. The NHL
// public API doesn't expose franchise leaderboards, so this page is a
// static reference of the most-cited Flyers single-game / single-season
// / career marks. Each entry can be updated when a record falls.
//
// Source notes are kept short on purpose; the canonical record book
// lives at flyershistory.com / NHL.com — this is the fan-facing summary.

const SINGLE_SEASON = [
  { stat: 'Goals',         player: 'Reggie Leach',     value: 61, year: '1975–76' },
  { stat: 'Assists',       player: 'Bobby Clarke',     value: 89, year: '1974–75' },
  { stat: 'Points',        player: 'Mark Recchi',      value: 123, year: '1992–93' },
  { stat: 'Power-play G',  player: 'Tim Kerr',         value: 34, year: '1985–86' },
  { stat: 'Hat tricks',    player: 'Tim Kerr',         value: 8,  year: '1984–85' },
  { stat: 'Plus/Minus',    player: 'Bobby Clarke',     value: '+84', year: '1975–76' },
  { stat: 'Penalty mins',  player: 'Dave Schultz',     value: 472, year: '1974–75' },
  { stat: 'Wins (G)',      player: 'Bernie Parent',    value: 47, year: '1973–74' },
  { stat: 'Shutouts (G)',  player: 'Bernie Parent',    value: 12, year: '1973–74 / 74–75' },
  { stat: 'GAA (G, min 25)', player: 'Bernie Parent',  value: 1.89, year: '1973–74' },
];

const SINGLE_GAME = [
  { stat: 'Goals',     player: 'Tim Kerr',     value: 4, note: '4× — first Flyer to do it repeatedly' },
  { stat: 'Assists',   player: 'Bobby Clarke', value: 6, note: 'vs Boston · Mar 25, 1976' },
  { stat: 'Points',    player: 'Bobby Clarke', value: 7, note: '4G + 3A possible — multi-time tied' },
  { stat: 'Saves',     player: 'Sergei Bobrovsky', value: 53, note: 'Apr 24, 2012 vs PIT (Game 6)' },
  { stat: 'Shots on goal (team)', player: 'Flyers',  value: 72, note: 'Dec 4, 1976 vs Toronto' },
];

const CAREER = [
  { stat: 'Games played', player: 'Bobby Clarke',  value: 1144 },
  { stat: 'Goals',        player: 'Bill Barber',   value: 420 },
  { stat: 'Assists',      player: 'Bobby Clarke',  value: 852 },
  { stat: 'Points',       player: 'Bobby Clarke',  value: 1210 },
  { stat: 'Penalty mins', player: 'Rick Tocchet',  value: 1683 },
  { stat: 'Wins (G)',     player: 'Ron Hextall',   value: 240 },
  { stat: 'Shutouts (G)', player: 'Bernie Parent', value: 50 },
  { stat: 'GAA (G, career)', player: 'Bernie Parent', value: 2.42 },
];

const TEAM_RECORDS = [
  { stat: 'Most wins (season)',     value: 53,   year: '1984–85' },
  { stat: 'Most points (season)',   value: 118,  year: '1975–76' },
  { stat: 'Longest unbeaten streak', value: '35 games', year: '1979–80 (25-0-10)' },
  { stat: 'Longest win streak',      value: '13 games',  year: '1985–86' },
  { stat: 'Most goals (season)',    value: 350,  year: '1983–84' },
  { stat: 'Stanley Cups',           value: 2,    year: '1973–74, 1974–75' },
];

const TABS = [
  { id: 'season', label: 'Single Season',  data: SINGLE_SEASON },
  { id: 'game',   label: 'Single Game',    data: SINGLE_GAME },
  { id: 'career', label: 'Career',         data: CAREER },
  { id: 'team',   label: 'Team',           data: TEAM_RECORDS },
];

export const Records = () => {
  const [tab, setTab] = useState('season');
  const active = TABS.find((t) => t.id === tab) || TABS[0];

  // The franchise record book below is Philadelphia Flyers data only — it
  // has no league-wide equivalent (the NHL public API doesn't expose
  // per-franchise leaderboards). On the league host (scumbag.hockey) the
  // page would otherwise show Flyers marks for all 32 teams, so we render
  // an empty state instead and keep this a flyers.fan-only feature.
  if (getHostScope() === 'league') {
    return (
      <div className="space-y-6">
        <SectionBand
          label="All-Time Franchise Records"
          color="orange"
          sub="flyers.fan only"
        />
        <Section title="Not available league-wide">
          <div className="px-4 py-8 text-center">
            <p className="text-[13px] text-white/70">
              Franchise records are a <span className="text-[#FF8A4C]">flyers.fan</span> feature.
            </p>
            <p className="mt-2 text-[11px] font-mono text-white/40">
              All-time leaderboards are curated for a single club and aren't available across the league.
            </p>
          </div>
        </Section>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SectionBand
        label="All-Time Franchise Records"
        color="orange"
        sub="curated · since 1967"
      />

      <div className="flex items-center gap-2 flex-wrap">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cx(
              'px-3 py-1.5 text-[11px] font-mono uppercase tracking-wider rounded-md border transition-colors',
              tab === t.id
                ? 'border-[#F74902]/40 bg-[#F74902]/[0.08] text-[#FF8A4C]'
                : 'border-white/[0.06] bg-white/[0.02] text-white/55 hover:text-white/80'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <Section title={active.label} action={<span className="text-[10px] font-mono text-white/40">{active.data.length} records</span>}>
        <div className="divide-y divide-white/[0.04]">
          {active.data.map((r, i) => (
            <div key={i} className="grid grid-cols-[120px_1fr_auto] sm:grid-cols-[180px_1fr_120px] items-center gap-3 px-4 py-2.5">
              <span className="text-[11px] font-mono uppercase tracking-wider text-white/55">{r.stat}</span>
              <div className="min-w-0">
                <div className="text-[14px] text-white/90 truncate">{r.player || '—'}</div>
                {r.note && <div className="text-[10px] font-mono text-white/40 truncate">{r.note}</div>}
                {r.year && <div className="text-[10px] font-mono text-white/40">{r.year}</div>}
              </div>
              <span className="text-[20px] sm:text-[22px] font-semibold tabular-nums text-[#FF8A4C] text-right">{r.value}</span>
            </div>
          ))}
        </div>
      </Section>

      <p className="text-[10px] font-mono text-white/30 px-1">
        Records reflect Philadelphia Flyers franchise history. Single-game / season marks reference the most commonly cited
        career-best performances; verify against the official record book for ties and context. Active seasons may not yet
        be reflected.
      </p>
    </div>
  );
};
