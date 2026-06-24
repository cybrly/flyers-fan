import { useMemo, useState } from 'react';
import { Search, BookOpen } from 'lucide-react';
import { cx } from '../config.js';
import { Section, SectionBand } from '../components/primitives.jsx';

// Reference glossary for every metric, badge, and bit of jargon used on
// the rest of the site. Hockey carries a *lot* of acronyms and a casual
// fan landing on a stat-heavy page (Roster, Game Tape, Standings) can
// hit a wall fast — this page is the answer to "what does that mean?"
//
// Authored as a flat list of categories. Each entry has:
//   • term   — the headline label (full name)
//   • abbr   — the abbreviation as it appears on other pages
//   • desc   — plain-English explanation
//   • where  — comma-list of pages where it shows up
//   • note   — optional caveat or formula
//
// Search filters across term/abbr/desc/where so a user can hunt for
// exactly what they're staring at.

const CATEGORIES = [
  {
    id: 'skater',
    title: 'Skater Stats',
    color: 'orange',
    items: [
      { term: 'Goals',           abbr: 'G',     desc: 'A puck the player shot that crossed the goal line. Empty-net and shootout goals are tracked separately on the league side, but the basic G column on Game Tape and Roster is the simple count.', where: 'Game Tape · Roster · Player' },
      { term: 'Assists',         abbr: 'A',     desc: 'Credit for being one of the (up to two) last teammates to touch the puck before a goal. Primary = the pass that set up the shot; secondary = the pass before that.', where: 'Game Tape · Roster · Player' },
      { term: 'Points',          abbr: 'PTS / P', desc: 'Goals + assists. The headline production number for a skater.', where: 'Roster · Player · Compare · Trends' },
      { term: 'Plus / Minus',    abbr: '+/–',   desc: '+1 every time the player is on the ice for an even-strength or shorthanded goal scored by their team, –1 every time the other team scores in the same situation. Power-play and empty-net goals don\'t move the number.', where: 'Game Tape · Roster · Player', note: 'Context-light — strong teams inflate it, weak teams deflate it.' },
      { term: 'Shots on Goal',   abbr: 'SOG / S', desc: 'Shots the player put on net (saved or scored). Misses and blocks are tracked separately and are not counted here.', where: 'Game Tape · Roster · Player' },
      { term: 'Shooting %',      abbr: 'S%',    desc: 'Goals divided by shots on goal. League average for skaters hovers around 9–10%.', where: 'Roster · Player · Trends' },
      { term: 'Hits',            abbr: 'HIT',   desc: 'Body checks credited by the in-arena scorer. NHL hit counts are a notoriously noisy stat — home scorers tend to over-credit their team.', where: 'Game Tape · Roster · Player' },
      { term: 'Blocked Shots',   abbr: 'BLK',   desc: 'Opponent shot attempts the player blocked before they reached the net.', where: 'Game Tape · Roster · Player' },
      { term: 'Penalty Minutes', abbr: 'PIM',   desc: 'Total minutes the player has been assessed in penalties. A 5-minute fighting major counts more than the actual on-ice damage.', where: 'Game Tape · Roster · Player' },
      { term: 'Faceoff %',       abbr: 'FO% / FOW%', desc: 'Faceoffs the player won divided by faceoffs they took. Centers only — wingers don\'t take draws meaningfully.', where: 'Game Tape · Roster · Player', note: 'Rounded to two decimals on Game Tape so 50.00 doesn\'t collapse to 50.' },
      { term: 'Time on Ice',     abbr: 'TOI',   desc: 'Total minutes:seconds the player skated in this game (or per game on season views).', where: 'Game Tape · Roster · Player' },
      { term: 'Average TOI',     abbr: 'ATOI',  desc: 'Average minutes:seconds skated per game across the season. A first-line forward usually sits 18–22, a fourth-liner 9–12.', where: 'Roster · Player' },
      { term: 'Takeaways',       abbr: 'TK',    desc: 'Times the player won the puck off an opponent (interception, lift, poke). Subjective — credited by the in-arena scorer.', where: 'Game Tape' },
      { term: 'Giveaways',       abbr: 'GV',    desc: 'Times the player turned the puck over to an opponent. Lower is better.', where: 'Game Tape' },
      { term: 'Game-Winning Goal', abbr: 'GWG', desc: 'Goal that ended up being the difference-maker — if a team wins 4–2, the third goal is the GWG.', where: 'Roster · Player' },
      { term: 'Power-Play Goal',  abbr: 'PPG',  desc: 'Goal scored while the player\'s team was on a power play.', where: 'Roster · Player · Compare' },
      { term: 'Power-Play Points', abbr: 'PPP', desc: 'Goals + assists scored on the power play.', where: 'Roster · Player · Compare' },
      { term: 'Shorthanded Goal', abbr: 'SHG',  desc: 'Goal scored while the player\'s team was killing a penalty.', where: 'Roster · Player · Compare' },
      { term: 'Overtime Goal',    abbr: 'OTG',  desc: 'Goal scored in 3-on-3 overtime — always a game-winner by definition.', where: 'Roster · Player' },
      { term: 'Even-Strength Goal', abbr: 'EVG', desc: 'Goal scored at full strength (5-on-5 or any state where neither team has a power play).', where: 'Player' },
      { term: 'Goals per Game', abbr: 'G/GP', desc: 'Season goals divided by games played. Quick rate stat.', where: 'Roster · Player' },
      { term: 'Points per Game', abbr: 'P/GP', desc: 'Season points divided by games played. The standard "is this guy producing" rate.', where: 'Roster · Player' },
    ],
  },
  {
    id: 'goalie',
    title: 'Goalie Stats',
    color: 'sky',
    items: [
      { term: 'Wins',                abbr: 'W',     desc: 'Games where the goalie was on the ice when their team scored the winning goal.', where: 'Goalies · Player · Compare' },
      { term: 'Losses',              abbr: 'L',     desc: 'Regulation losses where the goalie was the goalie of record.', where: 'Goalies · Player · Compare' },
      { term: 'Overtime Losses',     abbr: 'OTL',   desc: 'Losses in overtime or shootout. Worth one standings point — different from a regulation L.', where: 'Goalies · Compare' },
      { term: 'Saves',               abbr: 'SV',    desc: 'Shots on goal the goalie stopped.', where: 'Game Tape · Goalies' },
      { term: 'Shots Against',       abbr: 'SA',    desc: 'Shots on goal the goalie faced (saves + goals against).', where: 'Game Tape · Goalies' },
      { term: 'Goals Against',       abbr: 'GA',    desc: 'Goals scored against the goalie while on the ice.', where: 'Game Tape · Goalies' },
      { term: 'Goals-Against Avg',   abbr: 'GAA',   desc: 'Goals against per 60 minutes played. Lower is better; the league average sits in the 2.7–2.9 range.', where: 'Goalies · Compare', note: 'Formula: (GA × 60) / minutes played.' },
      { term: 'Save %',              abbr: 'SV%',   desc: 'Saves divided by shots against. .910 is roughly league average; .920+ is starter-grade; .900 is a problem.', where: 'Game Tape · Goalies · Compare' },
      { term: 'Shutouts',            abbr: 'SO',    desc: 'Games the goalie played the entire 60 minutes and gave up zero goals.', where: 'Goalies · Compare' },
      { term: 'Quality Start %',     abbr: 'QS%',   desc: 'Share of starts where the goalie\'s save percentage matched or beat league-average. Better signal than W/L because team scoring doesn\'t skew it.', where: 'Goalies · Compare' },
      { term: 'Goals Saved Above Expected', abbr: 'GSAx / GSAE', desc: 'How many goals a goalie has prevented compared to a league-average netminder facing the same shots. Positive = above average. Built off the lightweight xG model.', where: 'Goalies · Trends', note: 'Requires shot location data; absent on partial-game feeds.' },
      { term: 'Zone Save %',         abbr: '—',     desc: 'Save % broken out by where the shot came from on the ice (slot, point, perimeter). Highlights whether a goalie is being beaten on bad shots vs being hung out to dry.', where: 'Game Tape · Goalies' },
    ],
  },
  {
    id: 'team',
    title: 'Team & Standings',
    color: 'amber',
    items: [
      { term: 'Games Played',  abbr: 'GP',    desc: 'Games the team has played in the regular season so far. The schedule is 82.', where: 'Standings · Dashboard' },
      { term: 'Record',        abbr: 'W–L–OT', desc: 'Wins, regulation/OT losses, and overtime/shootout losses. Each W = 2 points, each OT loss = 1 point, regulation L = 0.', where: 'Dashboard · Standings · Hero' },
      { term: 'Points',        abbr: 'PTS',   desc: 'Total standings points. The number that actually decides who makes the playoffs.', where: 'Dashboard · Standings' },
      { term: 'Points %',      abbr: 'P%',    desc: 'Points earned divided by max possible (GP × 2). Better than raw points when teams have played different numbers of games.', where: 'Standings · Dashboard' },
      { term: 'Goals For',     abbr: 'GF',    desc: 'Total goals the team has scored.', where: 'Standings · Dashboard' },
      { term: 'Goals Against', abbr: 'GA',    desc: 'Total goals the team has allowed.', where: 'Standings · Dashboard' },
      { term: 'Goal Differential', abbr: 'DIFF / +/-', desc: 'GF minus GA. Best single signal of true team strength early in a season — it shrinks the noise of one-goal results.', where: 'Standings · Dashboard · Trends' },
      { term: 'Streak',        abbr: 'STRK',  desc: 'Most recent run of consecutive wins or losses (e.g. W4 = four wins in a row, L2 = two losses).', where: 'Standings · Hero' },
      { term: 'Last 10',       abbr: 'L10',   desc: 'Record over the team\'s last 10 games — quick read on current form.', where: 'Standings · Dashboard' },
      { term: 'Regulation Wins', abbr: 'RW',  desc: 'Wins finished in regulation (no OT or shootout). First tiebreaker in the standings.', where: 'Standings' },
      { term: 'Regulation + OT Wins', abbr: 'ROW', desc: 'Wins in regulation OR overtime — excludes shootout wins. Second tiebreaker.', where: 'Standings' },
      { term: 'Power Play %',  abbr: 'PP%',   desc: 'Percentage of power plays converted into goals. League average lives around 20%.', where: 'Roster · Trends' },
      { term: 'Penalty Kill %', abbr: 'PK%',  desc: 'Percentage of opponent power plays the team kills. League average ~80%.', where: 'Roster · Trends' },
      { term: 'Shots / Game',  abbr: 'SOG/GP', desc: 'Average shots on goal per game. Volume signal — high SOG with low GF means bad finishing or hot opposing goalie.', where: 'Trends · Roster' },
    ],
  },
  {
    id: 'game',
    title: 'Game Tape & Boxscore',
    color: 'emerald',
    items: [
      { term: 'Power Play (game)', abbr: '1/4', desc: 'In a game boxscore the format is goals / opportunities — "1/4" means 1 goal on 4 power plays.', where: 'Game Tape' },
      { term: 'PIM',           abbr: 'PIM',   desc: 'Penalty minutes accrued by the team in this game. High PIM with a lost game usually means discipline issues.', where: 'Game Tape' },
      { term: 'Three Stars',   abbr: '★ 1·2·3', desc: 'Three best players from the game, voted by media or scorers. First star = top performer.', where: 'Game Tape · Dashboard' },
      { term: 'Faceoff %',     abbr: 'FO%',   desc: 'Game-level faceoff win rate. Above 50 = won the dot.', where: 'Game Tape' },
      { term: 'Hits',          abbr: 'HIT',   desc: 'Total team body checks for the game.', where: 'Game Tape' },
      { term: 'Blocks',        abbr: 'BLK',   desc: 'Total opponent shot attempts the team\'s skaters blocked.', where: 'Game Tape' },
      { term: 'Takeaways / Giveaways', abbr: 'TK / GV', desc: 'Total puck-possession swings credited by the in-arena scorer.', where: 'Game Tape' },
      { term: 'Skater Tracker', abbr: '—',    desc: 'Side-by-side PHI / opponent skater table on Game Tape. Currently-on-ice players light up green during a live game; otherwise it shows the final boxscore.', where: 'Game Tape' },
      { term: 'Line Chemistry', abbr: '—',    desc: 'Top forward trios sorted by shared on-ice time. Computed live from shift overlaps — these are the lines that actually played, not the chalkboard combos.', where: 'Game Tape (live)' },
    ],
  },
  {
    id: 'shots',
    title: 'Shot Map & Expected Goals',
    color: 'warm',
    items: [
      { term: 'Expected Goals', abbr: 'xG',   desc: 'Probability a given shot becomes a goal, based on distance, angle, and shot type. A 0.30 xG shot is a 30% scoring chance.', where: 'Game Tape · Live Shot Ticker', note: 'Lightweight in-house model — directional rather than perfectly calibrated. Use it for "was that a good chance?" not for trade analysis.' },
      { term: 'High-Danger',   abbr: 'HD',    desc: 'Shot from the slot or low inside the dots — historically the highest-conversion areas. Flagged orange on the shot map.', where: 'Game Tape · Goalie Heat Map' },
      { term: 'Medium-Danger', abbr: 'MD',    desc: 'Shot from the upper slot or wide of the slot — moderate scoring chance.', where: 'Game Tape' },
      { term: 'Low-Danger',    abbr: 'LD',    desc: 'Long-distance / sharp-angle shot. Most shots from the point fall here.', where: 'Game Tape' },
      { term: 'Shot Map',      abbr: '—',     desc: 'Plot of every shot attempt overlaid on the offensive zone — orange dots are PHI, white are the opponent.', where: 'Game Tape' },
      { term: 'Goalie Heat Map', abbr: '—',   desc: 'Save / goal locations on the net itself — shows whether goals beat the goalie high, low, glove, or blocker.', where: 'Game Tape' },
    ],
  },
  {
    id: 'strength',
    title: 'Strength States',
    color: 'sky',
    items: [
      { term: 'Even Strength', abbr: 'EV / 5v5', desc: 'Both teams have the same number of skaters on the ice (usually 5v5).', where: 'Game Tape · Player · Broadcast' },
      { term: 'Power Play',    abbr: 'PP',    desc: 'One team has more skaters than the other due to a penalty (5v4, 5v3, or 4v3).', where: 'Game Tape · Broadcast · Trends' },
      { term: 'Penalty Kill',  abbr: 'PK',    desc: 'The shorthanded side of a power play — the team being one or two skaters down.', where: 'Game Tape · Broadcast' },
      { term: 'Empty Net',     abbr: 'EN',    desc: 'A team has pulled their goalie for a sixth attacker, usually late in a game when trailing by a goal or two.', where: 'Game Tape · Goal events' },
      { term: 'Overtime',      abbr: 'OT',    desc: 'Regular-season OT is 5 minutes of 3-on-3, sudden-death. Playoff OT is 20-minute periods of 5-on-5 until a goal.', where: 'Game Tape · Standings' },
      { term: 'Shootout',      abbr: 'SO',    desc: 'Regular-season tiebreaker after OT — alternating 1-on-0 attempts. Best of 3 then sudden-death rounds.', where: 'Game Tape · Standings' },
    ],
  },
  {
    id: 'contracts',
    title: 'Contracts & Salary Cap',
    color: 'amber',
    items: [
      { term: 'Cap Hit / AAV',     abbr: 'AAV',  desc: 'Average annual value of a contract, charged against the salary cap regardless of actual cash paid that year. Total dollars ÷ contract years.', where: 'Roster · Player · Salary Cap' },
      { term: 'Salary Cap Ceiling', abbr: 'CAP', desc: 'NHL-wide spending limit per team per season. Currently $95.5M.', where: 'Roster' },
      { term: 'Cap Space',         abbr: '—',    desc: 'Cap ceiling minus the team\'s projected cap hit. What\'s left to spend on free agents or absorb in trades.', where: 'Roster · Salary Cap' },
      { term: 'LTIR Pool',         abbr: 'LTIR', desc: 'Long-Term Injured Reserve relief — a team can spend over the cap ceiling by the AAV of an LTIR-placed player while they\'re out.', where: 'Roster · Salary Cap' },
      { term: 'Term',              abbr: '—',    desc: 'How many years the contract runs.', where: 'Player · Roster' },
      { term: 'Years Remaining',   abbr: 'Yrs Left', desc: 'Years left on the deal after the current season.', where: 'Player · Roster' },
      { term: 'Unrestricted Free Agent', abbr: 'UFA', desc: 'When the contract expires the player can sign with any team. Generally requires age 27+ or 7 accrued seasons.', where: 'Roster · Contracts' },
      { term: 'Restricted Free Agent', abbr: 'RFA', desc: 'When the contract expires the original team has matching rights. Younger players coming off ELC usually become RFAs first.', where: 'Roster · Contracts' },
      { term: 'Entry-Level Contract', abbr: 'ELC', desc: 'First NHL contract for a drafted player. 1–3 years, capped base salary, with performance bonuses on top.', where: 'Player' },
      { term: 'No-Movement Clause', abbr: 'NMC', desc: 'Player can\'t be traded, waived, or sent to the minors without their consent. Strongest contract protection.', where: 'Player · Contracts' },
      { term: 'No-Trade Clause',   abbr: 'NTC',  desc: 'Player can block trades — sometimes a list of teams they\'ll accept, sometimes a list they refuse.', where: 'Player · Contracts' },
    ],
  },
  {
    id: 'state',
    title: 'NHL Game States',
    color: 'default',
    items: [
      { term: 'Future',     abbr: 'FUT',   desc: 'Game is scheduled but not yet near puck drop.', where: 'Schedule · Hero' },
      { term: 'Pre-Game',   abbr: 'PRE',   desc: 'Roughly the 30 minutes before puck drop — warmups in progress.', where: 'Schedule · Hero' },
      { term: 'Live',       abbr: 'LIVE',  desc: 'Game is in progress. Live data — score, clock, on-ice — is being streamed.', where: 'Hero · Game Tape · Broadcast' },
      { term: 'Critical',   abbr: 'CRIT',  desc: 'Inside the final 5 minutes of regulation or any time during OT/shootout. Same as LIVE but flagged for late-game suspense.', where: 'Game Tape' },
      { term: 'Final',      abbr: 'FINAL', desc: 'Buzzer has sounded; result is settled.', where: 'Schedule · Game Tape' },
      { term: 'Off',        abbr: 'OFF',   desc: 'NHL\'s "results posted" state — equivalent to FINAL for our purposes.', where: 'Schedule' },
    ],
  },
  {
    id: 'ui',
    title: 'UI Indicators & Badges',
    color: 'orange',
    items: [
      { term: 'Hot / Cold',    abbr: '🔥 / ❄️',  desc: 'Player\'s recent scoring vs season pace. Hot = exceeding their usual rate over the last 10 games; cold = below it.', where: 'Roster · Player · Hero' },
      { term: 'Live Freshness', abbr: '● live · stream · Ns ago', desc: 'On Game Tape, shows whether live data is currently flowing. Green = fresh; amber > 8s old; red > 30s. "stream" = SSE; "poll" = REST fallback.', where: 'Game Tape' },
      { term: 'Form Dots',     abbr: '● ● ● ● ●', desc: 'Last five results, oldest on the left. Filled orange = win; muted = loss.', where: 'Hero · Player · Trends' },
      { term: 'Streak Chip',   abbr: '—',     desc: 'Hero banner badge — fires only on win streaks of 3+ or losing skids of 4+, otherwise hidden.', where: 'Hero' },
      { term: 'PP Banner',     abbr: '—',     desc: 'Broadcast view full-width strip during a live power play — shows the on-PP team, strength differential (5-on-4), and time remaining.', where: 'Broadcast' },
      { term: 'Goal Blast',    abbr: '—',     desc: 'Broadcast view full-screen celebration on a goal — scoring team\'s logo flashes 3× with a colored viewport-edge glow. ~5 seconds.', where: 'Broadcast' },
    ],
  },
  {
    id: 'misc',
    title: 'Schedule & Travel',
    color: 'sky',
    items: [
      { term: 'Back-to-Back',  abbr: 'B2B',   desc: 'Two games on consecutive calendar days. Tougher schedule slot — fatigue stacks.', where: 'Schedule · Forecast' },
      { term: 'Long Travel',   abbr: '1.5k+', desc: 'Flight legs over 1,500 miles between consecutive arenas. Used for Forecast/Trends fatigue context.', where: 'Schedule · Trends' },
      { term: 'Miles Flown',   abbr: '—',     desc: 'Cumulative travel distance for the season — coast-heavy schedules add up fast.', where: 'Schedule' },
      { term: 'Rested',        abbr: '—',     desc: 'Game where the team had ≥2 calendar days off going in.', where: 'Schedule · Forecast' },
    ],
  },
];

