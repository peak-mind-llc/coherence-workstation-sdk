/**
 * useActiveLayers: determine if a renderer should mount given the current
 * set of active layers (per v3 §3 layer/phase model).
 *
 * Layer numbering (v3):
 *   0 = Raw Signal
 *   1 = Architectural Characterization
 *   2 = Source-Level Decomposition
 *   3 = Longitudinal Context
 *   4 = AI Commentary
 *
 * Renderers MUST integrate this hook so that the substrate-sacred keystroke
 * (`0`) can strip them in any phase.
 */

export type Layer = 0 | 1 | 2 | 3 | 4;

let _activeLayers: ReadonlySet<Layer> = new Set([0, 1, 2, 3, 4]);

export interface ActiveLayersInfo {
  isVisible: boolean;
  active: ReadonlySet<Layer>;
}

export function useActiveLayers(
  targetLayers: readonly Layer[] = [1, 2, 3, 4],
): ActiveLayersInfo {
  const isVisible = targetLayers.some((l) => _activeLayers.has(l));
  return { isVisible, active: _activeLayers };
}

/** Test helper. The real instrument shell (Plan D) drives this via context. */
export function setActiveLayersForTests(layers: ReadonlySet<Layer>): void {
  _activeLayers = layers;
}

export function resetActiveLayersForTests(): void {
  _activeLayers = new Set([0, 1, 2, 3, 4]);
}
