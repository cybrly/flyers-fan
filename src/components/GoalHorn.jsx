import { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX, Mic } from 'lucide-react';
import { cx, OPP_FULL } from '../config.js';

const KEY = 'flyersfan.goalHorn'; // 'off' | 'horn' | 'voice' (back-compat: '1' === 'horn', '0' === 'off')

const readMode = () => {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw === '1') return 'horn';
    if (raw === '0' || raw == null) return 'off';
    if (raw === 'horn' || raw === 'voice' || raw === 'off') return raw;
    return 'off';
  } catch { return 'off'; }
};
const writeMode = (m) => { try { localStorage.setItem(KEY, m); } catch { /* ignore */ } };
const cycleMode = (m) => (m === 'off' ? 'horn' : m === 'horn' ? 'voice' : 'off');

// Synthesize an authentic-feeling 5-second goal horn with the Web Audio
// API — multi-harmonic sustained chord at low fundamental, with a slight
// pitch bend on attack and a tremolo LFO for "live brass" character.
// Avoids shipping an audio asset (no licensing) while still sounding
// closer to the real arena horn than a single short blip.
const HORN_DURATION_S = 5;

function playHorn(audioCtx) {
  const ctx = audioCtx;
  const now = ctx.currentTime;
  const dur = HORN_DURATION_S;

  // Master envelope — fast attack, full sustained body, gentle release.
  const master = ctx.createGain();
  master.gain.setValueAtTime(0, now);
  master.gain.linearRampToValueAtTime(0.42, now + 0.08);   // attack
  master.gain.linearRampToValueAtTime(0.40, now + 1.2);    // settle
  master.gain.setValueAtTime(0.40, now + dur - 0.6);       // hold
  master.gain.linearRampToValueAtTime(0, now + dur);       // release

  // Light low-pass to round off the sawtooth bite.
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 1800;
  lp.Q.value = 0.6;
  master.connect(lp);
  lp.connect(ctx.destination);

  // Tremolo LFO — small amplitude wobble so the horn breathes instead
  // of sitting as a static buzz. ~5.5 Hz, ±8% gain.
  const lfo = ctx.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.value = 5.5;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 0.06;
  lfo.connect(lfoGain);
  lfoGain.connect(master.gain);
  lfo.start(now);
  lfo.stop(now + dur);

  // Brassy power chord — root + fifth + octave + major third. Sawtooth
  // for the buzz, sine doubling at the root for body. Slight detune
  // across voices so it reads as a real instrument, not a single tone.
  const root = 110; // A2 — low, present, carries on small speakers.
  const voices = [
    { freq: root,        type: 'sawtooth', gain: 0.50, detune: -4 },
    { freq: root,        type: 'sine',     gain: 0.45, detune: 0 },
    { freq: root * 1.5,  type: 'sawtooth', gain: 0.32, detune: 5 },
    { freq: root * 2,    type: 'triangle', gain: 0.22, detune: -2 },
    { freq: root * 1.26, type: 'sawtooth', gain: 0.18, detune: 3 }, // major 3rd — the brass-chord shimmer
  ];
  for (const v of voices) {
    const o = ctx.createOscillator();
    o.type = v.type;
    // Short pitch bend up at attack — gives the air-horn "swoop" feel
    // before settling into the sustained tone.
    o.frequency.setValueAtTime(v.freq * 0.86, now);
    o.frequency.exponentialRampToValueAtTime(v.freq, now + 0.18);
    o.detune.value = v.detune;
    const og = ctx.createGain();
    og.gain.value = v.gain;
    o.connect(og);
    og.connect(master);
    o.start(now);
    o.stop(now + dur);
  }
}

// Voice option — speaks "GOAL!" plus the team that scored. Browser TTS
// rather than a recorded clip. Falls back silently if the browser has
// no SpeechSynthesis (older mobile, locked-down enterprise installs).
function speakGoal(teamFull) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  try {
    const phrase = teamFull ? `Goal! ${teamFull}!` : 'Goal!';
    const utter = new SpeechSynthesisUtterance(phrase);
    utter.rate = 1.0;
    utter.pitch = 0.95;
    utter.volume = 1.0;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
  } catch { /* ignore — TTS isn't critical */ }
}

// Watches the live goal timeline and plays the configured celebration —
// either the synthesized 5-second horn or a TTS voice announcement
// naming the team that scored. Off mode is silent.
export const useGoalHorn = (timeline, mode) => {
  const lastCountRef = useRef(0);
  const ctxRef = useRef(null);

  useEffect(() => {
    const count = timeline?.length || 0;
    const prev = lastCountRef.current;
    lastCountRef.current = count;
    if (!mode || mode === 'off') return;
    if (prev === 0) return; // first load — don't blast for historic goals
    if (count > prev) {
      const latest = timeline?.[count - 1];
      if (mode === 'voice') {
        const teamAbbr = latest?.team;
        const teamFull = teamAbbr ? OPP_FULL[teamAbbr] || teamAbbr : null;
        speakGoal(teamFull);
      } else {
        try {
          if (!ctxRef.current) ctxRef.current = new (window.AudioContext || window.webkitAudioContext)();
          if (ctxRef.current.state === 'suspended') ctxRef.current.resume();
          playHorn(ctxRef.current);
        } catch { /* ignore — autoplay policies */ }
      }
    }
  }, [timeline, mode]);
};

export const GoalHornToggle = () => {
  const [mode, setMode] = useState(readMode);

  useEffect(() => { writeMode(mode); }, [mode]);

  const next = () => setMode((m) => cycleMode(m));
  const label = mode === 'horn' ? 'horn' : mode === 'voice' ? 'voice' : 'off';
  const tone = mode === 'off' ? '' : 'text-[#FF8A4C]';
  const Icon = mode === 'voice' ? Mic : mode === 'horn' ? Volume2 : VolumeX;
  return (
    <button
      onClick={next}
      title={`Goal cue: ${label} (click to cycle)`}
      aria-label={`Goal cue ${label}, click to cycle`}
      className={cx('flex items-center gap-1.5 hover:text-white/85 transition-colors', tone)}
    >
      <Icon size={10} />
      <span className="hidden sm:inline">goal · {label}</span>
    </button>
  );
};

// Read the current mode from localStorage. Reactive: subscribes to
// storage events so toggling in one tab updates others (plus a local
// poll because same-tab writes don't fire 'storage').
export const useGoalHornEnabled = () => {
  const [mode, setMode] = useState(readMode);
  useEffect(() => {
    const sync = () => setMode(readMode());
    window.addEventListener('storage', sync);
    const t = setInterval(sync, 800);
    return () => { window.removeEventListener('storage', sync); clearInterval(t); };
  }, []);
  return mode;
};
