// Curated player contract data — used by the ContractPanel on Player
// Profile and the Salary Cap rollup on Roster.
//
// PuckPedia / CapWages don't offer a free public API and their pages are
// Cloudflare-protected, so this is hand-maintained. Read the data off
// PuckPedia's public pages and paste it here. Don't ship a scraped feed
// (their ToS forbids it) — manual curation for personal viewing is fine.
//
// Source pages used to populate:
//   • https://puckpedia.com/team/philadelphia-flyers
//   • https://puckpedia.com/player/{slug}
//
// Shape — every field optional, render gracefully if missing:
//   {
//     [playerId]: {
//       capHit:      number,    // current-season AAV in dollars (e.g. 6_500_000)
//       capHitPct:   number,    // capHit / leagueCap, decimal (e.g. 0.072)
//       aav:         number,    // contract AAV (usually same as capHit)
//       termYears:   number,    // total years on contract
//       yearsLeft:   number,    // years remaining including current
//       startYear:   number,    // first season (e.g. 2024 for 2024-25)
//       endYear:     number,    // last season (e.g. 2030 for 2030-31)
//       totalValue:  number,    // total contract value in dollars
//       signingBonus: number,   // current-year signing bonus
//       baseSalary:  number,    // current-year actual base salary
//       contractType: 'ELC' | 'STD' | 'EXT' | '35+',
//       clauseType:  'NMC' | 'M-NTC' | 'NTC' | null,  // no-move/no-trade
//       clauseDetail: 'string',  // e.g. "10-team list"
//       expiryStatus: 'UFA' | 'RFA' | null, // status when deal expires
//       acquiredVia:  'Draft' | 'Trade' | 'FA' | 'Waivers',
//       agency:       'string', // representation
//       updated:      '2026-05-07', // ISO date you last refreshed
//     }
//   }
//
// Add entries as you have time — the UI handles partial data and the
// missing-data placeholder renders cleanly for unpopulated players.

// 2025–26 NHL salary cap ceiling per CBA. Update each summer.
export const SALARY_CAP_CEILING = 95_500_000;
export const SALARY_CAP_FLOOR   = 70_600_000;

// Team-level numbers from PuckPedia, last verified 2026-05-07.
export const TEAM_CAP = {
  projectedCapHit:   88_412_646,
  projectedCapSpace:  7_087_354,
  annualCapHit:      88_288_095,
  ltirPool:                   0,
  potentialBonuses:   3_792_500,
  bonusOverages:              0,
  retainedRemaining: { used: 1, max: 3 },
  activeRoster:      { count: 25, max: 23 },  // includes inj. exceptions
  standardContracts: { count: 48, max: 50 },
};

const cap = (n) => ({ capHit: n, capHitPct: n / SALARY_CAP_CEILING, aav: n });

