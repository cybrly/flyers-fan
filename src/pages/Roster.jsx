import { useState } from 'react';
import { cx } from '../config.js';
import { Section, Skeleton } from '../components/primitives.jsx';
import { SkaterHotCold, GoalieHotCold } from '../components/HotCold.jsx';
import { SalaryCap } from '../components/SalaryCap.jsx';
import { ContractGrid } from '../components/ContractGrid.jsx';
import { PlayerLink } from '../components/PlayerLink.jsx';
import { Headshot } from '../components/Headshot.jsx';
import { Hometowns } from '../components/Hometowns.jsx';
import { Birthdays } from '../components/Birthdays.jsx';
import { ProjectedLineup } from '../components/ProjectedLineup.jsx';
import { TeamLogo } from '../components/Logo.jsx';

const HEIGHT = (inches) => inches ? `${Math.floor(inches / 12)}'${inches % 12}"` : '—';

// Build sorted-by-stat lists once per render so we can rank a player in
// constant-time below. Returns null when stats haven't loaded yet.
const buildSkaterRanks = (skaters) => {
  if (!skaters?.length) return null;
  const sortBy = (k) => [...skaters].sort((a, b) => (b[k] ?? -Infinity) - (a[k] ?? -Infinity));
  return {
    pts: sortBy('pts'),
    g:   sortBy('g'),
    a:   sortBy('a'),
    pm:  sortBy('pm'),
    hits:   sortBy('hits'),
    blocks: sortBy('blocks'),
    sog:    sortBy('sog'),
    ppg:    sortBy('ppg'),
    toi:    sortBy('toiPerGame'),
  };
};

const rankOf = (arr, id) => {
  if (!arr) return null;
  const i = arr.findIndex((p) => p.id === id);
  return i === -1 ? null : i + 1;
};

// Pick the most distinctive thing about a skater — leader board, top-N
// finish, or notable raw stats — and return a single short sentence. Falls
// through to a generic "N games this season" line when nothing stands out
// so every row gets *something* in the gap.
const skaterBlurb = (p, ranks, statRow) => {
  if (!ranks || !statRow) return null;
  const id = statRow.id;

  if (rankOf(ranks.pts,    id) === 1) return `Team scoring leader · ${statRow.pts} pts`;
  if (rankOf(ranks.g,      id) === 1) return `Team goal-scoring leader · ${statRow.g} G`;
  if (rankOf(ranks.a,      id) === 1) return `Team assists leader · ${statRow.a} A`;
  if (rankOf(ranks.hits,   id) === 1) return `Team hits leader · ${statRow.hits} hits`;
  if (rankOf(ranks.blocks, id) === 1) return `Team blocks leader · ${statRow.blocks} blocks`;
  if (rankOf(ranks.toi,    id) === 1) return `Most ice time on the team · ${statRow.toiPerGame || '—'}/g`;

  const ptsRank = rankOf(ranks.pts, id);
  if (ptsRank && ptsRank <= 3) return `Top-3 scorer · ${statRow.pts} pts (#${ptsRank})`;
  if (ptsRank && ptsRank <= 5) return `Top-5 scorer · ${statRow.pts} pts (#${ptsRank})`;

  const gRank = rankOf(ranks.g, id);
  if (gRank && gRank <= 3) return `${statRow.g} goals · #${gRank} on the team`;

  if ((statRow.ppg ?? 0) >= 5) return `Power-play threat · ${statRow.ppg} PPG`;
  if ((statRow.pm ?? 0) >= 10) return `+${statRow.pm} on the season · steady two-way play`;
  if ((statRow.pm ?? 0) <= -10) return `${statRow.pm} on the season · tough usage`;
  if ((statRow.hits ?? 0) >= 100) return `Physical presence · ${statRow.hits} hits`;
  if ((statRow.blocks ?? 0) >= 50) return `Shot blocker · ${statRow.blocks} blocks`;
  if ((statRow.sog ?? 0) >= 150) return `Shot volume · ${statRow.sog} SOG`;

  if ((statRow.gp ?? 0) >= 50 && (statRow.pts ?? 0) > 0) return `${statRow.pts} pts in ${statRow.gp} games`;
  if ((statRow.gp ?? 0) > 0) return `${statRow.gp} games played this season`;
  return null;
};

