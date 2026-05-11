import { useEffect, useState } from 'react';
import { ChevronRight, ChevronLeft, Flame, RefreshCw, X } from 'lucide-react';
import { cx, fmtRelative, connStatus, SEASON_LABEL } from '../config.js';
import { Kbd, Chip, Label, Skeleton } from './primitives.jsx';
import { FlyersMark, TeamLogo } from './Logo.jsx';
import { NAV_ITEMS, NAV_GROUPS } from './nav.js';
import { navigate, playerHref } from '../router.js';
import { TeamSwitcherPrank } from './TeamSwitcherPrank.jsx';
import { useTeam, TEAM_COLORS, ALL_TEAMS } from '../teamContext.jsx';

const COLLAPSED_KEY = 'flyersfan.sidebar-collapsed';

export const Sidebar = ({ page, setPage, team, liveGame, metro, roster, lastFetch, error, refresh, mobileOpen = false, onCloseMobile }) => {
  const status = connStatus(lastFetch, error);
  const streak = team?.streak;
  // Collapsed state — desktop only. Mobile drawer is already toggled
  // via the existing mobileOpen prop. Persisted in localStorage so
  // the layout choice survives refreshes.
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem(COLLAPSED_KEY) === '1'; } catch { return false; }
  });
  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    try { localStorage.setItem(COLLAPSED_KEY, next ? '1' : '0'); } catch { /* ignore */ }
  };

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
      {/* Mobile backdrop — fades in/out alongside the drawer rather than
          popping. Tap anywhere on the dimmed area to close, matching the
          native iOS/Android side-drawer pattern. */}
      <div
        aria-hidden
        onClick={onCloseMobile}
        className={cx(
          'lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300',
          mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        )}
      />

    <aside
      style={{
        transitionTimingFunction: 'cubic-bezier(0.32, 0.72, 0, 1)',
        boxShadow: mobileOpen ? '8px 0 32px -8px rgba(0,0,0,0.6)' : 'none',
        // Width animates between expanded (244px) and collapsed (56px)
        // on desktop. Mobile drawer always uses 244px because the
        // drawer mode itself is what hides/shows the panel.
        width: collapsed && !mobileOpen ? 56 : 244,
      }}
      className={cx(
        'flex flex-col shrink-0 border-r border-white/[0.08] bg-[#0A0A0A]/95 backdrop-blur-md',
        'lg:sticky lg:top-0 lg:h-screen',
        'fixed lg:relative inset-y-0 left-0 h-screen z-50 transition-[width,transform] duration-300',
        mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
      )}>
      <div className={cx(
        'h-12 flex items-center border-b border-white/[0.08] gap-1',
        collapsed ? 'justify-center px-1' : 'justify-between px-3',
      )}>
        {collapsed ? (
          <button
            onClick={() => navigate('/')}
            aria-label="flyers.fan home"
            className="flex items-center justify-center w-8 h-8 rounded-md hover:bg-white/[0.04] transition-colors"
          >
            <FlyersMark size={20} />
          </button>
        ) : (
          <TeamSwitcherPrank />
        )}
        {!collapsed && (
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
              onClick={toggleCollapsed}
              title="Collapse sidebar"
              aria-label="Collapse sidebar"
              className="hidden lg:flex w-7 h-7 items-center justify-center text-white/30 hover:text-white/70 transition-colors"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              onClick={onCloseMobile}
              aria-label="Close navigation"
              className="lg:hidden w-7 h-7 flex items-center justify-center text-white/40 hover:text-white transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        )}
      </div>

      {collapsed && (
        <button
          onClick={toggleCollapsed}
          title="Expand sidebar"
          aria-label="Expand sidebar"
          className="hidden lg:flex w-full items-center justify-center h-8 text-white/30 hover:text-white/70 hover:bg-white/[0.03] border-b border-white/[0.04] transition-colors"
        >
          <ChevronRight size={14} />
        </button>
      )}

      {!collapsed && <SidebarTeamSelector team={team} />}

      <nav aria-label="Primary navigation" className={cx('flex-1 overflow-y-auto py-3', collapsed ? 'px-1' : 'px-2')}>
        {NAV_GROUPS.map((group) => {
          const items = NAV_ITEMS.filter((n) => n.group === group.id);
          if (items.length === 0) return null;
          return (
            <div key={group.id} className="mb-3 last:mb-0">
              {/* Group label hidden when collapsed; replaced with a thin
                  divider so groups stay visually separated. */}
              {collapsed ? (
                <div className="mx-2 mb-1.5 mt-1 first:mt-0 h-px bg-white/[0.05]" />
              ) : (
                <div className="px-2 mb-1.5 mt-1 first:mt-0">
                  <Label>{group.label}</Label>
                </div>
              )}
              <div className={cx(collapsed ? 'space-y-1' : 'space-y-0.5')}>
                {items.map(({ id, label, icon: Icon, kbd }) => {
                  const active = page === id;
                  const liveBadge = id === 'game' && liveGame;
                  return (
                    <button
                      key={id}
                      onClick={() => handleSetPage(id)}
                      aria-current={active ? 'page' : undefined}
                      title={collapsed ? `${label}${kbd ? ` (${kbd})` : ''}${liveBadge ? ' · LIVE' : ''}` : undefined}
                      className={cx(
                        'relative w-full group flex items-center rounded-md transition-all',
                        collapsed ? 'justify-center h-9' : 'justify-between px-2 h-7',
                        active ? 'bg-white/[0.06] text-white' : 'text-white/55 hover:text-white hover:bg-white/[0.03]',
                      )}
                    >
                      <div className={cx('flex items-center', collapsed ? '' : 'gap-2')}>
                        <Icon size={collapsed ? 16 : 13} strokeWidth={active ? 2 : 1.75} className={active ? 'text-[var(--team-primary)]' : ''} />
                        {!collapsed && (
                          <>
                            <span className="text-[12px] font-medium tracking-tight">{label}</span>
                            {liveBadge && <Chip tone="live" pulse>LIVE</Chip>}
                          </>
                        )}
                      </div>
                      {!collapsed && !liveBadge && kbd && <Kbd>{kbd}</Kbd>}
                      {collapsed && liveBadge && (
                        <span
                          className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"
                          aria-hidden
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}

        {!collapsed && (
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
                  t.us ? 'bg-[var(--team-primary)]/[0.08]' : 'hover:bg-white/[0.02]',
                )}
              >
                <span className={cx('text-[10px] font-mono tabular-nums w-3',
                  t.us ? 'text-[var(--team-primary)]' : i < 3 ? 'text-white/50' : 'text-white/25'
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
        )}

        {!collapsed && <SidebarRoster roster={roster} />}
      </nav>

      <div className={cx('border-t border-white/[0.05] space-y-2', collapsed ? 'p-2' : 'p-3')}>
        {collapsed ? (
          <div
            className="flex justify-center"
            title={`${status.label}${streak ? ` · ${streak}` : ''} · ${fmtRelative(lastFetch)}`}
          >
            <span className="relative flex h-2 w-2">
              {status.tone === 'green' && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
              )}
              <span className={cx('relative inline-flex rounded-full h-2 w-2',
                status.tone === 'green' ? 'bg-emerald-400' :
                status.tone === 'amber' ? 'bg-amber-400' : 'bg-red-400'
              )} />
            </span>
          </div>
        ) : (
          <>
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
                      : 'text-[var(--team-primary)]'
                  } />
                  Streak
                </span>
                <span className={cx('font-medium tabular-nums',
                  streak.startsWith('W') ? 'text-emerald-400'
                    : streak.startsWith('L') ? 'text-red-400'
                    : 'text-[var(--team-accent)]'
                )}>{streak}</span>
              </div>
            )}
          </>
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
                  <span className="text-[10px] font-mono tabular-nums text-white/30 w-5 group-hover:text-[var(--team-accent)]">
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

const SidebarTeamSelector = ({ team }) => {
  const { teamAbbr, setTeamAbbr, colors, teamName } = useTeam();
  return (
    <div className="px-3 py-3 border-b border-white/[0.05]">
      <div className="flex items-center gap-2 px-2 py-1.5">
        <TeamLogo abbr={teamAbbr} size={20} />
        <div className="flex-1 min-w-0">
          <select
            value={teamAbbr}
            onChange={(e) => setTeamAbbr(e.target.value)}
            className="w-full bg-transparent text-[11px] font-medium text-white/85 border-none outline-none cursor-pointer appearance-none"
            style={{ colorScheme: 'dark' }}
            aria-label="Select team"
          >
            {ALL_TEAMS.map((abbr) => (
              <option key={abbr} value={abbr} style={{ background: '#111', color: '#ddd' }}>
                {TEAM_COLORS[abbr].name}
              </option>
            ))}
          </select>
          <div className="text-[10px] text-white/40 font-mono">
            {team ? `${team.w}–${team.l} · ${team.division || 'Metro'} #${team.divRank}` : <span className="text-white/30">loading…</span>}
          </div>
        </div>
        <ChevronRight size={12} className="text-white/30 shrink-0" />
      </div>
    </div>
  );
};
