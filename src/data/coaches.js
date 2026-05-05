// NHL head coaches — 2025–26 season.
//
// The public NHL API doesn't expose coach data directly (boxscore/right-rail
// includes coach name per game but no league-wide endpoint exists), so this
// is a manually curated table. Keep in mind coaching changes happen often
// mid-season; flag any stale entries via PR.
//
// Fields:
//   name        — current head coach
//   abbr        — team abbreviation (matches NHL API)
//   team        — full team name
//   hired       — year (or 'YYYY-MM') the current coach took the job
//   priorTeams  — short list of prior NHL head-coaching stints
//   highlight   — career notable: "Cup 2014" / "Calder 2018" / etc.
//   biography   — one-line career arc (player + coach mix)

export const COACHES = [
  { abbr: 'ANA', team: 'Anaheim Ducks',         name: 'Greg Cronin',         hired: '2023', priorTeams: ['CLR (AHL)', 'NTDP'], biography: 'Long-time AHL/college coach; first NHL HC job.' },
  { abbr: 'BOS', team: 'Boston Bruins',         name: 'Marco Sturm',         hired: '2025', priorTeams: ['Ontario Reign (AHL)', 'GER national team'], biography: 'Ex-Bruins forward; Olympic silver as German HC.' },
  { abbr: 'BUF', team: 'Buffalo Sabres',        name: 'Lindy Ruff',          hired: '2024', priorTeams: ['BUF (1997–2013)', 'DAL', 'NJD'], highlight: 'Jack Adams 2006', biography: 'Returns to Buffalo after 10+ year exile; franchise wins leader.' },
  { abbr: 'CGY', team: 'Calgary Flames',        name: 'Ryan Huska',          hired: '2023', priorTeams: ['Stockton/Calgary AHL'], biography: 'Promoted from associate; rebuild-era hire.' },
  { abbr: 'CAR', team: 'Carolina Hurricanes',   name: "Rod Brind'Amour",     hired: '2018', priorTeams: [], highlight: 'Jack Adams 2021', biography: 'Hall-of-Fame Hurricane captain turned franchise-defining coach.' },
  { abbr: 'CHI', team: 'Chicago Blackhawks',    name: 'Anders Sörensen',     hired: '2024-12', priorTeams: ['Rockford (AHL)'], biography: 'Interim turned full-time during Bedard-era rebuild.' },
  { abbr: 'COL', team: 'Colorado Avalanche',    name: 'Jared Bednar',        hired: '2016', priorTeams: ['Lake Erie (AHL)'], highlight: 'Stanley Cup 2022', biography: 'AHL Calder Cup winner; fast-paced offensive system.' },
  { abbr: 'CBJ', team: 'Columbus Blue Jackets', name: 'Dean Evason',         hired: '2024', priorTeams: ['MIN'], biography: 'Returned to NHL bench after Wild stint; defensive structure focus.' },
  { abbr: 'DAL', team: 'Dallas Stars',          name: 'Pete DeBoer',         hired: '2022', priorTeams: ['FLA', 'NJD', 'SJS', 'VGK'], biography: 'Four-time NHL HC; back-to-back conference final appearances with Dallas.' },
  { abbr: 'DET', team: 'Detroit Red Wings',     name: 'Todd McLellan',       hired: '2024-12', priorTeams: ['SJS', 'EDM', 'LAK'], biography: 'Took over mid-season for Lalonde; Cup Final assistant pedigree from Detroit.' },
  { abbr: 'EDM', team: 'Edmonton Oilers',       name: 'Kris Knoblauch',      hired: '2023', priorTeams: ['Hartford (AHL)'], biography: 'Lifted EDM to back-to-back Cup Finals after taking over for Woodcroft.' },
  { abbr: 'FLA', team: 'Florida Panthers',      name: 'Paul Maurice',        hired: '2022', priorTeams: ['HAR/CAR', 'TOR', 'WPG'], highlight: 'Stanley Cup 2024 · 2025', biography: 'Veteran motivator; back-to-back Cup champion in his fourth NHL stop.' },
  { abbr: 'LAK', team: 'Los Angeles Kings',     name: 'Jim Hiller',          hired: '2024', priorTeams: [], biography: 'Promoted from interim after McLellan exit; system-first approach.' },
  { abbr: 'MIN', team: 'Minnesota Wild',        name: 'John Hynes',          hired: '2023', priorTeams: ['NJD', 'NSH'], biography: 'Defensively responsible coach; long college and AHL background.' },
  { abbr: 'MTL', team: 'Montreal Canadiens',    name: 'Martin St. Louis',    hired: '2022', priorTeams: [], highlight: 'HHOF · Hart 2013', biography: 'Hall-of-Famer leading the Suzuki/Caufield rebuild — first NHL HC job.' },
  { abbr: 'NSH', team: 'Nashville Predators',   name: 'Andrew Brunette',     hired: '2023', priorTeams: ['FLA (interim)'], biography: 'Jack Adams runner-up with Florida; modern offensive system.' },
  { abbr: 'NJD', team: 'New Jersey Devils',     name: 'Sheldon Keefe',       hired: '2024', priorTeams: ['TOR'], biography: 'Hughes-era hire after Toronto; structured neutral-zone style.' },
  { abbr: 'NYI', team: 'New York Islanders',    name: 'Patrick Roy',         hired: '2024', priorTeams: ['COL'], highlight: 'HHOF goalie · 4× Cup', biography: 'Hall-of-Fame goalie; intense, accountability-first culture.' },
  { abbr: 'NYR', team: 'New York Rangers',      name: 'Mike Sullivan',       hired: '2025', priorTeams: ['BOS', 'PIT'], highlight: 'Stanley Cup 2016 · 2017', biography: 'Two-time Cup winner taking over Broadway after Pittsburgh tenure.' },
  { abbr: 'OTT', team: 'Ottawa Senators',       name: 'Travis Green',        hired: '2024', priorTeams: ['VAN', 'NJD (interim)'], biography: 'Disciplined defensive structure; rebuild-to-contender mandate.' },
  { abbr: 'PHI', team: 'Philadelphia Flyers',   name: 'John Tortorella',     hired: '2022', priorTeams: ['NYR', 'TBL', 'VAN', 'CBJ'], highlight: 'Stanley Cup 2004 · Jack Adams 2017', biography: 'Cup-winning veteran; demanding defensive style for the Flyers rebuild.' },
  { abbr: 'PIT', team: 'Pittsburgh Penguins',   name: 'Dan Muse',            hired: '2025', priorTeams: ['Asst. NSH/NYR'], biography: 'First-time NHL HC; Crosby-era continuity hire.' },
  { abbr: 'SJS', team: 'San Jose Sharks',       name: 'Ryan Warsofsky',      hired: '2024', priorTeams: ['SJ Barracuda'], biography: 'Promoted from AHL during the Sharks rebuild.' },
  { abbr: 'SEA', team: 'Seattle Kraken',        name: 'Lane Lambert',        hired: '2025', priorTeams: ['NYI'], biography: 'Replaced Bylsma after Kraken slow start; defensive structure.' },
  { abbr: 'STL', team: 'St. Louis Blues',       name: 'Jim Montgomery',      hired: '2024-11', priorTeams: ['DAL', 'BOS'], biography: 'Took over mid-season for Bannister; offensive-system advocate.' },
  { abbr: 'TBL', team: 'Tampa Bay Lightning',   name: 'Jon Cooper',          hired: '2013', priorTeams: ['Norfolk/Syracuse (AHL)'], highlight: 'Stanley Cup 2020 · 2021', biography: 'Longest-tenured active HC; cornerstone of TBL dynasty era.' },
  { abbr: 'TOR', team: 'Toronto Maple Leafs',   name: 'Craig Berube',        hired: '2024', priorTeams: ['STL', 'PHI (interim)'], highlight: 'Stanley Cup 2019', biography: 'Cup winner with St. Louis; brought in to add playoff edge.' },
  { abbr: 'UTA', team: 'Utah Mammoth',          name: 'André Tourigny',      hired: '2021', priorTeams: ['ARI'], biography: 'Brought to Utah from the Coyotes franchise relocation.' },
  { abbr: 'VAN', team: 'Vancouver Canucks',     name: 'Adam Foote',          hired: '2025', priorTeams: ['Asst. VAN'], highlight: 'Cup 1996 · 2001', biography: 'Cup-winning defenseman promoted from associate after Tocchet exit.' },
  { abbr: 'VGK', team: 'Vegas Golden Knights',  name: 'Bruce Cassidy',       hired: '2022', priorTeams: ['BOS'], highlight: 'Stanley Cup 2023 · Jack Adams 2020', biography: 'Cup winner in his first season with Vegas after Boston tenure.' },
  { abbr: 'WPG', team: 'Winnipeg Jets',         name: 'Scott Arniel',        hired: '2024', priorTeams: ['CBJ'], biography: 'Promoted from associate; built on Bowness-era foundation.' },
  { abbr: 'WSH', team: 'Washington Capitals',   name: 'Spencer Carbery',     hired: '2023', priorTeams: ['Asst. TOR'], highlight: 'Jack Adams 2024', biography: 'First NHL HC job; adapted Capitals into a top-defensive team.' },
];

// Quick lookup by team abbreviation.
export const COACH_BY_TEAM = Object.fromEntries(COACHES.map((c) => [c.abbr, c]));
