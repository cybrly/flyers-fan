import { useEffect } from 'react';
import { ChevronRight, Flame, RefreshCw, X } from 'lucide-react';
import { cx, fmtRelative, connStatus } from '../config.js';
import { Kbd, Chip, Label, Skeleton } from './primitives.jsx';
import { FlyersMark, TeamLogo } from './Logo.jsx';
import { NAV_ITEMS } from './nav.js';
import { navigate, playerHref } from '../router.js';
import { TeamSwitcherPrank } from './TeamSwitcherPrank.jsx';

export const Sidebar = ({ page, setPage, team, liveGame, metro, roster, lastFetch, error, refresh, mobileOpen = false, onCloseMobile }) => {
  const status = connStatus(lastFetch, error);
  const streak = team?.streak;

  // Auto-close drawer on route change (mobile UX) and on ESC.
  useEffect(() => {
    if (mobileOpen) onCloseMobile?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e) => { if (e.key === 'Escape') onCloseMobile?.(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [mobileOpen, onCloseMobile]);

  // Wrap navigation handler so mobile users dismiss the drawer immediately
  // on tap (the auto-close on `page` change kicks in *after* re-render, so
  // doing both is fine — second close is a no-op).
  const handleSetPage = (p) => {
    setPage(p);
    onCloseMobile?.();
  };

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          aria-hidden
          className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={onCloseMobile}
        />
      )}

    <aside className={cx(
      'flex flex-col w-[244px] shrink-0 border-r border-white/[0.06] bg-[#0A0A0A]/95 backdrop-blur-md',
      // Desktop: standard sticky sidebar
      'lg:sticky lg:top-0 lg:h-screen',
      // Mobile: fixed-position drawer that slides in from the left
      'fixed lg:relative inset-y-0 left-0 h-screen z-50 transition-transform duration-200 ease-out',
      mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
    )}>
      <div className="h-12 px-4 flex items-center justify-between border-b border-white/[0.05]">
        <TeamSwitcherPrank />
        <div className="flex items-center gap-1">
          <button
            onClick={refresh}
            title="Refresh data"
            aria-label="Refresh data"
            className="w-7 h-7 flex items-center justify-center text-white/30 hover:text-white/70 transition-colors"
          >
            <RefreshCw size={13} />
          </button>
          <button
            onClick={onCloseMobile}
            aria-label="Close navigation"
            className="lg:hidden w-7 h-7 flex items-center justify-center text-white/40 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      <div className="px-3 py-3 border-b border-white/[0.05]">
        <div className="w-full group flex items-center justify-between px-2 py-1.5 rounded-md">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-5 h-5 bg-gradient-to-br from-[#F74902] to-[#A82E00] rounded-sm flex items-center justify-center shrink-0">
              <span className="text-[9px] font-bold text-black font-mono">PHI</span>
            </div>
            <div className="min-w-0 text-left">
              <div className="text-[11px] font-medium truncate">2025–26 Season</div>
              <div className="text-[10px] text-white/40 font-mono">
                {team ? `${team.w}–${team.l} · Metro #${team.divRank}` : <span className="text-white/30">loading…</span>}
              </div>
            </div>
          </div>
        </div>
      </div>

      <nav aria-label="Primary navigation" className="flex-1 overflow-y-auto px-2 py-3">
        <div className="px-2 mb-2"><Label>Workspace</Label></div>
        <div className="space-y-0.5">
          {NAV_ITEMS.map(({ id, label, icon: Icon, kbd }) => {
            const active = page === id;
            const liveBadge = id === 'game' && liveGame;
            return (
              <button
                key={id}
                onClick={() => handleSetPage(id)}
                aria-current={active ? 'page' : undefined}
                className={cx(
                  'w-full group flex items-center justify-between px-2 h-7 rounded-md transition-all',
                  active ? 'bg-white/[0.06] text-white' : 'text-white/55 hover:text-white hover:bg-white/[0.03]',
                )}
              >
                <div className="flex items-center gap-2">
                  <Icon size={13} strokeWidth={active ? 2 : 1.75} className={active ? 'text-[#F74902]' : ''} />
                  <span className="text-[12px] font-medium tracking-tight">{label}</span>
                  {liveBadge && <Chip tone="live" pulse>LIVE</Chip>}
                </div>
                {!liveBadge && <Kbd>{kbd}</Kbd>}
              </button>
            );
          })}
        </div>

        <div className="mt-6 px-2">
          <div className="flex items-center justify-between mb-2">
            <Label>Metro · Top 4</Label>
            <ChevronRight size={10} className="text-white/30" />
          </div>
          <div className="space-y-[2px]">
            {metro?.length ? metro.slice(0, 4).map((t, i) => (
              <div
                key={t.abbr}
                className={cx(
                  'flex items-center gap-2 px-2 h-6 rounded-sm',
                  t.us ? 'bg-[#F74902]/[0.08]' : 'hover:bg-white/[0.02]',
                )}
              >
                <span className={cx('text-[10px] font-mono tabular-nums w-3',
                  t.us ? 'text-[#F74902]' : i < 3 ? 'text-white/50' : 'text-white/25'
                )}>{i + 1}</span>
                <TeamLogo abbr={t.abbr} size={14} />
                <span className={cx('text-[11px] font-mono font-medium',
                  t.us ? 'text-white' : 'text-white/70'
                )}>{t.abbr}</span>
                <span className="flex-1 text-right text-[10px] font-mono tabular-nums text-white/40">
                  {t.w}–{t.l}
                </span>
              </div>
            )) : (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="px-2 h-6 flex items-center"><Skeleton className="w-full" height={12} /></div>
              ))
            )}
          </div>
        </div>

        <SidebarRoster roster={roster} />
      </nav>

      <div className="border-t border-white/[0.05] p-3 space-y-2">
        <div className="flex items-center justify-between text-[10px] font-mono">
          <div className={cx('flex items-center gap-1.5',
            status.tone === 'green' ? 'text-emerald-400' :
            status.tone === 'amber' ? 'text-amber-400' : 'text-red-400'
          )}>
            <span className="relative flex h-1.5 w-1.5">
              {status.tone === 'green' && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
              )}
              <span className={cx('relative inline-flex rounded-full h-1.5 w-1.5',
                status.tone === 'green' ? 'bg-emerald-400' :
                status.tone === 'amber' ? 'bg-amber-400' : 'bg-red-400'
              )} />
            </span>
            <span className="uppercase">{status.label}</span>
          </div>
          <span className="text-white/30">{fmtRelative(lastFetch)}</span>
        </div>
        {streak && (
          <div className="flex items-center justify-between text-[10px] font-mono text-white/40">
            <span className="flex items-center gap-1.5">
              <Flame size={9} className={
                streak.startsWith('W') ? 'text-emerald-400'
                  : streak.startsWith('L') ? 'text-red-400'
                  : 'text-[#F74902]'
              } />
              Streak
            </span>
            <span className={cx('font-medium tabular-nums',
              streak.startsWith('W') ? 'text-emerald-400'
                : streak.startsWith('L') ? 'text-red-400'
                : 'text-[#FF8A4C]'
            )}>{streak}</span>
          </div>
        )}
      </div>
    </aside>
    </>
  );
};

