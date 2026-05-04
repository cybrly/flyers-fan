import { createContext, useContext } from 'react';

// Player drilldown is wired up via context so any nested element (skater
// rows, leaderboards, three-stars, goal scorers, roster) can call openPlayer
// without prop-drilling.
export const PlayerCtx = createContext({ open: () => {}, close: () => {} });
export const usePlayerModal = () => useContext(PlayerCtx);
