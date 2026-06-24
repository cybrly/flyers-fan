import { useState, useEffect, useRef, useCallback } from 'react';
import { API, API_RECORDS } from './config.js';

// One-shot fetch for the NHL Records API (via /api/records). Franchise history
// is static, so there's no polling — just fetch when the path changes. Returns
// the same shape as useNHL for drop-in use. A null path clears state.
export function useRecords(path) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(!!path);
  useEffect(() => {
    if (!path) { setData(null); setError(null); setLoading(false); return; }
    let cancelled = false;
    setLoading(true);
    fetch(API_RECORDS(path), { headers: { Accept: 'application/json' } })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((d) => { if (!cancelled) { setData(d); setError(null); setLoading(false); } })
      .catch((e) => { if (!cancelled) { setError(e.message || 'fetch failed'); setLoading(false); } });
    return () => { cancelled = true; };
  }, [path]);
  return { data, error, loading };
}

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

// Fires when the goal timeline grows, returning the latest goal entry
// (team, scorer, us flag) so the broadcast view can theme its blast
// around the team that actually scored. Returns null between bursts.
//
// Distinct from useScoreBurst: that one only knows "PHI score went up";
// this one knows which team's logo to flash and whether to bias the
// celebration toward us or them.
export function useGoalBurst(timeline, durationMs = 5000) {
  const lastCount = useRef(timeline?.length || 0);
  const [active, setActive] = useState(null);
  useEffect(() => {
    const count = timeline?.length || 0;
    const prev = lastCount.current;
    lastCount.current = count;
    if (count > prev && count > 0 && timeline) {
      const latest = timeline[count - 1];
      if (!latest) return;
      const key = Date.now();
      setActive({ team: latest.team, us: !!latest.us, scorer: latest.scorer, key });
      const t = setTimeout(() => {
        setActive((curr) => (curr && curr.key === key ? null : curr));
      }, durationMs);
      return () => clearTimeout(t);
    }
  }, [timeline, durationMs]);
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

// Real-time live-game stream over SSE. Connects to /api/live?game={id}
// for sub-2s score/clock updates while a PHI game is live. The existing
// useNHL polling continues alongside (it provides the full data shape we
// need for skaters/PBP/officials/etc); this hook only overlays the
// fastest-moving primitives so the score and clock feel instantaneous.
//
// Connection rotation: the edge function caps each stream at ~25s, then
// sends 'reconnect' and closes. EventSource auto-reconnects on close, so
// we just consume the stream until 'final' (game ended) when we close
// for good and let the standard poll take over.
export function useLiveStream(gameId, enabled = true) {
  const [snap, setSnap] = useState(null);
  const [connected, setConnected] = useState(false);
  useEffect(() => {
    setSnap(null);
    setConnected(false);
    if (!enabled || !gameId) return;
    if (typeof EventSource === 'undefined') return;

    let stopped = false;
    let es = null;
    let backoff = 0;

    const connect = () => {
      if (stopped) return;
      try {
        es = new EventSource(`/api/live?game=${encodeURIComponent(gameId)}`);
      } catch {
        return;
      }
      es.addEventListener('connected', () => { setConnected(true); backoff = 0; });
      es.addEventListener('box', (ev) => {
        try {
          const d = JSON.parse(ev.data);
          setSnap((prev) => ({ ...(prev || {}), ...d, kind: 'box' }));
        } catch { /* malformed event — ignore */ }
      });
      es.addEventListener('pbp', (ev) => {
        try {
          const d = JSON.parse(ev.data);
          setSnap((prev) => ({ ...(prev || {}), pbpCount: d.count, lastPlays: d.tail, kind: 'pbp' }));
        } catch { /* ignore */ }
      });
      es.addEventListener('final', () => {
        stopped = true;
        try { es?.close(); } catch { /* ignore */ }
        setConnected(false);
      });
      es.addEventListener('reconnect', () => {
        try { es?.close(); } catch { /* ignore */ }
        setConnected(false);
        if (!stopped) setTimeout(connect, 100);
      });
      es.onerror = () => {
        try { es?.close(); } catch { /* ignore */ }
        setConnected(false);
        if (stopped) return;
        // Exponential-ish backoff capped at 8s — server might be cold or
        // upstream NHL is hiccuping. Faster than full re-poll either way.
        backoff = Math.min(8000, (backoff || 500) * 2);
        setTimeout(connect, backoff);
      };
    };

    connect();
    return () => {
      stopped = true;
      try { es?.close(); } catch { /* ignore */ }
    };
  }, [gameId, enabled]);
  return { snap, connected };
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
