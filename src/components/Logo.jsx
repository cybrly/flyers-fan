import { useState } from 'react';
import { cx } from '../config.js';

const NHL_LOGO = (abbr) => `https://assets.nhle.com/logos/nhl/svg/${abbr}_dark.svg`;

// Stylized fallback used when the real SVG fails to load — orange skewed
// "P" tile that shares the brand vibe.
const FlyersBadge = ({ size = 18 }) => (
  <div
    className="relative flex items-center justify-center shrink-0 bg-[#F74902] text-black font-black"
    style={{
      width: size, height: size,
      transform: 'skewX(-8deg)',
      fontSize: size * 0.65, fontFamily: 'Geist, sans-serif',
      borderRadius: 2, lineHeight: 1,
    }}
  >
    <span style={{ transform: 'skewX(8deg)' }}>P</span>
  </div>
);

// Real Philadelphia Flyers winged-P logo. Falls back to the badge if the
// NHL CDN ever fails to serve the asset.
export const FlyersMark = ({ size = 18, className = '' }) => {
  const [failed, setFailed] = useState(false);
  if (failed) return <FlyersBadge size={size} />;
  return (
    <img
      src={NHL_LOGO('PHI')}
      alt="Philadelphia Flyers"
      width={size}
      height={size}
      loading="lazy"
      onError={() => setFailed(true)}
      className={cx('shrink-0 select-none object-contain', className)}
      style={{ width: size, height: size }}
    />
  );
};

// NHL serves SVG team logos at a predictable URL. _dark variant is designed
// for dark backgrounds (lighter strokes); _light is for light backgrounds.
// On error (e.g. team abbrev change) we fall back to a small mono badge.
export const TeamLogo = ({ abbr, size = 20, className = '' }) => {
  const [failed, setFailed] = useState(false);
  if (!abbr) return <div style={{ width: size, height: size }} className="shrink-0" />;
  if (failed) {
    return (
      <div
        className={cx('shrink-0 rounded-sm bg-white/[0.06] flex items-center justify-center text-white/65', className)}
        style={{ width: size, height: size, fontSize: size * 0.42 }}
      >
        <span className="font-bold font-mono">{abbr}</span>
      </div>
    );
  }
  return (
    <img
      src={NHL_LOGO(abbr)}
      alt={abbr}
      width={size}
      height={size}
      loading="lazy"
      onError={() => setFailed(true)}
      className={cx('shrink-0 select-none object-contain', className)}
      style={{ width: size, height: size }}
    />
  );
};
