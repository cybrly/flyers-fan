import { useMemo } from 'react';
import { cx } from '../config.js';
import { Section } from './primitives.jsx';

// Maps NHL's 3-letter country codes to flag emoji + display name. Covers
// every nation that's ever placed a player in the league; unknown codes
// fall back to the raw 3-letter code. Flag emoji are two regional-indicator
// chars — they render natively on every modern OS without an asset bundle.
const COUNTRY = {
  CAN: { name: 'Canada',          flag: '🇨🇦' },
  USA: { name: 'United States',   flag: '🇺🇸' },
  SWE: { name: 'Sweden',          flag: '🇸🇪' },
  FIN: { name: 'Finland',         flag: '🇫🇮' },
  RUS: { name: 'Russia',          flag: '🇷🇺' },
  CZE: { name: 'Czechia',         flag: '🇨🇿' },
  SVK: { name: 'Slovakia',        flag: '🇸🇰' },
  SUI: { name: 'Switzerland',     flag: '🇨🇭' },
  GER: { name: 'Germany',         flag: '🇩🇪' },
  LAT: { name: 'Latvia',          flag: '🇱🇻' },
  DEN: { name: 'Denmark',         flag: '🇩🇰' },
  NOR: { name: 'Norway',          flag: '🇳🇴' },
  BLR: { name: 'Belarus',         flag: '🇧🇾' },
  AUT: { name: 'Austria',         flag: '🇦🇹' },
  FRA: { name: 'France',          flag: '🇫🇷' },
  NED: { name: 'Netherlands',     flag: '🇳🇱' },
  NLD: { name: 'Netherlands',     flag: '🇳🇱' },
  GBR: { name: 'United Kingdom',  flag: '🇬🇧' },
  POL: { name: 'Poland',          flag: '🇵🇱' },
  KAZ: { name: 'Kazakhstan',      flag: '🇰🇿' },
  AUS: { name: 'Australia',       flag: '🇦🇺' },
  JPN: { name: 'Japan',           flag: '🇯🇵' },
  ITA: { name: 'Italy',           flag: '🇮🇹' },
  UKR: { name: 'Ukraine',         flag: '🇺🇦' },
  IRL: { name: 'Ireland',         flag: '🇮🇪' },
  EST: { name: 'Estonia',         flag: '🇪🇪' },
  LTU: { name: 'Lithuania',       flag: '🇱🇹' },
};

export const Hometowns = ({ roster }) => {
  const all = useMemo(() => {
    if (!roster) return [];
    return [...(roster.forwards || []), ...(roster.defense || []), ...(roster.goalies || [])];
  }, [roster]);

  const { countries, cities, total } = useMemo(() => {
    const cMap = {};
    const cityMap = {};
    for (const p of all) {
      const cc = p.birthCountry;
      if (cc) {
        cMap[cc] = (cMap[cc] || 0) + 1;
      }
      if (p.birthCity) {
        const key = `${p.birthCity}|${cc || ''}`;
        if (!cityMap[key]) cityMap[key] = { city: p.birthCity, country: cc, count: 0, players: [] };
        cityMap[key].count++;
        cityMap[key].players.push(p.name);
      }
    }
    const countries = Object.entries(cMap)
      .map(([code, count]) => ({ code, count, ...(COUNTRY[code] || { name: code, flag: '🏴' }) }))
      .sort((a, b) => b.count - a.count);
    const cities = Object.values(cityMap).sort((a, b) => b.count - a.count);
    return { countries, cities, total: all.length };
  }, [all]);

  if (!total) return null;

  const maxCountry = countries[0]?.count || 1;

  return (
    <Section
      title="Hometowns"
      action={<span className="text-[10px] font-mono text-white/40">{countries.length} countries · {cities.length} cities</span>}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-white/[0.04]">
        {/* Country breakdown — stacked horizontal bars */}
        <div className="bg-[#0A0A0A] p-3">
          <div className="text-[10px] font-mono text-white/40 uppercase tracking-wider mb-2">By Country</div>
          <div className="space-y-1.5">
            {countries.map((c) => (
              <div key={c.code} className="grid grid-cols-[24px_1fr_auto] items-center gap-2">
                <span className="text-[16px] leading-none">{c.flag}</span>
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[11px] text-white/75 truncate">{c.name}</span>
                  <div className="flex-1 h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[var(--team-primary)]/70 rounded-full"
                      style={{ width: `${(c.count / maxCountry) * 100}%` }}
                    />
                  </div>
                </div>
                <span className="text-[11px] font-mono tabular-nums text-[var(--team-accent)] font-medium">{c.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top hometowns — cities with multiple players, then everyone else */}
        <div className="bg-[#0A0A0A] p-3">
          <div className="text-[10px] font-mono text-white/40 uppercase tracking-wider mb-2">Top Hometown Cities</div>
          <div className="space-y-1.5 max-h-[240px] overflow-y-auto pr-1">
            {cities.slice(0, 14).map((c, i) => (
              <div key={`${c.city}-${c.country}`} className="grid grid-cols-[1fr_auto] items-center gap-2">
                <span className="flex items-center gap-2 min-w-0 text-[11px] text-white/75 truncate">
                  <span className="text-[12px]">{COUNTRY[c.country]?.flag || '🏴'}</span>
                  <span className="truncate">{c.city}</span>
                  {c.count > 1 && <span className="text-[9px] font-mono text-amber-300/70">×{c.count}</span>}
                </span>
                <span className="text-[10px] font-mono text-white/45 tabular-nums shrink-0">
                  {c.players.length === 1 ? c.players[0].split(' ').slice(-1).join(' ') : `${c.players.length} pl.`}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Section>
  );
};
