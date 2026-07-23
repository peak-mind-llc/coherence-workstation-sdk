/**
 * Pane-contract types — RUO-13 Task B2b.
 *
 * These are the plain-data types a plugin pane's public component signature
 * is built from. Promoted here (from the host's
 * `desktop/src/lib/workstation/core/types.ts` / `core/spectralScale.ts` /
 * `contexts/MontageContext.tsx`) so a plugin's render module can type its
 * exported `Component` against the SAME definition the host's
 * `PaneDefinition<TState>.Component: ComponentType<PaneProps<TState>>` uses —
 * one definition, no divergence. The host re-exports each of these from its
 * own module (`export type { X } from '@coherence/workstation-sdk'`) rather
 * than keeping a parallel declaration.
 *
 * `axes` / `emits` are typed as plain `string` here rather than the host's
 * `SyncAxis` (`CoreSyncAxis | (string & {})`) — `CoreSyncAxis`'s big literal
 * union is host/program-registry autocomplete sugar, not a pane-contract
 * requirement, and `string` unifies with `SyncAxis` in both directions
 * (every `SyncAxis` value already IS a string, and `SyncAxis`'s
 * `(string & {})` arm is exactly the "any string is fine" escape hatch), so
 * this stays structurally identical for type-checking.
 */

/** Power (µV²/Hz) vs amplitude (µV/√Hz = sqrt(power)) display convention for
 *  spectral surfaces. See the host's `core/spectralScale.ts` for the
 *  transform functions (`psdToScale`, `log10PowerToScale`, `spectralUnit`) —
 *  those stay host-side (and are vendored into plugins that need them,
 *  since they're pure functions); only the type is shared. */
export type SpectralScale = 'power' | 'amplitude';

/**
 * EEG signal-reference montage. See the host's
 * `desktop/src/contexts/MontageContext.tsx` for the live, persisted,
 * per-(workspace, condition) value a clinician picks — that context object
 * (Provider, localStorage persistence, `setActiveCondition`) is genuine host
 * session state and stays host-side; a plugin pane reads the CURRENT value
 * via the `PaneRuntime` contract's `useMontage()` hook (see `pane-runtime.ts`).
 */
export type Montage = 'average_ref' | 'linked_ears' | 'bipolar' | 'laplacian';

/**
 * Control-bus carrier — payload for the `connectivity-control-bus` sync axis
 * (SPEC-014). Emitted by the phase toolbar and by NetworkCoordinationViewPane;
 * consumed by every connectivity pane in the Network Coordination phase,
 * including the normative plugin's network strips.
 */
export interface ConnectivityControlBusPayload {
  metric: string;
  /**
   * Edge-display threshold. Interpretation depends on `thresholdMode`:
   *   - 'percentile' — fraction in [0, 1]; e.g. 0.1 means "show top 10%"
   *   - 'absolute'   — absolute coupling magnitude in [0, 1]
   * The toolbar's slider state is the source of truth; consumers must
   * branch on `thresholdMode` to apply the cut correctly.
   */
  threshold: number;
  thresholdMode: 'percentile' | 'absolute';
  networkMask: string[];
  parcelScope: 'dk68' | 'roi18';
  /** Emitted by the network-coordination-view pane (left pane band dropdown). Other
   *  band-scoped panes in the phase read it via `bus.band ?? 'alpha'`. The phase
   *  toolbar no longer controls or emits band — it's per-view-pane state surfaced
   *  onto the bus so peer panes can mirror it without owning their own pickers. */
  band?: string;
}

/**
 * A pane's public component props — the plug-in contract every
 * `PaneDefinition.Component` is called with. See the host's
 * `core/types.ts` for `PaneDefinition` itself (registration-only surface,
 * stays host-side).
 */
export interface PaneProps<TState = unknown> {
  paneId: string;
  programInstanceId: string;
  syncGroup: string;
  state: TState;
  setState: (next: TState | ((prev: TState) => TState)) => void;
  /** Set of axes this pane consumes (mirrors PaneDefinition.axes). */
  axes: readonly string[];
  /** Axis this pane emits, if any (mirrors PaneDefinition.emits). */
  emits?: string;
  /**
   * True when the pane is currently rendered visible (its parent phase
   * is active and the pane is not display:none-hidden by a maximize /
   * solo-mode collapse).
   *
   * Defaults to `true` for backward compatibility — panes that ignore
   * the prop continue to behave as before.
   */
  visible: boolean;
}
