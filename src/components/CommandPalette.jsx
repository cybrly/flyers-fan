import { useState, useEffect, useMemo, useRef } from 'react';
import { Search } from 'lucide-react';
import { cx, OPP_FULL } from '../config.js';
import { Kbd } from './primitives.jsx';
import { TeamLogo } from './Logo.jsx';
import { NAV_ITEMS } from './nav.js';

export const CommandPalette = ({ open, onClose, setPage, schedule, roster, clubStats, onOpenGame, onOpenPlayer }) => {
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => { if (open) { setQ(''); setActive(0); setTimeout(() => inputRef.current?.focus(), 30); } }, [open]);

  const items = useMemo(() => {
    const out = [];
    NAV_ITEMS.forEach((n) => out.push({
      key: `page-${n.id}`,
      kind: 'Page',
      label: n.label,
      onPick: () => setPage(n.id),
    }));
    (schedule?.games || []).slice(0, 30).forEach((g) => out.push({
      key: `g-${g.id}`,
      kind: 'Game',
      label: `${g.home ? 'vs' : '@'} ${OPP_FULL[g.opp] || g.opp}`,
      sub: `${g.label} · ${g.w ? 'W' : 'L'} ${g.us}–${g.them}`,
      teamAbbr: g.opp,
      onPick: () => onOpenGame(g.id),
    }));
    if (roster) {
      [...roster.forwards, ...roster.defense, ...roster.goalies].forEach((p) => out.push({
        key: `p-${p.id}`,
        kind: 'Player',
        label: p.name,
        sub: `#${p.num || '?'} · ${p.pos}`,
        onPick: () => onOpenPlayer(p.id),
      }));
    } else if (clubStats) {
      [...clubStats.skaters, ...clubStats.goalies].forEach((p) => out.push({
        key: `cs-${p.id}`,
        kind: 'Player',
        label: p.name,
        onPick: () => onOpenPlayer(p.id),
      }));
    }
    return out;
  }, [schedule, roster, clubStats, setPage, onOpenGame, onOpenPlayer]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return items.slice(0, 30);
    const matches = items.filter((it) =>
      it.label.toLowerCase().includes(term) ||
      (it.sub || '').toLowerCase().includes(term) ||
      it.kind.toLowerCase().includes(term)
    );
    return matches.slice(0, 40);
  }, [items, q]);

  useEffect(() => { setActive(0); }, [q, filtered.length]);

  if (!open) return null;

  const pick = (it) => { it?.onPick?.(); onClose(); };

  const onKey = (e) => {
    if (e.key === 'Escape') { e.preventDefault(); onClose(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => Math.min(filtered.length - 1, i + 1)); }
    else if (e.key === 'ArrowUp')   { e.preventDefault(); setActive((i) => Math.max(0, i - 1)); }
    else if (e.key === 'Enter')     { e.preventDefault(); pick(filtered[active]); }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] px-3 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
      style={{ animation: 'fadeIn 0.12s ease-out' }}
    >
      <div
        className="w-full max-w-xl border border-white/10 bg-[#0C0D11] rounded-lg shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-3 h-11 border-b border-white/[0.06]">
          <Search size={14} className="text-white/40" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKey}
            placeholder="Search pages, games, players…"
            className="flex-1 bg-transparent outline-none text-[13px] placeholder:text-white/30"
          />
          <Kbd>Esc</Kbd>
        </div>
        <div className="max-h-[52vh] overflow-y-auto py-1">
          {filtered.length === 0 && (
            <div className="px-4 py-6 text-center text-[12px] font-mono text-white/35">No matches.</div>
          )}
          {filtered.map((it, i) => (
            <button
              key={it.key}
              onMouseEnter={() => setActive(i)}
              onClick={() => pick(it)}
              className={cx(
                'w-full text-left flex items-center gap-2.5 px-3 h-9 transition-colors',
                i === active ? 'bg-white/[0.06]' : 'hover:bg-white/[0.03]',
              )}
            >
              {it.teamAbbr ? <TeamLogo abbr={it.teamAbbr} size={14} /> : <span className="w-[14px]" />}
              <span className="text-[12px] truncate flex-1">{it.label}</span>
              {it.sub && <span className="text-[10px] font-mono text-white/40 truncate max-w-[200px]">{it.sub}</span>}
              <span className="text-[9px] font-mono text-white/30 uppercase tracking-wider">{it.kind}</span>
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between gap-2 px-3 h-8 border-t border-white/[0.06] text-[10px] font-mono text-white/35">
          <span className="flex items-center gap-1.5"><Kbd>↑</Kbd><Kbd>↓</Kbd> navigate</span>
          <span className="flex items-center gap-1.5"><Kbd>↵</Kbd> select</span>
        </div>
      </div>
    </div>
  );
};
