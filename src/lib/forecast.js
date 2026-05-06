// Monte Carlo playoff-odds engine.
//
// Inputs:
//   • standings.all — every team's current { gp, w, l, ot, pts, pct, gf, ga, abbr, division, conference }
//   • remainingGames — array of unique scheduled games { home, away } not yet played
//
// Output: per-team outcome distribution { divWin, top3, wildcard, missed, ranks, pointsDist, expPts }
// plus run metadata { runs, ourAbbr, simulatedGames }
//
// Win-probability model (deliberately simple):
//   p(home wins) = clamp(0.06 + (homeStrength - awayStrength) * 0.7 + homeIce, 0.10, 0.90)
//   where strength is points% (Pts / max(GP*2, 1)) — converges to 0.5 once
//   GP > 0 so early-season weirdness self-corrects, and .50 is the no-info
//   fallback for teams without data.
//
// Outcome distribution per game (after winner is decided):
//   ~22% of NHL games go past regulation → loser gets 1 point
//   ~78% finish in regulation → loser gets 0 points
//
// Ranking:
//   Within each division, teams are sorted by points then ROW (we don't have
//   ROW per team in our adapter, so we fall back to wins which is a close
//   proxy after a full season). Top 3 per division auto-qualify; top 2
//   non-top-3 in each conference fill the wild-card slots.

const HOME_ICE = 0.035;
const OT_PROB  = 0.22;
const NO_INFO_STRENGTH = 0.5;

const strength = (team) => {
  if (!team || !team.gp || team.gp <= 0) return NO_INFO_STRENGTH;
  return team.pts / (team.gp * 2);
};

const winProb = (home, away) => {
  const sH = strength(home);
  const sA = strength(away);
  const raw = 0.5 + (sH - sA) * 0.7 + HOME_ICE;
  return Math.max(0.10, Math.min(0.90, raw));
};