const goalieBlurb = (statRow) => {
  if (!statRow || statRow.gp == null) return null;
  const sv = statRow.savePct != null ? `${statRow.savePct}%` : null;
  const gaa = statRow.gaa != null ? statRow.gaa.toFixed(2) : null;
  if (statRow.gp >= 30) return `Starter · ${statRow.w}W · ${sv ?? '—'} SV% · ${gaa ?? '—'} GAA`;
  if (statRow.gp >= 5)  return `${statRow.gp} GP · ${statRow.w}W · ${sv ?? '—'} SV%`;
  if (statRow.gp > 0)   return `Limited duty · ${statRow.gp} GP this season`;
  return 'Yet to appear this season';
};

const RosterTable = ({ players, showSaves = false, clubStats }) => {
  const skaterRanks = !showSaves ? buildSkaterRanks(clubStats?.skaters) : null;
  const statById = (() => {
    const m = new Map();
    if (showSaves) (clubStats?.goalies || []).forEach((g) => m.set(g.id, g));
    else (clubStats?.skaters || []).forEach((s) => m.set(s.id, s));
    return m;
  })();
  return (
    <table className="w-full">
      <thead>
        <tr className="text-[10px] font-mono text-white/35 uppercase tracking-wider border-b border-white/[0.05]">
          <th className="font-normal text-left px-4 h-8 w-[36px]">#</th>
          <th className="font-normal text-left px-2 h-8">Player</th>
          <th className="font-normal text-center px-2 h-8 w-[40px]">Pos</th>
          <th className="font-normal text-center px-2 h-8 w-[40px]">{showSaves ? 'C' : 'S'}</th>
          <th className="font-normal text-right px-2 h-8 w-[44px]">HT</th>
          <th className="font-normal text-right px-2 h-8 w-[44px]">WT</th>
          <th className="font-normal text-right px-2 h-8 w-[44px]">Age</th>
          <th className="font-normal text-right px-4 h-8 w-[60px]">Birth</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-white/[0.04]">
        {players.map((p) => {
          const statRow = statById.get(p.id);
          const note = showSaves ? goalieBlurb(statRow) : skaterBlurb(p, skaterRanks, statRow);
          return (
            <tr key={p.id} className="hover:bg-white/[0.02]">
              <td className="px-4 text-right text-[10px] font-mono tabular-nums text-white/30 h-14 align-middle">{p.num || '—'}</td>
              <td className="px-2 align-middle">
                <div className="flex items-center gap-2.5">
                  <Headshot src={p.headshot} num={p.num} size={32} />
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] text-white/90 leading-tight">
                      <PlayerLink playerId={p.id}>{p.name}</PlayerLink>
                    </div>
                    {note && (
                      <div className="text-[11px] font-mono text-white/40 mt-0.5 truncate" title={note}>
                        {note}
                      </div>
                    )}
                  </div>
                </div>
              </td>
              <td className="px-2 text-center text-[10px] font-mono text-white/45 align-middle">{p.pos}</td>
              <td className="px-2 text-center text-[10px] font-mono text-white/45 align-middle">{p.shoots || '—'}</td>
              <td className="px-2 text-right text-[11px] font-mono text-white/65 tabular-nums align-middle">{HEIGHT(p.heightIn)}</td>
              <td className="px-2 text-right text-[11px] font-mono text-white/65 tabular-nums align-middle">{p.weightLb || '—'}</td>
              <td className="px-2 text-right text-[11px] font-mono tabular-nums text-white/65 align-middle">{p.age ?? '—'}</td>
              <td className="px-4 text-right text-[10px] font-mono text-white/40 truncate max-w-[100px] align-middle">{p.birthCountry || '—'}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};

// Tiny G/A split bar — visualizes a scorer's points composition relative to
// the leader's total. Cheap to render and adds visual depth to the row
// without a per-player fetch.
const PtsBar = ({ goals, assists, max }) => {
  if (!max) return null;
  const w = 60;
  const total = goals + assists;
  const tw = (total / max) * w;
  const gw = total > 0 ? (goals / total) * tw : 0;
  return (
    <svg width={w} height={6} viewBox={`0 0 ${w} 6`} className="block">
      <rect x={0} y={2} width={w} height={2} fill="rgba(255,255,255,0.04)" />
      <rect x={0} y={1} width={gw} height={4} fill="#F74902" />
      <rect x={gw} y={1} width={tw - gw} height={4} fill="rgba(255,255,255,0.45)" />
    </svg>
  );
};

const Leaderboard = ({ rows, columns, title, withPtsBar = false }) => {
  const maxPts = withPtsBar ? Math.max(1, ...rows.map((r) => r.pts || 0)) : 0;
  return (
  <Section title={title}>
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="text-[10px] font-mono text-white/35 uppercase tracking-wider border-b border-white/[0.05]">
            <th className="font-normal text-left px-4 h-8 w-[28px]">#</th>
            <th className="font-normal text-left px-2 h-8">Player</th>
            {withPtsBar && <th className="font-normal text-left px-2 h-8 w-[68px]">G/A</th>}
            {columns.map((c) => (
              <th key={c.k} className="font-normal text-right px-2 h-8 w-[44px]">{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.04]">
          {rows.map((p, i) => (
            <tr key={p.id} className="hover:bg-white/[0.02]">
              <td className={cx('px-4 text-left text-[10px] font-mono tabular-nums h-9',
                i < 3 ? 'text-[#FF8A4C]' : 'text-white/30'
              )}>{i + 1}</td>
              <td className="px-2 text-[12px] text-white/85">
                <span className="flex items-center gap-2 flex-wrap">
                  <Headshot src={p.headshot} num={p.num} size={22} />
                  <PlayerLink playerId={p.id}>{p.name}</PlayerLink>
                  {p.pos && <span className="text-[10px] font-mono text-white/35">{p.pos}</span>}
                  {withPtsBar
                    ? <SkaterHotCold playerId={p.id} />
                    : <GoalieHotCold playerId={p.id} />}
                </span>
              </td>
              {withPtsBar && (
                <td className="px-2 align-middle">
                  <PtsBar goals={p.g || 0} assists={p.a || 0} max={maxPts} />
                </td>
              )}
              {columns.map((c) => (
                <td key={c.k} className={cx('px-2 text-right text-[11px] font-mono tabular-nums',
                  c.highlight && p[c.k] != null && p[c.k] > 0 ? 'text-white font-medium' : 'text-white/65'
                )}>{c.fmt ? c.fmt(p[c.k]) : (p[c.k] ?? '—')}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </Section>
  );
};

export const Roster = ({ roster, clubStats, prospects, draftPicks }) => {
  const [view, setView] = useState('forwards');
  if (!roster) {
    return (
      <div className="p-4 md:p-6 space-y-5">
        <Skeleton height={24} className="w-48" />
        <Skeleton height={400} />
      </div>
    );
  }
  const list = view === 'forwards' ? roster.forwards : view === 'defense' ? roster.defense : roster.goalies;
  const pointLeaders = clubStats ? [...clubStats.skaters].sort((a, b) => b.pts - a.pts).slice(0, 10) : [];
  const goalieLeaders = clubStats ? [...clubStats.goalies].sort((a, b) => (b.savePct ?? 0) - (a.savePct ?? 0)) : [];

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[20px] font-semibold tracking-tight">Roster</h1>
          <p className="text-[12px] text-white/45 mt-1 font-mono">
            Philadelphia Flyers · {roster.forwards.length}F · {roster.defense.length}D · {roster.goalies.length}G
          </p>
        </div>
        <div className="flex items-center gap-0.5 p-0.5 border border-white/[0.08] rounded-md bg-white/[0.02]">
          {[
            { id: 'forwards', l: `Forwards (${roster.forwards.length})` },
            { id: 'defense',  l: `Defense (${roster.defense.length})` },
            { id: 'goalies',  l: `Goalies (${roster.goalies.length})` },
          ].map((t) => (
            <button key={t.id} onClick={() => setView(t.id)}
              className={cx('px-2.5 h-6 text-[11px] font-medium rounded-[4px] transition-colors',
                view === t.id ? 'bg-white/[0.08] text-white' : 'text-white/50 hover:text-white'
              )}>{t.l}</button>
          ))}
        </div>
      </div>

      <SalaryCap roster={roster} />

      <ContractGrid roster={roster} />

      {/* Main roster table sits directly under the tabs so clicking
          Forwards/Defense/Goalies actually swaps content at the top of
          the page instead of way down. The supplemental leaderboards
          and roster oddities follow. */}
      <Section title={view === 'forwards' ? 'Forwards' : view === 'defense' ? 'Defense' : 'Goalies'}>
        <div className="overflow-x-auto">
          <RosterTable players={list} showSaves={view === 'goalies'} clubStats={clubStats} />
        </div>
      </Section>

      {clubStats && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Leaderboard
            title="Top Scorers"
            withPtsBar
            rows={pointLeaders}
            columns={[
              { k: 'gp', label: 'GP' },
              { k: 'g', label: 'G', highlight: true },
              { k: 'a', label: 'A' },
              { k: 'pts', label: 'P', highlight: true },
              { k: 'pm', label: '+/–', fmt: (v) => v > 0 ? `+${v}` : v },
            ]}
          />
          <Leaderboard
            title="Goalie Stats"
            rows={goalieLeaders}
            columns={[
              { k: 'gp', label: 'GP' },
              { k: 'w', label: 'W', highlight: true },
              { k: 'savePct', label: 'SV%', fmt: (v) => v != null ? `${v}%` : '—' },
              { k: 'gaa', label: 'GAA', fmt: (v) => v != null ? v.toFixed(2) : '—' },
              { k: 'so', label: 'SO' },
            ]}
          />
        </div>
      )}

      {clubStats && <IceTimeLeaderboard skaters={clubStats.skaters} />}

      <ProjectedLineup clubStats={clubStats} />

      <Birthdays roster={roster} />

      <Hometowns roster={roster} />

      {draftPicks?.length > 0 && <DraftPicksPanel picks={draftPicks} />}

      {prospects && <ProspectsPanel prospects={prospects} />}
    </div>
  );
};

// Recent draft picks for PHI — 1st + 2nd round of the most recent draft.
// Source: /v1/draft/picks/{year}/{round}, filtered by team. Click name →
// player profile. Each row shows pick number, position, and amateur club.
const DraftPicksPanel = ({ picks }) => {
  return (
    <Section
      title={`${picks[0].year} Draft · PHI Picks`}
      action={<span className="text-[10px] font-mono text-white/40">{picks.length} selections shown</span>}
    >
      <div className="divide-y divide-white/[0.04]">
        {picks.map((p) => (
          <div key={`${p.round}-${p.pickInRound}`} className="grid grid-cols-[60px_28px_1fr_auto] items-center gap-3 px-4 h-12 hover:bg-white/[0.02]">
            <div className="text-center">
              <div className="text-[16px] font-semibold tabular-nums text-[#FF8A4C] leading-none">#{p.overall}</div>
              <div className="text-[9px] font-mono text-white/35 mt-0.5">R{p.round} · {p.pickInRound}</div>
            </div>
            <span className="text-[10px] font-mono text-white/45 text-center">{p.pos}</span>
            <div className="min-w-0">
              <div className="text-[12px] text-white/85 truncate">
                {p.playerId
                  ? <PlayerLink playerId={p.playerId}>{p.name}</PlayerLink>
                  : <span>{p.name || '—'}</span>}
              </div>
              <div className="text-[10px] font-mono text-white/45 truncate">
                {[p.amateurClub, p.amateurLeague, p.birthCountry].filter(Boolean).join(' · ')}
              </div>
            </div>
            <div className="text-right text-[10px] font-mono text-white/45 shrink-0">
              {p.heightIn ? `${Math.floor(p.heightIn / 12)}'${p.heightIn % 12}"` : '—'}
              {p.weightLb ? ` · ${p.weightLb} lb` : ''}
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
};

// Prospects / pipeline view from /v1/prospects/PHI. Players from junior /
// college / European leagues who are signed/drafted but not on the NHL roster.
// Grouped F / D / G; click → player profile.
const ProspectsPanel = ({ prospects }) => {
  const total = prospects.forwards.length + prospects.defense.length + prospects.goalies.length;
  if (!total) return null;

  const Group = ({ label, list }) => list.length === 0 ? null : (
    <div className="bg-[#0A0A0A] p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-mono text-white/40 uppercase tracking-[0.18em]">{label}</span>
        <span className="text-[10px] font-mono text-white/30 tabular-nums">{list.length}</span>
      </div>
      <div className="space-y-1">
        {list.map((p) => (
          <button
            key={p.id}
            onClick={() => window.location.assign(`/player/${p.id}`)}
            className="w-full flex items-center gap-2 px-2 h-8 rounded-sm hover:bg-white/[0.04] transition-colors text-left"
          >
            <Headshot src={p.headshot} num={p.num} size={22} />
            <span className="flex-1 min-w-0">
              <span className="block text-[12px] text-white/85 truncate">{p.name}</span>
              <span className="block text-[9px] font-mono text-white/40 truncate">
                {p.pos}{p.age != null ? ` · ${p.age}y` : ''}{p.birthCountry ? ` · ${p.birthCountry}` : ''}
              </span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <Section
      title="Prospects · Pipeline"
      action={<span className="text-[10px] font-mono text-white/40">{total} players</span>}
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-white/[0.04]">
        <Group label="Forwards" list={prospects.forwards} />
        <Group label="Defense"  list={prospects.defense} />
        <Group label="Goalies"  list={prospects.goalies} />
      </div>
    </Section>
  );
};

// Ice Time leaderboard. NHL clubStats endpoint exposes per-game ice-time
// breakdowns in seconds (avgTimeOnIcePerGame, even-strength, PP, SH). We
// stack them as a horizontal bar so the EV/PP/SH split is readable at a
// glance, plus a numeric ATOI in the right column.
const secToMin = (s) => {
  if (s == null) return '—';
  const m = Math.floor(s / 60);
  const sec = Math.round(s % 60);
  return `${m}:${String(sec).padStart(2, '0')}`;
};

const IceTimeLeaderboard = ({ skaters }) => {
  if (!skaters?.length) return null;
  const rows = [...skaters]
    .filter((p) => p.avgToi != null && p.gp > 0)
    .sort((a, b) => (b.avgToi || 0) - (a.avgToi || 0))
    .slice(0, 18);
  if (!rows.length) return null;
  const maxToi = rows[0].avgToi;
  return (
    <Section
      title="Ice Time Leaders"
      action={<span className="text-[10px] font-mono text-white/40">avg per game · EV · PP · SH</span>}
    >
      <div className="px-4 py-2 grid grid-cols-[24px_2fr_1fr_180px_64px] gap-3 text-[9px] font-mono text-white/35 uppercase tracking-wider border-b border-white/[0.05]">
        <span>#</span>
        <span>Player</span>
        <span>Pos</span>
        <span>Ice time split</span>
        <span className="text-right">ATOI</span>
      </div>
      <div className="divide-y divide-white/[0.04]">
        {rows.map((p, i) => {
          const ev = p.avgEvToi || 0;
          const pp = p.avgPpToi || 0;
          const sh = p.avgShToi || 0;
          const total = ev + pp + sh || p.avgToi || 1;
          const widthPct = (p.avgToi / maxToi) * 100;
          return (
            <div key={p.id} className="grid grid-cols-[24px_2fr_1fr_180px_64px] gap-3 items-center px-4 h-10 hover:bg-white/[0.02]">
              <span className={cx('text-[10px] font-mono tabular-nums',
                i === 0 ? 'text-amber-300 font-semibold'
                : i === 1 ? 'text-white/65'
                : i === 2 ? 'text-orange-300/70'
                : 'text-white/35'
              )}>{i + 1}</span>
              <span className="flex items-center gap-2 min-w-0">
                <Headshot src={p.headshot} num={p.num} size={22} />
                <PlayerLink playerId={p.id}>{p.name}</PlayerLink>
              </span>
              <span className="text-[10px] font-mono text-white/45">{p.pos}</span>
              <div className="relative h-3 bg-white/[0.03] rounded-sm overflow-hidden" style={{ width: `${widthPct}%`, minWidth: 48 }}>
                <div className="absolute inset-y-0 left-0 bg-sky-500/70" style={{ width: `${(ev / total) * 100}%` }} />
                <div
                  className="absolute inset-y-0 bg-[#F74902]/80"
                  style={{ left: `${(ev / total) * 100}%`, width: `${(pp / total) * 100}%` }}
                />
                <div
                  className="absolute inset-y-0 bg-amber-500/80"
                  style={{ left: `${((ev + pp) / total) * 100}%`, width: `${(sh / total) * 100}%` }}
                />
              </div>
              <span className="text-[12px] font-mono tabular-nums text-right text-[#FF8A4C] font-medium">{secToMin(p.avgToi)}</span>
            </div>
          );
        })}
      </div>
      <div className="px-4 py-2 flex items-center gap-4 text-[10px] font-mono text-white/45 border-t border-white/[0.04]">
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 bg-sky-500/70 rounded-sm" /> Even strength</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 bg-[#F74902]/80 rounded-sm" /> Power play</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 bg-amber-500/80 rounded-sm" /> Shorthanded</span>
      </div>
    </Section>
  );
};
