import { LayoutDashboard, Calendar, Trophy, Clipboard, Award, Users, TrendingUp, ArrowLeftRight, UserCog, ListOrdered } from 'lucide-react';

export const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, kbd: '1' },
  { id: 'schedule',  label: 'Schedule',  icon: Calendar,        kbd: '2' },
  { id: 'standings', label: 'Standings', icon: Trophy,          kbd: '3' },
  { id: 'game',      label: 'Game Tape', icon: Clipboard,       kbd: '4' },
  { id: 'playoffs',  label: 'Playoffs',  icon: Award,           kbd: '5' },
  { id: 'roster',    label: 'Roster',    icon: Users,           kbd: '6' },
  { id: 'trends',    label: 'Trends',    icon: TrendingUp,      kbd: '7' },
  { id: 'compare',   label: 'Compare',   icon: ArrowLeftRight,  kbd: '8' },
  { id: 'coaches',   label: 'Coaches',   icon: UserCog,         kbd: '9' },
  { id: 'draft',     label: 'Draft',     icon: ListOrdered,     kbd: '0' },
];
