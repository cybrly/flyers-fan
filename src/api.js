import { useState, useEffect, useRef, useCallback } from 'react';
import { API } from './config.js';

// Polls an NHL endpoint. Auto-pauses when tab is hidden.
// intervalFn can be a number or a function that returns the current interval
// based on the latest data (used to speed up during live games).
export function useNHL(path, intervalFn) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [lastFetch, setLastFetch] = useState(null);
  const [loading, setLoading] = useState(!!path);
  const dataRef = useRef(data);
  dataRef.current = data;

  // Keep latest intervalFn in a ref so the polling loop always sees fresh
  // outer state without re-subscribing on every render.
  const intervalFnRef = useRef(intervalFn);
  intervalFnRef.current = intervalFn;

  const fetchOnce = useCallback(async () => {
    if (!path) return;
    try {
      const r = await fetch(API(path), { headers: { Accept: 'application/json' } });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const d = await r.json();
      setData(d);
      setLastFetch(Date.now());
      setError(null);
    } catch (e) {
      setError(e.message || 'fetch failed');
    } finally {
      setLoading(false);
    }
  }, [path]);

  useEffect(() => {
    if (!path) {
      setLoading(false);
      setData(null);
      setError(null);
      return;
    }

    let cancelled = false;
    let timer;
    setLoading(true);

    const tick = async () => {
      if (cancelled) return;
      if (document.visibilityState === 'visible') {
        await fetchOnce();
      }
      if (cancelled) return;
      const fn = intervalFnRef.current;
      const interval = typeof fn === 'function' ? fn(dataRef.current) : fn;
      if (interval && interval > 0) {
        timer = setTimeout(tick, interval);
      }
    };

    tick();

    const onVis = () => {
      if (document.visibilityState === 'visible') fetchOnce();
    };
    document.addEventListener('visibilitychange', onVis);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [path, fetchOnce]);

  return { data, error, lastFetch, loading, refresh: fetchOnce };
}

// Returns a class name that briefly flashes when `value` changes — used to
// highlight live score updates without disturbing layout.
export function useFlashOnChange(value, durationMs = 700) {
  const prev = useRef(value);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (prev.current !== value && prev.current != null && value != null) {
      setTick((n) => n + 1);
      const t = setTimeout(() => setTick(0), durationMs);
      return () => clearTimeout(t);
    }
    prev.current = value;
  }, [value, durationMs]);
  return tick > 0 ? 'score-flash' : '';
}

// Triggers a transient "burst" state when a numeric value increases (used
// for goal celebrations — only fires on score-up events, not score-down,
// so a goal review reversal won't accidentally trigger). Caller renders a
// celebration overlay while the returned bool is true.
export function useScoreBurst(value, durationMs = 2400) {
  const prev = useRef(value);
  const [active, setActive] = useState(false);
  useEffect(() => {
    if (prev.current != null && value != null && value > prev.current) {
      setActive(true);
      const t = setTimeout(() => setActive(false), durationMs);
      prev.current = value;
      return () => clearTimeout(t);
    }
    prev.current = value;
  }, [value, durationMs]);
  return active;
}

// Ticks every second so relative-time labels stay fresh.
export function useClockTick(ms = 1000) {
  const [, setN] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setN((n) => n + 1), ms);
    return () => clearInterval(t);
  }, [ms]);
}

// Fetches /api/shifts for a given gameId. Returns the raw shift array (one
// entry per shift, both teams). Browser HTTP cache dedupes parallel calls
// from different components (ShiftChart, LinemateAnalysis, etc.) since the
// proxy sets s-maxage=30 with stale-while-revalidate.
export function useShifts(gameId, pollMs = 0) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(!!gameId);
  useEffect(() => {
    if (!gameId) { setData(null); setLoading(false); return; }
    let cancelled = false;
    let timer = null;
    const fetchOnce = (showSpinner = false) => {
      if (showSpinner) setLoading(true);
      return fetch(`/api/shifts?gameId=${gameId}`)
        .then((r) => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
        .then((d) => { if (!cancelled) { setData(d?.data || []); setLoading(false); setError(null); } })
        .catch((e) => { if (!cancelled) { setError(e.message); setLoading(false); } });
    };
    fetchOnce(true);
    if (pollMs > 0) {
      timer = setInterval(() => fetchOnce(false), pollMs);
    }
    return () => { cancelled = true; if (timer) clearInterval(timer); };
  }, [gameId, pollMs]);
  return { data, error, loading };
}

// Smoothly interpolates a numeric value from its previous render to its new
// value over `durationMs` using an ease-out-cubic curve. Strings or `null`
// pass through unchanged. Used for KPI tiles so updated season totals tick
// up instead of jumping. requestAnimationFrame so it tracks display refresh.
export function useCountUp(value, durationMs = 600) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  useEffect(() => {
    const from = fromRef.current;
    const to = value;
    if (from === to) return;
    if (typeof from !== 'number' || typeof to !== 'number') {
      fromRef.current = to;
      setDisplay(to);
      return;
    }
    const start = performance.now();
    let frame;
    const tick = (now) => {
      const p = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(from + (to - from) * eased));
      if (p < 1) {
        frame = requestAnimationFrame(tick);
      } else {
        fromRef.current = to;
      }
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, durationMs]);
  return display;
}
