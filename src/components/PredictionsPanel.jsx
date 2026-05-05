import { useEffect, useMemo, useState } from 'react';
import { cx, fmtDateFull, fmtTime, OPP_FULL } from '../config.js';
import { Section, Chip } from './primitives.jsx';
import { FlyersMark, TeamLogo } from './Logo.jsx';

// Pre-game predictions. Stores picks keyed by gameId in localStorage,
// scores them when the final score becomes available, and tracks a
// running accuracy / streak across all picks. Pure client-side — no
// account, no server. Acts as a fan-engagement feature only.

const PICK_KEY = 'flyersfan.predictions.v1';

const loadAll = () => {
  try {
    const raw = localStorage.getItem(PICK_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};
const saveAll = (obj) => {
  try { localStorage.setItem(PICK_KEY, JSON.stringify(obj)); } catch { /* ignore */ }
};

// A pick is correct if the predicted winner matches AND the result type
// (REG / OT / SO) matches. The score-exact bonus is tracked separately.
const scorePick = (pick, finalGame) => {
  if (!pick || !finalGame || finalGame.us == null || finalGame.them == null) return null;
  const predUsWon = pick.us > pick.them;
  const actualUsWon = finalGame.us > finalGame.them;
  const winnerCorrect = predUsWon === actualUsWon;
  const exact = pick.us === finalGame.us && pick.them === finalGame.them;
  return { winnerCorrect, exact };
};

export const PredictionsPanel = ({ nextGame, recentGames }) => {
  const [picks, setPicks] = useState(loadAll);
  const [usGoals, setUsGoals] = useState(3);
  const [themGoals, setThemGoals] = useState(2);

  // Score any unscored picks against finals from `recentGames` so the
  // streak/accuracy stays current across reloads.
  useEffect(() => {
    if (!recentGames?.length) return;
    let mutated = false;
    const next = { ...picks };
    for (const g of recentGames) {
      const id = g.id;
      if (!id) continue;
      const p = next[id];
      if (!p || p.scored) continue;
      const result = scorePick(p, g);
      if (result) {
        next[id] = { ...p, scored: true, winnerCorrect: result.winnerCorrect, exact: result.exact, finalUs: g.us, finalThem: g.them };
        mutated = true;
      }
    }
    if (mutated) {
      setPicks(next);
      saveAll(next);
    }
  }, [recentGames, picks]);

  const stats = useMemo(() => {
    const scored = Object.values(picks).filter((p) => p.scored);
    const correct = scored.filter((p) => p.winnerCorrect).length;
    const exacts = scored.filter((p) => p.exact).length;
    // Walk picks in chronological order to compute current streak.
    const chrono = scored
      .filter((p) => p.startUTC)
      .sort((a, b) => new Date(b.startUTC) - new Date(a.startUTC));
    let streak = 0;
    let streakType = null;
    for (const p of chrono) {
      const t = p.winnerCorrect ? 'W' : 'L';
      if (streakType == null) { streakType = t; streak = 1; continue; }
      if (t === streakType) streak++;
      else break;
    }
    return {
      total: scored.length,
      correct,
      exacts,
      pct: scored.length ? Math.round((correct / scored.length) * 100) : null,
      streak,
      streakType,
    };
  }, [picks]);

  if (!nextGame) return null;
  const id = nextGame.id;
  const existing = picks[id];

  const submit = () => {
    const next = {
      ...picks,
      [id]: {
        gameId: id,
        opp: nextGame.opp,
        home: nextGame.home,
        startUTC: nextGame.startUTC,
        us: Number(usGoals) || 0,
        them: Number(themGoals) || 0,
        ts: Date.now(),
        scored: false,
      },
    };
    setPicks(next);
    saveAll(next);
  };

  const reset = () => {
    const next = { ...picks };
    delete next[id];
    setPicks(next);
    saveAll(next);
  };

  return (
    <Section
      title="Your Pick"
      action={
        stats.total > 0 ? (
          <span className="text-[10px] font-mono text-white/45 tabular-nums">
            {stats.correct}/{stats.total} · {stats.pct}%
            {stats.streakType && stats.streak >= 2 && (
              <span className={cx('ml-2', stats.streakType === 'W' ? 'text-emerald-400' : 'text-red-400')}>
                {stats.streak}{stats.streakType}
              </span>
            )}
          </span>
        ) : (
          <span className="text-[10px] font-mono text-white/40">predict the score</span>
        )
      }
    >
      <div className="text-[11px] font-mono text-white/45 mb-3 uppercase tracking-wider">
        {fmtDateFull(nextGame.startUTC)} · {fmtTime(nextGame.startUTC)}
        {nextGame.home ? ' · Home' : ` · @ ${OPP_FULL[nextGame.opp] || nextGame.opp}`}
      </div>

      {existing ? (
        <div>
          <div className="flex items-center justify-around py-3">
            <PickSide logo={<FlyersMark size={32} />} abbr="PHI" goals={existing.us} highlight={existing.us > existing.them} />
            <span className="text-[18px] text-white/25">–</span>
            <PickSide logo={<TeamLogo abbr={existing.opp} size={32} />} abbr={existing.opp} goals={existing.them} highlight={existing.them > existing.us} />
          </div>
          {existing.scored ? (
            <div className="mt-2 pt-3 border-t border-white/[0.05]">
              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className="text-white/45">Final · {existing.finalUs}–{existing.finalThem}</span>
                <span>
                  {existing.exact && <Chip tone="orange">EXACT</Chip>}
                  {!existing.exact && existing.winnerCorrect && <Chip tone="green">WINNER</Chip>}
                  {!existing.winnerCorrect && <Chip tone="red">MISS</Chip>}
                </span>
              </div>
            </div>
          ) : (
            <button
              onClick={reset}
              className="w-full text-[11px] font-mono text-white/40 hover:text-white/70 mt-2 pt-3 border-t border-white/[0.05] transition-colors"
            >
              change pick
            </button>
          )}
        </div>
      ) : (
        <div>
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            <ScoreStepper logo={<FlyersMark size={32} />} abbr="PHI" value={usGoals} onChange={setUsGoals} />
            <span className="text-[16px] text-white/25">–</span>
            <ScoreStepper logo={<TeamLogo abbr={nextGame.opp} size={32} />} abbr={nextGame.opp} value={themGoals} onChange={setThemGoals} />
          </div>
          <button
            onClick={submit}
            className="w-full mt-4 px-3 py-2 rounded-md bg-[#F74902] hover:bg-[#FF5C1F] text-black text-[12px] font-medium transition-colors"
          >
            Lock in pick
          </button>
        </div>
      )}
    </Section>
  );
};

const PickSide = ({ logo, abbr, goals, highlight }) => (
  <div className="flex flex-col items-center gap-1">
    {logo}
    <span className="text-[10px] font-mono text-white/45 uppercase tracking-wider">{abbr}</span>
    <span className={cx('text-[36px] font-semibold tabular-nums leading-none', highlight ? 'text-[#FF8A4C]' : 'text-white/70')}>
      {goals}
    </span>
  </div>
);

const ScoreStepper = ({ logo, abbr, value, onChange }) => (
  <div className="flex flex-col items-center gap-1.5">
    {logo}
    <span className="text-[10px] font-mono text-white/45 uppercase tracking-wider">{abbr}</span>
    <div className="flex items-center gap-1">
      <button
        onClick={() => onChange(Math.max(0, value - 1))}
        className="w-7 h-7 rounded-md bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-white/70 text-[14px] font-mono transition-colors"
        aria-label={`${abbr} minus`}
      >−</button>
      <span className="w-10 text-center text-[24px] font-semibold tabular-nums text-white">{value}</span>
      <button
        onClick={() => onChange(Math.min(15, value + 1))}
        className="w-7 h-7 rounded-md bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-white/70 text-[14px] font-mono transition-colors"
        aria-label={`${abbr} plus`}
      >+</button>
    </div>
  </div>
);
