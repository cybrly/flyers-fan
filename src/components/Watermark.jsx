import { cx } from '../config.js';

// Reusable team-logo watermark. Anchors a faded NHL primary logo to a
// corner of the parent card, designed to sit behind content as a quiet
// branding cue. The parent must have `relative overflow-hidden`; that
// detail is left to the call site so this component stays a pure leaf.
//
// Defaults are tuned for an unobtrusive 6–8% opacity at ~180px square,
// bottom-right anchor, no pointer events. Bigger / brighter variants
// override via the size and opacity props.

const POSITIONS = {
  'bottom-right': '-bottom-10 -right-10',
  'bottom-left':  '-bottom-10 -left-10',
  'top-right':    '-top-10 -right-10',
  'top-left':     '-top-10 -left-10',
};

export const TeamLogoBg = ({
  abbr,
  size = 180,
  opacity = 0.07,
  position = 'bottom-right',
  className = '',
}) => {
  if (!abbr) return null;
  return (
    <img
      src={`https://assets.nhle.com/logos/nhl/svg/${abbr}_dark.svg`}
      alt=""
      aria-hidden="true"
      loading="lazy"
      className={cx('absolute object-contain pointer-events-none select-none', POSITIONS[position] || POSITIONS['bottom-right'], className)}
      style={{ width: size, height: size, opacity }}
      onError={(e) => { e.currentTarget.style.display = 'none'; }}
    />
  );
};
