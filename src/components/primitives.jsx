import { ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { cx } from '../config.js';
import { useFlashOnChange } from '../api.js';

export const Kbd = ({ children }) => (
  <kbd className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 border border-white/10 bg-white/[0.03] text-white/50 text-[10px] font-mono rounded-[3px] leading-none">
    {children}
  </kbd>
);

export const Chip = ({ children, tone = 'default', pulse = false }) => {
  const tones = {
    default: 'border-white/10 bg-white/[0.02] text-white/65',
    orange:  'border-[#F74902]/40 bg-[#F74902]/10 text-[#FF8A4C]',
    green:   'border-emerald-500/30 bg-emerald-500/[0.08] text-emerald-400',
    red:     'border-red-500/30 bg-red-500/[0.08] text-red-400',
    amber:   'border-amber-500/30 bg-amber-500/[0.08] text-amber-400',
    muted:   'border-white/[0.06] text-white/40',
    live:    'border-red-500/50 bg-red-500/15 text-red-300',
  };
  return (
    <span className={cx(
      'inline-flex items-center gap-1 px-1.5 py-[2px] border text-[10px] font-mono leading-none rounded-[3px]',
      tones[tone],
    )}>
      {pulse && <span className="relative flex h-1.5 w-1.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75" />
        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-current" />
      </span>}
      {children}
    </span>
  );
};

export const Label = ({ children, className = '' }) => (
  <div className={cx('text-[10px] font-mono tracking-[0.06em] uppercase text-white/40', className)}>{children}</div>
);

// Section card. Borders use a thin Flyers-orange stroke instead of the
// neutral white tint so the panels feel brand-aligned without painting
// the surface (low-opacity orange FILLS perceive as brown on dark — only
// 1px STROKES preserve the orange hue cleanly).
export const Section = ({ title, action, children, className = '' }) => (
  <div className={cx('border border-[#F74902]/[0.18] bg-[#0C0C0C]/60 rounded-md backdrop-blur-sm', className)}>
    {(title || action) && (
      <div className="flex items-center justify-between px-3.5 h-8 border-b border-[#F74902]/[0.25]">
        <span className="text-[11px] font-medium text-white/85 tracking-tight">{title}</span>
        {action}
      </div>
    )}
    {children}
  </div>
);

// Big section divider used to break the Dashboard into "TONIGHT", "SEASON",
// "RECENT FORM" zones. The colored left bar gives each band a clear visual
// identity and (importantly) tells the user *what* they are about to look at.
const BAND_COLORS = {
  orange:  { bar: 'bg-[#F74902]', text: 'text-[#FF8A4C]' },
  emerald: { bar: 'bg-emerald-500', text: 'text-emerald-300' },
  amber:   { bar: 'bg-amber-500', text: 'text-amber-300' },
  sky:     { bar: 'bg-sky-500', text: 'text-sky-300' },
  violet:  { bar: 'bg-violet-500', text: 'text-violet-300' },
  muted:   { bar: 'bg-white/30', text: 'text-white/55' },
};

export const SectionBand = ({ label, color = 'orange', sub, action, count }) => {
  const c = BAND_COLORS[color] || BAND_COLORS.orange;
  return (
    <div className="flex items-center gap-3 pt-2">
      <span className={cx('w-1 h-5 rounded-sm shrink-0', c.bar)} />
      <span className={cx('text-[12px] font-semibold uppercase tracking-[0.18em]', c.text)}>{label}</span>
      {count != null && (
        <span className={cx('text-[10px] font-mono px-1.5 py-[1px] rounded-[3px] border border-current/30', c.text)}>
          {count}
        </span>
      )}
      {sub && <span className="text-[10px] font-mono text-white/35 uppercase tracking-wider">{sub}</span>}
      <span className="flex-1 h-px bg-gradient-to-r from-white/[0.08] via-white/[0.04] to-transparent" />
      {action}
    </div>
  );
};

export const Delta = ({ value, suffix = '', neutral = false }) => {
  const isUp = value > 0, isDown = value < 0;
  const color = neutral ? 'text-white/50' : isUp ? 'text-emerald-400' : isDown ? 'text-red-400' : 'text-white/50';
  const Icon = isUp ? ArrowUp : isDown ? ArrowDown : Minus;
  return (
    <span className={cx('inline-flex items-center gap-0.5 text-[11px] font-mono tabular-nums', color)}>
      <Icon size={10} strokeWidth={2.5} />
      {Math.abs(value)}{suffix}
    </span>
  );
};

// Score readout. `reverse` flips the visual order (use when PHI is home — the
// scoreboard convention is away-left, home-right). The Flyers number stays
// orange when winning regardless of which side it's rendered on.
export const ScoreReadout = ({ us, them, reverse = false }) => {
  const usFlash = useFlashOnChange(us);
  const themFlash = useFlashOnChange(them);
  const usWinning = us >= them;
  const usEl = (
    <span className={cx(
      'text-[44px] font-semibold tabular-nums tracking-tight inline-block',
      usWinning ? 'text-[#FF8A4C]' : 'text-white/70',
      usFlash,
    )}>{us}</span>
  );
  const themEl = (
    <span className={cx(
      'text-[44px] font-semibold tabular-nums tracking-tight inline-block',
      !usWinning && them > us ? 'text-white' : 'text-white/70',
      themFlash,
    )}>{them}</span>
  );
  return (
    <div className="flex items-baseline gap-3 justify-center">
      {reverse ? themEl : usEl}
      <span className="text-[24px] text-white/25">–</span>
      {reverse ? usEl : themEl}
    </div>
  );
};

export const Skeleton = ({ className = '', height = 20 }) => (
  <div
    className={cx('rounded-[3px] bg-white/[0.04] animate-pulse', className)}
    style={{ height }}
  />
);
