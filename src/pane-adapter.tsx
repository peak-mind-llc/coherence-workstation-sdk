/**
 * Adapt a plugin renderer (a plain ComponentType) into a PaneDefinition that
 * the instrument framework's pane registry accepts.
 *
 * The wrapped renderer receives the full PaneAdapterProps tuple (paneId,
 * syncGroup, state/setState, axes, etc.). Renderers that don't need any of
 * these can keep their no-arg signature; React drops props it doesn't read.
 * Renderers that DO need them (cursor sync, sync-group emits) can declare
 * `(props: PaneAdapterProps<TState>) => …` and read what they want.
 *
 * Optional `axes` / `emits` describe the pane's role in the workstation's
 * sync-group bus. Most renderers don't emit; the defaults are empty axes
 * and no emits.
 */
import type { ComponentType } from 'react';
import type { PaneInfoContent } from './PaneInfo';

// PaneDefinition + PaneProps come from the desktop's instrument core types.
// The SDK can't import from desktop directly (that would create a cycle),
// so we re-declare the minimal subset here. The adapter's output shape
// must match what the desktop's registerPane expects.

export type PaneAdapterAxis = string;

export interface PaneAdapterProps<TState = unknown> {
  paneId: string;
  programInstanceId: string;
  syncGroup: string;
  state: TState;
  setState: (next: TState | ((prev: TState) => TState)) => void;
  axes: readonly PaneAdapterAxis[];
  emits?: PaneAdapterAxis;
  visible: boolean;
}

export interface PaneAdapterDefinition<TState = unknown> {
  type: string;
  axes: readonly PaneAdapterAxis[];
  emits?: PaneAdapterAxis;
  Component: ComponentType<PaneAdapterProps<TState>>;
  /** RUO-13 Task B2d-3 — the wrapped redesign (V2) variant, present only
   *  when the registration supplied `componentV2`. The host mounts this
   *  in preference to its legacy compile-time `V2_PANES` map entry when
   *  redesign is enabled. */
  ComponentV2?: ComponentType<PaneAdapterProps<TState>>;
  defaultState: () => TState;
  snapshotState: (state: TState) => unknown;
  restoreState: (snapshot: unknown) => TState;
  schemaVersion: number;
  renderableLayers?: readonly number[];
  /** Phase 8 — opt-in to light-mode screenshot capture. SVG-only
   *  renderers can set this true unconditionally; canvas/uPlot
   *  renderers must also register a repainter via
   *  registerCaptureRepainter(paneId, …) inside the renderer. */
  supportsLightCapture?: boolean;
  /** SPEC-026 T35 — pane-level info content. When present, the host
   *  chrome renders a `<PaneInfo>` affordance (ⓘ → hover headline →
   *  click popover) next to the pane's breadcrumb title. Presence-
   *  driven: when undefined, no icon renders. Declared once at
   *  registration so every pane in the workstation framework can
   *  opt in uniformly without duplicating chrome inside the
   *  visualization. */
  info?: PaneInfoContent;
  /**
   * RUO-13 Task B1 — the plugin's RAW renderer component (before it's
   * wrapped in the pane adapter's `Component`). `paneFromRenderer` builds
   * a NEW `Component` wrapper on every call, so the wrapper's identity is
   * not stable across the host's re-runnable merge passes
   * (`rebuildProgramsFromRegisteredPlugins`). The underlying renderer
   * component, however, IS identity-stable (it's read from the same
   * plugin registration each pass). The host's `registerPaneIfAbsent`
   * uses this field to tell an idempotent re-registration (same
   * `sourceComponent` → skip silently) apart from a genuine cross-plugin
   * slot-id collision (different `sourceComponent` for the same pane
   * type → warn). Present only on adapters produced by `paneFromRenderer`.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sourceComponent?: ComponentType<any>;
}

export interface PaneFromRendererOptions {
  axes?: readonly PaneAdapterAxis[];
  emits?: PaneAdapterAxis;
  /** Phase 8 — passed through to the wrapped PaneDefinition. */
  supportsLightCapture?: boolean;
  /** SPEC-026 T35 — self-describing pane content; threaded into the
   *  PaneAdapterDefinition and rendered by the host's pane-chrome
   *  alongside the breadcrumb title. Presence-driven — when omitted,
   *  no ⓘ icon renders. */
  info?: PaneInfoContent;
  /** RUO-13 Task B2d-3 — optional redesign (V2) variant of the renderer.
   *  When supplied, the host mounts it in place of `component` once
   *  redesign is enabled; otherwise the host falls back to its legacy
   *  compile-time V2 map (or renders `component` under both flags). */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  componentV2?: ComponentType<any>;
}

export function paneFromRenderer(
  slotId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Renderer: ComponentType<any>,
  options: PaneFromRendererOptions = {},
): PaneAdapterDefinition<Record<string, never>> {
  const axes = options.axes ?? [];
  const emits = options.emits;

  const PaneAdaptedRenderer: ComponentType<
    PaneAdapterProps<Record<string, never>>
  > = (props) => {
    return <Renderer {...props} />;
  };

  let ComponentV2:
    | ComponentType<PaneAdapterProps<Record<string, never>>>
    | undefined;
  if (options.componentV2) {
    const RendererV2 = options.componentV2;
    const PaneAdaptedRendererV2: ComponentType<
      PaneAdapterProps<Record<string, never>>
    > = (props) => {
      return <RendererV2 {...props} />;
    };
    ComponentV2 = PaneAdaptedRendererV2;
  }

  return {
    type: slotId,
    axes,
    emits,
    Component: PaneAdaptedRenderer,
    ComponentV2,
    defaultState: () => ({}),
    snapshotState: () => ({}),
    restoreState: () => ({}),
    schemaVersion: 1,
    supportsLightCapture: options.supportsLightCapture,
    info: options.info,
    sourceComponent: Renderer,
  };
}