export const PLAYER_CONTRACTS = {
  // ── Forwards ────────────────────────────────────────────────────────
  8478439: { // Travis Konecny — RW · #11 · A
    ...cap(8_750_000), termYears: 8, yearsLeft: 8, endYear: 2032,
    expiryStatus: 'UFA', updated: '2026-05-07',
  },
  8476461: { // Sean Couturier — C · #14 · A
    ...cap(7_750_000), termYears: 5, yearsLeft: 5, endYear: 2029,
    expiryStatus: 'UFA', updated: '2026-05-07',
  },
  8480015: { // Owen Tippett — RW · #74
    ...cap(6_200_000), termYears: 7, yearsLeft: 7, endYear: 2031,
    expiryStatus: 'UFA', updated: '2026-05-07',
  },
  8481533: { // Trevor Zegras — C · #46
    ...cap(5_750_000), termYears: 1, yearsLeft: 1, endYear: 2025,
    expiryStatus: 'RFA', updated: '2026-05-07',
  },
  8477989: { // Christian Dvorak — C · #22
    ...cap(5_400_000), termYears: 6, yearsLeft: 6, endYear: 2030,
    expiryStatus: 'UFA', updated: '2026-05-07',
  },
  8480220: { // Noah Cates — C · #27
    ...cap(4_000_000), termYears: 4, yearsLeft: 4, endYear: 2028,
    expiryStatus: 'UFA', updated: '2026-05-07',
  },
  8482159: { // Tyson Foerster — RW · #71
    ...cap(3_750_000), termYears: 2, yearsLeft: 2, endYear: 2026,
    expiryStatus: 'RFA', updated: '2026-05-07',
  },
  8477903: { // Garnet Hathaway — RW · #19
    ...cap(2_400_000), termYears: 2, yearsLeft: 2, endYear: 2026,
    expiryStatus: 'UFA', updated: '2026-05-07',
  },
  8479336: { // Carl Grundstrom — LW · #91
    ...cap(1_800_000), termYears: 1, yearsLeft: 1, endYear: 2025,
    expiryStatus: 'UFA', updated: '2026-05-07',
  },
  8485406: { // Porter Martone — RW · #94 (ELC)
    ...cap(966_667), termYears: 3, yearsLeft: 3, endYear: 2027,
    contractType: 'ELC', expiryStatus: 'RFA', updated: '2026-05-07',
  },
  8483731: { // Alex Bump — LW · #20 (ELC)
    ...cap(950_000), termYears: 3, yearsLeft: 3, endYear: 2027,
    contractType: 'ELC', expiryStatus: 'RFA', updated: '2026-05-07',
  },
  8484387: { // Matvei Michkov — LW/RW · #39 (ELC)
    ...cap(950_000), termYears: 2, yearsLeft: 2, endYear: 2026,
    contractType: 'ELC', expiryStatus: 'RFA', updated: '2026-05-07',
  },
  8483733: { // Nikita Grebenkin — LW · #29
    ...cap(875_000), termYears: 1, yearsLeft: 1, endYear: 2025,
    expiryStatus: 'RFA', updated: '2026-05-07',
  },
  8484142: { // Denver Barkey — C · #52 (ELC)
    ...cap(863_333), termYears: 3, yearsLeft: 3, endYear: 2027,
    contractType: 'ELC', expiryStatus: 'RFA', updated: '2026-05-07',
  },
  8479022: { // Rodrigo Abols — C · #18 (IR)
    ...cap(800_000), termYears: 1, yearsLeft: 1, endYear: 2025,
    expiryStatus: 'UFA', updated: '2026-05-07',
  },
  8475253: { // Garrett Wilson — LW · #10
    ...cap(775_000), termYears: 1, yearsLeft: 1, endYear: 2025,
    expiryStatus: 'UFA', updated: '2026-05-07',
  },
  8476822: { // Luke Glendening — C · #41
    ...cap(775_000), termYears: 1, yearsLeft: 1, endYear: 2025,
    expiryStatus: 'UFA', updated: '2026-05-07',
  },

  // ── Defence ─────────────────────────────────────────────────────────
  8477948: { // Travis Sanheim — LD · #6 · A
    ...cap(6_250_000), termYears: 6, yearsLeft: 6, endYear: 2030,
    expiryStatus: 'UFA', updated: '2026-05-07',
  },
  8481546: { // Cam York — LD · #8
    ...cap(5_150_000), termYears: 5, yearsLeft: 5, endYear: 2029,
    expiryStatus: 'UFA', updated: '2026-05-07',
  },
  8477499: { // Rasmus Ristolainen — RD · #55
    ...cap(5_100_000), termYears: 2, yearsLeft: 2, endYear: 2026,
    expiryStatus: 'UFA', updated: '2026-05-07',
  },
  8476372: { // Nick Seeler — LD · #24
    ...cap(2_700_000), termYears: 3, yearsLeft: 3, endYear: 2027,
    expiryStatus: 'UFA', updated: '2026-05-07',
  },
  8482142: { // Jamie Drysdale — RD · #9
    ...cap(2_300_000), termYears: 1, yearsLeft: 1, endYear: 2025,
    expiryStatus: 'RFA', updated: '2026-05-07',
  },
  8482126: { // Emil Andrae — LD · #36
    ...cap(903_333), termYears: 1, yearsLeft: 1, endYear: 2025,
    expiryStatus: 'RFA', updated: '2026-05-07',
  },
  8478454: { // Noah Juulsen — RD · #47
    ...cap(900_000), termYears: 1, yearsLeft: 1, endYear: 2025,
    expiryStatus: 'UFA', updated: '2026-05-07',
  },

  // ── Goaltenders ─────────────────────────────────────────────────────
  8478435: { // Dan Vladar — G · #80
    ...cap(3_350_000), termYears: 2, yearsLeft: 2, endYear: 2026,
    expiryStatus: 'UFA', updated: '2026-05-07',
  },
  8481035: { // Samuel Ersson — G · #33
    ...cap(1_450_000), termYears: 1, yearsLeft: 1, endYear: 2025,
    expiryStatus: 'RFA', updated: '2026-05-07',
  },

  // ── Buried (count partial vs cap) ───────────────────────────────────
  8481577: { // Philip Tomasino — C/RW (NHL portion of buried cap hit)
    ...cap(600_000), termYears: 1, yearsLeft: 1, endYear: 2025,
    expiryStatus: 'RFA', updated: '2026-05-07',
    notes: 'Buried · NHL cap portion only',
  },
  8483460: { // David Jiricek — RD (ELC, buried portion)
    ...cap(275_000), termYears: 2, yearsLeft: 2, endYear: 2026,
    contractType: 'ELC', expiryStatus: 'RFA', updated: '2026-05-07',
    notes: 'Buried · NHL cap portion only',
  },
};

export const hasContract = (playerId) => !!PLAYER_CONTRACTS[playerId];
export const getContract = (playerId) => PLAYER_CONTRACTS[playerId] || null;

// Money formatters — PuckPedia uses the $X.XXM convention everywhere.
export const fmtMillions = (dollars) => {
  if (dollars == null) return '—';
  return `$${(dollars / 1_000_000).toFixed(2)}M`;
};

export const fmtFullDollars = (dollars) => {
  if (dollars == null) return '—';
  return `$${dollars.toLocaleString()}`;
};

export const fmtCapPct = (pct) => {
  if (pct == null) return '—';
  return `${(pct * 100).toFixed(2)}%`;
};