const ALL_ITEMS = CATEGORIES.flatMap((c) => c.items.map((it) => ({ ...it, categoryId: c.id, categoryTitle: c.title })));

export const Definitions = () => {
  const [q, setQ] = useState('');
  const [activeCat, setActiveCat] = useState('all');

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return CATEGORIES.map((cat) => ({
      ...cat,
      items: cat.items.filter((it) => {
        if (activeCat !== 'all' && activeCat !== cat.id) return false;
        if (!needle) return true;
        return [it.term, it.abbr, it.desc, it.where, it.note]
          .filter(Boolean)
          .some((s) => s.toLowerCase().includes(needle));
      }),
    })).filter((cat) => cat.items.length > 0);
  }, [q, activeCat]);

  const total = filtered.reduce((sum, c) => sum + c.items.length, 0);

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            <BookOpen size={18} className="text-[var(--team-accent)]" />
            <h1 className="text-[20px] font-semibold tracking-tight">Definitions</h1>
          </div>
          <p className="text-[12px] text-white/45 mt-1 font-mono">
            Every metric, abbreviation, and badge used across the site — explained in plain English.
            <span className="hidden sm:inline"> {ALL_ITEMS.length} entries · search any column.</span>
          </p>
        </div>
        <div className="flex items-center gap-2 px-2.5 h-8 border border-white/[0.08] focus-within:border-[var(--team-accent)]/50 bg-white/[0.02] rounded-md">
          <Search size={12} className="text-white/40" />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search FO%, GAA, NMC…"
            className="bg-transparent text-[12px] outline-none placeholder:text-white/30 w-48 sm:w-64"
          />
          {q && (
            <button onClick={() => setQ('')} className="text-[10px] font-mono text-white/40 hover:text-white">
              clear
            </button>
          )}
        </div>
      </div>

      {/* Category filter row — chips that scope the search to one category */}
      <div className="flex items-center gap-1 flex-wrap">
        <CategoryChip id="all" label="All" count={ALL_ITEMS.length} active={activeCat === 'all'} onClick={() => setActiveCat('all')} />
        {CATEGORIES.map((c) => (
          <CategoryChip key={c.id} id={c.id} label={c.title} count={c.items.length} active={activeCat === c.id} onClick={() => setActiveCat(c.id)} />
        ))}
      </div>

      {q && (
        <div className="text-[11px] font-mono text-white/45">
          {total} match{total === 1 ? '' : 'es'} for "<span className="text-white/85">{q}</span>"
        </div>
      )}

      {filtered.length === 0 && (
        <Section title="No matches">
          <div className="px-4 py-8 text-center text-[12px] font-mono text-white/40">
            Nothing here for "{q}". Try a shorter search — e.g. "save", "cap", "TOI".
          </div>
        </Section>
      )}

      {filtered.map((cat) => (
        <div key={cat.id} className="space-y-2">
          <SectionBand label={cat.title} color={cat.color} sub={`${cat.items.length} term${cat.items.length === 1 ? '' : 's'}`} />
          <div className="border border-white/[0.05] rounded-md bg-[#0A0A0A] divide-y divide-white/[0.04] overflow-hidden">
            {cat.items.map((it) => <DefinitionRow key={`${cat.id}-${it.term}`} item={it} highlight={q} />)}
          </div>
        </div>
      ))}

      <div className="text-[10px] font-mono text-white/35 leading-relaxed pt-2">
        Don’t see a metric? It probably comes from one of the season-long club-stats endpoints —
        send a note via the issues link in the footer and we’ll add it.
      </div>
    </div>
  );
};

