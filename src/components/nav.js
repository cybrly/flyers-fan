import { LayoutDashboard, Calendar, Trophy, Clipboard, Award, Users, TrendingUp, ArrowLeftRight, UserCog, ListOrdered, Star, Activity, ShieldCheck } from 'lucide-react';

// Nav items are grouped semantically so the sidebar can render light
// dividers between clusters. Order within each group matters for the
// keyboard shortcuts (1–9, 0); items without `kbd` sit at the bottom.
//
//   live      — what's happening right now (tonight, live game, today's tape)
//   season    — calendar / standings / postseason context
//   team      — players, comparisons, longer-arc stats
//   reference — almanac data that doesn't change game-to-game
export const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, kbd: '1', group: 'live' },
  { id: 'on-ice',    label: 'On Ice',    icon: Activity,        kbd: '2', group: 'live' },
  { id: 'game',      label: 'Game Tape', icon: Clipboard,       kbd: '3', group: 'live' },
  { id: 'schedule',  label: 'Schedule',  icon: Calendar,        kbd: '4', group: 'season' },
  { id: 'standings', label: 'Standings', icon: Trophy,          kbd: '5', group: 'season' },
  { id: 'playoffs',  label: 'Playoffs',  icon: Award,           kbd: '6', group: 'season' },
  { id: 'roster',    label: 'Roster',    icon: Users,           kbd: '7', group: 'team' },
  { id: 'goalies',   label: 'Goalies',   icon: ShieldCheck,            group: 'team' },
  { id: 'compare',   label: 'Compare',   icon: ArrowLeftRight,  kbd: '8', group: 'team' },
  { id: 'trends',    label: 'Trends',    icon: TrendingUp,      kbd: '9', group: 'team' },
  { id: 'coaches',   label: 'Coaches',   icon: UserCog,         kbd: '0', group: 'team' },
  { id: 'draft',     label: 'Draft',     icon: ListOrdered,            group: 'reference' },
  { id: 'records',   label: 'Records',   icon: Star,                   group: 'reference' },
];

export const NAV_GROUPS = [
  { id: 'live',      label: 'Live & Game' },
  { id: 'season',    label: 'Season' },
  { id: 'team',      label: 'Team' },
  { id: 'reference', label: 'Reference' },
];
