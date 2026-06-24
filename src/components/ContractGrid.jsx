import { useMemo } from 'react';
import { cx } from '../config.js';
import { Section } from './primitives.jsx';
import { Headshot } from './Headshot.jsx';
import { PlayerLink } from './PlayerLink.jsx';
import { getTeamContracts, fmtMillions } from '../data/playerContracts.js';
import { useTeam } from '../teamContext.jsx';

// PuckPedia-style year-by-year contract grid for the Roster page.
// Each row: player ▸ 5 season columns (current + next 4) ▸ expiry
// status badge. Cap hits come from PLAYER_CONTRACTS — flat AAV by
// default, with `yearByYear` overrides for stepped deals (e.g. Dvorak).
//
// Players without a contract on file render with em-dashes so missing
// data is visually obvious without breaking the table layout.

const FIRST_SEASON = 2025; // current season starts in this calendar year

const seasonHeader = (yearStart) => `${String(yearStart).slice(2)}–${String(yearStart + 1).slice(2)}`;

// Compute the cap hit for `player` in season starting at `yearStart`.
// Returns { kind: 'paid', amount } | { kind: 'expired' } | { kind: 'none' }
const cellFor = (contract, yearStart) => {
  if (!contract) return { kind: 'none' };
  const offset = yearStart - FIRST_SEASON;
  const left = contract.yearsLeft || 0;
  if (offset < 0 || offset >= left) {
    // Expiry hits in the season immediately after the last paid year.
    if (offset === left && contract.expiryStatus) {
      return { kind: 'expired', status: contract.expiryStatus };
    }
    return { kind: 'none' };
  }
  // Use per-year override if defined, otherwise flat AAV.
  const amount = contract.yearByYear?.[offset] ?? contract.capHit ?? contract.aav;
  return { kind: 'paid', amount };
};

const Cell = ({ cell, isFirst }) => {
  if (cell.kind === 'paid') {
    return (
      <span className={cx('text-[12px] font-mono tabular-nums',
        isFirst ? 'text-[var(--team-accent)] font-semibold' : 'text-white/85',
      )}>{fmtMillions(cell.amount)}</span>
    );
  }
  if (cell.kind === 'expired') {
    return (
      <span className={cx(
        'inline-flex items-center justify-center px-1.5 h-5 text-[9px] font-mono font-semibold uppercase tracking-wider rounded border',
        cell.status === 'UFA' ? 'border-amber-500/40 bg-amber-500/[0.08] text-amber-300'
          : 'border-sky-400/40 bg-sky-400/[0.08] text-sky-300',
      )}>{cell.status}</span>
    );
  }
  return <span className="text-white/20 text-[12px]">—</span>;
};

const Row = ({ player, contract, seasons }) => (
  <div className="grid grid-cols-[44px_1fr_repeat(5,minmax(74px,1fr))_56px] items-center gap-2 px-3 h-12 border-b border-white/[0.04] last:border-b-0 hover:bg-white/[0.02]">
    <Headshot src={player.headshot} num={player.num} size={32} />
    <div className="min-w-0 flex items-center gap-2">
      <PlayerLink playerId={player.id} className="text-[13px] truncate hover:text-white text-white/85">
        {player.name}
      </PlayerLink>
      <span className="text-[10px] font-mono text-white/30 shrink-0">#{player.num} · {player.pos}</span>
    </div>
    {seasons.map((y, i) => (
      <div key={y} className="text-right tabular-nums">
        <Cell cell={cellFor(contract, y)} isFirst={i === 0} />
      </div>
    ))}
    <div className="text-right">
      {contract?.expiryStatus
        ? (
          <span className={cx(
            'inline-flex items-center justify-center px-1.5 h-5 text-[9px] font-mono font-semibold uppercase tracking-wider rounded border',
            contract.expiryStatus === 'UFA' ? 'border-amber-500/40 bg-amber-500/[0.08] text-amber-300'
              : 'border-sky-400/40 bg-sky-400/[0.08] text-sky-300',
          )}>{contract.expiryStatus}</span>
        )
        : <span className="text-white/20 text-[10px]">—</span>}
    </div>
  </div>
);

