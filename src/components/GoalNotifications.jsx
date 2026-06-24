import { useEffect, useRef, useState } from 'react';
import { Bell, BellOff } from 'lucide-react';
import { cx, TEAM_ABBR, OPP_FULL } from '../config.js';
import { useTeam } from '../teamContext.jsx';

const KEY = 'flyersfan.goalNotifications';

// Browser desktop notifications for the active team's goals. Independent of
// the Goal Horn (audio) toggle so a user can have one without the other. We
// watch the timeline and fire one notification per new "us" goal — never
// opposing-team goals, since the user is a fan of the selected team first.
//
// Delivery path:
//   • If a service worker is active, route through registration.showNotification.
//     This is the path that lights up on installed iOS PWAs (16.4+) and
//     Android Chrome PWAs, supports actions/vibrate/badge, and lets the
//     notificationclick handler in sw.js focus the app.
//   • Otherwise fall back to the plain Notification constructor for desktop
//     browser tabs that don't have an SW registered yet.

const showGoalNotification = async (goal, teamAbbr, teamName) => {
  const fullName = teamName || OPP_FULL[teamAbbr] || teamAbbr;
  const title = `🚨 GOAL · ${fullName}`;
  const opts = {
    body: `${goal.scorer} scores · ${goal.awayScore}–${goal.homeScore}`,
    icon: '/icon-512.svg',
    badge: '/favicon.svg',
    tag: `${teamAbbr.toLowerCase()}-goal`,
    renotify: true,
    silent: false,
    vibrate: [200, 80, 200, 80, 400],
    data: { url: '/', goalId: `${goal.period}-${goal.time}-${goal.scorerId}` },
  };
  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) {
        await reg.showNotification(title, opts);
        return;
      }
    }
  } catch { /* fall through to plain Notification */ }
  try {
    const n = new Notification(title, opts);
    setTimeout(() => { try { n.close(); } catch { /* ignore */ } }, 6000);
  } catch { /* ignore */ }
};

export const useGoalNotifications = (timeline, enabled) => {
  const { teamAbbr, teamName } = useTeam();
  const lastUsCountRef = useRef(0);
  const lastTimelineLen = useRef(0);

  useEffect(() => {
    const len = timeline?.length || 0;
    const prevLen = lastTimelineLen.current;
    lastTimelineLen.current = len;
    if (!enabled) return;
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;
    if (prevLen === 0) {
      lastUsCountRef.current = (timeline || []).filter((g) => g.us).length;
      return;
    }
    if (len <= prevLen) return;

    const usGoals = (timeline || []).filter((g) => g.us);
    const prevUsCount = lastUsCountRef.current;
    if (usGoals.length > prevUsCount) {
      showGoalNotification(usGoals[usGoals.length - 1], teamAbbr || TEAM_ABBR, teamName);
    }
    lastUsCountRef.current = usGoals.length;
  }, [timeline, enabled, teamAbbr, teamName]);
};

export const useGoalNotificationsEnabled = () => {
  const [on, setOn] = useState(() => {
    try { return localStorage.getItem(KEY) === '1'; } catch { return false; }
  });
  useEffect(() => {
    const sync = () => { try { setOn(localStorage.getItem(KEY) === '1'); } catch { /* ignore */ } };
    window.addEventListener('storage', sync);
    const t = setInterval(sync, 800);
    return () => { window.removeEventListener('storage', sync); clearInterval(t); };
  }, []);
  return on;
};

// Toggle button — mirrors GoalHornToggle but routes through the Notification
// permission API. Clicking turns the feature on AND triggers the permission
// prompt if needed; turning it off doesn't revoke permission (browser scope).
export const GoalNotificationsToggle = () => {
  const [on, setOn] = useState(() => {
    try { return localStorage.getItem(KEY) === '1'; } catch { return false; }
  });
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    setSupported(typeof window !== 'undefined' && 'Notification' in window);
  }, []);

  useEffect(() => {
    try { localStorage.setItem(KEY, on ? '1' : '0'); } catch { /* ignore */ }
  }, [on]);

  if (!supported) return null;

  const toggle = async () => {
    if (!on) {
      try {
        const r = await Notification.requestPermission();
        if (r !== 'granted') return; // user denied — leave toggle off
        setOn(true);
      } catch { /* ignore */ }
    } else {
      setOn(false);
    }
  };

  return (
    <button
      onClick={toggle}
      title={on ? 'Goal notifications on' : 'Goal notifications off'}
      aria-label={on ? 'Disable goal notifications' : 'Enable goal notifications'}
      className={cx(
        'flex items-center gap-1.5 hover:text-white/85 transition-colors',
        on ? 'text-[#FF8A4C]' : ''
      )}
    >
      {on ? <Bell size={10} /> : <BellOff size={10} />}
      <span className="hidden sm:inline">alerts {on ? 'on' : 'off'}</span>
    </button>
  );
};