// Mulberry32 — fast deterministic PRNG. Lets us reproduce results when
// the user re-runs the sim with the same seed; we don't expose the seed
// in the UI but it's there if we ever want a "share this scenario" link.
const mulberry32 = (seed) => () => {
  let t = (seed += 0x6D2B79F5);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const compareForRank = (a, b) => {
  if (b.simPts !== a.simPts) return b.simPts - a.simPts;
  if (b.simWins !== a.simWins) return b.simWins - a.simWins;
  if (b.simGF !== a.simGF) return b.simGF - a.simGF;
  return 0;
};

export function runForecast({ standingsAll, remainingGames, ourAbbr, runs = 10000, seed = 1 }) {
  if (!standingsAll?.length) return null;
  const rand = mulberry32(seed);

  // Build a cheap lookup: abbr → index in our team array, plus a baseline
  // record snapshot we'll reset to at the start of each simulation run.
  const teams = standingsAll.map((t) => ({
    abbr: t.abbr,
    division: t.division,
    conference: t.conference,
    gp: t.gp || 0,
    pts: t.pts || 0,
    w: t.w || 0,
    gf: t.gf || 0,
    ga: t.ga || 0,
    pct: t.pct || 0,
  }));
  const idx = new Map(teams.map((t, i) => [t.abbr, i]));

  // Aggregators per team:
  //   divWin / top3 / wildcard / missed counts → divide by runs at end
  //   ranks[i][k] = number of times team k finished at division-rank i+1
  //   pointsDist sparse map of { points: count } for histogram
  //   expPts running sum
  const divWin = new Array(teams.length).fill(0);
  const top3 = new Array(teams.length).fill(0);
  const wildcard = new Array(teams.length).fill(0);
  const missed = new Array(teams.length).fill(0);
  const expPts = new Array(teams.length).fill(0);
  const expWins = new Array(teams.length).fill(0);
  const pointsDist = teams.map(() => new Map());

  // Working arrays reused across runs to avoid GC churn — micro-optimization
  // but it matters at N=10k sims.
  const simPts = new Float64Array(teams.length);
  const simWins = new Float64Array(teams.length);
  const simGF = new Float64Array(teams.length);
  const orderBuf = new Array(teams.length);

  for (let r = 0; r < runs; r++) {
    // Reset to baseline.
    for (let i = 0; i < teams.length; i++) {
      simPts[i] = teams[i].pts;
      simWins[i] = teams[i].w;
      simGF[i] = teams[i].gf;
    }

    // Simulate every remaining game. Bail-safe: skip games where one
    // side's abbr isn't in standings (shouldn't happen, but cheap guard).
    for (const g of remainingGames) {
      const hi = idx.get(g.home);
      const ai = idx.get(g.away);
      if (hi == null || ai == null) continue;
      const ph = winProb(teams[hi], teams[ai]);
      const homeWins = rand() < ph;
      const winner = homeWins ? hi : ai;
      const loser  = homeWins ? ai : hi;
      simPts[winner] += 2;
      simWins[winner] += 1;
      // OT/SO loser bonus
      if (rand() < OT_PROB) simPts[loser] += 1;
    }

    // Build sortable view of teams with this run's totals.
    for (let i = 0; i < teams.length; i++) {
      orderBuf[i] = { i, simPts: simPts[i], simWins: simWins[i], simGF: simGF[i] };
    }

    // Per-division ranks
    const divisions = {};
    for (const t of orderBuf) {
      const d = teams[t.i].division;
      if (!divisions[d]) divisions[d] = [];
      divisions[d].push(t);
    }
    const divRankByIdx = new Array(teams.length);
    Object.values(divisions).forEach((list) => {
      list.sort(compareForRank);
      list.forEach((t, rankZero) => {
        divRankByIdx[t.i] = rankZero + 1;
      });
    });

    // Per-conference wild card calculation: take all teams ranked >3 in
    // their division, sort by points across the conference, top 2 are WC.
    const conferences = {};
    for (let i = 0; i < teams.length; i++) {
      const c = teams[i].conference;
      if (!conferences[c]) conferences[c] = [];
      if (divRankByIdx[i] > 3) {
        conferences[c].push({ i, simPts: simPts[i], simWins: simWins[i], simGF: simGF[i] });
      }
    }
    const wcByIdx = new Array(teams.length).fill(false);
    Object.values(conferences).forEach((list) => {
      list.sort(compareForRank);
      list.slice(0, 2).forEach((t) => { wcByIdx[t.i] = true; });
    });

    // Tally outcomes for this run.
    for (let i = 0; i < teams.length; i++) {
      const dr = divRankByIdx[i];
      const pts = simPts[i];
      expPts[i] += pts;
      expWins[i] += simWins[i];
      if (dr === 1) divWin[i]++;
      if (dr <= 3) top3[i]++;
      else if (wcByIdx[i]) wildcard[i]++;
      else missed[i]++;
      // Bucket points to nearest int for the histogram.
      const k = Math.round(pts);
      pointsDist[i].set(k, (pointsDist[i].get(k) || 0) + 1);
    }
  }

  // Final shape: array of per-team outcomes plus run meta. Caller pulls
  // PHI's row for the headline numbers and surfaces the conference table
  // below it.
  const teamsOut = teams.map((t, i) => ({
    abbr: t.abbr,
    division: t.division,
    conference: t.conference,
    gp: t.gp,
    pts: t.pts,
    expPts: expPts[i] / runs,
    expWins: expWins[i] / runs,
    divWinPct: divWin[i] / runs,
    top3Pct: top3[i] / runs,
    wildcardPct: wildcard[i] / runs,
    missedPct: missed[i] / runs,
    playoffPct: (top3[i] + wildcard[i]) / runs,
    pointsDist: pointsDist[i],
  }));

  return {
    teams: teamsOut,
    ourAbbr,
    runs,
    simulatedGames: remainingGames.length,
  };
}