const Group = ({ title, players, totals, seasons, color }) => {
  if (players.length === 0) return null;
  return (
    <div>
      <div className="grid grid-cols-[44px_1fr_repeat(5,minmax(74px,1fr))_56px] items-center gap-2 px-3 py-2 border-y border-white/[0.05] bg-white/[0.015]">
        <span />
        <div className="flex items-center gap-2">
          <span className={cx('w-1.5 h-1.5 rounded-full', color)} />
          <span className="text-[11px] font-mono text-white/65 uppercase tracking-wider">{title}</span>
          <span className="text-[10px] font-mono text-white/35">{players.length}</span>
        </div>
        {totals.map((t, i) => (
          <span key={i} className="text-[11px] font-mono tabular-nums text-white/55 text-right hidden md:inline">
            {fmtMillions(t)}
          </span>
        ))}
        <span />
      </div>
      <div>
        {players.map(({ player, contract }) => (
          <Row key={player.id} player={player} contract={contract} seasons={seasons} />
        ))}
      </div>
    </div>
  );
};

export const ContractGrid = ({ roster }) => {
  const { teamAbbr } = useTeam();
  const seasons = useMemo(
    () => Array.from({ length: 5 }, (_, i) => FIRST_SEASON + i),
    [],
  );

  const groups = useMemo(() => {
    if (!roster) return null;
    const teamContracts = getTeamContracts(teamAbbr);
    // Match roster players to contract data by name or jersey number
    const findContract = (p) => {
      const name = (p.fullName || p.name || '').toLowerCase();
      const num = String(p.num || '');
      return teamContracts.find((c) => {
        const cName = (c.name || '').toLowerCase();
        if (cName && name && (cName === name || name.includes(cName) || cName.includes(name))) return true;
        if (num && c.num === num) return true;
        return false;
      }) || null;
    };
    const tag = (list) => list.map((p) => ({ player: p, contract: findContract(p) }));
    const sortByCap = (a, b) => (b.contract?.capHit || 0) - (a.contract?.capHit || 0);
    const fwd = tag(roster.forwards || []).sort(sortByCap);
    const def = tag(roster.defense  || []).sort(sortByCap);
    const goa = tag(roster.goalies  || []).sort(sortByCap);
    return { fwd, def, goa };
  }, [roster, teamAbbr]);

  const totalsForSeason = (entries, yearStart) => {
    return entries.reduce((sum, { contract }) => {
      const c = cellFor(contract, yearStart);
      return sum + (c.kind === 'paid' ? c.amount : 0);
    }, 0);
  };

  if (!groups) return null;

  return (
    <Section
      title="Year-by-Year Contracts"
      action={<span className="text-[10px] font-mono text-white/40 uppercase tracking-wider">via PuckPedia · current + next 4</span>}
    >
      {/* Header */}
      <div className="grid grid-cols-[44px_1fr_repeat(5,minmax(74px,1fr))_56px] items-center gap-2 px-3 h-9 border-b border-white/[0.05] text-[10px] font-mono text-white/40 uppercase tracking-wider">
        <span></span>
        <span>Player</span>
        {seasons.map((y) => <span key={y} className="text-right">{seasonHeader(y)}</span>)}
        <span className="text-right">Status</span>
      </div>

      <div className="overflow-x-auto">
        <Group
          title="Forwards"
          color="bg-[var(--team-accent)]"
          players={groups.fwd}
          seasons={seasons}
          totals={seasons.map((y) => totalsForSeason(groups.fwd, y))}
        />
        <Group
          title="Defence"
          color="bg-sky-400/80"
          players={groups.def}
          seasons={seasons}
          totals={seasons.map((y) => totalsForSeason(groups.def, y))}
        />
        <Group
          title="Goaltenders"
          color="bg-emerald-400/80"
          players={groups.goa}
          seasons={seasons}
          totals={seasons.map((y) => totalsForSeason(groups.goa, y))}
        />
      </div>

      <div className="px-3 py-2 border-t border-white/[0.05] text-[10px] font-mono text-white/35 leading-relaxed">
        Cap-hit values shown per season. UFA / RFA badges mark the expiry year — empty cells mean the contract has already ended or hasn't started for that player. Refresh after major roster moves.
      </div>
    </Section>
  );
};
