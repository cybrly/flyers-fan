import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { cx } from '../config.js';
import { usePlayerModal } from '../context.js';
import { useNHL } from '../api.js';
import { Headshot } from './Headshot.jsx';

// Player text/link wrapper. Click opens the player modal (existing
// behavior). Sustained hover (~350 ms) opens a small preview card with
// headshot + season stat line — speeds up scanning rosters / scoring
// summaries without requiring a click. Quick mouse-passes don't fire
// the fetch since the show-delay debounces the hover intent.
//
// Render the popover via portal to escape overflow:hidden parents
// (table cells, sidebars) and to anchor against the viewport so the
// edge-clamp logic works regardless of where the link lives.

const HOVER_OPEN_MS = 350;
const HOVER_CLOSE_MS = 120;

const useDelayedFlag = (active, openMs, closeMs) => {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShown(active), active ? openMs : closeMs);
    return () => clearTimeout(t);
  }, [active, openMs, closeMs]);
  return shown;
};

const HoverCard = ({ playerId, anchorRect }) => {
  const path = playerId ? `v1/player/${playerId}/landing` : null;
  const { data, loading } = useNHL(path, 0);

  // Position anchored under the link, edge-clamped to viewport.
  const W = 280;
  const margin = 8;
  const top = Math.min(window.innerHeight - 200 - margin, anchorRect.bottom + 8);
  const left = Math.max(margin, Math.min(window.innerWidth - W - margin, anchorRect.left));

  const fullName = data ? `${data.firstName?.default || ''} ${data.lastName?.default || ''}`.trim() : null;
  const isGoalie = data?.position === 'G';
  const seasonRow = (data?.featuredStats?.regularSeason?.subSeason) || (data?.featuredStats?.regularSeason?.career);

  return createPortal(
    <div
      role="tooltip"
      className="fixed z-[200] rounded-lg border border-white/[0.10] bg-[#0C0C0C]/96 backdrop-blur-md shadow-[0_18px_42px_-12px_rgba(0,0,0,0.85)]"
      style={{ top, left, width: W }}
    >
      <div className="px-3 py-3 flex items-start gap-3">
        <Headshot id={playerId} size={56} src={data?.headshot} />
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-medium text-white truncate">
            {fullName || (loading ? '—' : 'Player')}
          </div>
          <div className="text-[10px] font-mono text-white/45 mt-0.5 tabular-nums">
            {data?.sweaterNumber != null && `#${data.sweaterNumber} · `}
            {data?.position}
            {data?.currentTeamAbbrev && ` · ${data.currentTeamAbbrev}`}
          </div>
          {seasonRow && (
            <div className="mt-1.5 text-[11px] font-mono tabular-nums text-white/75">
              {isGoalie ? (
                <>
                  {seasonRow.gamesPlayed != null && `${seasonRow.gamesPlayed} GP`}
                  {seasonRow.wins != null && ` · ${seasonRow.wins}W`}
                  {seasonRow.losses != null && `–${seasonRow.losses}L`}
                  {seasonRow.savePctg != null && ` · ${(seasonRow.savePctg * 100).toFixed(1)}% SV`}
                </>
              ) : (
                <>
                  {seasonRow.gamesPlayed != null && `${seasonRow.gamesPlayed} GP`}
                  {seasonRow.goals != null && ` · ${seasonRow.goals}G`}
                  {seasonRow.assists != null && ` ${seasonRow.assists}A`}
                  {seasonRow.points != null && ` ${seasonRow.points}P`}
                </>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="px-3 py-1.5 border-t border-white/[0.05] text-[9px] font-mono text-white/30 uppercase tracking-wider">
        click for full profile
      </div>
    </div>,
    document.body,
  );
};

// Wraps any element to make it clickable for the player modal.
export const PlayerLink = ({ playerId, children, className = '' }) => {
  const { open } = usePlayerModal();
  const [hovering, setHovering] = useState(false);
  const [anchorRect, setAnchorRect] = useState(null);
  const ref = useRef(null);
  const showCard = useDelayedFlag(hovering, HOVER_OPEN_MS, HOVER_CLOSE_MS);

  if (!playerId) return <>{children}</>;

  const onEnter = () => {
    if (ref.current) {
      setAnchorRect(ref.current.getBoundingClientRect());
    }
    setHovering(true);
  };
  const onLeave = () => setHovering(false);

  return (
    <>
      <button
        ref={ref}
        type="button"
        onClick={() => open(playerId)}
        onMouseEnter={onEnter}
        onMouseLeave={onLeave}
        onFocus={onEnter}
        onBlur={onLeave}
        className={cx('text-left hover:text-[#FF8A4C] transition-colors cursor-pointer', className)}
      >
        {children}
      </button>
      {showCard && anchorRect && <HoverCard playerId={playerId} anchorRect={anchorRect} />}
    </>
  );
};
