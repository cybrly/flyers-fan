// Referee Tendencies panel — shows tendencies for tonight's officiating
// crew based on historical penalty call rates and style.

import React from 'react';
import { cx } from '../config.js';
import { Section, Label, Chip } from './primitives.jsx';
import { getRefStats, styleLabel, LEAGUE_AVG_PIM_PER_GAME } from '../data/refereeStats.js';

/**
 * Compact referee chip for Dashboard (shows in quick context).
 * @param {string[]} referees - array of referee names
 */
export function RefereeChip({ referees }) {
  if (!referees?.length) return null;
  const stats = referees.map(getRefStats).filter(Boolean);
  if (!stats.length) return null;
  const avgPIM = stats.reduce((s, r) => s + r.pimPerGame, 0) / stats.length;
  const isStrict = avgPIM > LEAGUE_AVG_PIM_PER_GAME + 0.3;
  const isLenient = avgPIM < LEAGUE_AVG_PIM_PER_GAME - 0.3;

  return (
    <Chip tone={isStrict ? 'amber' : isLenient ? 'green' : 'muted'}>
      Refs: {isStrict ? 'Tight crew' : isLenient ? 'Let them play' : 'Average crew'}
      {' · '}{avgPIM.toFixed(1)} PIM/g
    </Chip>
  );
}

/**
 * Full referee tendencies panel for GameTape.
 * @param {object} props
 * @param {string[]} props.referees - referee names
 * @param {string[]} [props.linesmen] - linesman names
 */
export function RefereeTendencies({ referees, linesmen }) {
  if (!referees?.length) return null;

  const refData = referees.map((name) => ({
    name,
    stats: getRefStats(name),
  }));

  const knownRefs = refData.filter((r) => r.stats);
  if (!knownRefs.length) {
    return (
      <Section title="Officials">
        <div className="p-4 space-y-2">
          <div className="text-[11px] text-white/50">
            {referees.map((name, i) => (
              <div key={i} className="flex items-center gap-2 h-7">
                <Chip tone="muted">REF</Chip>
                <span>{name}</span>
              </div>
            ))}
          </div>
          {linesmen?.length > 0 && (
            <div className="text-[11px] text-white/35 pt-2 border-t border-white/[0.05]">
              {linesmen.map((name, i) => (
                <div key={i} className="flex items-center gap-2 h-6">
                  <span className="text-[10px] font-mono text-white/25">LN</span>
                  <span>{name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </Section>
    );
  }

  const avgPIM = knownRefs.reduce((s, r) => s + r.stats.pimPerGame, 0) / knownRefs.length;
  const diff = avgPIM - LEAGUE_AVG_PIM_PER_GAME;
  const crewStyle = diff > 0.3 ? 'strict' : diff < -0.3 ? 'lenient' : 'moderate';

  return (
    <Section
      title="Officials & Tendencies"
      action={
        <Chip tone={crewStyle === 'strict' ? 'amber' : crewStyle === 'lenient' ? 'green' : 'muted'}>
          {styleLabel(crewStyle)}
        </Chip>
      }
    >
      <div className="p-4 space-y-3">
        {/* Crew summary */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[18px] font-semibold tabular-nums">
              {avgPIM.toFixed(1)}
              <span className="text-[11px] font-mono text-white/40 ml-1.5">PIM/game</span>
            </div>
            <div className="text-[10px] font-mono text-white/35 mt-0.5">
              crew average · league avg {LEAGUE_AVG_PIM_PER_GAME}
            </div>
          </div>
          <div className={cx(
            'text-[13px] font-mono font-medium',
            diff > 0 ? 'text-amber-400' : diff < 0 ? 'text-emerald-400' : 'text-white/50',
          )}>
            {diff > 0 ? '+' : ''}{diff.toFixed(1)} vs avg
          </div>
        </div>

        {/* PIM comparison bar */}
        <div className="relative h-3 bg-white/[0.04] rounded-full overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
            style={{
              width: `${Math.min(100, (avgPIM / 12) * 100)}%`,
              background: crewStyle === 'strict' ? '#F59E0B' : crewStyle === 'lenient' ? '#10B981' : '#666',
            }}
          />
          {/* League average marker */}
          <div
            className="absolute top-0 bottom-0 w-px bg-white/40"
            style={{ left: `${(LEAGUE_AVG_PIM_PER_GAME / 12) * 100}%` }}
          />
        </div>

        {/* Individual referees */}
        <div className="divide-y divide-white/[0.04]">
          {refData.map(({ name, stats }) => (
            <div key={name} className="flex items-center justify-between py-2.5">
              <div className="flex items-center gap-2">
                <Chip tone="muted">REF</Chip>
                <span className="text-[12px] text-white/80">{name}</span>
              </div>
              {stats ? (
                <div className="flex items-center gap-3 text-[11px] font-mono">
                  <span className={cx(
                    'tabular-nums',
                    stats.pimPerGame > LEAGUE_AVG_PIM_PER_GAME + 0.3 ? 'text-amber-400' :
                    stats.pimPerGame < LEAGUE_AVG_PIM_PER_GAME - 0.3 ? 'text-emerald-400' : 'text-white/55',
                  )}>
                    {stats.pimPerGame} PIM/g
                  </span>
                  <span className="text-white/30">·</span>
                  <span className="text-white/40">{stats.games} career GP</span>
                  <Chip tone={stats.style === 'strict' ? 'amber' : stats.style === 'lenient' ? 'green' : 'muted'}>
                    {stats.style}
                  </Chip>
                </div>
              ) : (
                <span className="text-[10px] font-mono text-white/30">No data</span>
              )}
            </div>
          ))}
        </div>

        {/* Linesmen */}
        {linesmen?.length > 0 && (
          <div className="pt-2 border-t border-white/[0.05]">
            {linesmen.map((name, i) => (
              <div key={i} className="flex items-center gap-2 py-1">
                <span className="text-[10px] font-mono text-white/25 w-6">LN</span>
                <span className="text-[11px] text-white/45">{name}</span>
              </div>
            ))}
          </div>
        )}

        <div className="text-[10px] text-white/30 font-mono">
          PIM/game based on 2022–25 regular season data. Bias is the % more penalties called on away teams.
        </div>
      </div>
    </Section>
  );
}
