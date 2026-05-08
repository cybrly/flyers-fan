import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { cx, fmtRelative, connStatus, SEASON_LABEL } from '../config.js';
import { GoalHornToggle } from './GoalHorn.jsx';
import { GoalNotificationsToggle } from './GoalNotifications.jsx';

export const Statusbar = ({ lastFetch, error, refresh }) => {
  const status = connStatus(lastFetch, error);
  return (
    <div className="h-7 border-t border-[#F74902]/[0.22] bg-[#080808] flex items-center justify-between px-4 md:px-6 text-[10px] font-mono text-white/45">
      <div className="flex items-center gap-4">
        <span className={cx('flex items-center gap-1.5',
          status.tone === 'red' && 'text-red-400',
          status.tone === 'amber' && 'text-amber-400'
        )}>
          {error ? <WifiOff size={10} /> : <Wifi size={10} />}
          <span>api-web.nhle.com · {status.label}</span>
        </span>
        <button
          onClick={refresh}
          aria-label="Refresh data"
          className="flex items-center gap-1.5 hover:text-white/70 transition-colors"
        >
          <RefreshCw size={10} />
          <span className="hidden sm:inline">refresh {fmtRelative(lastFetch)}</span>
          <span className="sm:hidden">refresh</span>
        </button>
        <GoalHornToggle />
        <GoalNotificationsToggle />
      </div>
      <div className="flex items-center gap-4">
        <span className="hidden lg:inline text-white/35">
          Unofficial · Not affiliated with the NHL or Philadelphia Flyers
        </span>
        <span className="lg:hidden text-white/35">Unofficial · not NHL</span>
        <span className="hidden md:inline">{SEASON_LABEL} Season</span>
        <span>v13.4</span>
      </div>
    </div>
  );
};
