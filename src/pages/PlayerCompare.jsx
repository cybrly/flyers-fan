import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, X, AlertCircle, Plus } from 'lucide-react';
import { cx, TEAM_CAPTAINS, TEAM_ABBR, SEASON_LABEL } from '../config.js';
import { useNHL } from '../api.js';
import { Section, Skeleton } from '../components/primitives.jsx';
import { TeamLogo } from '../components/Logo.jsx';
import { navigate, playerHref } from '../router.js';

// Side-by-side compare for up to 4 NHL players. Two slots default to the
// current top scorer of the active team and tonight's opponent (resolved from
// live club stats); the third and fourth slots are opt-in (lets fans stack a
// forward line or D-pair side-by-side without cluttering the default 2-way
// matchup view). All slots support the same search + URL state behaviour.

const SLOTS = ['a', 'b', 'c', 'd'];

// Most-points skater from a club-stats payload — used to seed the default
// compare slots from live data so they self-heal when a captain is traded
// (instead of relying on hardcoded captain IDs that drift out of date).
const topScorerId = (clubStatsRaw) => {
  const skaters = clubStatsRaw?.skaters || [];
  if (!skaters.length) return null;
  const top = [...skaters].sort((a, b) => (b.points || 0) - (a.points || 0))[0];
  return top?.playerId != null ? String(top.playerId) : null;
};

const HEIGHT = (inches) => inches ? `${Math.floor(inches / 12)}'${inches % 12}"` : '—';

function useDebounced(value, ms = 220) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