const CategoryChip = ({ id, label, count, active, onClick }) => (
  <button
    onClick={onClick}
    className={cx(
      'px-2.5 h-7 inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider rounded-md border transition-colors',
      active
        ? 'border-[var(--team-primary)]/55 bg-[var(--team-primary)]/[0.10] text-[var(--team-accent)]'
        : 'border-white/[0.08] bg-white/[0.02] text-white/55 hover:text-white hover:border-white/20',
    )}
  >
    <span>{label}</span>
    <span className={cx('text-[9px] tabular-nums', active ? 'text-[var(--team-accent)]/70' : 'text-white/30')}>
      {count}
    </span>
  </button>
);

const DefinitionRow = ({ item, highlight }) => {
  const hl = highlight?.trim();
  return (
    <div className="grid grid-cols-1 md:grid-cols-[160px_1fr_180px] gap-x-4 gap-y-1 px-4 py-3 hover:bg-white/[0.02]">
      <div className="flex items-baseline gap-2 flex-wrap">
        <span className="text-[14px] font-semibold tracking-tight text-white">
          <Highlighted text={item.term} q={hl} />
        </span>
        {item.abbr && item.abbr !== '—' && (
          <span className="text-[10px] font-mono text-[var(--team-accent)] uppercase tracking-wider px-1.5 py-0.5 rounded border border-[var(--team-primary)]/30 bg-[var(--team-primary)]/[0.06]">
            <Highlighted text={item.abbr} q={hl} />
          </span>
        )}
      </div>
      <div className="min-w-0">
        <div className="text-[12px] text-white/75 leading-relaxed">
          <Highlighted text={item.desc} q={hl} />
        </div>
        {item.note && (
          <div className="text-[10px] font-mono text-white/45 mt-1.5 italic">
            note · <Highlighted text={item.note} q={hl} />
          </div>
        )}
      </div>
      {item.where && (
        <div className="text-[10px] font-mono text-white/40 uppercase tracking-wider md:text-right md:pl-4 self-baseline">
          <span className="text-white/30">seen on · </span>
          <Highlighted text={item.where} q={hl} />
        </div>
      )}
    </div>
  );
};

// Inline keyword highlight — splits the body on the search needle and
// wraps matches in an orange-tinted span. Case-insensitive but preserves
// the original casing in the rendered output.
const Highlighted = ({ text, q }) => {
  if (!q || !text) return <>{text}</>;
  const needle = q.toLowerCase();
  const lower = text.toLowerCase();
  const out = [];
  let i = 0;
  while (i < text.length) {
    const idx = lower.indexOf(needle, i);
    if (idx === -1) { out.push(text.slice(i)); break; }
    if (idx > i) out.push(text.slice(i, idx));
    out.push(
      <span key={idx} className="bg-[var(--team-primary)]/20 text-[var(--team-accent)] rounded-sm">
        {text.slice(idx, idx + needle.length)}
      </span>
    );
    i = idx + needle.length;
  }
  return <>{out.map((part, k) => typeof part === 'string' ? <span key={k}>{part}</span> : part)}</>;
};

export default Definitions;
