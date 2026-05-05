import { useMemo } from 'react';
import { Cake } from 'lucide-react';
import { Section } from './primitives.jsx';
import { Headshot } from './Headshot.jsx';
import { PlayerLink } from './PlayerLink.jsx';

// Players with birthdays in the current calendar month — sorted by day
// ascending. NHL roster API serves birthDate as 'YYYY-MM-DD'. Doesn't
// account for timezone but the day boundary is rough enough for this kind
// of fan widget.

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export const Birthdays = ({ roster }) => {
  const list = useMemo(() => {
    if (!roster) return [];
    const all = [...(roster.forwards || []), ...(roster.defense || []), ...(roster.goalies || [])];
    const now = new Date();
    const month = now.getMonth();
    const today = now.getDate();
    return all
      .filter((p) => p.birthDate)
      .map((p) => {
        // Parse YYYY-MM-DD as local date to avoid timezone-induced off-by-one.
        const [y, m, d] = p.birthDate.split('-').map(Number);
        return { ...p, bMonth: m - 1, bDay: d, bYear: y };
      })
      .filter((p) => p.bMonth === month)
      .sort((a, b) => a.bDay - b.bDay);
  }, [roster]);

  if (!list.length) return null;

  const now = new Date();
  const today = now.getDate();
  const monthLabel = MONTHS[now.getMonth()];

  return (
    <Section
      title={<span className="flex items-center gap-2"><Cake size={12} className="text-amber-400" /> Birthdays · {monthLabel}</span>}
      action={<span className="text-[10px] font-mono text-white/40">{list.length} this month</span>}
    >
      <div className="p-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2">
        {list.map((p) => {
          const isToday = p.bDay === today;
          const past = p.bDay < today;
          const turning = now.getFullYear() - p.bYear;
          return (
            <div
              key={p.id}
              className={[
                'border rounded-md px-2.5 py-2 flex items-center gap-2',
                isToday
                  ? 'border-amber-400/50 bg-amber-500/[0.08]'
                  : past
                    ? 'border-white/[0.04] bg-white/[0.01] opacity-65'
                    : 'border-white/[0.06] bg-white/[0.02]',
              ].join(' ')}
            >
              <Headshot src={p.headshot} num={p.num} size={28} />
              <div className="min-w-0 flex-1">
                <div className="text-[12px] truncate">
                  <PlayerLink playerId={p.id}>{p.name}</PlayerLink>
                </div>
                <div className="text-[10px] font-mono text-white/45 flex items-center gap-1.5">
                  <span className={isToday ? 'text-amber-300 font-semibold' : 'text-white/55'}>
                    {monthLabel} {p.bDay}
                  </span>
                  <span className="text-white/25">·</span>
                  <span>turns {turning}</span>
                  {isToday && <span className="text-[9px] text-amber-300">🎂 today</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Section>
  );
};
