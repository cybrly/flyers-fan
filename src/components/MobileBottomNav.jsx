import { LayoutDashboard, Activity, Calendar, Trophy, MoreHorizontal } from 'lucide-react';
import { cx } from '../config.js';

// Phone-only fixed bottom navigation. Five highest-traffic destinations,
// thumb-reachable. Sidebar still exists behind a hamburger via "More" — we
// don't want to lose the long tail of pages, just give the common ones a
// faster path on small screens. Hidden ≥ sm where the sidebar is visible.

const ITEMS = [
  { id: 'dashboard', label: 'Home',     icon: LayoutDashboard },
  { id: 'schedule',  label: 'Schedule', icon: Calendar },
  { id: 'on-ice',    label: 'On Ice',   icon: Activity },
  { id: 'standings', label: 'Standings', icon: Trophy },
];

export const MobileBottomNav = ({ page, setPage, onOpenMore }) => (
  <nav
    aria-label="Primary"
    className="sm:hidden fixed bottom-0 inset-x-0 z-30 h-14 border-t border-[#F74902]/[0.22] bg-[#080808]/96 backdrop-blur-md flex items-stretch"
    style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
  >
    {ITEMS.map((it) => {
      const Icon = it.icon;
      const active = page === it.id;
      return (
        <button
          key={it.id}
          onClick={() => setPage(it.id)}
          aria-current={active ? 'page' : undefined}
          className={cx(
            'flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors',
            active ? 'text-[#FF8A4C]' : 'text-white/55 hover:text-white/85',
          )}
        >
          <Icon size={18} strokeWidth={active ? 2.4 : 1.8} />
          <span className={cx('text-[10px] font-mono tracking-wide', active && 'font-semibold')}>
            {it.label}
          </span>
        </button>
      );
    })}
    <button
      onClick={onOpenMore}
      aria-label="Open full menu"
      className="flex-1 flex flex-col items-center justify-center gap-0.5 text-white/55 hover:text-white/85 transition-colors"
    >
      <MoreHorizontal size={18} strokeWidth={1.8} />
      <span className="text-[10px] font-mono tracking-wide">More</span>
    </button>
  </nav>
);
