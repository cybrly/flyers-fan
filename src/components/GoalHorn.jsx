import { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { cx } from '../config.js';

const KEY = 'flyersfan.goalHorn';

// Synthesize a short horn-like sound with the Web Audio API. Avoids shipping
// an audio asset; sounds bright enough to signal a goal without surprise.
function playHorn(audioCtx) {
  const ctx = audioCtx;
  const now = ctx.currentTime;
  const dur = 1.4;

  // Two stacked sawtooth oscillators a fifth apart for a horn-ish chord.
  const root = 196.0; // G3
  const fifth = root * 1.5;

  const master = ctx.createGain();
  master.gain.value = 0;
  master.gain.setValueAtTime(0, now);
  master.gain.linearRampToValueAtTime(0.35, now + 0.05);
  master.gain.linearRampToValueAtTime(0.3, now + 0.9);
  master.gain.linearRampToValueAtTime(0, now + dur);
  master.connect(ctx.destination);

  for (const f of [root, fifth]) {
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(f * 0.92, now);
    o.frequency.exponentialRampToValueAtTime(f, now + 0.08);
    const og = ctx.createGain();
    og.gain.value = 0.5;
    o.connect(og); og.connect(master);
    o.start(now);
    o.stop(now + dur);
  }
}

export const useGoalHorn = (timeline, enabled) => {
  // Track the last seen goal count. When timeline grows, play the horn.
  const lastCountRef = useRef(0);
  const ctxRef = useRef(null);

  useEffect(() => {
    const count = timeline?.length || 0;
    const prev = lastCountRef.current;
    lastCountRef.current = count;
    if (!enabled) return;
    if (prev === 0) return; // first load — don't blast horn for historic goals
    if (count > prev) {
      try {
        if (!ctxRef.current) ctxRef.current = new (window.AudioContext || window.webkitAudioContext)();
        if (ctxRef.current.state === 'suspended') ctxRef.current.resume();
        playHorn(ctxRef.current);
      } catch { /* ignore — autoplay policies */ }
    }
  }, [timeline, enabled]);
};

export const GoalHornToggle = () => {
  const [on, setOn] = useState(() => {
    try { return localStorage.getItem(KEY) === '1'; } catch { return false; }
  });

  useEffect(() => {
    try { localStorage.setItem(KEY, on ? '1' : '0'); } catch { /* ignore */ }
  }, [on]);

  return (
    <button
      onClick={() => setOn((v) => !v)}
      title={on ? 'Goal horn on' : 'Goal horn off'}
      aria-label={on ? 'Disable goal horn' : 'Enable goal horn'}
      className={cx(
        'flex items-center gap-1.5 hover:text-white/85 transition-colors',
        on ? 'text-[#FF8A4C]' : ''
      )}
    >
      {on ? <Volume2 size={10} /> : <VolumeX size={10} />}
      <span className="hidden sm:inline">horn {on ? 'on' : 'off'}</span>
    </button>
  );
};

// Read the current toggle from localStorage — used by App so the timeline
// effect knows whether to fire. Also reactive: subscribes to storage events
// so toggling in one tab updates others (and the same tab via custom event).
export const useGoalHornEnabled = () => {
  const [on, setOn] = useState(() => {
    try { return localStorage.getItem(KEY) === '1'; } catch { return false; }
  });
  useEffect(() => {
    const sync = () => {
      try { setOn(localStorage.getItem(KEY) === '1'); } catch { /* ignore */ }
    };
    window.addEventListener('storage', sync);
    // Local toggle changes don't fire 'storage', so re-poll briefly.
    const t = setInterval(sync, 800);
    return () => { window.removeEventListener('storage', sync); clearInterval(t); };
  }, []);
  return on;
};