// Roster section in the left sidebar — full team list grouped F/D/G,
// jersey-number ordered. Click a name to jump straight to the player's
// profile page. Designed to slot under "Metro · Top 4" without bloating
// the sidebar: each row is 24px tall and the whole list flows in the
// already-scrollable nav area.
const SidebarRoster = ({ roster }) => {
  if (!roster) {
    return (
      <div className="mt-6 px-2">
        <div className="flex items-center justify-between mb-2">
          <Label>Roster</Label>
        </div>
        <div className="space-y-[2px]">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="px-2 h-6 flex items-center">
              <Skeleton className="w-full" height={10} />
            </div>
          ))}
        </div>
      </div>
    );
  }
  const groups = [
    { label: 'Forwards', list: roster.forwards },
    { label: 'Defense',  list: roster.defense  },
    { label: 'Goalies',  list: roster.goalies  },
  ];
  const total = roster.forwards.length + roster.defense.length + roster.goalies.length;

  return (
    <div className="mt-6 px-2">
      <div className="flex items-center justify-between mb-2">
        <Label>Roster</Label>
        <span className="text-[9px] font-mono text-white/30">{total}</span>
      </div>
      <div className="space-y-2">
        {groups.map((g) => (
          <div key={g.label}>
            <div className="px-2 mb-1 text-[8px] font-mono uppercase tracking-[0.18em] text-white/30">
              {g.label} · {g.list.length}
            </div>
            <div className="space-y-[1px]">
              {g.list.map((p) => (
                <button
                  key={p.id}
                  onClick={() => navigate(playerHref(p.id))}
                  title={`${p.name} · #${p.num || '—'} · ${p.pos}`}
                  className="w-full flex items-center gap-2 px-2 h-6 rounded-sm hover:bg-white/[0.04] transition-colors text-left group"
                >
                  <span className="text-[10px] font-mono tabular-nums text-white/30 w-5 group-hover:text-[#FF8A4C]">
                    {p.num != null ? p.num : '—'}
                  </span>
                  <span className="text-[11px] text-white/70 group-hover:text-white truncate flex-1">
                    {p.name}
                  </span>
                  <span className="text-[9px] font-mono text-white/30">{p.pos}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
