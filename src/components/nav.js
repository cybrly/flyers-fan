import { LayoutDashboard, Calendar, Trophy, Clipboard, Award, Users, TrendingUp, ArrowLeftRight, UserCog, ListOrdered, Star, Activity } from 'lucide-react';

export const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, kbd: '1' },
  { id: 'on-ice',    label: 'On Ice',    icon: Activity,        kbd: '2' },
  { id: 'schedule',  label: 'Schedule',  icon: Calendar,        kbd: '3' },
  { id: 'standings', label: 'Standings', icon: Trophy,          kbd: '4' },
  { id: 'game',      label: 'Game Tape', icon: Clipboard,       kbd: '5' },
  { id: 'playoffs',  label: 'Playoffs',  icon: Award,           kbd: '6' },
  { id: 'roster',    label: 'Roster',    icon: Users,           kbd: '7' },
  { id: 'trends',    label: 'Trends',    icon: TrendingUp,      kbd: '8' },
  { id: 'compare',   label: 'Compare',   icon: ArrowLeftRight,  kbd: '9' },
  { id: 'coaches',   label: 'Coaches',   icon: UserCog,         kbd: '0' },
  { id: 'draft',     label: 'Draft',     icon: ListOrdered },
  { id: 'records',   label: 'Records',   icon: Star },
];
