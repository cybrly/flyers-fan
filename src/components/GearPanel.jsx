import { Wrench, ExternalLink } from 'lucide-react';
import { Section } from './primitives.jsx';
import { getGear, getGearLabels } from '../data/playerGear.js';

// Player gear loadout — sourced from PuckPedia / GearGeek.com.
// Renders six fields in a 2- or 3-column grid: Stick / Skates / Gloves /
// Helmet / Pants / Visor for skaters, or Stick / Skates / Pads / Glove /
// Blocker / Mask for goalies.
//
// Brand families show up enough times across the team that we color-tag
// the most common ones (Bauer, CCM, Warrior, TRUE) for quick scanning.

const BRAND_TONE = {
  Bauer:   'text-amber-300',
  CCM:     'text-red-300',
  Warrior: 'text-sky-300',
  TRUE:    'text-emerald-300',
  Oakley:  'text-white/65',
};

const detectBrand = (str) => {
  if (!str) return null;
  return Object.keys(BRAND_TONE).find((b) => str.toLowerCase().startsWith(b.toLowerCase())) || null;
};

const GearItem = ({ label, value }) => {
  const brand = detectBrand(value);
  const tone = brand ? BRAND_TONE[brand] : 'text-white/75';
  return (
    <div className="border border-white/[0.05] rounded bg-white/[0.02] px-3 py-2.5">
      <div className="text-[9px] font-mono text-white/40 uppercase tracking-wider">{label}</div>
      {value
        ? <div className={`text-[12px] font-medium mt-0.5 ${tone}`}>{value}</div>
        : <div className="text-[12px] text-white/30 mt-0.5">—</div>}
    </div>
  );
};

export const GearPanel = ({ playerId }) => {
  const gear = getGear(playerId);
  if (!gear) return null;

  const labels = getGearLabels(gear.kind);
  const fields = gear.kind === 'goalie'
    ? [gear.stick, gear.skates, gear.pads, gear.glove, gear.blocker, gear.mask]
    : [gear.stick, gear.skates, gear.gloves, gear.helmet, gear.pants, gear.visor];

  return (
    <Section
      title="Gear Loadout"
      action={
        <a
          href="https://geargeek.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[10px] font-mono text-white/40 hover:text-white/70"
        >
          via GearGeek <ExternalLink size={9} />
        </a>
      }
    >
      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Wrench size={11} className="text-white/45" />
          <span className="text-[11px] font-mono text-white/55">
            {gear.kind === 'goalie' ? 'Goaltender setup' : 'Skater setup'}
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {labels.map((label, i) => (
            <GearItem key={label} label={label} value={fields[i]} />
          ))}
        </div>
      </div>
    </Section>
  );
};
