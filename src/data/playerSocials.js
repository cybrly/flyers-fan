// Curated social-handle map for NHL players, indexed by NHL playerId.
//
// Why curated: the NHL public API does not expose social-media handles. To
// avoid linking to the wrong account (e.g. a fan account or someone with the
// same name), a handle only renders as a direct link when it has been
// manually added here. Players without a curated entry get a search-link
// fallback so visitors can find the official account on the platform.
//
// Format: PLAYER_SOCIALS[playerId] = { instagram?: 'handle', x?: 'handle' }
// Handles must NOT include the leading "@".
//
// Add entries as you confirm them (Wikipedia, NHL.com player page, the
// player's own bio). Remove any that turn out to be wrong.
export const PLAYER_SOCIALS = {
  // Examples (left empty intentionally — populate as confirmed):
  // 8478439: { instagram: 'kone_11', x: 'TKonecny11' },  // Travis Konecny
  // 8484144: { instagram: 'matvei.michkov' },             // Matvei Michkov
};
