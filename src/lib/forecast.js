// Monte Carlo playoff-odds engine.
//
// Two entry points:
//   • runForecast(opts) — synchronous, returns a full result. Suitable
//     for unit tests or one-shot calls when you don't need progress.
//   • startForecast(opts) — chunked async runner that yields to the
//     event loop between chunks and fires `onProgress` with intermediate
//     aggregates. Returns a cancel function. This is what the Forecast
//     page uses so the UI can paint a live-converging probability while
//     sims accumulate.
//
// Win-probability model (deliberately simple):
//   p(home wins) = clamp(0.5 + (homeStrength - awayStrength) * 0.7 + homeIce, 0.10, 0.90)
//   strength = points% (Pts / max(GP*2, 1)); 0.5 fallback before any GP.
//
// Outcome distribution per game:
//   ~22% of NHL games go past regulation → loser gets 1 point.
//   The other ~78% are regulation losses → loser gets 0 points.
//
// Ranking: per-division by points (then wins, then GF). Top 3 per division
// auto-qualify; top 2 conference teams from outside top-3 take the wild
// cards.

const HOME_ICE = 0.035;
const OT_PROB  = 0.22;
const NO_INFO_STRENGTH = 0.5;
const DEFAULT_CHUNK = 500;

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

// Internal: builds the mutable aggregator state we update across runs.
const buildState = (standingsAll) => {
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
  return {
    teams,
    idx,
    divWin: new Array(teams.length).fill(0),
    top3: new Array(teams.length).fill(0),
    wildcard: new Array(teams.length).fill(0),
    missed: new Array(teams.length).fill(0),
    expPts: new Array(teams.length).fill(0),
    expWins: new Array(teams.length).fill(0),
    pointsDist: teams.map(() => new Map()),
    completed: 0,
  };
};

// Internal: run `n` more simulations into the supplied aggregator.
const runChunk = (state, remainingGames, n, rand) => {
  const { teams, idx, divWin, top3, wildcard, missed, expPts, expWins, pointsDist } = state;
  const simPts = new Float64Array(teams.length);
  const simWins = new Float64Array(teams.length);
  const simGF = new Float64Array(teams.length);
  const orderBuf = new Array(teams.length);

  for (let r = 0; r < n; r++) {
    for (let i = 0; i < teams.length; i++) {
      simPts[i] = teams[i].pts;
      simWins[i] = teams[i].w;
      simGF[i] = teams[i].gf;
    }
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
      if (rand() < OT_PROB) simPts[loser] += 1;
    }

    // Per-division ranking.
    for (let i = 0; i < teams.length; i++) {
      orderBuf[i] = { i, simPts: simPts[i], simWins: simWins[i], simGF: simGF[i] };
    }
    const divisions = {};
    for (const t of orderBuf) {
      const d = teams[t.i].division;
      if (!divisions[d]) divisions[d] = [];
      divisions[d].push(t);
    }
    const divRankByIdx = new Array(teams.length);
    Object.values(divisions).forEach((list) => {
      list.sort(compareForRank);
      list.forEach((t, rankZero) => { divRankByIdx[t.i] = rankZero + 1; });
    });

    // Wild card: top 2 conference teams ranked >3 in their division.
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

    for (let i = 0; i < teams.length; i++) {
      const dr = divRankByIdx[i];
      const pts = simPts[i];
      expPts[i] += pts;
      expWins[i] += simWins[i];
      if (dr === 1) divWin[i]++;
      if (dr <= 3) top3[i]++;
      else if (wcByIdx[i]) wildcard[i]++;
      else missed[i]++;
      const k = Math.round(pts);
      pointsDist[i].set(k, (pointsDist[i].get(k) || 0) + 1);
    }
  }
  state.completed += n;
};

// Internal: snapshot the aggregator into a result shape using whatever
// number of runs have completed so far. Cheap; makes incremental
// progress callbacks viable.
const snapshot = ({ teams, divWin, top3, wildcard, missed, expPts, expWins, pointsDist, completed }, ourAbbr, simulatedGames) => {
  const runs = completed || 1;
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
  return { teams: teamsOut, ourAbbr, runs: completed, simulatedGames };
};

export function runForecast({ standingsAll, remainingGames, ourAbbr, runs = 10000, seed = 1 }) {
  if (!standingsAll?.length) return null;
  const state = buildState(standingsAll);
  const rand = mulberry32(seed);
  runChunk(state, remainingGames, runs, rand);
  return snapshot(state, ourAbbr, remainingGames.length);
}

// Chunked runner for live-updating UI. Calls onProgress with a snapshot
// after every chunk of `chunkSize` runs. Returns a cancel function that
// stops further chunks; in-flight work always finishes its current
// chunk to keep aggregator state coherent.
export function startForecast({
  standingsAll,
  remainingGames,
  ourAbbr,
  runs = 10000,
  seed = 1,
  chunkSize = DEFAULT_CHUNK,
  onProgress,
  onComplete,
}) {
  if (!standingsAll?.length) return () => {};
  const state = buildState(standingsAll);
  const rand = mulberry32(seed);
  let cancelled = false;
  let timer = null;

  const tick = () => {
    if (cancelled) return;
    const remaining = runs - state.completed;
    if (remaining <= 0) {
      onComplete?.(snapshot(state, ourAbbr, remainingGames.length));
      return;
    }
    const n = Math.min(chunkSize, remaining);
    runChunk(state, remainingGames, n, rand);
    onProgress?.(snapshot(state, ourAbbr, remainingGames.length), state.completed, runs);
    timer = setTimeout(tick, 0);
  };

  // Yield once before the first chunk so the caller has a chance to
  // paint a "Running…" indicator.
  timer = setTimeout(tick, 0);

  return () => {
    cancelled = true;
    if (timer) clearTimeout(timer);
  };
}
