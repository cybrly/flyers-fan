import { cx } from '../config.js';
import { usePlayerModal } from '../context.js';

// Wraps any element to make it clickable for the player modal.
export const PlayerLink = ({ playerId, children, className = '' }) => {
  const { open } = usePlayerModal();
  if (!playerId) return <>{children}</>;
  return (
    <button
      type="button"
      onClick={() => open(playerId)}
      className={cx('text-left hover:text-[#FF8A4C] transition-colors cursor-pointer', className)}
    >
      {children}
    </button>
  );
};
