import { useState } from 'react';
import { TEAM_ABBR, cx } from '../config.js';

export const FlyersMark = ({ size = 18 }) => (
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

// NHL serves SVG team logos at a predictable URL. _dark variant is designed
// for dark backgrounds (lighter strokes); _light is for light backgrounds.
// On error (e.g. team abbrev change) we fall back to a small mono badge.
export const TeamLogo = ({ abbr, size = 20, className = '' }) => {
  const [failed, setFailed] = useState(false);
  if (!abbr) return <div style={{ width: size, height: size }} className="shrink-0" />;
  if (abbr === TEAM_ABBR) return <FlyersMark size={size} />;
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
      src={`https://assets.nhle.com/logos/nhl/svg/${abbr}_dark.svg`}
      alt={abbr}
      width={size}
      height={size}
      loading="lazy"
      onError={() => setFailed(true)}
      className={cx('shrink-0 select-none', className)}
      style={{ width: size, height: size }}
    />
  );
};
