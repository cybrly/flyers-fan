import { cx, TEAM_ABBR, fmtTime, isLive, isFuture, isFinal } from '../config.js';
import { isStaleAsOf } from '../lib/hockey.js';
import { TeamLogo } from './Logo.jsx';

// Around-the-league ticker — single thin horizontal row of compact game pills
// that scrolls horizontally when the night is busy. Lives at the very bottom
// of the dashboard, not at the top, so league-wide info doesn't crowd out
// Flyers content. Each pill compresses to: live indicator · away abbr +
// score · final score · home abbr + score · status. PHI tile stays warm-tinted.
export const Scoreboard = ({ data }) => {
  if (!data?.games?.length) return null;
  const games = [...data.games].sort((a, b) => {
    // Sort: PHI first if present, then live, then upcoming by start time,
    // then finals. Keeps the eye-catching stuff at the front of the ticker.
    const isUs = (g) => g.away.abbr === TEAM_ABBR || g.home.abbr === TEAM_ABBR;
    const phase = (g) => isLive(g.state) ? 1 : isFuture(g.state) ? 2 : 3;
    if (isUs(a) !== isUs(b)) return isUs(a) ? -1 : 1;
    return phase(a) - phase(b) || (a.startUTC || '').localeCompare(b.startUTC || '');
  });

  // Label the ticker honestly. In the offseason the NHL scoreboard pins to the
  // last game played (e.g. a June Cup Final), so "Tonight" would be a lie — if
  // nothing is live and the newest game is days old, call it "Recent".
  const anyLive = games.some((g) => isLive(g.state));
  const newest = games.reduce((m, g) => ((g.startUTC || '') > m ? g.startUTC : m), '');
  const tickerLabel = anyLive ? 'League · Live' : isStaleAsOf(newest) ? 'League · Recent' : 'League · Tonight';

  return (
    <div className="border border-[var(--team-primary)]/[0.18] bg-[#0C0C0C]/40 rounded-md overflow-hidden">
      <div className="flex items-stretch">
        <div className="shrink-0 px-3 flex items-center gap-2 border-r border-white/[0.05] bg-white/[0.02]">
          <span className="text-[9px] font-mono uppercase tracking-[0.18em] text-white/45">
            {tickerLabel}
          </span>
          <span className="text-[10px] font-mono text-white/30 tabular-nums">{games.length}</span>
        </div>
        <div className="flex-1 min-w-0 overflow-x-auto" style={{ scrollbarWidth: 'thin' }}>
          <div className="flex items-stretch divide-x divide-white/[0.04]">
            {games.map((g) => <TickerPill key={g.id} g={g} />)}
          </div>
        </div>
      </div>
    </div>
  );
};

const TickerPill = ({ g }) => {
  const live = isLive(g.state);
  const final = isFinal(g.state);
  const future = isFuture(g.state);
  const hasUs = g.away.abbr === TEAM_ABBR || g.home.abbr === TEAM_ABBR;

  const status = live
    ? `P${g.period?.number || '?'} ${g.clock?.timeRemaining || ''}`.trim()
    : final
      ? `F${g.period?.periodType === 'OT' ? '/OT' : g.period?.periodType === 'SO' ? '/SO' : ''}`
      : future
        ? fmtTime(g.startUTC)
        : '—';

  const winner = (final && g.away.score != null && g.home.score != null)
    ? (g.away.score > g.home.score ? 'away' : 'home')
    : null;

  return (
    <div
      className={cx(
        'shrink-0 px-3 h-10 flex items-center gap-2 transition-colors whitespace-nowrap',
        hasUs ? 'bg-[var(--team-primary)]/[0.07] hover:bg-[var(--team-primary)]/[0.12]' : 'hover:bg-white/[0.025]',
      )}
    >
      <span
        className={cx(
          'text-[9px] font-mono uppercase tracking-wider w-[36px] shrink-0',
          live ? 'text-red-400' : final ? 'text-white/35' : 'text-sky-300/70',
        )}
      >
        {live && <span className="inline-block w-1 h-1 rounded-full bg-red-400 animate-pulse mr-1 align-middle" />}
        {status}
      </span>
      <TeamCell t={g.away} dim={winner === 'home'} bold={winner === 'away'} />
      <span className="text-[11px] font-mono text-white/25">·</span>
      <TeamCell t={g.home} dim={winner === 'away'} bold={winner === 'home'} />
      {g.series && (
        <span className="text-[8px] font-mono text-[var(--team-accent)]/60 ml-1 shrink-0">
          G{g.series.gameNum}
        </span>
      )}
    </div>
  );
};

const TeamCell = ({ t, dim, bold }) => {
  const isUs = t.abbr === TEAM_ABBR;
  return (
    <span className="flex items-center gap-1.5">
      <TeamLogo abbr={t.abbr} size={14} />
      <span
        className={cx(
          'text-[11px] font-mono tabular-nums tracking-tight',
          bold ? 'text-white font-medium' : dim ? 'text-white/40' : 'text-white/75',
          isUs && (bold ? 'text-[var(--team-accent)]' : 'text-[var(--team-accent)]/85'),
        )}
      >
        {t.abbr}
      </span>
      <span
        className={cx(
          'text-[12px] font-mono tabular-nums',
          bold || isUs ? 'text-white' : dim ? 'text-white/35' : 'text-white/55',
          isUs && bold && 'text-[var(--team-accent)]',
        )}
      >
        {t.score != null ? t.score : '—'}
      </span>
    </span>
  );
};
