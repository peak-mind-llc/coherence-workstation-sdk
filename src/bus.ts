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
  /**
   * Optional index fetch. Production clients (HttpBusClient) implement this so
   * the index-watch coordinator can poll which artifact types currently exist.
   * Returns the set of artifact-type keys in the bus index.
   */
  fetchIndex?(): Promise<Set<string>>;
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

/* Bus index snapshot (populated by the index-watch coordinator, busIndexWatch.ts).
 * The hook consults it so it never fetches a name the bus does not have — the
 * guaranteed-404 legs of scoped reads make no request at all. `_busWarmSettled`
 * is false while a warm is actively changing the index and true at rest; a 404 is
 * only "missing" (honest empty) once settled, otherwise it's "loading". Defaults:
 * no index loaded (fetch as today) and settled (at rest, a 404 is honest). */
let _busIndex: Set<string> | null = null;
let _busWarmSettled = true;
let _busIndexVersion = 0;
const _busIndexListeners = new Set<() => void>();

/** Coordinator entry point: publish the latest index snapshot + settled flag. */
export function setBusIndex(snapshot: Set<string> | null, settled: boolean): void {
  _busIndex = snapshot;
  _busWarmSettled = settled;
  _busIndexVersion += 1;
  _busIndexListeners.forEach((l) => l());
}

/** True once a real index snapshot has been published (vs the default null). */
export function busIndexLoaded(): boolean {
  return _busIndex !== null;
}

/** True when the loaded index lists this artifact type. */
export function busIndexHas(type: string): boolean {
  return _busIndex?.has(type) ?? false;
}

/** True when no warm is actively expected to change the index. */
export function isBusWarmSettled(): boolean {
  return _busWarmSettled;
}

/* Bus fetch retry policy. Two distinct failure modes, two bounded retry loops
 * (sharing one timer); both reset on invalidate() / remount.
 *
 * 1. TRANSIENT — `readArtifactAsync` THROWS (network error / 5xx, e.g. the
 *    backend mid-restart). Retry with exponential backoff, ~28s total, then
 *    surface null and let invalidate()/remount try again.
 *
 * 2. NOT-YET-EMITTED — `readArtifactAsync` returns null (HTTP 404). Fetch ONCE
 *    and stop. Re-fetch is driven by the index-watch coordinator: it calls
 *    invalidate() when a warm lands new artifacts, which re-runs this effect.
 *    No per-pane blind poll. A 404 with the warm settled is an honest "missing".
 *
 *    (This supersedes PR #1018's poll-rate mitigation, which tuned the absent
 *    poll to 30 attempts / 20s cap; the poll is removed entirely here.)
 */
const BUS_FETCH_MAX_ATTEMPTS = 8;
const BUS_FETCH_BASE_DELAY_MS = 400;
const BUS_FETCH_MAX_DELAY_MS = 8000;

export type BusArtifactStatus = 'loading' | 'ready' | 'missing';

export interface BusArtifactState<TData = unknown> {
  artifact: BusArtifact<TData> | null;
  status: BusArtifactStatus;
}

