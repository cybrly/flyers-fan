// All NHL player contracts — generated from PuckPedia data for the 2025–26
// season, with two manual corrections layered on top of the raw scrape:
//   • John Carlson moved from the ANA bucket to WSH (scrape mis-bucket — he is
//     a Washington player; under ANA he inflated Anaheim's cap by $8M).
//   • Exact-duplicate rows (same ppId) are de-duped at read time in
//     getTeamContracts() so a player is never counted twice.
// Re-running the converter regenerates this file; reapply corrections after.
//
// Snapshot: 165 players across 32 teams, 2025–26 season (static, not live).

export const SALARY_CAP_CEILING = 95_500_000;

// Human-readable marker for the snapshot's season. Surfaced in the UI so the
// figures read as a point-in-time 2025–26 snapshot rather than live data.
// Intentionally NOT the auto-rolling SEASON label — the data does not roll
// over on its own, so the marker must stay pinned to what was actually captured.
export const SNAPSHOT_LABEL = '2025–26 season';

export const fmtMillions = (dollars) => {
  if (dollars == null) return '—';
  return `$${(dollars / 1_000_000).toFixed(2)}M`;
};

export const fmtCapPct = (pct) => {
  if (pct == null) return '—';
  return `${typeof pct === "number" ? pct.toFixed(1) : pct}%`;
};

export const fmtFullDollars = (dollars) => {
  if (dollars == null) return '—';
  return `$${dollars.toLocaleString()}`;
};

