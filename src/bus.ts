/**
 * useBusArtifact: read a typed bus artifact from a renderer.
 *
 * Production path (HttpBusClient): the hook fetches asynchronously via
 * readArtifactAsync on first mount, populates the in-memory cache, and
 * returns the result. While the fetch is in flight the hook returns
 * null — the renderer's empty-state handles that.
 *
 * Test path (synchronous mock injected via setBusClientForTests): the
 * hook reads from the mock's readArtifact() on the initial render, so
 * test code that returns artifacts synchronously still works without
 * waitFor.
 */

import { useEffect, useState } from 'react';

import type { Provenance } from './types/provenance';

export interface BusArtifact<TData = unknown> {
  provenance: Provenance;
  data: TData;
}

export interface BusClient {
  readArtifact<T = unknown>(artifactType: string): BusArtifact<T> | null;
  /**
   * Optional async fetch. Production clients (HttpBusClient) implement
   * this to retrieve artifacts that aren't yet in the sync cache.
   * Tests using a synchronous mock can omit it.
   */
  readArtifactAsync?<T = unknown>(
    artifactType: string,
  ): Promise<BusArtifact<T> | null>;
  /**
   * Optional invalidation subscription. Production clients fire on
   * events that should cause subscribers to re-fetch (e.g. the host
   * changing the global montage). The hook re-reads its artifact when
   * the listener fires. Returns an unsubscribe function.
   *
   * Tests using a synchronous mock can omit this.
   */
  subscribe?(listener: () => void): () => void;
}

let _client: BusClient | null = null;

/* Fetch gate. The host (desktop) can suppress fetches for artifacts known to be
 * unavailable in the current workflow state — analysis artifacts before
 * clinical sign-off, which the warm deliberately doesn't emit until the
 * clinician blesses the cleaning. A gated artifact skips the async fetch AND
 * the 404-poll entirely and stays null, so a cold-read session doesn't hammer
 * the backend (and flood the console) with 404s for artifacts that don't exist
 * yet by design. The gate lifts when the host calls setBusFetchGate again; the
 * version bump re-runs every hook's fetch effect, so previously-gated artifacts
 * fetch the moment sign-off opens the gate. */
let _fetchGate: ((artifactType: string) => boolean) | null = null;
let _fetchGateVersion = 0;
const _fetchGateListeners = new Set<() => void>();

/**
 * Set (or clear) the fetch gate. `gate(artifactType)` returns true when that
 * artifact must NOT be fetched right now. Pass `null` to lift the gate
 * entirely (everything fetches). Called by the desktop from sign-off state.
 */
export function setBusFetchGate(
  gate: ((artifactType: string) => boolean) | null,
): void {
  _fetchGate = gate;
  _fetchGateVersion += 1;
  _fetchGateListeners.forEach((l) => l());
}

/* Bus fetch retry policy. Two distinct failure modes, two bounded retry loops
 * (sharing one timer); both reset on invalidate() / remount.
 *
 * 1. TRANSIENT — `readArtifactAsync` THROWS (network error / 5xx, e.g. the
 *    backend mid-restart). Retry with exponential backoff, ~28s total, then
 *    surface null and let invalidate()/remount try again.
 *
 * 2. NOT-YET-EMITTED — `readArtifactAsync` returns null (HTTP 404). During an
 *    active warm, "absent" usually means "this producer hasn't emitted yet":
 *    producers emit over minutes (norms land near the end, and the SECOND
 *    resting condition's norms land only after the FIRST condition's entire
 *    sweep — the EC normative head-map blank), and nothing invalidate()s on
 *    warm COMPLETION. So a pane that mounted before its artifact landed would
 *    stay blank until a manual reload. Poll the 404 with backoff capped at 5s
 *    for up to ~8 min (covers a cold two-condition warm), then accept null as
 *    genuinely absent (e.g. normative skipped for missing demographics) so it
 *    doesn't poll forever. The pane stays in its empty state while polling. */
const BUS_FETCH_MAX_ATTEMPTS = 8;
const BUS_FETCH_BASE_DELAY_MS = 400;
const BUS_FETCH_MAX_DELAY_MS = 8000;
/** 404 / not-yet-emitted poll: backoff capped at 5s, ~100 attempts ≈ 8 min. */
const BUS_FETCH_ABSENT_MAX_ATTEMPTS = 100;
const BUS_FETCH_ABSENT_MAX_DELAY_MS = 5000;

