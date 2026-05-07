// Curated player signatures — used by the Player Profile signature panel
// to give fans a reference image they can compare against signed merch.
//
// The NHL has no public signatures API; this is a manually maintained map
// keyed by player ID. Pull SVG/PNG sources from clearly licensed places
// (Wikipedia Commons is the typical home for athlete signatures, usually
// CC0 / CC-BY-SA). Always include a `source` and `license` so attribution
// is visible in the UI.
//
// Shape:
//   {
//     [playerId]: {
//       url:     'https://...svg',     // direct image URL
//       source:  'Wikipedia Commons',
//       sourceUrl: 'https://commons.wikimedia.org/wiki/File:...svg',
//       license: 'Public domain' | 'CC-BY-SA 4.0' | 'CC0' | ...,
//       added:   '2026-05-07',         // ISO date you added it
//       notes:   'optional context',
//     }
//   }
//
// Empty map = panel renders a "not on file" placeholder for every player.
// Add entries as you verify them — there's no NHL-side endpoint to fetch
// these from automatically.

export const PLAYER_SIGNATURES = {
  // Sean Couturier (PHI · #14)
  8476461: {
    url: '/autographs/couturier.png',
    source: 'Site collection',
    license: 'For reference only',
    added: '2026-05-07',
  },
  // Travis Konecny (PHI · #11)
  8478439: {
    url: '/autographs/konecny.png',
    source: 'Site collection',
    license: 'For reference only',
    added: '2026-05-07',
  },
  // Trevor Zegras (PHI · #46)
  8481533: {
    url: '/autographs/zegras.png',
    source: 'Site collection',
    license: 'For reference only',
    added: '2026-05-07',
  },
  // Jamie Drysdale (PHI · #9)
  8482142: {
    url: '/autographs/drysdale.png',
    source: 'Site collection',
    license: 'For reference only',
    added: '2026-05-07',
  },
  // Porter Martone (PHI · #94)
  8485406: {
    url: '/autographs/martone.png',
    source: 'Site collection',
    license: 'For reference only',
    added: '2026-05-07',
  },
  // Cam York (PHI · #8)
  8481546: {
    url: '/autographs/york.png',
    source: 'Site collection',
    license: 'For reference only',
    added: '2026-05-07',
  },
  // Alex Bump (PHI · #20)
  8483731: {
    url: '/autographs/bump.png',
    source: 'Site collection',
    license: 'For reference only',
    added: '2026-05-07',
  },
  // Noah Cates (PHI · #27)
  8480220: {
    url: '/autographs/cates.png',
    source: 'Site collection',
    license: 'For reference only',
    added: '2026-05-07',
  },
  // Garnet Hathaway (PHI · #19)
  8477903: {
    url: '/autographs/hathaway.png',
    source: 'Site collection',
    license: 'For reference only',
    added: '2026-05-07',
  },
  // Matvei Michkov (PHI · #39)
  8484387: {
    url: '/autographs/michkov.png',
    source: 'Site collection',
    license: 'For reference only',
    added: '2026-05-07',
  },
  // Rasmus Ristolainen (PHI · #55)
  8477499: {
    url: '/autographs/ristolainen.png',
    source: 'Site collection',
    license: 'For reference only',
    added: '2026-05-07',
  },
  // Travis Sanheim (PHI · #6)
  8477948: {
    url: '/autographs/sanheim.png',
    source: 'Site collection',
    license: 'For reference only',
    added: '2026-05-07',
  },
  // Nick Seeler (PHI · #24)
  8476372: {
    url: '/autographs/seeler.png',
    source: 'Site collection',
    license: 'For reference only',
    added: '2026-05-07',
  },
  // Owen Tippett (PHI · #74)
  8480015: {
    url: '/autographs/tippett.png',
    source: 'Site collection',
    license: 'For reference only',
    added: '2026-05-07',
  },
  // Dan Vladar (PHI · #80)
  8478435: {
    url: '/autographs/vladar.png',
    source: 'Site collection',
    license: 'For reference only',
    added: '2026-05-07',
  },
};

export const hasSignature = (playerId) => !!PLAYER_SIGNATURES[playerId];
export const getSignature = (playerId) => PLAYER_SIGNATURES[playerId] || null;