// Contract data keyed by PuckPedia player ID.
// NHL player IDs differ — the app matches via roster name/number.
const CONTRACTS_BY_TEAM = {
  ANA: [
    { ppId: '4783', name: 'Jacob Trouba', pos: 'D', num: '65', aav: 8000000, capHit: 8000000, capHitPct: 0.098, termYears: 7, endYear: 2026, totalValue: 56000000, expiryStatus: 'UFA', clauseType: 'M-NTC' },
    { ppId: '17408', name: 'Lukas Dostal', pos: 'G', num: '1', aav: 6500000, capHit: 6500000, capHitPct: 0.068, termYears: 5, yearsLeft: 4, endYear: 2030, totalValue: 32500000, expiryStatus: 'UFA' },
    { ppId: '4012', name: 'Petr Mrazek', pos: 'G', num: '34', aav: 4250000, capHit: 4250000, capHitPct: 0.048, termYears: 2, endYear: 2026, totalValue: 8500000, expiryStatus: 'UFA' },
    { ppId: '6127', name: 'Ville Husso', pos: 'G', num: '33', aav: 2200000, capHit: 2200000, capHitPct: 0.023, termYears: 2, yearsLeft: 1, endYear: 2027, totalValue: 4400000, expiryStatus: 'UFA' },
  ],
  BOS: [
    { ppId: '6060', name: 'David Pastrnak', pos: 'R', num: '88', aav: 11250000, capHit: 11250000, capHitPct: 0.135, termYears: 8, yearsLeft: 5, endYear: 2031, totalValue: 90000000, expiryStatus: 'UFA', clauseType: 'NMC' },
    { ppId: '6732', name: 'Charlie McAvoy', pos: 'D', num: '73', aav: 9500000, capHit: 9500000, capHitPct: 0.115, termYears: 8, yearsLeft: 4, endYear: 2030, totalValue: 76000000, expiryStatus: 'UFA', clauseType: 'NMC' },
    { ppId: '17053', name: 'Jeremy Swayman', pos: 'G', num: '1', aav: 8250000, capHit: 8250000, capHitPct: 0.094, termYears: 8, yearsLeft: 6, endYear: 2032, totalValue: 66000000, expiryStatus: 'UFA' },
    { ppId: '17053', name: 'Jeremy Swayman', pos: 'G', num: '1', aav: 8250000, capHit: 8250000, capHitPct: 0.094, termYears: 8, yearsLeft: 6, endYear: 2032, totalValue: 66000000, expiryStatus: 'UFA' },
    { ppId: '5645', name: 'Elias Lindholm', pos: 'C', num: '28', aav: 7750000, capHit: 7750000, capHitPct: 0.088, termYears: 7, yearsLeft: 5, endYear: 2031, totalValue: 54250000, expiryStatus: 'UFA', clauseType: 'NMC' },
    { ppId: '4836', name: 'Joonas Korpisalo', pos: 'G', num: '70', aav: 4000000, capHit: 4000000, capHitPct: 0.048, termYears: 5, yearsLeft: 2, endYear: 2028, totalValue: 20000000, expiryStatus: 'UFA', clauseType: 'M-NTC' },
  ],
  BUF: [
    { ppId: '17324', name: 'Rasmus Dahlin', pos: 'D', num: '26', aav: 11000000, capHit: 11000000, capHitPct: 0.125, termYears: 8, yearsLeft: 6, endYear: 2032, totalValue: 88000000, expiryStatus: 'UFA', clauseType: 'NMC' },
    { ppId: '18888', name: 'Owen Power', pos: 'D', num: '25', aav: 8350000, capHit: 8350000, capHitPct: 0.095, termYears: 7, yearsLeft: 5, endYear: 2031, totalValue: 58450000, expiryStatus: 'UFA' },
    { ppId: '16961', name: 'Joshua Norris', pos: 'C', num: '9', aav: 7950000, capHit: 7950000, capHitPct: 0.096, termYears: 8, yearsLeft: 4, endYear: 2030, totalValue: 63600000, expiryStatus: 'UFA' },
    { ppId: '16996', name: 'Ukko-Pekka Luukkonen', pos: 'G', num: '1', aav: 4750000, capHit: 4750000, capHitPct: 0.054, termYears: 5, yearsLeft: 3, endYear: 2029, totalValue: 23750000, expiryStatus: 'UFA' },
    { ppId: '18046', name: 'Colten Ellis', pos: 'G', num: '92', aav: 775000, capHit: 775000, capHitPct: 0.008, termYears: 2, yearsLeft: 1, endYear: 2027, totalValue: 1550000, expiryStatus: 'RFA' },
  ],
  CAR: [
    { ppId: '6396', name: 'Sebastian Aho', pos: 'C', num: '20', aav: 9750000, capHit: 9750000, capHitPct: 0.111, termYears: 8, yearsLeft: 6, endYear: 2032, totalValue: 78000000, expiryStatus: 'UFA', clauseType: 'NMC' },
    { ppId: '6044', name: 'Nikolaj Ehlers', pos: 'L', num: '27', aav: 8500000, capHit: 8500000, capHitPct: 0.089, termYears: 6, yearsLeft: 5, endYear: 2031, totalValue: 51000000, expiryStatus: 'UFA', clauseType: 'NMC' },
    { ppId: '17325', name: 'Andrei Svechnikov', pos: 'R', num: '37', aav: 7750000, capHit: 7750000, capHitPct: 0.095, termYears: 8, yearsLeft: 3, endYear: 2029, totalValue: 62000000, expiryStatus: 'UFA', clauseType: 'M-NTC' },
    { ppId: '4058', name: 'Frederik Andersen', pos: 'G', num: '31', aav: 3500000, capHit: 2750000, capHitPct: 0.029, termYears: 1, endYear: 2026, totalValue: 3500000, expiryStatus: 'UFA', clauseType: 'M-NTC,NMC' },
    { ppId: '17989', name: 'Pyotr Kochetkov', pos: 'G', num: '52', aav: 2000000, capHit: 2000000, capHitPct: 0.024, termYears: 4, yearsLeft: 1, endYear: 2027, totalValue: 8000000, expiryStatus: 'UFA' },
  ],
  CBJ: [
    { ppId: '6369', name: 'Zach Werenski', pos: 'D', num: '8', aav: 9583333, capHit: 9583333, capHitPct: 0.116, termYears: 6, yearsLeft: 2, endYear: 2028, totalValue: 57499998, expiryStatus: 'UFA', clauseType: 'NMC' },
    { ppId: '6368', name: 'Ivan Provorov', pos: 'D', num: '9', aav: 8500000, capHit: 8500000, capHitPct: 0.089, termYears: 7, yearsLeft: 6, endYear: 2032, totalValue: 59500000, expiryStatus: 'UFA', clauseType: 'NMC' },
    { ppId: '6109', name: 'Elvis Merzlikins', pos: 'G', num: '90', aav: 5400000, capHit: 5400000, capHitPct: 0.065, termYears: 5, yearsLeft: 1, endYear: 2027, totalValue: 27000000, expiryStatus: 'UFA', clauseType: 'M-NTC' },
  ],
  CGY: [
    { ppId: '4372', name: 'Jonathan Huberdeau', pos: 'L', num: '10', aav: 10500000, capHit: 10500000, capHitPct: 0.126, termYears: 8, yearsLeft: 5, endYear: 2031, totalValue: 84000000, expiryStatus: 'UFA', clauseType: 'NMC' },
    { ppId: '19051', name: 'Arseni Sergeyev', pos: 'G', num: '40', aav: 912500, capHit: 866250, capHitPct: 0.009, termYears: 2, yearsLeft: 1, endYear: 2027, totalValue: 1825000, expiryStatus: 'RFA', contractType: 'ELC' },
    { ppId: '18167', name: 'Dustin Wolf', pos: 'G', num: '32', aav: 850000, capHit: 850000, capHitPct: 0.01, termYears: 2, endYear: 2026, totalValue: 1700000, expiryStatus: 'RFA' },
  ],
  CHI: [
    { ppId: '1434', name: 'Shea Weber', pos: 'D', num: '', aav: 7857143, capHit: 7857143, capHitPct: 0.131, termYears: 14, endYear: 2026, totalValue: 110000002, expiryStatus: 'UFA' },
    { ppId: '17966', name: 'Spencer Knight', pos: 'G', num: '30', aav: 4500000, capHit: 4500000, capHitPct: 0.054, termYears: 3, endYear: 2026, totalValue: 13500000, expiryStatus: 'RFA' },
  ],
  COL: [
    { ppId: '5002', name: 'Nathan MacKinnon', pos: 'C', num: '29', aav: 12600000, capHit: 12600000, capHitPct: 0.151, termYears: 8, yearsLeft: 5, endYear: 2031, totalValue: 100800000, expiryStatus: 'UFA', clauseType: 'NMC' },
    { ppId: '16946', name: 'Cale Makar', pos: 'D', num: '8', aav: 9000000, capHit: 9000000, capHitPct: 0.11, termYears: 6, yearsLeft: 1, endYear: 2027, totalValue: 54000000, expiryStatus: 'UFA' },
    { ppId: '6403', name: 'MacKenzie Blackwood', pos: 'G', num: '39', aav: 5250000, capHit: 5250000, capHitPct: 0.055, termYears: 5, yearsLeft: 4, endYear: 2030, totalValue: 26250000, expiryStatus: 'UFA', clauseType: 'M-NTC' },
    { ppId: '3955', name: 'Scott Wedgewood', pos: 'G', num: '41', aav: 1500000, capHit: 1500000, capHitPct: 0.017, termYears: 2, endYear: 2026, totalValue: 3000000, expiryStatus: 'UFA' },
  ],
  DAL: [
    { ppId: '6371', name: 'Mikko Rantanen', pos: 'C', num: '96', aav: 12000000, capHit: 12000000, capHitPct: 0.126, termYears: 8, yearsLeft: 7, endYear: 2033, totalValue: 96000000, expiryStatus: 'UFA', clauseType: 'NMC' },
    { ppId: '3872', name: 'Tyler Seguin', pos: 'C', num: '91', aav: 9850000, capHit: 9850000, capHitPct: 0.121, termYears: 8, yearsLeft: 1, endYear: 2027, totalValue: 78800000, expiryStatus: 'UFA', clauseType: 'NMC' },
    { ppId: '6410', name: 'Roope Hintz', pos: 'C', num: '24', aav: 8450000, capHit: 8450000, capHitPct: 0.101, termYears: 8, yearsLeft: 5, endYear: 2031, totalValue: 67600000, expiryStatus: 'UFA', clauseType: 'NMC' },
    { ppId: '16945', name: 'Miro Heiskanen', pos: 'D', num: '4', aav: 8450000, capHit: 8450000, capHitPct: 0.104, termYears: 8, yearsLeft: 3, endYear: 2029, totalValue: 67600000, expiryStatus: 'UFA', clauseType: 'NMC' },
    { ppId: '18851', name: 'Wyatt Johnston', pos: 'C', num: '53', aav: 8400000, capHit: 8400000, capHitPct: 0.088, termYears: 5, yearsLeft: 4, endYear: 2030, totalValue: 42000000, expiryStatus: 'UFA' },
    { ppId: '16968', name: 'Jake Oettinger', pos: 'G', num: '29', aav: 8250000, capHit: 8250000, capHitPct: 0.086, termYears: 8, yearsLeft: 7, endYear: 2033, totalValue: 66000000, expiryStatus: 'UFA' },
    { ppId: '16968', name: 'Jake Oettinger', pos: 'G', num: '29', aav: 8250000, capHit: 8250000, capHitPct: 0.086, termYears: 8, yearsLeft: 7, endYear: 2033, totalValue: 66000000, expiryStatus: 'UFA' },
    { ppId: '16981', name: 'Jason Robertson', pos: 'L', num: '21', aav: 7750000, capHit: 7750000, capHitPct: 0.094, termYears: 4, endYear: 2026, totalValue: 31000000, expiryStatus: 'RFA' },
  ],
  DET: [
    { ppId: '6050', name: 'Dylan Larkin', pos: 'C', num: '71', aav: 8700000, capHit: 8700000, capHitPct: 0.104, termYears: 8, yearsLeft: 5, endYear: 2031, totalValue: 69600000, expiryStatus: 'UFA', clauseType: 'NTC' },
    { ppId: '17959', name: 'Moritz Seider', pos: 'D', num: '53', aav: 8550000, capHit: 8550000, capHitPct: 0.097, termYears: 7, yearsLeft: 5, endYear: 2031, totalValue: 59850000, expiryStatus: 'UFA' },
    { ppId: '18354', name: 'Lucas Raymond', pos: 'L', num: '23', aav: 8075000, capHit: 8075000, capHitPct: 0.092, termYears: 8, yearsLeft: 6, endYear: 2032, totalValue: 64600000, expiryStatus: 'UFA' },
    { ppId: '6757', name: 'Alex Debrincat', pos: 'R', num: '93', aav: 7875000, capHit: 7875000, capHitPct: 0.094, termYears: 4, yearsLeft: 1, endYear: 2027, totalValue: 31500000, expiryStatus: 'UFA', clauseType: 'M-NTC' },
    { ppId: '4408', name: 'John Gibson', pos: 'G', num: '36', aav: 6400000, capHit: 6400000, capHitPct: 0.079, termYears: 8, yearsLeft: 1, endYear: 2027, totalValue: 51200000, expiryStatus: 'UFA', clauseType: 'M-NTC' },
  ],
  EDM: [
    { ppId: '6038', name: 'Leon Draisaitl', pos: 'C', num: '29', aav: 14000000, capHit: 14000000, capHitPct: 0.147, termYears: 8, yearsLeft: 7, endYear: 2033, totalValue: 112000000, expiryStatus: 'UFA', clauseType: 'NMC' },
    { ppId: '6362', name: 'Connor McDavid', pos: 'C', num: '97', aav: 12500000, capHit: 12500000, capHitPct: 0.157, termYears: 8, endYear: 2026, totalValue: 100000000, expiryStatus: 'UFA', clauseType: 'NMC' },
    { ppId: '17333', name: 'Evan Bouchard', pos: 'D', num: '2', aav: 10500000, capHit: 10500000, capHitPct: 0.11, termYears: 4, yearsLeft: 3, endYear: 2029, totalValue: 42000000, expiryStatus: 'UFA' },
    { ppId: '5647', name: 'Darnell Nurse', pos: 'D', num: '25', aav: 9250000, capHit: 9250000, capHitPct: 0.112, termYears: 8, yearsLeft: 4, endYear: 2030, totalValue: 74000000, expiryStatus: 'UFA', clauseType: 'NMC' },
    { ppId: '5676', name: 'Tristan Jarry', pos: 'G', num: '35', aav: 5375000, capHit: 5375000, capHitPct: 0.064, termYears: 5, yearsLeft: 2, endYear: 2028, totalValue: 26875000, expiryStatus: 'UFA', clauseType: 'M-NTC' },
    { ppId: '6656', name: 'Connor Ingram', pos: 'G', num: '39', aav: 1950000, capHit: 1950000, capHitPct: 0.023, termYears: 3, endYear: 2026, totalValue: 5850000, expiryStatus: 'UFA' },
  ],
  FLA: [
    { ppId: '5644', name: 'Aleksander Barkov', pos: 'C', num: '16', aav: 10000000, capHit: 10000000, capHitPct: 0.121, termYears: 8, yearsLeft: 4, endYear: 2030, totalValue: 80000000, expiryStatus: 'UFA', clauseType: 'NMC' },
    { ppId: '5628', name: 'Seth Jones', pos: 'D', num: '3', aav: 9500000, capHit: 9500000, capHitPct: 0.115, termYears: 8, yearsLeft: 4, endYear: 2030, totalValue: 76000000, expiryStatus: 'UFA', clauseType: 'NMC' },
    { ppId: '6724', name: 'Matthew Tkachuk', pos: 'L', num: '19', aav: 9500000, capHit: 9500000, capHitPct: 0.115, termYears: 8, yearsLeft: 4, endYear: 2030, totalValue: 76000000, expiryStatus: 'UFA', clauseType: 'NMC' },
    { ppId: '6037', name: 'Sam Reinhart', pos: 'C', num: '13', aav: 8625000, capHit: 8625000, capHitPct: 0.098, termYears: 8, yearsLeft: 6, endYear: 2032, totalValue: 69000000, expiryStatus: 'UFA', clauseType: 'M-NTC,NMC' },
    { ppId: '6039', name: 'Sam Bennett', pos: 'C', num: '9', aav: 8000000, capHit: 8000000, capHitPct: 0.084, termYears: 8, yearsLeft: 7, endYear: 2033, totalValue: 64000000, expiryStatus: 'UFA', clauseType: 'NMC' },
    { ppId: '17028', name: 'Daniil Tarasov', pos: 'G', num: '40', aav: 1050000, capHit: 1050000, capHitPct: 0.011, termYears: 1, endYear: 2026, totalValue: 1050000, expiryStatus: 'UFA' },
  ],
  LAK: [
    { ppId: '2999', name: 'Drew Doughty', pos: 'D', num: '8', aav: 11000000, capHit: 11000000, capHitPct: 0.135, termYears: 8, yearsLeft: 1, endYear: 2027, totalValue: 88000000, expiryStatus: 'UFA', clauseType: 'M-NTC' },
    { ppId: '6046', name: 'Kevin Fiala', pos: 'C', num: '22', aav: 7875000, capHit: 7875000, capHitPct: 0.095, termYears: 7, yearsLeft: 3, endYear: 2029, totalValue: 55125000, expiryStatus: 'UFA', clauseType: 'NMC' },
    { ppId: '3820', name: 'Darcy Kuemper', pos: 'G', num: '35', aav: 5250000, capHit: 5250000, capHitPct: 0.064, termYears: 5, yearsLeft: 1, endYear: 2027, totalValue: 26250000, expiryStatus: 'UFA', clauseType: 'M-NTC' },
    { ppId: '4556', name: 'Anton Forsberg', pos: 'G', num: '31', aav: 2250000, capHit: 2250000, capHitPct: 0.024, termYears: 2, yearsLeft: 1, endYear: 2027, totalValue: 4500000, expiryStatus: 'UFA' },
  ],
  MIN: [
    { ppId: '6496', name: 'Kirill Kaprizov', pos: 'L', num: '97', aav: 9000000, capHit: 9000000, capHitPct: 0.11, termYears: 5, endYear: 2026, totalValue: 45000000, expiryStatus: 'UFA', clauseType: 'NMC' },
    { ppId: '18398', name: 'Brock Faber', pos: 'D', num: '7', aav: 8500000, capHit: 8500000, capHitPct: 0.089, termYears: 8, yearsLeft: 7, endYear: 2033, totalValue: 68000000, expiryStatus: 'UFA' },
    { ppId: '17330', name: 'Quinn Hughes', pos: 'D', num: '43', aav: 7850000, capHit: 7850000, capHitPct: 0.096, termYears: 6, yearsLeft: 1, endYear: 2027, totalValue: 47100000, expiryStatus: 'UFA' },
    { ppId: '4189', name: 'Jared Spurgeon', pos: 'D', num: '46', aav: 7575000, capHit: 7575000, capHitPct: 0.093, termYears: 7, yearsLeft: 1, endYear: 2027, totalValue: 53025000, expiryStatus: 'UFA', clauseType: 'M-NTC' },
    { ppId: '6773', name: 'Filip Gustavsson', pos: 'G', num: '32', aav: 3750000, capHit: 3750000, capHitPct: 0.045, termYears: 3, endYear: 2026, totalValue: 11250000, expiryStatus: 'UFA', clauseType: 'NMC' },
    { ppId: '18899', name: 'Jesper Wallstedt', pos: 'G', num: '30', aav: 2200000, capHit: 2200000, capHitPct: 0.023, termYears: 2, yearsLeft: 1, endYear: 2027, totalValue: 4400000, expiryStatus: 'RFA' },
  ],
  MTL: [
    { ppId: '17335', name: 'Noah Dobson', pos: 'D', num: '53', aav: 9500000, capHit: 9500000, capHitPct: 0.099, termYears: 8, yearsLeft: 7, endYear: 2033, totalValue: 76000000, expiryStatus: 'UFA' },
    { ppId: '6720', name: 'Patrik Laine', pos: 'L', num: '92', aav: 8700000, capHit: 8700000, capHitPct: 0.105, termYears: 4, endYear: 2026, totalValue: 34800000, expiryStatus: 'UFA', clauseType: 'M-NTC' },
    { ppId: '16955', name: 'Nick Suzuki', pos: 'C', num: '14', aav: 7875000, capHit: 7875000, capHitPct: 0.095, termYears: 8, yearsLeft: 4, endYear: 2030, totalValue: 63000000, expiryStatus: 'UFA' },
    { ppId: '17968', name: 'Cole Caufield', pos: 'L', num: '13', aav: 7850000, capHit: 7850000, capHitPct: 0.094, termYears: 8, yearsLeft: 5, endYear: 2031, totalValue: 62800000, expiryStatus: 'UFA' },
    { ppId: '19202', name: 'Juraj Slafkovský', pos: 'R', num: '20', aav: 7600000, capHit: 7600000, capHitPct: 0.08, termYears: 8, yearsLeft: 7, endYear: 2033, totalValue: 60800000, expiryStatus: 'UFA' },
    { ppId: '6438', name: 'Sam Montembeault', pos: 'G', num: '35', aav: 3150000, capHit: 3150000, capHitPct: 0.036, termYears: 3, yearsLeft: 1, endYear: 2027, totalValue: 9450000, expiryStatus: 'UFA' },
    { ppId: '18487', name: 'Jakub Dobes', pos: 'G', num: '75', aav: 965000, capHit: 965000, capHitPct: 0.01, termYears: 2, yearsLeft: 1, endYear: 2027, totalValue: 1930000, expiryStatus: 'RFA' },
    { ppId: '19551', name: 'Jacob Fowler', pos: 'G', num: '32', aav: 1150000, capHit: 923333, capHitPct: 0.01, termYears: 3, yearsLeft: 2, endYear: 2028, totalValue: 3450000, expiryStatus: 'RFA', contractType: 'ELC' },
  ],
  NJD: [
    { ppId: '4378', name: 'Dougie Hamilton', pos: 'D', num: '7', aav: 9000000, capHit: 9000000, capHitPct: 0.11, termYears: 7, yearsLeft: 2, endYear: 2028, totalValue: 63000000, expiryStatus: 'UFA', clauseType: 'M-NTC,NMC' },
    { ppId: '18890', name: 'Luke Hughes', pos: 'D', num: '43', aav: 9000000, capHit: 9000000, capHitPct: 0.094, termYears: 7, yearsLeft: 6, endYear: 2032, totalValue: 63000000, expiryStatus: 'UFA' },
    { ppId: '6370', name: 'Timo Meier', pos: 'R', num: '28', aav: 8800000, capHit: 8800000, capHitPct: 0.105, termYears: 8, yearsLeft: 5, endYear: 2031, totalValue: 70400000, expiryStatus: 'UFA', clauseType: 'NMC' },
    { ppId: '17954', name: 'Jack Hughes', pos: 'C', num: '86', aav: 8000000, capHit: 8000000, capHitPct: 0.097, termYears: 8, yearsLeft: 4, endYear: 2030, totalValue: 64000000, expiryStatus: 'UFA' },
    { ppId: '6881', name: 'Jesper Bratt', pos: 'L', num: '63', aav: 7875000, capHit: 7875000, capHitPct: 0.094, termYears: 8, yearsLeft: 5, endYear: 2031, totalValue: 63000000, expiryStatus: 'UFA', clauseType: 'NMC' },
    { ppId: '4129', name: 'Jacob Markstrom', pos: 'G', num: '25', aav: 6000000, capHit: 6000000, capHitPct: 0.074, termYears: 6, endYear: 2026, totalValue: 36000000, expiryStatus: 'UFA', clauseType: 'NMC' },
    { ppId: '4213', name: 'Jake Allen', pos: 'G', num: '34', aav: 1800000, capHit: 1800000, capHitPct: 0.019, termYears: 5, yearsLeft: 4, endYear: 2030, totalValue: 9000000, expiryStatus: 'UFA', clauseType: 'NTC' },
  ],
  NSH: [
    { ppId: '4279', name: 'Roman Josi', pos: 'D', num: '59', aav: 9059000, capHit: 9059000, capHitPct: 0.111, termYears: 8, yearsLeft: 2, endYear: 2028, totalValue: 72472000, expiryStatus: 'UFA', clauseType: 'NMC' },
    { ppId: '4785', name: 'Filip Forsberg', pos: 'C', num: '9', aav: 8500000, capHit: 8500000, capHitPct: 0.103, termYears: 8, yearsLeft: 4, endYear: 2030, totalValue: 68000000, expiryStatus: 'UFA', clauseType: 'NMC' },
    { ppId: '3010', name: 'Steven Stamkos', pos: 'C', num: '91', aav: 8000000, capHit: 8000000, capHitPct: 0.091, termYears: 4, yearsLeft: 2, endYear: 2028, totalValue: 32000000, expiryStatus: 'UFA', clauseType: 'NMC' },
    { ppId: '5724', name: 'Juuse Saros', pos: 'G', num: '74', aav: 7740000, capHit: 7740000, capHitPct: 0.081, termYears: 8, yearsLeft: 7, endYear: 2033, totalValue: 61920000, expiryStatus: 'UFA', clauseType: 'NMC' },
    { ppId: '5724', name: 'Juuse Saros', pos: 'G', num: '74', aav: 7740000, capHit: 7740000, capHitPct: 0.081, termYears: 8, yearsLeft: 7, endYear: 2033, totalValue: 61920000, expiryStatus: 'UFA', clauseType: 'NMC' },
    { ppId: '17387', name: 'Justus Annunen', pos: 'G', num: '29', aav: 837500, capHit: 837500, capHitPct: 0.01, termYears: 2, endYear: 2026, totalValue: 1675000, expiryStatus: 'RFA' },
  ],
  NYI: [
    { ppId: '6377', name: 'Mathew Barzal', pos: 'C', num: '13', aav: 9150000, capHit: 9150000, capHitPct: 0.11, termYears: 8, yearsLeft: 5, endYear: 2031, totalValue: 73200000, expiryStatus: 'UFA', clauseType: 'M-NTC' },
    { ppId: '5649', name: 'Bo Horvat', pos: 'C', num: '14', aav: 8500000, capHit: 8500000, capHitPct: 0.102, termYears: 8, yearsLeft: 5, endYear: 2031, totalValue: 68000000, expiryStatus: 'UFA', clauseType: 'NTC' },
    { ppId: '6111', name: 'Ilya Sorokin', pos: 'G', num: '30', aav: 8250000, capHit: 8250000, capHitPct: 0.094, termYears: 8, yearsLeft: 6, endYear: 2032, totalValue: 66000000, expiryStatus: 'UFA', clauseType: 'NMC' },
    { ppId: '6111', name: 'Ilya Sorokin', pos: 'G', num: '30', aav: 8250000, capHit: 8250000, capHitPct: 0.094, termYears: 8, yearsLeft: 6, endYear: 2032, totalValue: 66000000, expiryStatus: 'UFA', clauseType: 'NMC' },
    { ppId: '3019', name: 'Semyon Varlamov', pos: 'G', num: '40', aav: 2750000, capHit: 2750000, capHitPct: 0.033, termYears: 4, yearsLeft: 1, endYear: 2027, totalValue: 11000000, expiryStatus: 'UFA', clauseType: 'M-NTC' },
  ],
  NYR: [
    { ppId: '6148', name: 'Igor Shesterkin', pos: 'G', num: '31', aav: 11500000, capHit: 11500000, capHitPct: 0.12, termYears: 8, yearsLeft: 7, endYear: 2033, totalValue: 92000000, expiryStatus: 'UFA', clauseType: 'NMC' },
    { ppId: '6148', name: 'Igor Shesterkin', pos: 'G', num: '31', aav: 11500000, capHit: 11500000, capHitPct: 0.12, termYears: 8, yearsLeft: 7, endYear: 2033, totalValue: 92000000, expiryStatus: 'UFA', clauseType: 'NMC' },
    { ppId: '6784', name: 'Adam Fox', pos: 'D', num: '23', aav: 9500000, capHit: 9500000, capHitPct: 0.115, termYears: 7, yearsLeft: 3, endYear: 2029, totalValue: 66500000, expiryStatus: 'UFA', clauseType: 'NMC' },
    { ppId: '4375', name: 'Mika Zibanejad', pos: 'C', num: '93', aav: 8500000, capHit: 8500000, capHitPct: 0.103, termYears: 8, yearsLeft: 4, endYear: 2030, totalValue: 68000000, expiryStatus: 'UFA', clauseType: 'NMC' },
    { ppId: '4589', name: 'J.T. Miller', pos: 'C', num: '8', aav: 8000000, capHit: 8000000, capHitPct: 0.096, termYears: 7, yearsLeft: 4, endYear: 2030, totalValue: 56000000, expiryStatus: 'UFA', clauseType: 'NMC' },
    { ppId: '2660', name: 'Jonathan Quick', pos: 'G', num: '32', aav: 1850000, capHit: 1550000, capHitPct: 0.016, termYears: 1, endYear: 2026, totalValue: 1850000, expiryStatus: 'UFA', clauseType: 'M-NTC' },
    { ppId: '18454', name: 'Dylan Garand', pos: 'G', num: '33', aav: 775000, capHit: 775000, capHitPct: 0.008, termYears: 1, endYear: 2026, totalValue: 775000, expiryStatus: 'RFA' },
  ],
  OTT: [
    { ppId: '18578', name: 'Tim Stutzle', pos: 'L', num: '18', aav: 8350000, capHit: 8350000, capHitPct: 0.1, termYears: 8, yearsLeft: 5, endYear: 2031, totalValue: 66800000, expiryStatus: 'UFA' },
    { ppId: '4937', name: 'Linus Ullmark', pos: 'G', num: '35', aav: 8250000, capHit: 8250000, capHitPct: 0.086, termYears: 4, yearsLeft: 3, endYear: 2029, totalValue: 33000000, expiryStatus: 'UFA', clauseType: 'NMC' },
    { ppId: '4937', name: 'Linus Ullmark', pos: 'G', num: '35', aav: 8250000, capHit: 8250000, capHitPct: 0.086, termYears: 4, yearsLeft: 3, endYear: 2029, totalValue: 33000000, expiryStatus: 'UFA', clauseType: 'NMC' },
    { ppId: '17327', name: 'Brady Tkachuk', pos: 'L', num: '7', aav: 8205714, capHit: 8205714, capHitPct: 0.102, termYears: 7, yearsLeft: 2, endYear: 2028, totalValue: 57439998, expiryStatus: 'UFA', clauseType: 'NMC' },
    { ppId: '18358', name: 'Jake Sanderson', pos: 'D', num: '85', aav: 8050000, capHit: 8050000, capHitPct: 0.091, termYears: 8, yearsLeft: 6, endYear: 2032, totalValue: 64400000, expiryStatus: 'UFA' },
    { ppId: '6379', name: 'Thomas Chabot', pos: 'D', num: '72', aav: 8000000, capHit: 8000000, capHitPct: 0.098, termYears: 8, yearsLeft: 2, endYear: 2028, totalValue: 64000000, expiryStatus: 'UFA', clauseType: 'M-NTC' },
    { ppId: '18422', name: 'Leevi Merilainen', pos: 'G', num: '1', aav: 1050000, capHit: 1050000, capHitPct: 0.011, termYears: 1, endYear: 2026, totalValue: 1050000, expiryStatus: 'RFA' },
    { ppId: '3015', name: 'James Reimer', pos: 'G', num: '47', aav: 850000, capHit: 850000, capHitPct: 0.009, termYears: 1, endYear: 2026, totalValue: 850000, expiryStatus: 'UFA' },
  ],
  PHI: [
    { ppId: '6385', name: 'Travis Konecny', pos: 'R', num: '11', aav: 8750000, capHit: 8750000, capHitPct: 0.092, termYears: 8, yearsLeft: 7, endYear: 2033, totalValue: 70000000, expiryStatus: 'UFA', clauseType: 'NMC' },
    { ppId: '4377', name: 'Sean Couturier', pos: 'C', num: '14', aav: 7750000, capHit: 7750000, capHitPct: 0.094, termYears: 8, yearsLeft: 4, endYear: 2030, totalValue: 62000000, expiryStatus: 'UFA', clauseType: 'NMC' },
    { ppId: '6436', name: 'Dan Vladar', pos: 'G', num: '80', aav: 3350000, capHit: 3350000, capHitPct: 0.035, termYears: 2, yearsLeft: 1, endYear: 2027, totalValue: 6700000, expiryStatus: 'UFA', clauseType: 'M-NTC' },
    { ppId: '17466', name: 'Samuel Ersson', pos: 'G', num: '33', aav: 1450000, capHit: 1450000, capHitPct: 0.016, termYears: 2, endYear: 2026, totalValue: 2900000, expiryStatus: 'RFA' },
  ],
  PIT: [
    { ppId: '3404', name: 'Erik Karlsson', pos: 'D', num: '65', aav: 11500000, capHit: 11500000, capHitPct: 0.141, termYears: 8, yearsLeft: 1, endYear: 2027, totalValue: 92000000, expiryStatus: 'UFA', clauseType: 'NMC' },
    { ppId: '1207', name: 'Sidney Crosby', pos: 'C', num: '87', aav: 8700000, capHit: 8700000, capHitPct: 0.091, termYears: 2, yearsLeft: 1, endYear: 2027, totalValue: 17400000, expiryStatus: 'UFA', clauseType: 'NMC' },
    { ppId: '17020', name: 'Stuart Skinner', pos: 'G', num: '74', aav: 2600000, capHit: 2600000, capHitPct: 0.031, termYears: 3, endYear: 2026, totalValue: 7800000, expiryStatus: 'UFA' },
    { ppId: '18109', name: 'Arturs Silovs', pos: 'G', num: '37', aav: 850000, capHit: 850000, capHitPct: 0.01, termYears: 2, endYear: 2026, totalValue: 1700000, expiryStatus: 'RFA' },
  ],
  SEA: [
    { ppId: '3983', name: 'Philipp Grubauer', pos: 'G', num: '31', aav: 5900000, capHit: 5900000, capHitPct: 0.072, termYears: 6, yearsLeft: 1, endYear: 2027, totalValue: 35400000, expiryStatus: 'UFA', clauseType: 'M-NTC' },
    { ppId: '6560', name: 'Joey Daccord', pos: 'G', num: '35', aav: 5000000, capHit: 5000000, capHitPct: 0.052, termYears: 5, yearsLeft: 4, endYear: 2030, totalValue: 25000000, expiryStatus: 'UFA', clauseType: 'M-NTC' },
    { ppId: '4857', name: 'Matt Murray', pos: 'G', num: '30', aav: 1000000, capHit: 1000000, capHitPct: 0.01, termYears: 1, endYear: 2026, totalValue: 1000000, expiryStatus: 'UFA' },
    { ppId: '19236', name: 'Niklas Kokko', pos: 'G', num: '39', aav: 918333, capHit: 891666, capHitPct: 0.01, termYears: 3, yearsLeft: 1, endYear: 2027, totalValue: 2754999, expiryStatus: 'RFA', contractType: 'ELC' },
  ],
  SJS: [
    { ppId: '1799', name: 'Carey Price', pos: 'G', num: '', aav: 10500000, capHit: 10500000, capHitPct: 0.132, termYears: 8, endYear: 2026, totalValue: 84000000, expiryStatus: 'UFA', clauseType: 'NMC' },
    { ppId: '1799', name: 'Carey Price', pos: 'G', num: '', aav: 10500000, capHit: 10500000, capHitPct: 0.132, termYears: 8, endYear: 2026, totalValue: 84000000, expiryStatus: 'UFA', clauseType: 'NMC' },
    { ppId: '3277', name: 'Logan Couture', pos: 'C', num: '39', aav: 8000000, capHit: 8000000, capHitPct: 0.098, termYears: 8, yearsLeft: 1, endYear: 2027, totalValue: 64000000, expiryStatus: 'UFA', clauseType: 'M-NTC' },
    { ppId: '6071', name: 'Alex Nedeljkovic', pos: 'G', num: '33', aav: 2500000, capHit: 2500000, capHitPct: 0.028, termYears: 2, endYear: 2026, totalValue: 5000000, expiryStatus: 'UFA' },
    { ppId: '18364', name: 'Yaroslav Askarov', pos: 'G', num: '30', aav: 2000000, capHit: 2000000, capHitPct: 0.021, termYears: 2, yearsLeft: 1, endYear: 2027, totalValue: 4000000, expiryStatus: 'RFA' },
  ],
  STL: [
    { ppId: '6753', name: 'Jordan Kyrou', pos: 'C', num: '25', aav: 8125000, capHit: 8125000, capHitPct: 0.097, termYears: 8, yearsLeft: 5, endYear: 2031, totalValue: 65000000, expiryStatus: 'UFA', clauseType: 'NTC' },
    { ppId: '16962', name: 'Robert Thomas', pos: 'C', num: '18', aav: 8125000, capHit: 8125000, capHitPct: 0.097, termYears: 8, yearsLeft: 5, endYear: 2031, totalValue: 65000000, expiryStatus: 'UFA', clauseType: 'NTC' },
    { ppId: '5701', name: 'Pavel Buchnevich', pos: 'C', num: '89', aav: 8000000, capHit: 8000000, capHitPct: 0.084, termYears: 6, yearsLeft: 5, endYear: 2031, totalValue: 48000000, expiryStatus: 'UFA', clauseType: 'NTC' },
    { ppId: '4456', name: 'Jordan Binnington', pos: 'G', num: '50', aav: 6000000, capHit: 6000000, capHitPct: 0.074, termYears: 6, yearsLeft: 1, endYear: 2027, totalValue: 36000000, expiryStatus: 'UFA', clauseType: 'M-NTC' },
    { ppId: '17430', name: 'Joel Hofer', pos: 'G', num: '30', aav: 3400000, capHit: 3400000, capHitPct: 0.036, termYears: 2, yearsLeft: 1, endYear: 2027, totalValue: 6800000, expiryStatus: 'RFA' },
  ],
  TBL: [
    { ppId: '4427', name: 'Nikita Kucherov', pos: 'R', num: '86', aav: 9500000, capHit: 9500000, capHitPct: 0.117, termYears: 8, yearsLeft: 1, endYear: 2027, totalValue: 76000000, expiryStatus: 'UFA', clauseType: 'M-NTC' },
    { ppId: '4793', name: 'Andrei Vasilevskiy', pos: 'G', num: '88', aav: 9500000, capHit: 9500000, capHitPct: 0.117, termYears: 8, yearsLeft: 2, endYear: 2028, totalValue: 76000000, expiryStatus: 'UFA', clauseType: 'M-NTC' },
    { ppId: '6112', name: 'Brayden Point', pos: 'C', num: '21', aav: 9500000, capHit: 9500000, capHitPct: 0.115, termYears: 8, yearsLeft: 4, endYear: 2030, totalValue: 76000000, expiryStatus: 'UFA', clauseType: 'NMC' },
    { ppId: '4793', name: 'Andrei Vasilevskiy', pos: 'G', num: '88', aav: 9500000, capHit: 9500000, capHitPct: 0.117, termYears: 8, yearsLeft: 2, endYear: 2028, totalValue: 76000000, expiryStatus: 'UFA', clauseType: 'M-NTC' },
    { ppId: '5707', name: 'Jake Guentzel', pos: 'L', num: '59', aav: 9000000, capHit: 9000000, capHitPct: 0.102, termYears: 7, yearsLeft: 5, endYear: 2031, totalValue: 63000000, expiryStatus: 'UFA', clauseType: 'NMC' },
    { ppId: '3413', name: 'Victor Hedman', pos: 'D', num: '77', aav: 8000000, capHit: 8000000, capHitPct: 0.084, termYears: 4, yearsLeft: 3, endYear: 2029, totalValue: 32000000, expiryStatus: 'UFA', clauseType: 'NMC' },
    { ppId: '6094', name: 'Jonas Johansson', pos: 'G', num: '31', aav: 1250000, capHit: 1250000, capHitPct: 0.013, termYears: 2, yearsLeft: 1, endYear: 2027, totalValue: 2500000, expiryStatus: 'UFA' },
  ],
  TOR: [
    { ppId: '6719', name: 'Auston Matthews', pos: 'C', num: '34', aav: 13250000, capHit: 13250000, capHitPct: 0.151, termYears: 4, yearsLeft: 2, endYear: 2028, totalValue: 53000000, expiryStatus: 'UFA', clauseType: 'NMC' },
    { ppId: '6043', name: 'William Nylander', pos: 'C', num: '88', aav: 11500000, capHit: 11500000, capHitPct: 0.131, termYears: 8, yearsLeft: 6, endYear: 2032, totalValue: 92000000, expiryStatus: 'UFA', clauseType: 'NMC' },
    { ppId: '18919', name: 'Matthew Knies', pos: 'L', num: '23', aav: 7750000, capHit: 7750000, capHitPct: 0.081, termYears: 6, yearsLeft: 5, endYear: 2031, totalValue: 46500000, expiryStatus: 'UFA' },
    { ppId: '6780', name: 'Joseph Woll', pos: 'G', num: '60', aav: 3666667, capHit: 3666667, capHitPct: 0.038, termYears: 3, yearsLeft: 2, endYear: 2028, totalValue: 11000001, expiryStatus: 'UFA' },
    { ppId: '4819', name: 'Anthony Stolarz', pos: 'G', num: '41', aav: 2500000, capHit: 2500000, capHitPct: 0.028, termYears: 2, endYear: 2026, totalValue: 5000000, expiryStatus: 'UFA', clauseType: 'M-NTC' },
    { ppId: '19283', name: 'Dennis Hildeby', pos: 'G', num: '35', aav: 841667, capHit: 841667, capHitPct: 0.009, termYears: 3, yearsLeft: 2, endYear: 2028, totalValue: 2525001, expiryStatus: 'RFA' },
  ],
  UTA: [
    { ppId: '6727', name: 'Mikhail Sergachev', pos: 'D', num: '98', aav: 8500000, capHit: 8500000, capHitPct: 0.102, termYears: 8, yearsLeft: 5, endYear: 2031, totalValue: 68000000, expiryStatus: 'UFA', clauseType: 'NTC' },
    { ppId: '18387', name: 'John-Jason Peterka', pos: 'C', num: '77', aav: 7700000, capHit: 7700000, capHitPct: 0.081, termYears: 5, yearsLeft: 4, endYear: 2030, totalValue: 38500000, expiryStatus: 'UFA' },
    { ppId: '6506', name: 'Karel Vejmelka', pos: 'G', num: '70', aav: 4750000, capHit: 4750000, capHitPct: 0.05, termYears: 5, yearsLeft: 4, endYear: 2030, totalValue: 23750000, expiryStatus: 'UFA', clauseType: 'M-NTC' },
    { ppId: '6073', name: 'Vitek Vanecek', pos: 'G', num: '41', aav: 1500000, capHit: 1500000, capHitPct: 0.016, termYears: 1, endYear: 2026, totalValue: 1500000, expiryStatus: 'UFA' },
  ],
  VAN: [
    { ppId: '16947', name: 'Elias Pettersson', pos: 'C', num: '40', aav: 11600000, capHit: 11600000, capHitPct: 0.132, termYears: 8, yearsLeft: 6, endYear: 2032, totalValue: 92800000, expiryStatus: 'UFA', clauseType: 'NMC' },
    { ppId: '6070', name: 'Thatcher Demko', pos: 'G', num: '35', aav: 5000000, capHit: 5000000, capHitPct: 0.061, termYears: 5, endYear: 2026, totalValue: 25000000, expiryStatus: 'UFA' },
  ],
  VGK: [
    { ppId: '6365', name: 'Mitch Marner', pos: 'R', num: '93', aav: 12000000, capHit: 12000000, capHitPct: 0.126, termYears: 8, yearsLeft: 7, endYear: 2033, totalValue: 96000000, expiryStatus: 'UFA', clauseType: 'NMC' },
    { ppId: '6363', name: 'Jack Eichel', pos: 'C', num: '9', aav: 10000000, capHit: 10000000, capHitPct: 0.126, termYears: 8, endYear: 2026, totalValue: 80000000, expiryStatus: 'UFA', clauseType: 'NMC' },
    { ppId: '4049', name: 'Mark Stone', pos: 'R', num: '61', aav: 9500000, capHit: 9500000, capHitPct: 0.117, termYears: 8, yearsLeft: 1, endYear: 2027, totalValue: 76000000, expiryStatus: 'UFA', clauseType: 'NMC' },
    { ppId: '3009', name: 'Alex Pietrangelo', pos: 'D', num: '7', aav: 8800000, capHit: 8800000, capHitPct: 0.108, termYears: 7, yearsLeft: 1, endYear: 2027, totalValue: 61600000, expiryStatus: 'UFA', clauseType: 'NMC' },
    { ppId: '4791', name: 'Tomas Hertl', pos: 'C', num: '48', aav: 8137500, capHit: 8137500, capHitPct: 0.099, termYears: 8, yearsLeft: 4, endYear: 2030, totalValue: 65100000, expiryStatus: 'UFA', clauseType: 'M-NTC' },
    { ppId: '6437', name: 'Adin Hill', pos: 'G', num: '33', aav: 6250000, capHit: 6250000, capHitPct: 0.065, termYears: 6, yearsLeft: 5, endYear: 2031, totalValue: 37500000, expiryStatus: 'UFA', clauseType: 'M-NTC' },
    { ppId: '6766', name: 'Carter Hart', pos: 'G', num: '79', aav: 2000000, capHit: 2000000, capHitPct: 0.021, termYears: 2, yearsLeft: 1, endYear: 2027, totalValue: 4000000, expiryStatus: 'UFA' },
    { ppId: '17459', name: 'Akira Schmid', pos: 'G', num: '40', aav: 875000, capHit: 875000, capHitPct: 0.01, termYears: 2, endYear: 2026, totalValue: 1750000, expiryStatus: 'RFA' },
  ],
  WPG: [
    { ppId: '4376', name: 'Mark Scheifele', pos: 'C', num: '55', aav: 8500000, capHit: 8500000, capHitPct: 0.097, termYears: 7, yearsLeft: 5, endYear: 2031, totalValue: 59500000, expiryStatus: 'UFA', clauseType: 'NMC' },
    { ppId: '4904', name: 'Connor Hellebuyck', pos: 'G', num: '37', aav: 8500000, capHit: 8500000, capHitPct: 0.097, termYears: 7, yearsLeft: 5, endYear: 2031, totalValue: 59500000, expiryStatus: 'UFA', clauseType: 'NMC' },
    { ppId: '4904', name: 'Connor Hellebuyck', pos: 'G', num: '37', aav: 8500000, capHit: 8500000, capHitPct: 0.097, termYears: 7, yearsLeft: 5, endYear: 2031, totalValue: 59500000, expiryStatus: 'UFA', clauseType: 'NMC' },
    { ppId: '5688', name: 'Eric Comrie', pos: 'G', num: '1', aav: 825000, capHit: 825000, capHitPct: 0.009, termYears: 2, endYear: 2026, totalValue: 1650000, expiryStatus: 'UFA' },
  ],
  WSH: [
    { ppId: '1216', name: 'Alex Ovechkin', pos: 'L', num: '8', aav: 9500000, capHit: 9500000, capHitPct: 0.117, termYears: 5, endYear: 2026, totalValue: 47500000, expiryStatus: 'UFA', clauseType: 'M-NTC,NMC' },
    { ppId: '6734', name: 'Jakob Chychrun', pos: 'D', num: '6', aav: 9000000, capHit: 9000000, capHitPct: 0.094, termYears: 8, yearsLeft: 7, endYear: 2033, totalValue: 72000000, expiryStatus: 'UFA', clauseType: 'NMC' },
    { ppId: '6721', name: 'Pierre-Luc Dubois', pos: 'C', num: '80', aav: 8500000, capHit: 8500000, capHitPct: 0.102, termYears: 8, yearsLeft: 5, endYear: 2031, totalValue: 68000000, expiryStatus: 'UFA', clauseType: 'NMC' },
    { ppId: '3319', name: 'John Carlson', pos: 'D', num: '74', aav: 8000000, capHit: 8000000, capHitPct: 0.101, termYears: 8, endYear: 2026, totalValue: 64000000, expiryStatus: 'UFA', clauseType: 'M-NTC' },
  ],
};

// Lookup by team abbreviation. De-dupes exact-duplicate rows (same ppId) that
// occasionally appear in the raw scrape, so cap totals and roster counts never
// double-count a player. Keeps the first occurrence.
export const getTeamContracts = (abbr) => {
  const list = CONTRACTS_BY_TEAM[abbr] || [];
  const seen = new Set();
  return list.filter((c) => {
    if (c.ppId == null) return true;
    if (seen.has(c.ppId)) return false;
    seen.add(c.ppId);
    return true;
  });
};

// Legacy: lookup by NHL player ID (matches by name+number from roster).
// For backward compat with the old PLAYER_CONTRACTS[playerId] pattern.
export const PLAYER_CONTRACTS = {};

// Backward-compat helper used by ContractPanel.
export const getContract = (playerId) => {
  return PLAYER_CONTRACTS[playerId] || null;
};
