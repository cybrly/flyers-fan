import { DollarSign, ExternalLink } from 'lucide-react';
import { cx } from '../config.js';
import { getTeamContracts, fmtMillions, fmtCapPct, SALARY_CAP_CEILING } from '../data/playerContracts.js';
import { TEAM_ABBR } from '../config.js';

// Contract card on the Player Profile hero. Two states mirror the
// signature panel pattern: render the curated terms when present,
// otherwise a clean placeholder explaining the data lives in
// playerContracts.js and how to populate it.
//
// Always disclaims source attribution — PuckPedia is the authoritative
// public source even though we can't fetch it directly. Linking back to
// their player page is the right thing for users who want the deeper
// breakdown (year-by-year salary, signing bonuses, NTC team lists).

const slugify = (name) => (name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const Stat = ({ label, value, tone }) => (
  <div className="border border-white/[0.05] rounded bg-white/[0.02] px-2.5 py-2">
    <div className="text-[9px] font-mono text-white/40 uppercase tracking-wider">{label}</div>
    <div className={cx('text-[14px] font-mono tabular-nums mt-0.5 font-medium',
      tone === 'orange' ? 'text-[#FF8A4C]'
      : tone === 'amber' ? 'text-amber-300'
      : tone === 'sky' ? 'text-sky-300'
      : 'text-white/85',
    )}>{value}</div>
  </div>
);

export const ContractPanel = ({ playerId, fullName }) => {
  const c = (() => {
    const contracts = getTeamContracts(TEAM_ABBR);
    if (!contracts.length || !fullName) return null;
    const name = fullName.toLowerCase().trim();
    const lastName = name.split(' ').pop();
    // Try exact match first, then last-name match
    return contracts.find((ct) => (ct.name || '').toLowerCase() === name)
      || contracts.find((ct) => (ct.name || '').toLowerCase().endsWith(lastName))
      || null;
  })();
  const puckpediaUrl = `https://puckpedia.com/player/${slugify(fullName)}`;

  return (
    <div className="border border-white/[0.08] bg-[#0C0C0C]/60 rounded-md p-4">
      <div className="flex items-center gap-2 mb-3">
        <DollarSign size={12} className="text-white/55" />
        <span className="text-[10px] font-mono text-white/55 uppercase tracking-wider">Contract</span>
        <a
          href={puckpediaUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto inline-flex items-center gap-1 text-[10px] font-mono text-white/45 hover:text-white"
          title="Open on PuckPedia"
        >
          PuckPedia <ExternalLink size={9} />
        </a>
      </div>

      {c ? (
        <div className="space-y-2.5">
          {/* Headline AAV + cap-hit % */}
          <div className="flex items-baseline gap-3">
            <span className="text-[28px] font-semibold tabular-nums tracking-tight text-[#FF8A4C] leading-none">
              {fmtMillions(c.aav ?? c.capHit)}
            </span>
            <span className="text-[11px] font-mono text-white/45">AAV</span>
            {c.capHitPct != null && (
              <span className="ml-auto text-[11px] font-mono text-white/55 tabular-nums">
                {fmtCapPct(c.capHitPct)} <span className="text-white/30">of cap</span>
              </span>
            )}
          </div>

          {/* Term + years remaining */}
          <div className="grid grid-cols-2 gap-2">
            {c.termYears != null && (
              <Stat label="Term" value={`${c.termYears} yr${c.termYears === 1 ? '' : 's'}`} />
            )}
            {c.yearsLeft != null && (
              <Stat label="Yrs Left" value={c.yearsLeft} tone={c.yearsLeft === 1 ? 'amber' : 'sky'} />
            )}
            {c.totalValue != null && (
              <Stat label="Total" value={fmtMillions(c.totalValue)} />
            )}
            {c.endYear != null && (
              <Stat label="Expires" value={`${String(c.endYear).slice(2)}–${String(c.endYear + 1).slice(2)}`} />
            )}
          </div>

          {/* Clauses + status row */}
          {(c.clauseType || c.expiryStatus || c.contractType) && (
            <div className="flex items-center flex-wrap gap-1.5 pt-2 border-t border-white/[0.05]">
              {c.contractType && (
                <span className="px-1.5 h-5 inline-flex items-center text-[9px] font-mono font-semibold uppercase tracking-wider rounded border border-white/[0.10] text-white/65">
                  {c.contractType}
                </span>
              )}
              {c.clauseType && (
                <span
                  title={c.clauseDetail || ''}
                  className={cx(
                    'px-1.5 h-5 inline-flex items-center text-[9px] font-mono font-semibold uppercase tracking-wider rounded border',
                    c.clauseType === 'NMC' ? 'border-amber-500/45 bg-amber-500/[0.10] text-amber-300'
                    : c.clauseType === 'NTC' ? 'border-orange-500/40 bg-orange-500/[0.08] text-orange-300'
                    : 'border-sky-400/40 bg-sky-400/[0.08] text-sky-300',
                  )}
                >
                  {c.clauseType}
                </span>
              )}
              {c.expiryStatus && (
                <span className="px-1.5 h-5 inline-flex items-center text-[9px] font-mono font-semibold uppercase tracking-wider rounded border border-white/[0.10] text-white/55">
                  → {c.expiryStatus}
                </span>
              )}
            </div>
          )}

          {c.updated && (
            <div className="text-[9px] font-mono text-white/30 pt-1">
              Source: PuckPedia · last verified {c.updated}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2.5">
          <div className="rounded bg-white/[0.02] border border-dashed border-white/[0.08] p-5 flex flex-col items-center justify-center gap-1.5 min-h-[100px]">
            <DollarSign size={18} className="text-white/25" />
            <span className="text-[11px] font-mono text-white/45">No contract on file</span>
          </div>
          <div className="text-[10px] font-mono text-white/40 leading-relaxed">
            Contract terms are hand-curated from PuckPedia. Click the link above
            to view this player's deal there — entries appear here as they're
            added to the dataset.
          </div>
        </div>
      )}
    </div>
  );
};

export { SALARY_CAP_CEILING };
