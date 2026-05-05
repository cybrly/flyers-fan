import { cx, TEAM_ABBR, fmtTime, isLive, isFuture, isFinal } from '../config.js';
import { Chip } from './primitives.jsx';
import { TeamLogo } from './Logo.jsx';

// Around-the-league tonight strip. Renders all of today's NHL games as compact
// tiles with live scores, period/clock, and playoff series context. Tiles flow
// left-to-right; on narrow viewports they stack into a 2-up grid. Flyers games
// get the orange treatment so they pop in the row.
export const Scoreboard = ({ data }) => {
  if (!data?.games?.length) return null;
  const games = [...data.games].sort((a, b) => {
    // Live games first, then upcoming, then finals — keeps the most exciting
    // content at the front of the strip.
    const score = (g) => isLive(g.state) ? 0 : isFuture(g.state) ? 1 : 2;
    return score(a) - score(b) || (a.startUTC || '').localeCompare(b.startUTC || '');
  });

  return (
    <div className="border border-white/[0.06] bg-[#0C0C0C]/60 rounded-md overflow-hidden">
      <div className="px-4 h-9 flex items-center justify-between border-b border-white/[0.05]">
        <span className="text-[11px] font-medium text-white/80 tracking-tight">Around the League · Tonight</span>
        <span className="text-[10px] font-mono text-white/40">{games.length} game{games.length === 1 ? '' : 's'}</span>
      </div>
      {/* auto-fit + minmax means each tile gets at least 240px and expands
          to fill remaining track space, with empty tracks collapsing rather
          than rendering as blank cells. So 1 game = 1 wide tile (no dead
          rectangle to its right), 12 games wrap into rows of 4–5. */}
      <div
        className="grid gap-px bg-white/[0.05]"
        style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}
      >
        {games.map((g) => <ScoreTile key={g.id} g={g} />)}
      </div>
    </div>
  );
};

const ScoreTile = ({ g }) => {
  const live = isLive(g.state);
  const final = isFinal(g.state);
  const future = isFuture(g.state);
  const hasUs = g.away.abbr === TEAM_ABBR || g.home.abbr === TEAM_ABBR;

  const status = live
    ? `P${g.period?.number || '?'} · ${g.clock?.timeRemaining || ''}`
    : final
      ? `Final${g.period?.periodType === 'OT' ? ' · OT' : g.period?.periodType === 'SO' ? ' · SO' : ''}`
      : future
        ? fmtTime(g.startUTC)
        : g.state || '—';

  const winner = (final && g.away.score != null && g.home.score != null)
    ? (g.away.score > g.home.score ? 'away' : 'home')
    : null;

  return (
    <div className={cx(
      'p-3 transition-colors',
      hasUs ? 'bg-[#F74902]/[0.06] hover:bg-[#F74902]/[0.10]' : 'bg-[#0A0A0A] hover:bg-[#0F0F0F]'
    )}>
      <div className="flex items-center justify-between mb-2">
        <span className={cx(
          'text-[9px] font-mono uppercase tracking-wider',
          live ? 'text-red-400' : final ? 'text-white/40' : 'text-white/55'
        )}>
          {live && <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse mr-1 align-middle" />}
          {status}
        </span>
        {g.series && (
          <span className="text-[9px] font-mono text-[#FF8A4C]/70">
            R{g.series.round} · G{g.series.gameNum}
          </span>
        )}
      </div>

      <TeamRow t={g.away} dim={winner === 'home'} bold={winner === 'away'} />
      <TeamRow t={g.home} dim={winner === 'away'} bold={winner === 'home'} />

      {g.series && (g.series.top.wins > 0 || g.series.bottom.wins > 0) && (
        <div className="mt-1.5 pt-1.5 border-t border-white/[0.04] flex items-center justify-between text-[9px] font-mono text-white/40">
          <span>Series</span>
          <span className="tabular-nums">
            <span className={g.series.top.abbr === TEAM_ABBR ? 'text-[#FF8A4C]' : ''}>{g.series.top.abbr} {g.series.top.wins}</span>
            <span className="text-white/25 mx-1">–</span>
            <span className={g.series.bottom.abbr === TEAM_ABBR ? 'text-[#FF8A4C]' : ''}>{g.series.bottom.wins} {g.series.bottom.abbr}</span>
          </span>
        </div>
      )}
    </div>
  );
};

const TeamRow = ({ t, dim, bold }) => {
  const isUs = t.abbr === TEAM_ABBR;
  return (
    <div className="flex items-center gap-2 py-0.5">
      <TeamLogo abbr={t.abbr} size={18} />
      <span className={cx('flex-1 text-[12px] font-mono',
        bold ? 'text-white font-medium' : dim ? 'text-white/45' : 'text-white/80',
        isUs && 'text-[#FF8A4C]'
      )}>{t.abbr}</span>
      <span className={cx('text-[15px] font-mono tabular-nums',
        bold || isUs ? 'text-white font-semibold' : dim ? 'text-white/45' : 'text-white/65',
        isUs && bold && 'text-[#FF8A4C]'
      )}>
        {t.score != null ? t.score : '—'}
      </span>
    </div>
  );
};
