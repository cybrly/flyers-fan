import { useState } from 'react';
import { cx, SEASON } from '../config.js';

// NHL serves player mugs at predictable URLs:
//   https://assets.nhle.com/mugs/nhl/{season}/{teamAbbrev}/{playerId}.png
// We accept either a full `src` (already known via the API) or a (playerId,
// teamAbbrev) pair to construct one. Falls back to a sweater-number badge
// when the image fails to load.
export const Headshot = ({ src, playerId, teamAbbrev, num, size = 28, className = '' }) => {
  // Candidate URLs in priority order. When we construct the mug URL ourselves
  // we try the current season first, then the prior season: right after the
  // Sep-1 season rollover the new season's mugs aren't published yet, so the
  // current-season URL 302s to a generic silhouette. Falling back to last
  // season's mug keeps a real face on screen until the CDN catches up. If an
  // explicit `src` was passed there's no season to fall back to.
  const mug = (season) => `https://assets.nhle.com/mugs/nhl/${season}/${teamAbbrev}/${playerId}.png`;
  const startY = Number(String(SEASON).slice(0, 4));
  const priorSeason = Number.isFinite(startY) ? `${startY - 1}${startY}` : null;
  const candidates = src
    ? [src]
    : (playerId && teamAbbrev
        ? [mug(SEASON), priorSeason && mug(priorSeason)].filter(Boolean)
        : []);

  const [idx, setIdx] = useState(0);
  const url = candidates[idx] || null;

  if (!url) {
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
      decoding="async"
      onError={() => setIdx((i) => i + 1)}
      className={cx('shrink-0 rounded-full object-cover bg-white/[0.04]', className)}
      style={{ width: size, height: size }}
    />
  );
};
