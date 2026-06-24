// Streak & Milestone Alerts — prominent callouts for active player point
// streaks, team streaks approaching records, and milestone proximity.

import React from 'react';
import { cx } from '../config.js';
import { Chip } from './primitives.jsx';
import { Flame, Zap, Trophy } from 'lucide-react';

/**
 * StreakAlerts — horizontal rail of active streak/milestone chips.
 *
 * @param {object} props
 * @param {object[]} [props.playerStreaks] - [{ name, points, games, type }]
 * @param {object} [props.teamStreak] - { type: 'W'|'L', count, longestW }
 * @param {object[]} [props.milestones] - [{ name, stat, current, target, label }]
 */
export function StreakAlerts({ playerStreaks, teamStreak, milestones }) {
  const alerts = [];

  // Team streak (3+ games)
  if (teamStreak?.count >= 3) {
    const hot = teamStreak.type === 'W';
    alerts.push({
      key: 'team-streak',
      icon: hot ? Flame : null,
      tone: hot ? 'warm' : 'bad',
      text: `${teamStreak.count}-game ${hot ? 'win' : 'losing'} streak`,
      priority: teamStreak.count >= 5 ? 1 : 2,
    });
  }

  // Player point streaks (3+ games)
  if (playerStreaks?.length) {
    for (const ps of playerStreaks) {
      if (ps.games >= 3) {
        alerts.push({
          key: `streak-${ps.name}`,
          icon: Zap,
          tone: 'warm',
          text: `${ps.name}: ${ps.games}-game point streak`,
          priority: ps.games >= 6 ? 1 : 3,
        });
      }
    }
  }

  // Milestones within reach (5 or fewer away)
  if (milestones?.length) {
    for (const m of milestones) {
      const away = m.target - m.current;
      if (away > 0 && away <= 5) {
        alerts.push({
          key: `milestone-${m.name}-${m.stat}`,
          icon: Trophy,
          tone: away === 1 ? 'orange' : 'default',
          text: `${m.name}: ${away} ${m.label} from ${m.target}`,
          priority: away === 1 ? 1 : 4,
        });
      }
    }
  }

  if (!alerts.length) return null;

  // Sort by priority
  alerts.sort((a, b) => a.priority - b.priority);

  const TONE_MAP = {
    warm: 'border-[var(--team-primary)]/30 bg-[var(--team-primary)]/[0.08] text-[var(--team-accent)]',
    bad: 'border-red-500/30 bg-red-500/[0.06] text-red-400',
    orange: 'border-[var(--team-primary)]/40 bg-[var(--team-primary)]/15 text-[var(--team-accent)]',
    default: 'border-white/[0.08] bg-white/[0.03] text-white/60',
  };

  return (
    <div className="flex flex-wrap gap-2">
      {alerts.slice(0, 5).map((alert) => {
        const Icon = alert.icon;
        return (
          <div
            key={alert.key}
            className={cx(
              'inline-flex items-center gap-1.5 px-2.5 py-1.5 border rounded-md text-[11px] font-medium',
              TONE_MAP[alert.tone] || TONE_MAP.default,
            )}
          >
            {Icon && <Icon size={12} />}
            {alert.text}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Detect active point streaks from club stats + recent game data.
 * This is a simplified version — a full implementation would walk each
 * player's game log. For now, we use the "hot" flag from adaptClubStats.
 *
 * @param {object[]} skaters - club stats skater array
 * @param {object[]} recentGames - last N games with scoring data
 * @returns {object[]} [{ name, games, type }]
 */
export function detectPlayerStreaks(skaters, recentGames) {
  // Without per-player game logs, we approximate by checking if a player
  // scored in each of the last N games. This requires game-level scoring
  // data which we have from landing.summary.scoring.
  // For now, return empty — the full implementation requires walking
  // individual player game logs from /v1/player/{id}/landing.
  return [];
}
