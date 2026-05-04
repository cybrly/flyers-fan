import { ChevronRight, Search, Command } from 'lucide-react';
import { cx, connStatus } from '../config.js';
import { Kbd, Chip } from './primitives.jsx';
import { FlyersMark } from './Logo.jsx';
import { NAV_ITEMS } from './nav.js';

export const Topbar = ({ page, setPage, liveGame, lastFetch, error, onOpenPalette }) => {
  const current = NAV_ITEMS.find((n) => n.id === page) || NAV_ITEMS[0];
  const Icon = current.icon;
  const status = connStatus(lastFetch, error);

  return (
    <header className="h-12 border-b border-white/[0.06] bg-[#0A0A0A]/90 backdrop-blur-md sticky top-0 z-30">
      <div className="h-full px-4 md:px-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 min-w-0">
          <div className="lg:hidden flex items-center gap-2 mr-2">
            <FlyersMark size={18} />
            <span className="text-[12px] font-semibold">flyers<span className="text-[#F74902]">.fan</span></span>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-[11px] font-mono text-white/40">
            <span>PHI</span>
            <ChevronRight size={11} />
            <span className="text-white/80 flex items-center gap-1.5"><Icon size={11} strokeWidth={2} />{current.label}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <nav aria-label="Primary navigation" className="lg:hidden flex items-center gap-0.5">
            {NAV_ITEMS.map(({ id, icon: I, label }) => (
              <button
                key={id}
                onClick={() => setPage(id)}
                aria-label={label}
                aria-current={page === id ? 'page' : undefined}
                className={cx(
                  'w-8 h-8 flex items-center justify-center rounded-md transition-colors relative',
                  page === id ? 'bg-white/[0.06] text-[#F74902]' : 'text-white/50 hover:text-white'
                )}
              >
                <I size={14} strokeWidth={2} />
                {id === 'game' && liveGame && (
                  <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                )}
              </button>
            ))}
          </nav>

          <button
            onClick={onOpenPalette}
            aria-label="Open command palette"
            className="hidden md:flex items-center gap-2 h-7 pl-2 pr-1.5 border border-white/[0.08] hover:border-white/20 bg-white/[0.02] rounded-md transition-colors"
          >
            <Search size={12} strokeWidth={2} className="text-white/40" />
            <span className="text-[11px] text-white/40 font-mono">Search or jump to</span>
            <div className="flex items-center gap-0.5 ml-2">
              <Kbd><Command size={9} strokeWidth={2.5} /></Kbd>
              <Kbd>K</Kbd>
            </div>
          </button>

          <div className="h-4 w-px bg-white/[0.08] hidden md:block" />

          {liveGame ? (
            <Chip tone="live" pulse>LIVE · {liveGame.us}–{liveGame.them} {liveGame.home ? 'vs' : '@'} {liveGame.opp}</Chip>
          ) : (
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-1.5 w-1.5">
                {status.tone === 'green' && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />}
                <span className={cx('relative inline-flex rounded-full h-1.5 w-1.5',
                  status.tone === 'green' ? 'bg-emerald-400' : status.tone === 'amber' ? 'bg-amber-400' : 'bg-red-400'
                )} />
              </span>
              <span className="text-[11px] font-mono text-white/60 hidden sm:inline">
                {error ? 'OFFLINE' : 'SEASON LIVE'}
              </span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
