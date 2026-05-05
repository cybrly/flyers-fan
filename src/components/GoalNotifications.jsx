import { useEffect, useRef, useState } from 'react';
import { Bell, BellOff } from 'lucide-react';
import { cx, TEAM_ABBR } from '../config.js';

const KEY = 'flyersfan.goalNotifications';

// Browser desktop notifications for PHI goals. Independent of the Goal Horn
// (audio) toggle so a user can have one without the other. We watch the
// timeline and fire one notification per new PHI goal — never opposing-team
// goals, since the user is a Flyers fan first.

export const useGoalNotifications = (timeline, enabled) => {
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
      // First load — record current PHI count without firing.
      lastUsCountRef.current = (timeline || []).filter((g) => g.us).length;
      return;
    }
    if (len <= prevLen) return; // nothing new

    const usGoals = (timeline || []).filter((g) => g.us);
    const prevUsCount = lastUsCountRef.current;
    if (usGoals.length > prevUsCount) {
      const newest = usGoals[usGoals.length - 1];
      try {
        const n = new Notification(`🚨 GOAL · Philadelphia Flyers`, {
          body: `${newest.scorer} scores · ${newest.awayScore}–${newest.homeScore}`,
          icon: '/favicon.svg',
          tag: 'phi-goal',
          renotify: true,
          silent: false,
        });
        // Auto-close after 6s so the desktop doesn't get cluttered during
        // a five-goal night.
        setTimeout(() => { try { n.close(); } catch { /* ignore */ } }, 6000);
      } catch { /* notifications can throw on some platforms */ }
    }
    lastUsCountRef.current = usGoals.length;
  }, [timeline, enabled]);
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
