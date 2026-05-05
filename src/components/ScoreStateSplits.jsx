import { useMemo } from 'react';
import { TEAM_ABBR, cx } from '../config.js';
import { Section } from './primitives.jsx';

// Score-state splits — for a single game's play-by-play, walk events in
// chronological order tracking the running score, and for every shot/goal
// attribute it to the state PHI was in: LEADING, TIED, or TRAILING. Time
// spent in each state comes from the cumulative gap between consecutive
// events, capped at the period boundary so an empty stretch doesn't get
// charged against one state.
//
// Shots are pulled from typeDescKey ∈ {goal, shot-on-goal, missed-shot,
// blocked-shot} since the team-level shot share is what score-effects
// research is interested in (Corsi-style — all attempts).

const STATES = ['LEADING', 'TIED', 'TRAILING'];
const TONE = {
  LEADING:  { color: '#10B981', bg: 'bg-emerald-500/10', text: 'text-emerald-300' },
  TIED:     { color: '#F59E0B', bg: 'bg-amber-500/10',   text: 'text-amber-300' },
  TRAILING: { color: '#EF4444', bg: 'bg-red-500/10',     text: 'text-red-300' },
};

const SHOT_KINDS = new Set(['goal', 'shot-on-goal', 'missed-shot', 'blocked-shot']);

// Convert "MM:SS" period-clock to seconds elapsed *in the period*. Plays come
// down with timeInPeriod, so we add 20-minute (1200s) chunks per completed
// period and treat OT/SO timeInPeriod as additive (close enough for splits).
const toSecondsElapsed = (period, timeInPeriod) => {
  if (period == null || !timeInPeriod) return 0;
  const [m, s] = String(timeInPeriod).split(':').map(Number);
  if (Number.isNaN(m) || Number.isNaN(s)) return 0;
  return (period - 1) * 1200 + m * 60 + s;
};

const stateFor = (us, them) => (us > them ? 'LEADING' : us === them ? 'TIED' : 'TRAILING');

export const ScoreStateSplits = ({ pbpRaw }) => {
  const splits = useMemo(() => {
    if (!pbpRaw?.plays?.length) return null;
    const usIsHome = pbpRaw.homeTeam?.abbrev === TEAM_ABBR;
    const homeId = pbpRaw.homeTeam?.id;
    const awayId = pbpRaw.awayTeam?.id;
    if (!homeId || !awayId) return null;

    // Initialise accumulator
    const init = () => ({ time: 0, shotsFor: 0, shotsAg: 0, goalsFor: 0, goalsAg: 0 });
    const acc = { LEADING: init(), TIED: init(), TRAILING: init() };

    let us = 0;
    let them = 0;
    let lastTimeMark = 0;
    let lastState = stateFor(us, them);
    const plays = [...pbpRaw.plays].sort((a, b) => {
      const pa = a.periodDescriptor?.number || 0;
      const pb = b.periodDescriptor?.number || 0;
      if (pa !== pb) return pa - pb;
      return toSecondsElapsed(pa, a.timeInPeriod) - toSecondsElapsed(pb, b.timeInPeriod);
    });

    for (const p of plays) {
      const period = p.periodDescriptor?.number;
      if (!period) continue;
      const t = toSecondsElapsed(period, p.timeInPeriod);

      // Charge time elapsed since previous mark to whatever the current
      // state was during that interval.
      if (t >= lastTimeMark) {
        acc[lastState].time += t - lastTimeMark;
        lastTimeMark = t;
      }

      // Shot/goal attribution at the moment of the play (state BEFORE the
      // goal, so a tying goal is recorded as having occurred while trailing).
      const det = p.details || {};
      const ownerId = det.eventOwnerTeamId;
      if (SHOT_KINDS.has(p.typeDescKey) && ownerId) {
        // Blocked-shot's eventOwnerTeamId is the BLOCKING team — flip.
        const shooterId = p.typeDescKey === 'blocked-shot'
          ? (ownerId === homeId ? awayId : homeId)
          : ownerId;
        const isUsShot = (shooterId === homeId) === usIsHome;
        if (isUsShot) acc[lastState].shotsFor++;
        else acc[lastState].shotsAg++;

        if (p.typeDescKey === 'goal') {
          if (isUsShot) {
            acc[lastState].goalsFor++;
            us++;
          } else {
            acc[lastState].goalsAg++;
            them++;
          }
        }
      }
      lastState = stateFor(us, them);
    }

    return acc;
  }, [pbpRaw]);

  if (!splits) return null;

  const totalTime = STATES.reduce((s, k) => s + splits[k].time, 0) || 1;
  const fmtMin = (sec) => {
    const m = Math.floor(sec / 60);
    const s = Math.round(sec % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  return (
    <Section title="Score-State Splits" action={<span className="text-[10px] font-mono text-white/40">PHI by game state</span>}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-white/[0.05]">
        {STATES.map((state) => {
          const s = splits[state];
          const tone = TONE[state];
          const pctTime = (s.time / totalTime) * 100;
          const totalShots = s.shotsFor + s.shotsAg;
          const sharePct = totalShots > 0 ? (s.shotsFor / totalShots) * 100 : null;
          return (
            <div key={state} className="bg-[#0A0A0A] p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ background: tone.color }} />
                  <span className={cx('text-[11px] font-mono uppercase tracking-wider', tone.text)}>{state.toLowerCase()}</span>
                </div>
                <span className="text-[10px] font-mono text-white/40 tabular-nums">{fmtMin(s.time)}</span>
              </div>
              <div className="space-y-2">
                <div>
                  <div className="flex items-center justify-between text-[10px] font-mono text-white/45 mb-1 uppercase tracking-wider">
                    <span>Shots PHI · Opp</span>
                    <span className="tabular-nums">{s.shotsFor} · {s.shotsAg}</span>
                  </div>
                  {totalShots > 0 && (
                    <div className="h-1 w-full rounded-full overflow-hidden bg-white/[0.05]">
                      <div className="h-full" style={{ width: `${sharePct}%`, background: tone.color }} />
                    </div>
                  )}
                  {sharePct != null && (
                    <div className={cx('text-[11px] font-mono tabular-nums mt-1', tone.text)}>
                      {sharePct.toFixed(1)}% shot share
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between text-[11px] font-mono text-white/55 pt-2 border-t border-white/[0.04]">
                  <span>Goals PHI · Opp</span>
                  <span className="tabular-nums">
                    <span className="text-emerald-400">{s.goalsFor}</span>
                    <span className="text-white/25 mx-1">·</span>
                    <span className="text-red-400">{s.goalsAg}</span>
                  </span>
                </div>
                <div className="text-[10px] font-mono text-white/35">
                  {pctTime.toFixed(1)}% of game
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Section>
  );
};
