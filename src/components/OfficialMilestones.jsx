// OfficialMilestones.jsx
//
// Fetches live NHL milestone data from /api/milestones (proxied from
// api.nhle.com/stats/rest/en/milestones/{skaters,goalies}) and renders
// approaching milestones. PHI players are highlighted; all league
// milestones are shown with PHI entries pinned to the top.

import { useState, useEffect, useMemo } from 'react';
import { TEAM_ABBR } from '../config.js';
import { Section, Chip } from './primitives.jsx';
import { Headshot } from './Headshot.jsx';
import { PlayerLink } from './PlayerLink.jsx';

// Fetch milestones from the edge proxy — not the standard useNHL hook
// because this endpoint lives on a different host/route (/api/milestones).
function useMilestones(type) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/milestones?type=${type}`, { headers: { Accept: 'application/json' } })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d) => { if (!cancelled) { setData(d); setError(null); } })
      .catch((e) => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [type]);

  return { data, error, loading };
}

// Normalize a single milestone entry from the API response. The NHL
// milestones endpoint returns objects with properties like:
//   { playerId, firstName, lastName, teamAbbrev, headshot,
//     milestoneStatName, currentStatValue, milestoneValue, ... }
function normalizeMilestone(m) {
  return {
    id: m.playerId ?? m.id,
    name: [m.firstName?.default ?? m.firstName, m.lastName?.default ?? m.lastName]
      .filter(Boolean).join(' ') || '—',
    team: m.teamAbbrevs ?? m.teamAbbrev ?? m.team ?? '',
    headshot: m.headshot ?? null,
    num: m.sweaterNumber ?? null,
    stat: m.milestoneStatName ?? m.statName ?? m.description ?? '—',
    current: m.currentStatValue ?? m.currentValue ?? 0,
    target: m.milestoneValue ?? m.targetValue ?? 0,
    away: (m.milestoneValue ?? m.targetValue ?? 0) - (m.currentStatValue ?? m.currentValue ?? 0),
  };
}

export const OfficialMilestones = () => {
  const [tab, setTab] = useState('skaters');
  const skaters = useMilestones('skaters');
  const goalies = useMilestones('goalies');

  const feed = tab === 'skaters' ? skaters : goalies;

  const milestones = useMemo(() => {
    if (!feed.data) return [];
    // The NHL milestones endpoint may return { data: [...] } or just an array.
    const raw = Array.isArray(feed.data) ? feed.data
      : Array.isArray(feed.data.data) ? feed.data.data
      : [];
    const list = raw.map(normalizeMilestone).filter((m) => m.away > 0);
    // Sort: PHI players first, then by how close to the milestone.
    list.sort((a, b) => {
      const aUs = a.team === TEAM_ABBR || a.team?.includes?.(TEAM_ABBR) ? 0 : 1;
      const bUs = b.team === TEAM_ABBR || b.team?.includes?.(TEAM_ABBR) ? 0 : 1;
      if (aUs !== bUs) return aUs - bUs;
      return a.away - b.away;
    });
    return list;
  }, [feed.data]);

  const loading = skaters.loading || goalies.loading;
  const err = feed.error;

  return (
    <Section
      title="Official NHL Milestones"
      action={
        <div className="flex items-center gap-2">
          <Chip tone="orange">LIVE</Chip>
          <div className="flex border border-white/[0.08] rounded-md overflow-hidden">
            <button
              onClick={() => setTab('skaters')}
              className={`px-2 h-6 text-[10px] font-mono transition-colors ${
                tab === 'skaters' ? 'bg-[var(--team-primary)]/15 text-[var(--team-accent)]' : 'text-white/45 hover:text-white/75'
              }`}
            >Skaters</button>
            <button
              onClick={() => setTab('goalies')}
              className={`px-2 h-6 text-[10px] font-mono border-l border-white/[0.08] transition-colors ${
                tab === 'goalies' ? 'bg-[var(--team-primary)]/15 text-[var(--team-accent)]' : 'text-white/45 hover:text-white/75'
              }`}
            >Goalies</button>
          </div>
        </div>
      }
    >
      {loading && !milestones.length && (
        <div className="px-4 py-6 text-center text-[12px] font-mono text-white/30">Loading milestones...</div>
      )}
      {err && !milestones.length && (
        <div className="px-4 py-6 text-center text-[12px] font-mono text-red-400/70">{err}</div>
      )}
      {!loading && !err && milestones.length === 0 && (
        <div className="px-4 py-6 text-center text-[12px] font-mono text-white/30">No approaching milestones.</div>
      )}
      {milestones.length > 0 && (
        <div className="divide-y divide-white/[0.04]">
          {milestones.slice(0, 10).map((m) => {
            const isPhi = m.team === TEAM_ABBR || m.team?.includes?.(TEAM_ABBR);
            return (
              <div
                key={`${m.id}-${m.stat}-${m.target}`}
                className={`grid grid-cols-[1fr_auto] items-center gap-2 px-3 h-9 ${
                  isPhi ? 'bg-[var(--team-primary)]/[0.04]' : ''
                }`}
              >
                <span className="flex items-center gap-2 min-w-0">
                  <Headshot src={m.headshot} num={m.num} size={20} />
                  <PlayerLink playerId={m.id}>
                    <span className={`text-[13px] truncate ${isPhi ? 'text-[var(--team-accent)]' : ''}`}>{m.name}</span>
                  </PlayerLink>
                  {isPhi && <Chip tone="orange">PHI</Chip>}
                  {!isPhi && m.team && (
                    <span className="text-[9px] font-mono text-white/35 shrink-0">{m.team}</span>
                  )}
                </span>
                <span className="flex items-baseline gap-1 text-[10px] font-mono tabular-nums shrink-0">
                  <span className="text-white/55">{m.current}</span>
                  <span className="text-white/25">&rarr;</span>
                  <span className="text-emerald-400 font-medium">{m.target}</span>
                  <span className="text-[9px] text-white/40 ml-1">{m.stat}</span>
                  <span className="text-[9px] text-white/35 ml-1">&middot;</span>
                  <span className="text-[10px] text-amber-300/85">{m.away} away</span>
                </span>
              </div>
            );
          })}
        </div>
      )}
    </Section>
  );
};
