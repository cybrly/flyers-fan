import { useState } from 'react';
import { cx } from '../config.js';
import { useTeam } from '../teamContext.jsx';

const NHL_LOGO = (abbr) => `https://assets.nhle.com/logos/nhl/svg/${abbr}_dark.svg`;

// Stylized fallback used when the real SVG fails to load — colored tile
// with the team's abbreviation. Was a static "P"; now reads the active
// team's first letter so a fallback for, say, COL renders 'C' rather
// than the wrong 'P'.
const TeamBadge = ({ abbr = 'NHL', size = 18 }) => (
  <div
    className="relative flex items-center justify-center shrink-0 text-black font-black"
    style={{
      width: size, height: size,
      transform: 'skewX(-8deg)',
      fontSize: size * 0.65, fontFamily: 'Geist, sans-serif',
      borderRadius: 2, lineHeight: 1,
      background: 'var(--team-primary, #F74902)',
    }}
  >
    <span style={{ transform: 'skewX(8deg)' }}>{(abbr || '?')[0]}</span>
  </div>
);

// The active team's mark — name's a historical artifact from when this
// codebase was Flyers-only. Now reads useTeam() so switching to EDM
// renders the Oilers logo, COL renders the Avalanche, etc. Falls back
// to a colored tile with the team's first initial if the NHL CDN ever
// fails to serve the asset. Pass an explicit `abbr` to override the
// context (used by broadcast / kiosk to pin PHI vs OPP layout).
export const FlyersMark = ({ size = 18, className = '', abbr }) => {
  const ctx = useTeam();
  const resolved = abbr || ctx?.teamAbbr || 'PHI';
  const [failed, setFailed] = useState(false);
  if (failed) return <TeamBadge abbr={resolved} size={size} />;
  return (
    <img
      src={NHL_LOGO(resolved)}
      alt={ctx?.teamName || resolved}
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
