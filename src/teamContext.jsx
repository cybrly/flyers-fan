// Team context — provides the selected team abbreviation and color theme
// to the entire app. Replaces the hardcoded TEAM_ABBR constant with a
// dynamic value that a dropdown selector controls.

import { createContext, useContext, useState, useMemo, useCallback } from 'react';

const STORAGE_KEY = 'flyersfan.selected-team';

// 32-team color map: primary (strong accent) + accent (lighter text).
// Colors sourced from official team brand guides.
export const TEAM_COLORS = {
  ANA: { primary: '#F47A38', accent: '#F9A66C', name: 'Anaheim Ducks' },
  BOS: { primary: '#FFB81C', accent: '#FFD166', name: 'Boston Bruins' },
  BUF: { primary: '#003087', accent: '#6A8FC7', name: 'Buffalo Sabres' },
  CGY: { primary: '#D2001C', accent: '#E8555A', name: 'Calgary Flames' },
  CAR: { primary: '#CC0000', accent: '#E55555', name: 'Carolina Hurricanes' },
  CHI: { primary: '#CF0A2C', accent: '#E05555', name: 'Chicago Blackhawks' },
  COL: { primary: '#6F263D', accent: '#A25E73', name: 'Colorado Avalanche' },
  CBJ: { primary: '#002654', accent: '#5A7BA5', name: 'Columbus Blue Jackets' },
  DAL: { primary: '#006847', accent: '#4DAA84', name: 'Dallas Stars' },
  DET: { primary: '#CE1126', accent: '#E05A68', name: 'Detroit Red Wings' },
  EDM: { primary: '#041E42', accent: '#FF4C00', name: 'Edmonton Oilers' },
  FLA: { primary: '#041E42', accent: '#C8102E', name: 'Florida Panthers' },
  LAK: { primary: '#A2AAAD', accent: '#C8CDD0', name: 'LA Kings' },
  MIN: { primary: '#154734', accent: '#4D8B72', name: 'Minnesota Wild' },
  MTL: { primary: '#AF1E2D', accent: '#D05A64', name: 'Montreal Canadiens' },
  NSH: { primary: '#FFB81C', accent: '#FFD166', name: 'Nashville Predators' },
  NJD: { primary: '#CE1126', accent: '#E05A68', name: 'New Jersey Devils' },
  NYI: { primary: '#00539B', accent: '#5599CC', name: 'New York Islanders' },
  NYR: { primary: '#0038A8', accent: '#5577CC', name: 'New York Rangers' },
  OTT: { primary: '#C52032', accent: '#D86A74', name: 'Ottawa Senators' },
  PHI: { primary: '#F74902', accent: '#FF8A4C', name: 'Philadelphia Flyers' },
  PIT: { primary: '#FFB81C', accent: '#FFD166', name: 'Pittsburgh Penguins' },
  SJS: { primary: '#006D75', accent: '#4DA8AE', name: 'San Jose Sharks' },
  SEA: { primary: '#99D9D9', accent: '#BBE5E5', name: 'Seattle Kraken' },
  STL: { primary: '#002F87', accent: '#5577BB', name: 'St. Louis Blues' },
  TBL: { primary: '#002868', accent: '#5577AA', name: 'Tampa Bay Lightning' },
  TOR: { primary: '#00205B', accent: '#5566AA', name: 'Toronto Maple Leafs' },
  UTA: { primary: '#69B3E7', accent: '#99CCF0', name: 'Utah Mammoth' },
  VAN: { primary: '#00205B', accent: '#5566AA', name: 'Vancouver Canucks' },
  VGK: { primary: '#B4975A', accent: '#D4BB88', name: 'Vegas Golden Knights' },
  WPG: { primary: '#041E42', accent: '#5577AA', name: 'Winnipeg Jets' },
  WSH: { primary: '#C8102E', accent: '#E05A68', name: 'Washington Capitals' },
};

// All 32 team abbreviations sorted alphabetically for the dropdown.
export const ALL_TEAMS = Object.keys(TEAM_COLORS).sort();

const TeamContext = createContext(null);

export const TeamProvider = ({ children }) => {
  const [teamAbbr, setTeamAbbrState] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved && TEAM_COLORS[saved] ? saved : 'PHI';
    } catch { return 'PHI'; }
  });

  const setTeamAbbr = useCallback((abbr) => {
    if (!TEAM_COLORS[abbr]) return;
    setTeamAbbrState(abbr);
    try { localStorage.setItem(STORAGE_KEY, abbr); } catch { /* ignore */ }
  }, []);

  const colors = TEAM_COLORS[teamAbbr] || TEAM_COLORS.PHI;
  const teamName = colors.name;
  const isPHI = teamAbbr === 'PHI';

  const value = useMemo(() => ({
    teamAbbr,
    setTeamAbbr,
    colors,
    teamName,
    isPHI,
  }), [teamAbbr, setTeamAbbr, colors, teamName, isPHI]);

  return (
    <TeamContext.Provider value={value}>
      {children}
    </TeamContext.Provider>
  );
};

export const useTeam = () => {
  const ctx = useContext(TeamContext);
  if (!ctx) throw new Error('useTeam must be used inside TeamProvider');
  return ctx;
};
