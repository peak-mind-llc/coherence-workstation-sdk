/**
 * PaneRuntime — the curated "what a plugin pane gets from the host"
 * contract. RUO-13 Task B2a.
 *
 * A plugin pane needs session identity, a few bus-read hooks, a
 * synchronizer, layer/sign-off state, and the sign-off prompt component —
 * but it must NEVER receive a concrete CW class or context object (the
 * host's `WorkstationContextValue`, its `Synchronizer` class instance
 * shape, `OperationStack`, `DiscoveredInstance`, etc. are all internal).
 * This module is the narrow, typed seam between the two:
 *
 *   - Every TYPE here is either plain data (`subjectId`, `sessionDate`,
 *     `instances`), a small re-declared structural interface
 *     (`PaneSynchronizer`, `PaneRuntimeInstance` — same pattern as
 *     `pane-adapter.tsx`'s `PaneAdapterProps`, which re-declares rather
 *     than imports from desktop to avoid an SDK -> desktop cycle), or
 *     explicitly OPAQUE (`operationStack: unknown`, `signOffRevision`
 *     as a bare number cache-key dep).
 *   - The HOST calls `setPaneRuntime({...})` once at startup, wiring its
 *     real `useWorkstation()`-derived values in. The SDK never imports
 *     from desktop; the host imports this module and hands it a
 *     conforming implementation.
 *   - Plugin panes call the exported hooks/getters below. Each delegates
 *     to the registered implementation and throws a clear error if
 *     nothing has been registered yet (a plugin pane rendering before
 *     host startup wiring is a bug the plugin author should see
 *     immediately, not silently no-op against).
 *
 * This SUPERSEDES Task B1's raw `window.__CW_WS_HOOKS__` global (removed
 * in `pluginRuntimeGlobals.ts` in the same change) — plugins now get
 * host hooks through the SDK contract instead of a bespoke ad-hoc global.
 *
 * Does NOT migrate any plugin render (that's Task B2b) — this module is
 * additive only.
 */
import { createElement, type ComponentType } from 'react';
import type { BusArtifact } from './bus';
import type { Montage, SpectralScale } from './pane-types';

/* ──────────────────────────────────────────────────────────────────
 *  Session data — plain data + opaque handles only
 * ──────────────────────────────────────────────────────────────── */

/**
 * Per-instance seed data a pane needs to resolve "which condition am I
 * mounted in" (`instances.find(i => i.seed.instanceId === programInstanceId)`
 * then read `.seed.context.condition`). Deliberately a minimal, re-declared
 * structural subset of the host's `DiscoveredInstance` — NOT imported from
 * desktop, so the SDK carries no dependency on the program-registry
 * internals (extra fields the host's type may carry are simply not
 * visible here).
 */
export interface PaneRuntimeInstanceSeed {
  instanceId: string;
  label: string;
  context: Record<string, unknown>;
}

export interface PaneRuntimeInstance {
  kind: string;
  seed: PaneRuntimeInstanceSeed;
}

/**
 * Synchronizer surface a plugin pane needs: read the last cursor event on
 * a (syncGroup, channel) pair, and subscribe to future ones. Deliberately
 * narrower than the host's full `Synchronizer` (no `emit` / `freeze` /
 * `unfreeze` / `isFrozen` / `getState` — normative-style panes only ever
 * read + subscribe) and deliberately OPAQUE on payload shape: both
 * `getLastEvent` and the `subscribe` callback carry `unknown`, matching
 * how panes already treat sync-bus payloads (narrow with `typeof x ===
 * 'object'` + a local cast, never trust the bus's internal event shape).
 */
export interface PaneSynchronizer {
  getLastEvent(syncGroup: string, channel: string): unknown;
  subscribe(
    syncGroup: string,
    channel: string,
    fn: (evt: unknown) => void,
    options?: { paneId?: string },
  ): () => void;
}

/**
 * Session-scoped state a plugin pane may read via `useWorkstationSession()`.
 * Every field is either plain data or an opaque handle — no concrete CW
 * class or context object leaks through.
 */
export interface PaneSession {
  subjectId: string;
  sessionDate: string;
  instances: readonly PaneRuntimeInstance[];
  activeLayers: ReadonlySet<number>;
  /**
   * OPAQUE. Panes only `JSON.stringify` it (as a cache-key / effect dep)
   * or pass it through verbatim to an API call that accepts the same
   * opaque shape server-side. Its internal shape (`OperationStack`) is a
   * CW pipeline-cleaning-history detail and is intentionally not modeled
   * here.
   */
  operationStack: unknown;
  /** OPAQUE cache-key dep — bumps when the active condition's sign-off
   *  state changes, for consumers that need to invalidate on re-sign. */
  signOffRevision: number;
  synchronizer: PaneSynchronizer;
  maximizedPaneId: string | null;
  toggleMaximize: (paneId: string) => void;
}

/* ──────────────────────────────────────────────────────────────────
 *  Bus-read hook result shapes
 * ──────────────────────────────────────────────────────────────── */

export interface PriorRecordingResult {
  /** ISO date of the pinned baseline when usable, else null. */
  date: string | null;
  /** Reason `date` is null — for tooltip / status copy. */
  reason: 'no-baseline' | 'is-current' | null;
  loading: boolean;
  error: string | null;
}

export interface PriorBusArtifactResult<T = unknown> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

/* ──────────────────────────────────────────────────────────────────
 *  The runtime contract + registration
 * ──────────────────────────────────────────────────────────────── */