export function useBusArtifactState<T = unknown>(
  artifactType: string,
): BusArtifactState<T> {
  const [artifact, setArtifact] = useState<BusArtifact<T> | null>(() => {
    return _client?.readArtifact<T>(artifactType) ?? null;
  });
  // The single fetch resolved to a 404 (or transient retries exhausted). Kept
  // separate from `artifact` so status can distinguish loading from missing.
  const [notFound, setNotFound] = useState(false);

  const [epoch, setEpoch] = useState(0);
  useEffect(() => {
    if (!_client?.subscribe) return;
    return _client.subscribe(() => setEpoch((e) => e + 1));
  }, []);

  const [gateVersion, setGateVersion] = useState(_fetchGateVersion);
  useEffect(() => {
    const listener = () => setGateVersion(_fetchGateVersion);
    _fetchGateListeners.add(listener);
    listener();
    return () => {
      _fetchGateListeners.delete(listener);
    };
  }, []);

  // Re-render + re-run the fetch effect when the index snapshot / settled flag
  // changes (the coordinator publishing a warm's progress).
  const [indexVersion, setIndexVersion] = useState(_busIndexVersion);
  useEffect(() => {
    const listener = () => setIndexVersion(_busIndexVersion);
    _busIndexListeners.add(listener);
    listener();
    return () => {
      _busIndexListeners.delete(listener);
    };
  }, []);

  useEffect(() => {
    if (!_client) return;
    setNotFound(false);

    const cached = _client.readArtifact<T>(artifactType);
    if (cached) {
      setArtifact(cached);
      return;
    }

    // Host-gated (analysis before sign-off): stay null, do not fetch.
    if (_fetchGate?.(artifactType)) {
      setArtifact(null);
      return;
    }

    // Index-consult gate: the index is loaded and does not list this type, so
    // it is genuinely absent — do NOT fetch (kills the guaranteed-404 legs).
    if (busIndexLoaded() && !busIndexHas(artifactType)) {
      setArtifact(null);
      setNotFound(true);
      return;
    }

    if (typeof _client.readArtifactAsync !== 'function') return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let throwAttempt = 0;

    const backoff = (n: number, maxDelay: number) =>
      Math.min(maxDelay, BUS_FETCH_BASE_DELAY_MS * 2 ** (n - 1));

    const run = () => {
      _client!
        .readArtifactAsync!<T>(artifactType)
        .then((env) => {
          if (cancelled) return;
          if (env) {
            setArtifact(env);
            setNotFound(false);
            return;
          }
          // 404 — single fetch, no poll. The coordinator's invalidate() (on a
          // later index change) re-runs this effect if the artifact lands.
          setArtifact(null);
          setNotFound(true);
        })
        .catch(() => {
          // Transient failure (network / 5xx): bounded exponential retry.
          if (cancelled) return;
          throwAttempt += 1;
          if (throwAttempt >= BUS_FETCH_MAX_ATTEMPTS) {
            setArtifact(null);
            setNotFound(true);
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
  }, [artifactType, epoch, gateVersion, indexVersion]);

  const status: BusArtifactStatus = artifact
    ? 'ready'
    : notFound && isBusWarmSettled()
      ? 'missing'
      : 'loading';

  return { artifact, status };
}

export function useBusArtifact<T = unknown>(
  artifactType: string,
): BusArtifact<T> | null {
  return useBusArtifactState<T>(artifactType).artifact;
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
  _busIndex = null;
  _busWarmSettled = true;
  _busIndexVersion += 1;
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
  private readonly inflight = new Map<string, Promise<BusArtifact | null>>();
  private readonly listeners = new Set<() => void>();

  constructor(config: HttpBusClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.sessionId = config.sessionId;
  }

  async readArtifactAsync<T = unknown>(
    artifactType: string,
  ): Promise<BusArtifact<T> | null> {
    const existing = this.inflight.get(artifactType);
    if (existing) return existing as Promise<BusArtifact<T> | null>;
    const p: Promise<BusArtifact<T> | null> = this._fetchArtifact<T>(artifactType).finally(() => {
      // Delete by identity, not key: an in-flight request that settles after
      // invalidate() cleared the map (and a fresh request re-populated it)
      // must not evict the newer entry.
      if (this.inflight.get(artifactType) === (p as Promise<BusArtifact | null>)) {
        this.inflight.delete(artifactType);
      }
    });
    this.inflight.set(artifactType, p as Promise<BusArtifact | null>);
    return p;
  }

  private async _fetchArtifact<T = unknown>(
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

  /** Fetch the set of artifact-type keys currently in the bus index. */
  async fetchIndex(): Promise<Set<string>> {
    const url = `${this.baseUrl}/api/bus/${this.sessionId}/index`;
    const resp = await fetch(url, { method: 'GET' });
    if (!resp.ok) return new Set();
    const body = (await resp.json()) as { latest?: Record<string, unknown> };
    return new Set(Object.keys(body.latest ?? {}));
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
    this.inflight.clear();
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
