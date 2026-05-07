import { PenLine, ExternalLink } from 'lucide-react';
import { getSignature } from '../data/playerSignatures.js';

// Reference signature for a player, shown in the Player Profile hero.
// Two states:
//   • Found: render the curated SVG/PNG with a "for reference only"
//     disclaimer + attribution + a link back to the source. Critical
//     framing — we are NOT an authentication service. Real PSA/JSA-grade
//     auth requires hands-on examination.
//   • Missing: clean placeholder explaining the panel exists and how
//     entries get added (so users don't think it's broken).

export const SignaturePanel = ({ playerId, fullName }) => {
  const sig = getSignature(playerId);

  return (
    <div className="border border-white/[0.08] bg-[#0C0C0C]/60 rounded-md p-4">
      <div className="flex items-center gap-2 mb-3">
        <PenLine size={12} className="text-white/55" />
        <span className="text-[10px] font-mono text-white/55 uppercase tracking-wider">
          Reference Signature
        </span>
      </div>

      {sig ? (
        <div className="space-y-3">
          <div className="rounded bg-white/[0.04] border border-white/[0.05] p-4 flex items-center justify-center min-h-[120px]">
            <img
              src={sig.url}
              alt={`${fullName} signature`}
              className="max-h-[120px] max-w-full object-contain invert opacity-90"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          </div>
          <div className="text-[10px] font-mono text-white/40 leading-relaxed">
            <div>
              Source: {sig.sourceUrl ? (
                <a href={sig.sourceUrl} target="_blank" rel="noopener noreferrer"
                  className="text-white/65 hover:text-white inline-flex items-center gap-1">
                  {sig.source} <ExternalLink size={9} />
                </a>
              ) : (
                <span className="text-white/65">{sig.source}</span>
              )}
              {sig.license && <> · {sig.license}</>}
            </div>
            {sig.notes && <div className="mt-1">{sig.notes}</div>}
          </div>
          <div className="border-t border-white/[0.05] pt-2 text-[10px] font-mono text-amber-400/80 leading-relaxed">
            For reference only. Authenticating signed merchandise requires
            hands-on examination by a service like PSA/DNA or JSA — comparing
            against an image is a starting point, not a verdict.
          </div>
        </div>
      ) : (
        <div className="space-y-2.5">
          <div className="rounded bg-white/[0.02] border border-dashed border-white/[0.08] p-6 flex flex-col items-center justify-center gap-2 min-h-[120px]">
            <PenLine size={20} className="text-white/25" />
            <span className="text-[11px] font-mono text-white/45">No signature on file</span>
          </div>
          <div className="text-[10px] font-mono text-white/40 leading-relaxed">
            We hand-curate signatures from clearly licensed sources (typically
            Wikipedia Commons). When this player's is added, the reference
            image appears here.
          </div>
        </div>
      )}
    </div>
  );
};
