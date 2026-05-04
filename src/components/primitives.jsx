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

export const Section = ({ title, action, children, className = '' }) => (
  <div className={cx('border border-white/[0.06] bg-[#0C0C0C]/60 rounded-md backdrop-blur-sm', className)}>
    {(title || action) && (
      <div className="flex items-center justify-between px-4 h-10 border-b border-white/[0.05]">
        <span className="text-[11px] font-medium text-white/80 tracking-tight">{title}</span>
        {action}
      </div>
    )}
    {children}
  </div>
);

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

export const ScoreReadout = ({ us, them }) => {
  const usFlash = useFlashOnChange(us);
  const themFlash = useFlashOnChange(them);
  return (
    <div className="flex items-baseline gap-3 justify-center">
      <span className={cx(
        'text-[44px] font-semibold tabular-nums tracking-tight inline-block',
        us >= them ? 'text-[#FF8A4C]' : 'text-white/70',
        usFlash,
      )}>{us}</span>
      <span className="text-[24px] text-white/25">–</span>
      <span className={cx(
        'text-[44px] font-semibold tabular-nums tracking-tight inline-block',
        them > us ? 'text-white' : 'text-white/70',
        themFlash,
      )}>{them}</span>
    </div>
  );
};

export const Skeleton = ({ className = '', height = 20 }) => (
  <div
    className={cx('rounded-[3px] bg-white/[0.04] animate-pulse', className)}
    style={{ height }}
  />
);