const PlayerSearch = ({ onPick, label }) => {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const dq = useDebounced(q.trim());
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!dq || dq.length < 2) { setResults([]); return; }
    let cancelled = false;
    setLoading(true);
    fetch(`/api/search?q=${encodeURIComponent(dq)}&limit=12`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        setResults(Array.isArray(d) ? d : []);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setResults([]);
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [dq]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => { if (!wrapRef.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  return (
    <div ref={wrapRef} className="relative">
      <label className="block text-[10px] font-mono text-white/40 uppercase tracking-wider mb-1">
        {label}
      </label>
      <div className="flex items-center gap-2 px-2.5 h-9 border border-white/[0.08] hover:border-white/15 focus-within:border-[var(--team-accent)]/50 bg-white/[0.02] rounded-md transition-colors">
        <Search size={12} className="text-white/40 shrink-0" />
        <input
          type="text"
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Search NHL player…"
          className="flex-1 bg-transparent text-[12px] outline-none placeholder:text-white/30 min-w-0"
        />
        {q && (
          <button onClick={() => { setQ(''); setResults([]); }} className="text-white/40 hover:text-white/70" aria-label="Clear">
            <X size={11} />
          </button>
        )}
      </div>
      {open && (q.length >= 2) && (
        <div className="absolute left-0 right-0 mt-1 z-10 max-h-72 overflow-y-auto border border-white/[0.1] bg-[#0C0D11]/96 backdrop-blur-md rounded-md shadow-2xl">
          {loading && <div className="px-3 py-2 text-[11px] font-mono text-white/40">Searching…</div>}
          {!loading && results.length === 0 && (
            <div className="px-3 py-2 text-[11px] font-mono text-white/40">No matches.</div>
          )}
          {results.map((r) => (
            <button
              key={r.playerId}
              onClick={() => { onPick(r.playerId); setOpen(false); setQ(''); setResults([]); }}
              className="w-full flex items-center gap-2 px-3 h-10 text-left hover:bg-white/[0.05] transition-colors"
            >
              {r.teamAbbrev && <TeamLogo abbr={r.teamAbbrev} size={16} />}
              <span className="text-[12px] text-white/85 truncate flex-1">{r.name}</span>
              <span className="text-[10px] font-mono text-white/40 shrink-0">{r.positionCode || '—'}</span>
              {r.sweaterNumber && <span className="text-[10px] font-mono text-white/35 shrink-0">#{r.sweaterNumber}</span>}
              {r.teamAbbrev && <span className="text-[10px] font-mono text-white/40 shrink-0">{r.teamAbbrev}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const PlayerCard = ({ slotKey, playerId, label, onClear, onPick }) => {
  const path = playerId ? `v1/player/${playerId}/landing` : null;
  const { data, loading, error } = useNHL(path, 0);

  if (!playerId) {
    return (
      <div className="border border-dashed border-white/[0.08] bg-white/[0.01] rounded-md p-4">
        <PlayerSearch onPick={onPick} label={label} />
        <div className="mt-4 text-center text-[11px] font-mono text-white/30">
          Search any active NHL player.
        </div>
      </div>
    );
  }

  if (loading && !data) {
    return (
      <div className="border border-white/[0.08] bg-[#0C0C0C]/60 rounded-md p-4 space-y-3">
        <Skeleton height={32} />
        <Skeleton height={80} />
      </div>
    );
  }
  if (error && !data) {
    return (
      <div className="border border-white/[0.08] bg-[#0C0C0C]/60 rounded-md p-4 text-center">
        <AlertCircle size={16} className="text-red-400 mx-auto mb-2" />
        <div className="text-[10px] font-mono text-white/55">{error}</div>
      </div>
    );
  }
  if (!data) return null;

  const fullName = `${data.firstName?.default || ''} ${data.lastName?.default || ''}`.trim();
  return (
    <div className="border border-white/[0.08] bg-[#0C0C0C]/60 rounded-md overflow-hidden">
      <div className="px-3 pt-2 pb-2 border-b border-white/[0.06]">
        <PlayerSearch onPick={onPick} label={label} />
      </div>
      <div className="p-3 flex items-start gap-2.5">
        {data.headshot && (
          <img
            src={data.headshot}
            alt={fullName}
            className="w-12 h-12 rounded-md bg-white/[0.04] object-cover shrink-0 border border-white/[0.06]"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-1 flex-wrap">
            <button
              onClick={() => navigate(playerHref(playerId))}
              className="text-[13px] font-semibold tracking-tight truncate text-left hover:text-[var(--team-accent)] transition-colors"
            >
              {fullName}
            </button>
            {data.sweaterNumber && <span className="text-[10px] font-mono text-white/35">#{data.sweaterNumber}</span>}
          </div>
          <div className="text-[10px] font-mono text-white/55 mt-0.5 flex items-center gap-1 flex-wrap">
            <TeamLogo abbr={data.currentTeamAbbrev} size={11} />
            <span>{data.currentTeamAbbrev}</span>
            <span className="text-white/25">·</span>
            <span>{data.position}</span>
            {data.shootsCatches && <><span className="text-white/25">·</span><span>{data.shootsCatches}</span></>}
          </div>
          <div className="text-[10px] font-mono text-white/35 mt-0.5">
            {HEIGHT(data.heightInInches)} · {data.weightInPounds || '—'} lb
            {data.birthCountry ? ` · ${data.birthCountry}` : ''}
          </div>
        </div>
        <button
          onClick={onClear}
          className="text-white/30 hover:text-white/65 transition-colors"
          aria-label="Clear"
        >
          <X size={12} />
        </button>
      </div>
    </div>
  );
};

// One stat row across N players. Label is centered; values flank it
// (first ceil(N/2) on the left, the rest on the right) so labels align
// vertically down the middle of the panel — same axis as the GameTape
// Team Comparison. Best value(s) tint green, worst value(s) tint red,
// middle values stay neutral. Inverted stats (PIM, GAA, losses,
// giveaways) flip polarity so lower wins.
const StatRow = ({ label, values, higherBetter = true, fmt }) => {
  const nums = values.map((v) => (typeof v === 'number' ? v : (v == null ? null : Number(v))));
  if (nums.every((v) => v == null)) return null;
  const valid = nums.filter((v) => v != null);
  const best = higherBetter ? Math.max(...valid) : Math.min(...valid);
  const worst = higherBetter ? Math.min(...valid) : Math.max(...valid);
  const allEqual = best === worst;
  const max = Math.max(1, Math.max(...nums.map((v) => Math.abs(v ?? 0))));
  const f = fmt || ((v) => v);

  const leftCount = Math.ceil(nums.length / 2);
  const leftNums = nums.slice(0, leftCount);
  const rightNums = nums.slice(leftCount);

  const renderCell = (n, side) => {
    const isBest = !allEqual && n != null && n === best && valid.length > 1;
    const isWorst = !allEqual && n != null && n === worst && valid.length > 1 && !isBest;
    const pct = n != null ? Math.min(100, (Math.abs(n) / max) * 100) : 0;
    const barClass = isBest ? 'bg-emerald-500' : isWorst ? 'bg-red-500' : 'bg-white/25';
    const numClass = isBest ? 'text-emerald-400 font-semibold'
                    : isWorst ? 'text-red-400 font-semibold'
                    : 'text-white/70';
    return (
      <div className={cx(
        'flex items-center gap-2 w-full max-w-[140px]',
        side === 'right' && 'flex-row-reverse',
      )}>
        <div className="relative h-1 flex-1 bg-white/[0.04] rounded-full overflow-hidden">
          <div
            className={cx('absolute top-0 h-full rounded-full', barClass, side === 'left' ? 'right-0' : 'left-0')}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className={cx('text-[12px] font-mono tabular-nums shrink-0 w-10', side === 'left' ? 'text-right' : 'text-left', numClass)}>
          {n != null ? f(n) : '—'}
        </span>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-[1fr_140px_1fr] items-center gap-4 px-4 h-10 hover:bg-white/[0.02]">
      <div className="flex items-center justify-end gap-3">
        {leftNums.map((n, i) => <div key={i} className="flex-1 max-w-[160px]">{renderCell(n, 'left')}</div>)}
      </div>
      <span className="text-center text-[11px] font-mono text-white/55 uppercase tracking-wider">{label}</span>
      <div className="flex items-center gap-3">
        {rightNums.map((n, i) => <div key={i} className="flex-1 max-w-[160px]">{renderCell(n, 'right')}</div>)}
      </div>
    </div>
  );
};

export const PlayerCompare = ({ schedule }) => {
  const [ids, setIds] = useState({ a: null, b: null, c: null, d: null });
  const [didDefault, setDidDefault] = useState(false);

  // Hydrate from URL ?a=&b=&c=&d=
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const next = {};
    SLOTS.forEach((s) => { const v = params.get(s); if (v) next[s] = v; });
    if (Object.keys(next).length) setIds((prev) => ({ ...prev, ...next }));
  }, []);

  const oppAbbr =
    schedule?.liveGame?.opp ||
    schedule?.nextGame?.opp ||
    schedule?.games?.[0]?.opp ||
    null;

  // Live club stats for the active team and the upcoming opponent — used to
  // seed the default compare slots with each side's current top scorer.
  const usStatsRaw = useNHL(`v1/club-stats/${TEAM_ABBR}/now`, 0);
  const oppStatsRaw = useNHL(oppAbbr ? `v1/club-stats/${oppAbbr}/now` : null, 0);

  // Default a/b to the CURRENT top scorer of the active team vs the upcoming
  // opponent, resolved from live club stats so the defaults self-heal when a
  // player is traded — instead of the hardcoded TEAM_CAPTAINS map, which goes
  // stale (captains change teams, IDs drift). The captain map remains only as
  // a last-resort fallback if club stats can't load.
  useEffect(() => {
    if (didDefault || !schedule) return;
    const params = new URLSearchParams(window.location.search);
    const urlA = params.get('a');
    const urlB = params.get('b');
    // Wait for the active team's stats to load (or fail) before locking in
    // defaults, so we don't prematurely fall back to the stale captain map.
    const usReady = usStatsRaw.data || usStatsRaw.error;
    if (!urlA && !urlB && !usReady) return;
    setIds((prev) => ({
      ...prev,
      a: urlA || prev.a || topScorerId(usStatsRaw.data) || TEAM_CAPTAINS[TEAM_ABBR] || null,
      b: urlB || prev.b || (oppAbbr ? (topScorerId(oppStatsRaw.data) || TEAM_CAPTAINS[oppAbbr]) : null) || null,
    }));
    setDidDefault(true);
  }, [schedule, oppAbbr, didDefault, usStatsRaw.data, usStatsRaw.error, oppStatsRaw.data]);

  // Reflect selections to URL.
  useEffect(() => {
    const url = new URL(window.location.href);
    SLOTS.forEach((s) => {
      if (ids[s]) url.searchParams.set(s, ids[s]); else url.searchParams.delete(s);
    });
    window.history.replaceState({}, '', url.pathname + (url.search || ''));
  }, [ids]);

  // Per-slot landing fetches — hooks can't be in a loop, so spelled out.
  const aRaw = useNHL(ids.a ? `v1/player/${ids.a}/landing` : null, 0);
  const bRaw = useNHL(ids.b ? `v1/player/${ids.b}/landing` : null, 0);
  const cRaw = useNHL(ids.c ? `v1/player/${ids.c}/landing` : null, 0);
  const dRaw = useNHL(ids.d ? `v1/player/${ids.d}/landing` : null, 0);
  const slotsData = { a: aRaw, b: bRaw, c: cRaw, d: dRaw };

  // Decide which slots are visible (always a + b; c + d only when set or
  // explicitly opened). Rendering an empty slot card is fine — it shows the
  // search box.
  const [showCD, setShowCD] = useState(false);
  useEffect(() => {
    if (ids.c || ids.d) setShowCD(true);
  }, [ids.c, ids.d]);

  const visible = useMemo(() => {
    const base = ['a', 'b'];
    if (showCD) base.push('c', 'd');
    return base;
  }, [showCD]);

  const players = visible.map((k) => slotsData[k].data).filter(Boolean);
  const loadingAny = visible.some((k) => slotsData[k].loading && !slotsData[k].data);
  const allSkaters = players.length > 0 && players.every((p) => p?.position && p.position !== 'G');
  const allGoalies = players.length > 0 && players.every((p) => p?.position === 'G');

  const setId = (slot) => (id) => setIds((prev) => ({ ...prev, [slot]: id }));
  const clearId = (slot) => () => setIds((prev) => ({ ...prev, [slot]: null }));

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[20px] font-semibold tracking-tight">Compare Players</h1>
          <p className="text-[12px] text-white/45 mt-1 font-mono">
            {oppAbbr
              ? <>Defaulting to {TEAM_ABBR} vs <span className="text-[var(--team-accent)]">{oppAbbr}</span> top scorers · stack up to 4 players</>
              : 'Stack up to 4 NHL players · stat-by-stat comparison'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!showCD ? (
            <button
              onClick={() => setShowCD(true)}
              className="flex items-center gap-1.5 px-2.5 h-7 border border-white/[0.08] hover:border-white/20 bg-white/[0.02] rounded-md transition-colors text-[11px] font-mono text-white/65 hover:text-white"
            >
              <Plus size={11} /> add 3rd & 4th
            </button>
          ) : (
            <button
              onClick={() => { setShowCD(false); setIds((p) => ({ ...p, c: null, d: null })); }}
              className="flex items-center gap-1.5 px-2.5 h-7 border border-white/[0.08] hover:border-white/20 bg-white/[0.02] rounded-md transition-colors text-[11px] font-mono text-white/55 hover:text-white"
            >
              <X size={11} /> back to 2
            </button>
          )}
        </div>
      </div>

      {/* Player cards split around the same center axis the stat rows
          use, so each card sits directly above the column where its
          stats are rendered. ceil(N/2) cards go left, the rest right;
          a 140 px center spacer lines up with the centered stat label
          column. */}
      {(() => {
        const leftCount = Math.ceil(visible.length / 2);
        const leftSlots = visible.slice(0, leftCount);
        const rightSlots = visible.slice(leftCount);
        return (
          <div className="grid grid-cols-[1fr_140px_1fr] items-stretch gap-4">
            <div className="flex gap-3">
              {leftSlots.map((slot, i) => (
                <div key={slot} className="flex-1 min-w-0">
                  <PlayerCard
                    slotKey={slot}
                    playerId={ids[slot]}
                    label={`Player ${String.fromCharCode(65 + i)}`}
                    onClear={clearId(slot)}
                    onPick={setId(slot)}
                  />
                </div>
              ))}
            </div>
            <div aria-hidden />
            <div className="flex gap-3">
              {rightSlots.map((slot, i) => (
                <div key={slot} className="flex-1 min-w-0">
                  <PlayerCard
                    slotKey={slot}
                    playerId={ids[slot]}
                    label={`Player ${String.fromCharCode(65 + leftCount + i)}`}
                    onClear={clearId(slot)}
                    onPick={setId(slot)}
                  />
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {players.length >= 2 && (
        <>
          <Section title={`${SEASON_LABEL} · Regular Season`} action={<span className="text-[10px] font-mono text-white/40">side-by-side</span>}>
            <div className="divide-y divide-white/[0.04]">
              {allSkaters && (() => {
                const subs = players.map((p) => p.featuredStats?.regularSeason?.subSeason || {});
                return (
                  <>
                    <StatRow label="Games"            values={subs.map((s) => s.gamesPlayed)} />
                    <StatRow label="Goals"            values={subs.map((s) => s.goals)} />
                    <StatRow label="Assists"          values={subs.map((s) => s.assists)} />
                    <StatRow label="Points"           values={subs.map((s) => s.points)} />
                    <StatRow label="Plus/Minus"       values={subs.map((s) => s.plusMinus)} />
                    <StatRow label="Pen. Minutes"     values={subs.map((s) => s.pim)} higherBetter={false} />
                    <StatRow label="Shots on Goal"    values={subs.map((s) => s.shots)} />
                    <StatRow label="Shooting %"
                      values={subs.map((s) => s.shootingPctg != null ? +(s.shootingPctg * 100).toFixed(1) : null)}
                      fmt={(v) => `${v}%`} />
                    <StatRow label="Power Play Goals" values={subs.map((s) => s.powerPlayGoals)} />
                    <StatRow label="Power Play Pts"   values={subs.map((s) => s.powerPlayPoints)} />
                    <StatRow label="Game-Winning"     values={subs.map((s) => s.gameWinningGoals)} />
                    <StatRow label="Faceoff %"
                      values={subs.map((s) => s.faceoffWinningPctg != null ? +(s.faceoffWinningPctg * 100).toFixed(1) : null)}
                      fmt={(v) => `${v}%`} />
                  </>
                );
              })()}
              {allGoalies && (() => {
                const subs = players.map((p) => p.featuredStats?.regularSeason?.subSeason || {});
                return (
                  <>
                    <StatRow label="Games"           values={subs.map((s) => s.gamesPlayed)} />
                    <StatRow label="Wins"            values={subs.map((s) => s.wins)} />
                    <StatRow label="Losses"          values={subs.map((s) => s.losses)} higherBetter={false} />
                    <StatRow label="Save %"
                      values={subs.map((s) => s.savePercentage != null ? +(s.savePercentage * 100).toFixed(2) : null)}
                      fmt={(v) => `${v}%`} />
                    <StatRow label="GAA"
                      values={subs.map((s) => s.goalsAgainstAverage)}
                      higherBetter={false}
                      fmt={(v) => v?.toFixed?.(2) ?? v} />
                    <StatRow label="Shutouts"        values={subs.map((s) => s.shutouts)} />
                    <StatRow label="Saves"           values={subs.map((s) => s.saves)} />
                  </>
                );
              })()}
              {!allSkaters && !allGoalies && players.length >= 2 && (
                <div className="px-4 py-6 text-center text-[11px] font-mono text-white/40">
                  Mix of skaters and goalies — pick all skaters or all goalies for stat comparison.
                </div>
              )}
            </div>
          </Section>

          {(allSkaters || allGoalies) && (
            <Section title="Career · Regular Season" action={<span className="text-[10px] font-mono text-white/40">all-time NHL</span>}>
              <div className="divide-y divide-white/[0.04]">
                {allSkaters && (() => {
                  const cars = players.map((p) => p.careerTotals?.regularSeason || {});
                  return (
                    <>
                      <StatRow label="Games"           values={cars.map((c) => c.gamesPlayed)} />
                      <StatRow label="Goals"           values={cars.map((c) => c.goals)} />
                      <StatRow label="Assists"         values={cars.map((c) => c.assists)} />
                      <StatRow label="Points"          values={cars.map((c) => c.points)} />
                      <StatRow label="Pts per Game"
                        values={cars.map((c) => c.gamesPlayed ? +(c.points / c.gamesPlayed).toFixed(2) : null)} />
                      <StatRow label="Shots on Goal"   values={cars.map((c) => c.shots)} />
                      <StatRow label="Shooting %"
                        values={cars.map((c) => c.shootingPctg != null ? +(c.shootingPctg * 100).toFixed(1) : null)}
                        fmt={(v) => `${v}%`} />
                    </>
                  );
                })()}
                {allGoalies && (() => {
                  const cars = players.map((p) => p.careerTotals?.regularSeason || {});
                  return (
                    <>
                      <StatRow label="Games"           values={cars.map((c) => c.gamesPlayed)} />
                      <StatRow label="Wins"            values={cars.map((c) => c.wins)} />
                      <StatRow label="Losses"          values={cars.map((c) => c.losses)} higherBetter={false} />
                      <StatRow label="Save %"
                        values={cars.map((c) => c.savePercentage != null ? +(c.savePercentage * 100).toFixed(2) : null)}
                        fmt={(v) => `${v}%`} />
                      <StatRow label="GAA"
                        values={cars.map((c) => c.goalsAgainstAverage)}
                        higherBetter={false}
                        fmt={(v) => v?.toFixed?.(2) ?? v} />
                      <StatRow label="Shutouts"        values={cars.map((c) => c.shutouts)} />
                    </>
                  );
                })()}
              </div>
            </Section>
          )}
        </>
      )}

      {loadingAny && players.length < 2 && (
        <div className="text-center text-[11px] font-mono text-white/40 py-4">Loading…</div>
      )}
    </div>
  );
};
