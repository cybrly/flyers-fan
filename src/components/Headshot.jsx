import { useState } from 'react';
import { cx, SEASON } from '../config.js';

// NHL serves player mugs at predictable URLs:
//   https://assets.nhle.com/mugs/nhl/{season}/{teamAbbrev}/{playerId}.png
// We accept either a full `src` (already known via the API) or a (playerId,
// teamAbbrev) pair to construct one. Falls back to a sweater-number badge
// when the image fails to load.
export const Headshot = ({ src, playerId, teamAbbrev, num, size = 28, className = '' }) => {
  const [failed, setFailed] = useState(false);
  const url = src || (playerId && teamAbbrev
    ? `https://assets.nhle.com/mugs/nhl/${SEASON}/${teamAbbrev}/${playerId}.png`
    : null);

  if (!url || failed) {
    return (
      <div
        className={cx('shrink-0 rounded-full bg-white/[0.05] flex items-center justify-center text-white/55', className)}
        style={{ width: size, height: size, fontSize: size * 0.35 }}
      >
        <span className="font-mono font-medium">{num != null ? num : '?'}</span>
      </div>
    );
  }
  return (
    <img
      src={url}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      onError={() => setFailed(true)}
      className={cx('shrink-0 rounded-full object-cover bg-white/[0.04]', className)}
      style={{ width: size, height: size }}
    />
  );
};
