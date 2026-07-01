/**
 * Plugin registration registry.
 *
 * Plugins call `registerPlugin` at module load time. The registry is consulted
 * by the host shell to discover registered plugins, their renderers, and their
 * declared output registers.
 *
 * The real instrument shell (Plan D) reads from this registry; tests use
 * `resetRegistryForTests()` to start from a clean slate.
 */

import type { ComponentType } from 'react';
import type { Layer } from './active-layers';
import type { PaneInfoContent } from './PaneInfo';

export type EvidenceGrade = 'research' | 'clinical-pending' | 'clinical';
export type OutputRegister = 'descriptive' | 'self-comparative' | 'inferential';

export interface RendererRegistration {
  slot: string;
  component: ComponentType;
  /** Which analytical kind this slot belongs to. Must match a kind id. */
  kindId: string;
  /** Sort weight within the kind. Default 100. */
  order?: number;
  /** Grid placement hints (defaults: rowSpan = 1, colSpan = 12). */
  rowSpan?: number;
  colSpan?: number;
  /**
   * Sync-group axes this pane subscribes to (e.g. ['session-time']).
   * Threaded into PaneAdapterDefinition.axes; the workstation core uses
   * it to wire keyboard scrub bindings and pane-freeze semantics.
   * Default: [].
   */
  axes?: readonly string[];
  /**
   * Sync-group axis this pane emits cursor events on, if any.
   * Threaded into PaneAdapterDefinition.emits.
   */
  emits?: string;
  /**
   * Phase 8 — opt-in to light-mode screenshot capture. SVG-only
   * renderers can set this true unconditionally; canvas/uPlot
   * renderers must also register a per-instance repainter via
   * `registerCaptureRepainter(paneId, …)` inside the renderer.
   * When omitted, light-mode capture warns once per pane type and
   * falls back to current-theme capture.
   */
  supportsLightCapture?: boolean;
  /**
   * SPEC-026 T35 — self-describing pane content. When supplied, the
   * host's pane-chrome renders a `<PaneInfo>` affordance (ⓘ → hover
   * headline → click popover) next to the breadcrumb title for any
   * pane mounted from this renderer. Presence-driven — when omitted,
   * no icon renders. Threaded through `mergePluginContributions` and
   * the Phase 7 builder into `PaneAdapterDefinition.info`, so every
   * plugin gets uniform self-describing UI by declaring once here
   * instead of duplicating a title bar inside the pane's content.
   */
  info?: PaneInfoContent;
}

/**
 * Props the workstation host passes to a phase toolbar component.
 * Structurally matches `desktop/src/lib/workstation/core/types.ts`'s
 * `PhaseToolbarProps`; redeclared here so plugins don't have to import
 * from the desktop tree.
 */
export interface PhaseToolbarProps {
  instanceId: string;
  context: Record<string, unknown>;
}

export interface PluginKindContribution {
  /** Kind id — must match what manifest.toml declares (e.g., 'spectral'). */
  id: string;
  /** Human-readable label shown in the stepper (e.g., 'Spectral parameterization'). */
  label: string;
  /** Sort weight — lower comes first. Tie-break alphabetically by id. Default 100. */
  order?: number;
  /**
   * Optional component rendered as workspace chrome above the program
   * grid when this kind's phase is active. Use for view toggles, zoom
   * controls, threshold sliders — anything that should sit in the host
   * pane toolbar at the top of the screen rather than inside an
   * individual pane's content area. Mirrors the `phaseToolbar` slot
   * that built-in programs (QEEG, ERP) use.
   */
  phaseToolbar?: ComponentType<PhaseToolbarProps>;
  /**
   * Opt into the workstation's standard session-chrome above this
   * kind's renderer slots — ``raw-trace`` (rows 1-5 col 1-11),
   * ``field-topo`` (rows 1-3 col 12), and the badge slot (rows 4-5
   * col 12). The plugin's slots then lay out starting at row 6.
   *
   * Pass ``true`` for the default chrome (vigilance-badge in the
   * badge slot). Pass an object to override:
   *   - ``badgeSlot``: pane type to render in the badge cell instead
   *     of ``vigilance-badge``. The plugin must register that pane
   *     under its own ``renderers`` array. Useful for research-tier
   *     kinds that want a domain-specific badge (e.g. Mind Mirror
   *     state) in the chrome's badge cell.
   *
   * Default off — FOOOF / microstates / etc. lay out flush from row 1
   * without chrome.
   */
  withSessionChrome?: boolean | { badgeSlot?: string };
}

/** A named variant a plugin contributes to its target phase. The host
 *  synthesizes a default 'native' variant from the phase's current panes
 *  and adds this one alongside it, so a generic toggle can flip between
 *  them. Generic — carries no domain vocabulary. */
export interface PluginVariantTarget {
  /** Variant id, scoped to the target phase. e.g. 'norms'. */
  id: string;
  /** Human label for the toggle pill. e.g. 'Norms'. */
  label: string;
  /** Layers activated while this variant is selected. Folds into the
   *  phase's effective layer set via computeActiveLayers. */
  layersActive?: readonly Layer[];
}

/** Where a plugin lands in the workstation UI.
 *
 * Defaults (when `target` is omitted): the plugin lands in **Exploratory**
 * (program=`phase7`, no specific phase) — backward-compatible with FOOOF /
 * Microstates style plugins. Set `program` + `phase` to target a built-in
 * program's specific phase (e.g., `{ program: "qeeg", phase: "architectural" }`).
 * When `replaces` is set, the plugin's renderers substitute the named pane
 * types in that phase rather than appending alongside them. When `asVariant`
 * is also set, the swap is installed as a named variant of the target phase
 * rather than mutating the phase's base pane set.
 */
export interface PluginTarget {
  program: string;
  phase?: string;
  replaces?: readonly string[];
  /** When set, the plugin's `replaces` swap is installed as a NAMED
   *  VARIANT of the target phase rather than mutating the phase's base
   *  pane set. */
  asVariant?: PluginVariantTarget;
}

export interface PluginRegistration {
  name: string;
  consumes: readonly string[];
  renderers: readonly RendererRegistration[];
  evidenceGrade: EvidenceGrade;
  outputRegister: OutputRegister;
  /** Analytical kinds this plugin contributes to its target program. */
  kinds?: readonly PluginKindContribution[];
  /** Where this plugin lands. Defaults to Exploratory. */
  target?: PluginTarget;
}

const _plugins = new Map<string, PluginRegistration>();

export function registerPlugin(reg: PluginRegistration): void {
  if (!reg.name) {
    throw new Error('registerPlugin: plugin name is required');
  }
  if (_plugins.has(reg.name)) {
    throw new Error(`registerPlugin: '${reg.name}' is already registered`);
  }
  _plugins.set(reg.name, reg);
}

export function getRegisteredPlugins(): readonly PluginRegistration[] {
  return Array.from(_plugins.values());
}

/** Test helper. Do not use outside tests. */
export function resetRegistryForTests(): void {
  _plugins.clear();
}
