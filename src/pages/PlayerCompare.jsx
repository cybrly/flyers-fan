import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, X, ArrowLeftRight, AlertCircle } from 'lucide-react';
import { cx } from '../config.js';
import { useNHL } from '../api.js';
import { Section, Skeleton } from '../components/primitives.jsx';
import { TeamLogo } from '../components/Logo.jsx';
import { navigate, playerHref } from '../router.js';

// Side-by-side compare for any two NHL players. Pulls /v1/player/{id}/landing
// for each and renders matched stat rows with bars showing who leads each
// category. Player picker uses NHL search (/api/search proxy), so any active
// NHL player is selectable — not just the Flyers roster.

const HEIGHT = (inches) => inches ? `${Math.floor(inches / 12)}'${inches % 12}"` : '—';

// Tiny debounce — we don't want a fetch on every keystroke. 220ms feels fast
// enough that the suggestions appear "as you type."
function useDebounced(value, ms = 220) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

const PlayerSearch = ({ value, onPick, label, side }) => {
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

  // Click-outside closes dropdown.
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
      <div className="flex items-center gap-2 px-2.5 h-9 border border-white/[0.08] hover:border-white/15 focus-within:border-[#FF8A4C]/50 bg-white/[0.02] rounded-md transition-colors">
        <Search size={12} className="text-white/40 shrink-0" />
        <input
          type="text"
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={`Search ${side === 'a' ? 'left' : 'right'} player…`}
          className="flex-1 bg-transparent text-[12px] outline-none placeholder:text-white/30"
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

// Single side card — shows the picked player's hero block + sub-season stats
// in a compact form. Renders skeletons while loading.
const Side = ({ playerId, label, onClear, onPick, otherId }) => {
  const path = playerId ? `v1/player/${playerId}/landing` : null;
  const { data, loading, error } = useNHL(path, 0);

  if (!playerId) {
    return (
      <div className="border border-dashed border-white/[0.08] bg-white/[0.01] rounded-md p-5">
        <PlayerSearch value={null} onPick={onPick} label={label} side={label.toLowerCase()} />
        <div className="mt-6 text-center text-[11px] font-mono text-white/30">
          Search any active NHL player.
        </div>
      </div>
    );
  }

  if (loading && !data) {
    return (
      <div className="border border-white/[0.08] bg-[#0C0C0C]/60 rounded-md p-5 space-y-3">
        <Skeleton height={60} />
        <Skeleton height={120} />
      </div>
    );
  }
  if (error && !data) {
    return (
      <div className="border border-white/[0.08] bg-[#0C0C0C]/60 rounded-md p-6 text-center">
        <AlertCircle size={18} className="text-red-400 mx-auto mb-2" />
        <div className="text-[11px] font-mono text-white/55">{error}</div>
      </div>
    );
  }
  if (!data) return null;

  const fullName = `${data.firstName?.default || ''} ${data.lastName?.default || ''}`.trim();
  const sub = data.featuredStats?.regularSeason?.subSeason;

  return (
    <div className="border border-white/[0.08] bg-[#0C0C0C]/60 rounded-md overflow-hidden">
      <div className="px-4 pt-3 pb-3 border-b border-white/[0.06]">
        <PlayerSearch value={playerId} onPick={onPick} label={label} side={label.toLowerCase()} />
      </div>
      <div className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          {data.headshot && (
            <img
              src={data.headshot}
              alt={fullName}
              className="w-16 h-16 rounded-md bg-white/[0.04] object-cover shrink-0 border border-white/[0.06]"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-1.5 flex-wrap">
              <button
                onClick={() => navigate(playerHref(playerId))}
                className="text-[16px] font-semibold tracking-tight truncate text-left hover:text-[#FF8A4C] transition-colors"
              >
                {fullName}
              </button>
              {data.sweaterNumber && <span className="text-[12px] font-mono text-white/35">#{data.sweaterNumber}</span>}
            </div>
            <div className="text-[11px] font-mono text-white/55 mt-1 flex items-center gap-1.5 flex-wrap">
              <TeamLogo abbr={data.currentTeamAbbrev} size={13} />
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
            <X size={13} />
          </button>
        </div>
      </div>
    </div>
  );
};

const StatBar = ({ label, a, b, higherBetter = true, fmt }) => {
  const aNum = typeof a === 'number' ? a : (a == null ? null : Number(a));
  const bNum = typeof b === 'number' ? b : (b == null ? null : Number(b));
  if (aNum == null && bNum == null) return null;
  const max = Math.max(aNum || 0, bNum || 0, 1);
  const aPct = aNum != null ? (aNum / max) * 100 : 0;
  const bPct = bNum != null ? (bNum / max) * 100 : 0;
  const aWins = aNum != null && bNum != null && (higherBetter ? aNum > bNum : aNum < bNum);
  const bWins = aNum != null && bNum != null && (higherBetter ? bNum > aNum : bNum < aNum);
  const f = fmt || ((v) => v);
  return (
    <div className="grid grid-cols-[1fr_minmax(140px,200px)_1fr] items-center gap-3 px-4 h-11 hover:bg-white/[0.02]">
      {/* Left side bar grows right→left */}
      <div className="flex items-center gap-2 justify-end">
        <span className={cx('text-[13px] font-mono tabular-nums shrink-0',
          aWins ? 'text-[#FF8A4C] font-semibold' : 'text-white/70'
        )}>{aNum != null ? f(aNum) : '—'}</span>
        <div className="relative h-1.5 w-full max-w-[160px] bg-white/[0.04] rounded-full overflow-hidden">
          <div
            className={cx('absolute right-0 top-0 h-full rounded-full',
              aWins ? 'bg-[#F74902]' : 'bg-white/25'
            )}
            style={{ width: `${aPct}%` }}
          />
        </div>
      </div>
      <span className="text-[11px] font-mono text-white/55 uppercase tracking-wider text-center shrink-0 whitespace-nowrap">{label}</span>
      <div className="flex items-center gap-2">
        <div className="relative h-1.5 w-full max-w-[160px] bg-white/[0.04] rounded-full overflow-hidden">
          <div
            className={cx('absolute left-0 top-0 h-full rounded-full',
              bWins ? 'bg-[#F74902]' : 'bg-white/25'
            )}
            style={{ width: `${bPct}%` }}
          />
        </div>
        <span className={cx('text-[13px] font-mono tabular-nums shrink-0',
          bWins ? 'text-[#FF8A4C] font-semibold' : 'text-white/70'
        )}>{bNum != null ? f(bNum) : '—'}</span>
      </div>
    </div>
  );
};

export const PlayerCompare = () => {
  const [aId, setAId] = useState(null);
  const [bId, setBId] = useState(null);

  // Hydrate from URL ?a=&b= so the page is shareable.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const a = params.get('a');
    const b = params.get('b');
    if (a) setAId(a);
    if (b) setBId(b);
  }, []);

  // Reflect selections back to the URL (replace, no history spam).
  useEffect(() => {
    const url = new URL(window.location.href);
    if (aId) url.searchParams.set('a', aId); else url.searchParams.delete('a');
    if (bId) url.searchParams.set('b', bId); else url.searchParams.delete('b');
    window.history.replaceState({}, '', url.pathname + (url.search || ''));
  }, [aId, bId]);

  const aPath = aId ? `v1/player/${aId}/landing` : null;
  const bPath = bId ? `v1/player/${bId}/landing` : null;
  const aRaw = useNHL(aPath, 0);
  const bRaw = useNHL(bPath, 0);

  const a = aRaw.data;
  const b = bRaw.data;

  const isSkaterA = a?.position && a.position !== 'G';
  const isSkaterB = b?.position && b.position !== 'G';
  const bothSkaters = isSkaterA && isSkaterB;
  const bothGoalies = a && !isSkaterA && b && !isSkaterB;

  const aSub = a?.featuredStats?.regularSeason?.subSeason;
  const bSub = b?.featuredStats?.regularSeason?.subSeason;
  const aCar = a?.careerTotals?.regularSeason;
  const bCar = b?.careerTotals?.regularSeason;

  const swap = () => { setAId(bId); setBId(aId); };

  return (
    <div className="p-3 md:p-5 space-y-3">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[20px] font-semibold tracking-tight">Compare Players</h1>
          <p className="text-[12px] text-white/45 mt-1 font-mono">
            Pick any two NHL players · stat-by-stat comparison
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={swap}
            disabled={!aId || !bId}
            className="flex items-center gap-1.5 px-2.5 h-7 border border-white/[0.08] hover:border-white/20 bg-white/[0.02] rounded-md transition-colors text-[11px] font-mono text-white/55 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ArrowLeftRight size={11} /> swap
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Side playerId={aId} label="Player A" onClear={() => setAId(null)} onPick={setAId} otherId={bId} />
        <Side playerId={bId} label="Player B" onClear={() => setBId(null)} onPick={setBId} otherId={aId} />
      </div>

      {a && b && (
        <>
          {/* Season comparison */}
          <Section title="2025–26 · Regular Season" action={<span className="text-[10px] font-mono text-white/40">side-by-side</span>}>
            <div className="divide-y divide-white/[0.04]">
              {bothSkaters && aSub && bSub && (
                <>
                  <StatBar label="Games Played"     a={aSub.gamesPlayed} b={bSub.gamesPlayed} />
                  <StatBar label="Goals"            a={aSub.goals} b={bSub.goals} />
                  <StatBar label="Assists"          a={aSub.assists} b={bSub.assists} />
                  <StatBar label="Points"           a={aSub.points} b={bSub.points} />
                  <StatBar label="Plus/Minus"       a={aSub.plusMinus} b={bSub.plusMinus} />
                  <StatBar label="Penalty Minutes"  a={aSub.pim} b={bSub.pim} higherBetter={false} />
                  <StatBar label="Shots on Goal"    a={aSub.shots} b={bSub.shots} />
                  <StatBar label="Shooting %"       a={aSub.shootingPctg != null ? +(aSub.shootingPctg * 100).toFixed(1) : null}
                                                    b={bSub.shootingPctg != null ? +(bSub.shootingPctg * 100).toFixed(1) : null}
                                                    fmt={(v) => `${v}%`} />
                  <StatBar label="Power Play Goals" a={aSub.powerPlayGoals} b={bSub.powerPlayGoals} />
                  <StatBar label="Power Play Points" a={aSub.powerPlayPoints} b={bSub.powerPlayPoints} />
                  <StatBar label="Game-Winning Goals" a={aSub.gameWinningGoals} b={bSub.gameWinningGoals} />
                  <StatBar label="Faceoff %"        a={aSub.faceoffWinningPctg != null ? +(aSub.faceoffWinningPctg * 100).toFixed(1) : null}
                                                    b={bSub.faceoffWinningPctg != null ? +(bSub.faceoffWinningPctg * 100).toFixed(1) : null}
                                                    fmt={(v) => `${v}%`} />
                </>
              )}
              {bothGoalies && aSub && bSub && (
                <>
                  <StatBar label="Games Played"     a={aSub.gamesPlayed} b={bSub.gamesPlayed} />
                  <StatBar label="Wins"             a={aSub.wins} b={bSub.wins} />
                  <StatBar label="Losses"           a={aSub.losses} b={bSub.losses} higherBetter={false} />
                  <StatBar label="Save %"           a={aSub.savePercentage != null ? +(aSub.savePercentage * 100).toFixed(2) : null}
                                                    b={bSub.savePercentage != null ? +(bSub.savePercentage * 100).toFixed(2) : null}
                                                    fmt={(v) => `${v}%`} />
                  <StatBar label="Goals Against Avg" a={aSub.goalsAgainstAverage} b={bSub.goalsAgainstAverage} higherBetter={false}
                                                    fmt={(v) => v?.toFixed?.(2) ?? v} />
                  <StatBar label="Shutouts"         a={aSub.shutouts} b={bSub.shutouts} />
                  <StatBar label="Saves"            a={aSub.saves} b={bSub.saves} />
                </>
              )}
              {!bothSkaters && !bothGoalies && (
                <div className="px-4 py-6 text-center text-[11px] font-mono text-white/40">
                  These two players play different positions — pick two skaters or two goalies.
                </div>
              )}
            </div>
          </Section>

          {/* Career comparison */}
          {(bothSkaters || bothGoalies) && aCar && bCar && (
            <Section title="Career · Regular Season" action={<span className="text-[10px] font-mono text-white/40">all-time NHL</span>}>
              <div className="divide-y divide-white/[0.04]">
                {bothSkaters && (
                  <>
                    <StatBar label="Games Played"     a={aCar.gamesPlayed} b={bCar.gamesPlayed} />
                    <StatBar label="Goals"            a={aCar.goals} b={bCar.goals} />
                    <StatBar label="Assists"          a={aCar.assists} b={bCar.assists} />
                    <StatBar label="Points"           a={aCar.points} b={bCar.points} />
                    <StatBar label="Points per Game"  a={aCar.gamesPlayed ? +(aCar.points / aCar.gamesPlayed).toFixed(2) : null}
                                                      b={bCar.gamesPlayed ? +(bCar.points / bCar.gamesPlayed).toFixed(2) : null} />
                    <StatBar label="Shots on Goal"    a={aCar.shots} b={bCar.shots} />
                    <StatBar label="Shooting %"       a={aCar.shootingPctg != null ? +(aCar.shootingPctg * 100).toFixed(1) : null}
                                                      b={bCar.shootingPctg != null ? +(bCar.shootingPctg * 100).toFixed(1) : null}
                                                      fmt={(v) => `${v}%`} />
                  </>
                )}
                {bothGoalies && (
                  <>
                    <StatBar label="Games Played"      a={aCar.gamesPlayed} b={bCar.gamesPlayed} />
                    <StatBar label="Wins"              a={aCar.wins} b={bCar.wins} />
                    <StatBar label="Losses"            a={aCar.losses} b={bCar.losses} higherBetter={false} />
                    <StatBar label="Save %"            a={aCar.savePercentage != null ? +(aCar.savePercentage * 100).toFixed(2) : null}
                                                       b={bCar.savePercentage != null ? +(bCar.savePercentage * 100).toFixed(2) : null}
                                                       fmt={(v) => `${v}%`} />
                    <StatBar label="Goals Against Avg" a={aCar.goalsAgainstAverage} b={bCar.goalsAgainstAverage} higherBetter={false}
                                                       fmt={(v) => v?.toFixed?.(2) ?? v} />
                    <StatBar label="Shutouts"          a={aCar.shutouts} b={bCar.shutouts} />
                  </>
                )}
              </div>
            </Section>
          )}
        </>
      )}

      {(aRaw.loading || bRaw.loading) && (!a || !b) && (aId || bId) && (
        <div className="text-center text-[11px] font-mono text-white/40 py-4">Loading…</div>
      )}
    </div>
  );
};
