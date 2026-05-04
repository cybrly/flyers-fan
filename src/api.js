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

// Ticks every second so relative-time labels stay fresh.
export function useClockTick(ms = 1000) {
  const [, setN] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setN((n) => n + 1), ms);
    return () => clearInterval(t);
  }, [ms]);
}