export function useBusArtifact<T = unknown>(
  artifactType: string,
): BusArtifact<T> | null {
  const [artifact, setArtifact] = useState<BusArtifact<T> | null>(() => {
    // Initial render: try the synchronous cache. This serves
    // (a) production cache hits after the first async fetch lands and
    // (b) tests that inject a synchronous mock client.
    return _client?.readArtifact<T>(artifactType) ?? null;
  });

  // Bumped when the bus client fires its subscription event (e.g. on
  // global montage change). Used as an effect dep so the fetch loop
  // below re-runs and the renderer picks up the new artifact.
  const [epoch, setEpoch] = useState(0);

  useEffect(() => {
    if (!_client?.subscribe) return;
    return _client.subscribe(() => setEpoch((e) => e + 1));
  }, []);

  // Re-run the fetch effect when the host changes the fetch gate (e.g.
  // sign-off lifts it), so a previously-gated artifact starts fetching.
  const [gateVersion, setGateVersion] = useState(_fetchGateVersion);
  useEffect(() => {
    const listener = () => setGateVersion(_fetchGateVersion);
    _fetchGateListeners.add(listener);
    // Reconcile against any gate change between render and effect-attach.
    listener();
    return () => {
      _fetchGateListeners.delete(listener);
    };
  }, []);

  useEffect(() => {
    if (!_client) return;

    // Sync cache hit: state may have been seeded by useState's initial
    // value, but if the cache was populated AFTER the initial render
    // (e.g. via a sibling renderer's prefetch), pick it up here too.
    const cached = _client.readArtifact<T>(artifactType);
    if (cached) {
      setArtifact(cached);
      return;
    }

    // Host-gated: missing AND the host says this artifact won't be available
    // yet (e.g. analysis before sign-off). Stay null and do NOT fetch/poll —
    // we re-run when the gate version changes (sign-off lifts the gate). This
    // is what keeps cold read from polling 404s for unwarmed analysis.
    if (_fetchGate?.(artifactType)) {
      setArtifact(null);
      return;
    }

    // Sync cache miss: fall back to async fetch if the client supports it.
    if (typeof _client.readArtifactAsync !== 'function') return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let throwAttempt = 0;
    let absentAttempt = 0;

    const backoff = (n: number, maxDelay: number) =>
      Math.min(maxDelay, BUS_FETCH_BASE_DELAY_MS * 2 ** (n - 1));

    const run = () => {
      _client!
        .readArtifactAsync!<T>(artifactType)
        .then((env) => {
          if (cancelled) return;
          if (env) {
            // Landed — done.
            setArtifact(env);
            return;
          }
          // env === null is a 404: not emitted (yet). Keep the pane in its
          // empty state and poll a bounded number of times, so a late-landing
          // artifact appears on its own without a reload. After the cap, treat
          // it as genuinely absent.
          setArtifact(null);
          absentAttempt += 1;
          if (absentAttempt >= BUS_FETCH_ABSENT_MAX_ATTEMPTS) return;
          timer = setTimeout(
            run,
            backoff(absentAttempt, BUS_FETCH_ABSENT_MAX_DELAY_MS),
          );
        })
        .catch(() => {
          // Transient failure (network error / 5xx). Retry with bounded
          // exponential backoff so a single dropped fetch doesn't strand the
          // pane; once exhausted, surface null and let invalidate()/remount retry.
          if (cancelled) return;
          throwAttempt += 1;
          if (throwAttempt >= BUS_FETCH_MAX_ATTEMPTS) {
            setArtifact(null);
            return;
          }
          timer = setTimeout(run, backoff(throwAttempt, BUS_FETCH_MAX_DELAY_MS));
        });
    };
    run();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [artifactType, epoch, gateVersion]);

  return artifact;
}

/** Production setter. Called by the desktop app at session open. */
export function setBusClient(client: BusClient): void {
  _client = client;
}

/** Get the current bus client, or null if none configured. Useful for prefetching. */
export function getBusClient(): BusClient | null {
  return _client;
}

/** Test helper. Plan B replaces this with the real client setup. */
export function setBusClientForTests(client: BusClient): void {
  _client = client;
}

/** Test helper. */
export function resetBusForTests(): void {
  _client = null;
  _fetchGate = null;
  _fetchGateVersion += 1;
}

export interface HttpBusClientConfig {
  baseUrl: string;
  sessionId: string;
}

/**
 * HTTP-backed bus client. Reads artifacts from the FastAPI bus endpoints.
 *
 * Note: the React `useBusArtifact` hook is synchronous and expects an in-memory
 * cache. The real instrument shell (Plan D) is responsible for prefetching
 * artifacts into a cache that the synchronous `BusClient` reads. This class
 * exposes both the async raw API (`readArtifactAsync`) and a sync cache
 * accessor (`readArtifact`) seeded by `prefetch`.
 */
export class HttpBusClient implements BusClient {
  private readonly baseUrl: string;
  private readonly sessionId: string;
  private readonly cache = new Map<string, BusArtifact>();
  private readonly listeners = new Set<() => void>();

  constructor(config: HttpBusClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.sessionId = config.sessionId;
  }

  async readArtifactAsync<T = unknown>(
    artifactType: string,
  ): Promise<BusArtifact<T> | null> {
    const url = `${this.baseUrl}/api/bus/${this.sessionId}/${artifactType}`;
    const resp = await fetch(url, { method: 'GET' });
    if (resp.status === 404) return null;
    if (!resp.ok) throw new Error(`bus read failed: HTTP ${resp.status}`);
    const envelope = (await resp.json()) as BusArtifact<T>;
    this.cache.set(artifactType, envelope as BusArtifact);
    return envelope;
  }

  /** Prefetch an artifact into the in-memory cache for synchronous later reads. */
  async prefetch(artifactType: string): Promise<void> {
    await this.readArtifactAsync(artifactType);
  }

  /** Synchronous read from the in-memory cache. Returns null if not prefetched. */
  readArtifact<T = unknown>(artifactType: string): BusArtifact<T> | null {
    return (this.cache.get(artifactType) as BusArtifact<T> | undefined) ?? null;
  }

  /**
   * Subscribe to invalidation events. Returns an unsubscribe function.
   * The host (workstation shell) calls invalidate() when state that
   * affects artifact identity changes — primarily the global montage.
   */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Clear the in-memory cache and notify all subscribers. Subscribers
   * (renderers using useBusArtifact) re-trigger their fetch and pick
   * up the artifact for the new montage that the server now points
   * `latest` to. Reference-invariant artifacts get refetched too —
   * cheap because the server returns the same hash and the renderer
   * sees the same data.
   */
  invalidate(): void {
    this.cache.clear();
    for (const listener of this.listeners) {
      try {
        listener();
      } catch {
        /* listener errors must not break invalidation for siblings */
      }
    }
  }
}
