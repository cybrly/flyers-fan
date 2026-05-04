import { LayoutDashboard, Calendar, Trophy, Clipboard, Award, Users } from 'lucide-react';

export const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, kbd: '1' },
  { id: 'schedule',  label: 'Schedule',  icon: Calendar,        kbd: '2' },
  { id: 'standings', label: 'Standings', icon: Trophy,          kbd: '3' },
  { id: 'game',      label: 'Game Tape', icon: Clipboard,       kbd: '4' },
  { id: 'playoffs',  label: 'Playoffs',  icon: Award,           kbd: '5' },
  { id: 'roster',    label: 'Roster',    icon: Users,           kbd: '6' },
];