export interface PaneRuntime {
  /** Reads the host's `WorkstationContext` and returns the pane-facing
   *  subset. A React hook — the host's implementation calls its own
   *  `useWorkstation()` internally. */
  useWorkstationSession(): PaneSession;
  /** Condition-aware bus artifact reader — see the host's
   *  `useScopedBusArtifact` for the scoped/unscoped fallback contract. */
  useScopedBusArtifact<T = unknown>(
    baseName: string,
    programInstanceId: string | undefined,
  ): BusArtifact<T> | null;
  /** Resolves the clinician-pinned baseline session to compare against,
   *  if any — see the host's `usePriorRecording`. */
  usePriorRecording(
    subjectId: string | null,
    currentDate: string | null,
    paradigm?: 'resting' | 'erp',
  ): PriorRecordingResult;
  /** Cross-session bus artifact fetch for the compare-prior overlay —
   *  see the host's `usePriorBusArtifact`. */
  usePriorBusArtifact<T = unknown>(
    baseName: string,
    subjectId: string | null,
    priorDate: string | null,
    condition: string | null,
  ): PriorBusArtifactResult<T>;
  /** The "not signed off yet" prompt — host-injected so panes keep
   *  CW-consistent sign-off UX without importing desktop's component. */
  SignOffToAnalyze: ComponentType<{ label?: string }>;
  /** True when the active condition has NOT been signed off yet, so its
   *  analysis hasn't warmed — see the host's `useNotSignedOff` (Task
   *  B2b). Gates whether a pane renders `SignOffToAnalyze` at all instead
   *  of attempting to read its bus artifact. */
  useNotSignedOff(): boolean;
  /** True when analysis is paused because the active condition's sign-off
   *  was PRESERVED but its ICA fit basis went stale on a heal — the
   *  clinician must re-review on Surface EEG and re-sign before analysis
   *  resumes. See the host's `useStaleFitPendingReview` (WOR-166). Gates
   *  the same `SignOffToAnalyze` CTA as `useNotSignedOff` (Task A6-5). */
  useStaleFitPendingReview(): boolean;
  /** Power vs amplitude display preference (Task B2b) — see the host's
   *  `useSpectralScalePref` (a localStorage-backed, cross-instance-synced
   *  pref; no host state beyond that, but contract-provided so every
   *  spectral surface — host and plugin — reads the SAME toggle). */
  useSpectralScalePref(): [SpectralScale, (v: SpectralScale) => void];
  /** The clinician's current EEG signal-reference montage (Task B2b) — see
   *  the host's `contexts/MontageContext.tsx`. Genuine host session state
   *  (Provider, per-workspace/condition persistence), so contract-provided
   *  rather than vendored. */
  useMontage(): Montage;
}

let _runtime: PaneRuntime | null = null;

/** The host calls this once at startup (before any plugin pane can
 *  render) to register its real implementation. Idempotent by design —
 *  a later call simply replaces the registered implementation, which is
 *  useful for tests. */
export function setPaneRuntime(impl: PaneRuntime): void {
  _runtime = impl;
}

/** Test-only: clear the registered runtime between test cases. */
export function resetPaneRuntimeForTesting(): void {
  _runtime = null;
}

function requirePaneRuntime(): PaneRuntime {
  if (!_runtime) {
    throw new Error(
      '[@coherence/workstation-sdk] PaneRuntime is not registered. ' +
        'The host must call setPaneRuntime(...) at startup, before any ' +
        'plugin pane renders — see packages/cw-workstation-sdk-ts/src/pane-runtime.ts.',
    );
  }
  return _runtime;
}

/* ──────────────────────────────────────────────────────────────────
 *  Delegating consumer hooks/getters
 * ──────────────────────────────────────────────────────────────── */

export function useWorkstationSession(): PaneSession {
  return requirePaneRuntime().useWorkstationSession();
}

export function useScopedBusArtifact<T = unknown>(
  baseName: string,
  programInstanceId: string | undefined,
): BusArtifact<T> | null {
  return requirePaneRuntime().useScopedBusArtifact<T>(baseName, programInstanceId);
}

export function usePriorRecording(
  subjectId: string | null,
  currentDate: string | null,
  paradigm?: 'resting' | 'erp',
): PriorRecordingResult {
  return requirePaneRuntime().usePriorRecording(subjectId, currentDate, paradigm);
}

export function usePriorBusArtifact<T = unknown>(
  baseName: string,
  subjectId: string | null,
  priorDate: string | null,
  condition: string | null,
): PriorBusArtifactResult<T> {
  return requirePaneRuntime().usePriorBusArtifact<T>(
    baseName,
    subjectId,
    priorDate,
    condition,
  );
}

/**
 * The "not signed off yet" prompt, read from the registered runtime on
 * every render (so it always reflects the current registration — tests
 * that call `setPaneRuntime` after this module has already been
 * imported still see the fake's component). Not JSX (this module keeps
 * a `.ts` extension) — built with `createElement` instead.
 */
export const SignOffToAnalyze: ComponentType<{ label?: string }> = (props) => {
  const Impl = requirePaneRuntime().SignOffToAnalyze;
  return createElement(Impl, props);
};

export function useNotSignedOff(): boolean {
  return requirePaneRuntime().useNotSignedOff();
}

export function useStaleFitPendingReview(): boolean {
  return requirePaneRuntime().useStaleFitPendingReview();
}

export function useSpectralScalePref(): [SpectralScale, (v: SpectralScale) => void] {
  return requirePaneRuntime().useSpectralScalePref();
}

export function useMontage(): Montage {
  return requirePaneRuntime().useMontage();
}
