// Player gear loadouts — sourced from PuckPedia / GearGeek.com.
//
// Hand-curated like contracts and signatures. GearGeek is the canonical
// public source for what each player actually wears game-to-game; updates
// are infrequent (gear changes between seasons or when a player switches
// brands), so a quarterly refresh is plenty.
//
// Skater shape:
//   { stick, skates, gloves, helmet, pants, visor }
// Goalie shape:
//   { stick, skates, pads, glove, blocker, mask }
//
// Empty fields render as "—" in the panel; whole-loadout missing renders
// the placeholder.

const SKATER_GEAR_LABELS = ['Stick', 'Skates', 'Gloves', 'Helmet', 'Pants', 'Visor'];
const GOALIE_GEAR_LABELS = ['Stick', 'Skates', 'Pads', 'Glove', 'Blocker', 'Mask'];

const skater = (stick, skates, gloves, helmet, pants, visor) => ({
  kind: 'skater', stick, skates, gloves, helmet, pants, visor,
});
const goalie = (stick, skates, pads, glove, blocker, mask) => ({
  kind: 'goalie', stick, skates, pads, glove, blocker, mask,
});

export const PLAYER_GEAR = {
  // ── Skaters ────────────────────────────────────────────────────────
  8479022: skater('Bauer Nexus Tracer', 'Bauer Vapor FlyLite', 'Bauer Vapor HyperLite', 'Bauer Re-Akt 150', 'Bauer Pants', 'Bauer 55P X Cut'),                  // Abols
  8482126: skater('Bauer Nexus Tracer', 'Bauer Supreme Shadow', 'Bauer Vapor HyperLite', 'Bauer Re-Akt 150', 'CCM Pants', 'Oakley 831'),                       // Andrae
  8484142: skater('CCM JetSpeed FT8 Pro', 'Bauer Vapor FlyLite', 'CCM JetSpeed FT8 Pro', 'CCM Super Tacks X', 'CCM Pants', 'Oakley 831'),                      // Barkey
  8484148: skater('CCM Tacks XF Ghost', 'Bauer Supreme Fuse', 'CCM JetSpeed FT8 Pro', 'Bauer Re-Akt 150', 'CCM Pants', 'Oakley 825'),                          // Bonk
  8483731: skater('CCM Tacks XF Ghost', 'Bauer Supreme Shadow', 'CCM JetSpeed FT8 Pro', 'CCM Super Tacks X', 'CCM Pants', 'Bauer 55P Blade Cut'),              // Bump
  8480220: skater('CCM Tacks XF Ghost', 'CCM JetSpeed FT8 Pro', 'CCM Jetspeed FT1', 'CCM Super Tacks X', 'CCM Pants', 'Bauer 55P X Cut'),                      // Cates
  8476461: skater('Warrior Covert QR7 Pro', 'Bauer Vapor HyperLite 2', 'CCM Tacks XR Ghost', 'CCM Vector V08', 'CCM Pants', 'Oakley 825'),                     // Couturier
  8482142: skater('Bauer Pulse', 'Bauer Supreme Shadow', 'Bauer Vapor HyperLite', 'Bauer Re-Akt 150', 'Bauer Pants', 'Bauer 55P Blade Cut'),                   // Drysdale
  8477989: skater('CCM Tacks XF Ghost', 'Bauer Supreme 2S Pro', 'TRUE Catalyst 9X', 'CCM Super Tacks X', 'Bauer Pants', 'Oakley 831'),                         // Dvorak
  8482159: skater('CCM Tacks XF Ghost', 'CCM Vizion', 'Warrior Covert QRE', 'CCM Tacks 710', 'CCM Pants', 'Oakley 831'),                                       // Foerster
  8481848: skater('CCM Tacks XF Pro', 'Bauer Vapor HyperLite 2', 'CCM Jetspeed FT1', 'CCM Vector V08', 'CCM Pants', 'Oakley 825'),                             // Gaucher
  8476822: skater('CCM Tacks XF Ghost', 'Bauer Vapor 2X Pro', 'CCM JetSpeed FT8 Pro', 'CCM Vector V08', 'CCM Pants', 'Oakley 831'),                            // Glendening
  8482169: skater('CCM Tacks XF Pro', 'CCM JetSpeed FT6 Pro', 'CCM Jetspeed FT1', 'CCM Tacks 910', 'CCM Pants', 'Oakley 831'),                                 // Grans
  8483733: skater('CCM JetSpeed FT8 Pro', 'CCM JetSpeed FT6 Pro', 'CCM Jetspeed FT1', 'Bauer Re-Akt 150', 'CCM Pants', 'Bauer 55P Blade Cut'),                 // Grebenkin
  8479336: skater('Warrior Covert QR6 Pro', 'Bauer Vapor FlyLite', 'Warrior Alpha LX3 Pro', 'Warrior Covert PX2', 'Warrior Pants', 'Oakley 831'),              // Grundstrom
  8477903: skater('Bauer Nexus Tracer', 'TRUE SVH Custom', 'TRUE Catalyst 9X', 'CCM Super Tacks X', 'Bauer Pants', 'Oakley 825'),                              // Hathaway
  8483460: skater('CCM Ribcor Trigger 10 Pro', 'CCM Super Tacks AS3 Pro', 'CCM 4-Roll Pro', 'CCM Vector V08', 'CCM Pants', 'Bauer 55P X Cut'),                 // Jiricek
  8478454: skater('CCM Tacks XF Ghost', 'Bauer Vapor HyperLite 2', 'CCM Ultra Tacks', 'CCM Super Tacks X', 'CCM Pants', 'Oakley 825'),                         // Juulsen
  8478439: skater('Bauer Nexus Tracer', 'Bauer Supreme Shadow', 'Bauer Supreme Mach', 'Bauer 4500', 'Warrior Pants', 'Bauer 55P Blade Cut'),                   // Konecny
  8484779: skater('CCM JetSpeed FT8 Pro', 'Bauer Supreme Shadow', 'Bauer Vapor HyperLite', 'Bauer Re-Akt 150', 'CCM Pants', 'Oakley 825'),                     // Luchanko
  8485406: skater('Bauer Vapor FLYLITE', 'Bauer Vapor FlyLite', 'Bauer Vapor HyperLite', 'Bauer Re-Akt 150', 'Bauer Pants', 'Bauer 55P Blade Cut'),            // Martone
  8484387: skater('Warrior Alpha LX3 Pro', 'Bauer Supreme Shadow', 'Warrior Covert QRE', 'Bauer Re-Akt 95', 'Bauer Pants', 'Bauer 55P Blade Cut'),             // Michkov
  8477499: skater('Warrior Covert QR6 Pro', 'Bauer Supreme Mach', 'Warrior Alpha QX', 'CCM Vector V08', 'Warrior Pants', 'Oakley 825'),                        // Ristolainen
  8477948: skater('Warrior Covert QR6 Pro', 'Bauer Vapor HyperLite 2', 'Warrior Covert QRE', 'Bauer Re-Akt 100', 'Bauer Pants', 'Bauer 55P X Cut'),            // Sanheim
  8476372: skater('CCM Tacks XF Ghost', 'Bauer Vapor FlyLite', 'CCM 4-Roll Pro', 'CCM Vector V08', 'CCM Pants', 'Oakley 825'),                                 // Seeler
  8480015: skater('Bauer Pulse', 'Bauer Vapor FlyLite', 'Bauer Pro Series', 'Bauer Re-Akt 150', 'Bauer Pants', 'Bauer 55P X Cut'),                             // Tippett
  8475253: skater('Warrior Covert QR6 Pro', 'Bauer Vapor FlyLite', 'CCM Jetspeed FT1', 'Bauer 4500', 'CCM Pants', 'Bauer 55P Blade Cut'),                      // Wilson
  8481546: skater('Bauer Nexus Tracer', 'Bauer Vapor FlyLite', 'Bauer Vapor HyperLite', 'Bauer Re-Akt 95', 'Bauer Pants', 'Bauer 55P X Cut'),                  // York
  8481533: skater('Bauer Pulse', 'Bauer Vapor FlyLite', 'Bauer Vapor HyperLite', 'Bauer Re-Akt 150', 'Bauer Pants', 'Oakley 831'),                             // Zegras

  // ── Goalies ────────────────────────────────────────────────────────
  8481035: goalie('Warrior Ritual V4 RTL', 'TRUE TF Custom Pro', 'TRUE Catalyst Nitro Pro', 'TRUE Catalyst Nitro Pro', 'TRUE Catalyst Nitro Pro', 'Bauer 960'), // Ersson
  8482783: goalie('Bauer Vapor FlyLite', 'TRUE Custom SVH Two Piece', 'Bauer Supreme Shadow', 'Bauer Supreme Shadow', 'Bauer Supreme Shadow', 'Wall Pro'),     // Kolosov
  8478435: goalie('Bauer Vapor FlyLite', 'TRUE TF Custom Pro', 'Bauer Supreme Shadow', 'Bauer Supreme Shadow', 'Bauer Supreme Shadow', 'Bauer 960'),           // Vladar
};

export const hasGear = (playerId) => !!PLAYER_GEAR[playerId];
export const getGear = (playerId) => PLAYER_GEAR[playerId] || null;
export const getGearLabels = (kind) => kind === 'goalie' ? GOALIE_GEAR_LABELS : SKATER_GEAR_LABELS;
