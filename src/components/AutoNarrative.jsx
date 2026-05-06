import { useMemo } from 'react';
import { OPP_FULL } from '../config.js';

// Templated, no-AI auto-narrative. Reads like a beat-writer's lead by
// stitching together the strongest 2–3 signals from the data we already
// have. No external calls; pure derivation from team + schedule + nextGame
// state. Designed to hold up across the full season — quiet stretches
// (no streak, no notable diff) fall back to the standings line.
//
// Signals scored by salience, then top 2–3 are stitched into prose:
//   • streak (W3+ / L3+)
//   • last-10 form (≥7 wins or ≤3 wins)
//   • running goal differential (≥+15 or ≤-15)
//   • points pace projection (≥98 or ≤82)
//   • standings position (top 3 in division, or out of playoff)
//   • next-game framing (vs / @ opponent)

const SEASON_GAMES = 82;

const fmtRecord = (us) => us ? `${us.w}-${us.l}-${us.ot || 0}` : null;
const oppName = (abbr) => OPP_FULL[abbr] || abbr;

export const buildNarrative = ({ team, games, nextGame, lastGame }) => {
  const us = team;
  if (!us || !games?.length) return null;

  const lines = [];

  // 1) Streak — leading clause when material.
  const streak = us.streak;
  if (streak && streak.count >= 3) {
    if (streak.type === 'W') {
      lines.push(`Riding a ${streak.count}-game win streak`);
    } else if (streak.type === 'L') {
      lines.push(`Mired in a ${streak.count}-game skid`);
    } else if (streak.type === 'OT') {
      lines.push(`On a ${streak.count}-game OT/SO loss run`);
    }
  }

  // 2) L10 — strong tone-setter when extreme.
  const l10 = games.slice(0, Math.min(10, games.length));
  const l10w = l10.filter((g) => g.w).length;
  if (l10.length >= 5) {
    if (l10w >= 7) lines.push(`gone ${l10w}-${l10.length - l10w} over the last ${l10.length}`);
    else if (l10w <= 3) lines.push(`just ${l10w}-${l10.length - l10w} in their last ${l10.length}`);
  }

  // 3) Standings frame.
  const div = us.divRank;
  if (div) {
    if (div <= 3) lines.push(`sit ${ordinal(div)} in the Metro`);
    else if (div >= 6) lines.push(`hold ${ordinal(div)} in the Metro, outside the wild card`);
    else lines.push(`sit ${ordinal(div)} in the Metro on the playoff bubble`);
  }

  // 4) Goal diff — flavor for the prose.
  const diff = us.diff ?? (us.gf != null && us.ga != null ? us.gf - us.ga : null);
  if (diff != null) {
    if (diff >= 15) lines.push(`outscoring opponents ${us.gf}-${us.ga}`);
    else if (diff <= -15) lines.push(`bleeding goals (${us.gf}-${us.ga})`);
  }

  // 5) Pace.
  const ptsPace = us.gp ? Math.round((us.pts / us.gp) * SEASON_GAMES) : null;
  if (ptsPace != null) {
    if (ptsPace >= 100) lines.push(`on a ${ptsPace}-point pace`);
    else if (ptsPace <= 78) lines.push(`tracking toward ${ptsPace} points`);
  }

  // 6) Closing — what's next.
  let closing = null;
  if (nextGame?.opp) {
    const where = nextGame.home ? 'host' : 'visit';
    closing = `Up next: ${where} the ${oppName(nextGame.opp)}.`;
  } else if (lastGame?.opp) {
    const verb = lastGame.us > lastGame.them ? 'beat' : 'fell to';
    closing = `Last out: ${verb} the ${oppName(lastGame.opp)} ${lastGame.us}-${lastGame.them}.`;
  }

  if (lines.length === 0) {
    const rec = fmtRecord(us);
    if (!rec) return null;
    return {
      lead: `Philadelphia is ${rec} this season.`,
      closing,
    };
  }

  // Stitch into one sentence: capitalize first phrase, comma-join rest.
  const [first, ...rest] = lines;
  const capFirst = first[0].toUpperCase() + first.slice(1);
  let lead = `Philadelphia ${us ? `(${fmtRecord(us)}) ` : ''}is ${joinPhrases(['', capFirst.toLowerCase(), ...rest]).slice(2)}.`;
  // ^ joinPhrases adds Oxford-y commas; trim leading separator.
  // If 'is riding' reads weird, prefer 'has been' / 'is' depending on first verb.
  if (capFirst.startsWith('Riding')) lead = `Philadelphia (${fmtRecord(us)}) is ${capFirst.toLowerCase()}${joinTail(rest)}.`;
  else if (capFirst.startsWith('Mired')) lead = `Philadelphia (${fmtRecord(us)}) is ${capFirst.toLowerCase()}${joinTail(rest)}.`;
  else if (capFirst.startsWith('On a'))  lead = `Philadelphia (${fmtRecord(us)}) is ${capFirst.toLowerCase()}${joinTail(rest)}.`;
  else if (capFirst.startsWith('Gone'))  lead = `Philadelphia (${fmtRecord(us)}) has ${capFirst.toLowerCase()}${joinTail(rest)}.`;
  else if (capFirst.startsWith('Just'))  lead = `Philadelphia (${fmtRecord(us)}) is ${capFirst.toLowerCase()}${joinTail(rest)}.`;
  else lead = `Philadelphia (${fmtRecord(us)}) ${first}${joinTail(rest)}.`;

  return { lead, closing };
};

function joinPhrases(arr) {
  const filtered = arr.filter(Boolean);
  if (filtered.length <= 1) return filtered.join('');
  if (filtered.length === 2) return filtered.join(' and ');
  return filtered.slice(0, -1).join(', ') + ', and ' + filtered[filtered.length - 1];
}

function joinTail(rest) {
  if (!rest.length) return '';
  if (rest.length === 1) return ` and ${rest[0]}`;
  return ', ' + rest.slice(0, -1).join(', ') + ', and ' + rest[rest.length - 1];
}

function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export const AutoNarrative = ({ team, games, nextGame, lastGame }) => {
  const narr = useMemo(
    () => buildNarrative({ team, games, nextGame, lastGame }),
    [team, games, nextGame, lastGame],
  );
  if (!narr) return null;
  return (
    <div className="border border-[#F74902]/[0.18] bg-[#F74902]/[0.03] rounded-md px-4 py-3">
      <div className="flex items-baseline gap-2">
        <span className="text-[9px] font-mono text-[#FF8A4C]/80 uppercase tracking-wider shrink-0">Pulse</span>
        <p className="text-[13px] leading-relaxed text-white/85">
          {narr.lead}
          {narr.closing && <span className="text-white/60"> {narr.closing}</span>}
        </p>
      </div>
    </div>
  );
};
