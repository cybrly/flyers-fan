// "This day in Flyers history" — curated milestones keyed by MM-DD so the
// Dashboard panel auto-rolls forever without code changes. Entries are
// public-record events: Stanley Cups, retired numbers, captaincy changes,
// notable trades, founder-era milestones. Keep it tight: 1–2 lines max
// per entry; the panel only shows the most notable when multiple match.
//
// Add new entries with the most-notable-first ordering within a date.

export const FLYERS_HISTORY = [
  // Cup wins + Finals appearances
  { md: '05-19', year: 1974, title: 'First Stanley Cup', detail: 'Flyers beat Bruins 1-0 in Game 6, becoming the first expansion team to win the Cup.' },
  { md: '05-27', year: 1975, title: 'Back-to-back Cups', detail: 'Flyers sweep Sabres 4 games to 2 to repeat as Stanley Cup champions.' },
  { md: '05-31', year: 2010, title: 'Reach Stanley Cup Final', detail: 'Flyers defeat Canadiens to advance to the SCF for the first time since 1997.' },
  { md: '06-09', year: 2010, title: 'Stanley Cup Final Game 6', detail: 'Patrick Kane wins the Cup for Chicago in OT; Flyers fall in 6.' },

  // Captaincy
  { md: '01-19', year: 1973, title: 'Bobby Clarke named captain', detail: 'At age 23, Clarke becomes the youngest captain in NHL history at the time.' },
  { md: '09-12', year: 2008, title: 'Mike Richards named captain', detail: 'Richards inherits the C from Jason Smith for the 2008–09 season.' },
  { md: '09-30', year: 2013, title: 'Claude Giroux named captain', detail: 'Giroux succeeds Chris Pronger to become the 19th captain in franchise history.' },
  { md: '01-12', year: 2023, title: 'Sean Couturier named captain', detail: 'Couturier becomes the 20th captain after Giroux’s 2022 trade to Florida.' },

  // Retired numbers
  { md: '11-15', year: 1984, title: '#16 Bobby Clarke retired', detail: 'Clarke’s number lifted to the rafters at the Spectrum.' },
  { md: '03-06', year: 1990, title: '#7 Bill Barber retired', detail: 'Barber’s number raised; he remains a top-3 all-time goal scorer for Philadelphia.' },
  { md: '10-11', year: 1979, title: '#1 Bernie Parent retired', detail: 'Two-time Conn Smythe winner becomes the first Flyer to have his number retired.' },

  // Trades + signings
  { md: '02-23', year: 1992, title: 'Eric Lindros trade announced', detail: 'Flyers acquire Lindros from Quebec for six players, two draft picks, and $15M.' },
  { md: '06-23', year: 2011, title: 'Pronger / Richards / Carter shake-up', detail: 'In a 24-hour stretch, Flyers move Richards to LA and Carter to Columbus, signing Bryzgalov.' },
  { md: '03-19', year: 2022, title: 'Giroux traded to Florida', detail: 'After 1,000 games and 13 seasons, Giroux is dealt to the Panthers for picks and Provorov-era prospects.' },

  // On-ice events
  { md: '02-11', year: 1976, title: 'Flyers vs Red Army', detail: 'In one of the most famous exhibitions ever, the Flyers beat CSKA Moscow 4-1.' },
  { md: '04-19', year: 1976, title: 'Reggie Leach 5-goal playoff game', detail: 'Leach scores 5 goals in a single playoff game vs Boston, an NHL record.' },
  { md: '05-09', year: 2008, title: 'Briere OT winner vs Habs', detail: 'Daniel Briere ends Game 5 in OT to push the Flyers to the conference final.' },
  { md: '12-31', year: 2011, title: 'Winter Classic at Citizens Bank Park', detail: 'Flyers fall to Rangers 3-2 in the franchise’s first outdoor regular-season game.' },

  // Franchise milestones
  { md: '06-05', year: 1967, title: 'Flyers founded', detail: 'Philadelphia awarded an NHL franchise as part of the league’s six-team expansion.' },
  { md: '09-11', year: 2018, title: 'Gritty introduced', detail: 'The googly-eyed orange mascot debuts at a community event, instantly becoming a viral sensation.' },
];

// Returns up to N entries that match today's MM-DD, sorted by year descending
// (most recent first). Returns an empty array on dates with no entries.
export function todaysHistory(now = new Date(), limit = 3) {
  const md = `${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  return FLYERS_HISTORY
    .filter((e) => e.md === md)
    .sort((a, b) => b.year - a.year)
    .slice(0, limit);
}
