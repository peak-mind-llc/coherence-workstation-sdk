/**
 * captureRepainterRegistry — per-instance repaint hook for canvas /
 * uPlot panes during light-mode screenshot capture.
 *
 * Pairs with `supportsLightCapture: true` on the pane definition.
 * captureElement(el, { theme: 'light' }) clones the source pane into a
 * hidden container with data-workstation-theme="light" set; SVG and
 * styled DOM resolve their CSS custom properties freshly under the
 * light theme, but canvas pixels are baked at draw time and don't
 * survive the clone.
 *
 * Each canvas pane registers a function via registerCaptureRepainter
 * keyed by its paneId. The function receives the cloned container
 * and re-paints the canvases inside it (typically by re-mounting the
 * canvas-bearing component, or by re-running the renderer with the
 * current data + theme-resolved colors). It returns an optional
 * cleanup the host invokes after html2canvas finishes.
 *
 * A second, finer registry is keyed by the LIVE `<canvas>` element
 * instead of a paneId: a renderer that draws one canvas registers how
 * to redraw that canvas, and the host calls it on the cloned canvas.
 * `renderTopomap` registers itself this way, so every topomap canvas —
 * in any pane, host or plugin — comes out light with no pane code.
 *
 * Mode-neutral: lives in the SDK so plugin panes can register
 * alongside in-tree panes. The desktop's host-side
 * captureRepainterRegistry re-exports from here.
 */

export type CaptureRepainter = (
  clonedContainer: HTMLElement,
) =>
  | void
  | Promise<void>
  | (() => void)
  | Promise<() => void>;

const registry = new Map<string, CaptureRepainter>();

/**
 * Register a repainter for a pane instance. Returns an unregister
 * callback (call on unmount; idiomatically the cleanup return of the
 * same useEffect that registers).
 *
 * Re-register replaces. The unregister callback only deletes its own
 * slot — re-registrations from a later mount aren't accidentally torn
 * down (matches React StrictMode's effect cleanup ordering).
 */
export function registerCaptureRepainter(
  paneId: string,
  fn: CaptureRepainter,
): () => void {
  registry.set(paneId, fn);
  return () => {
    if (registry.get(paneId) === fn) registry.delete(paneId);
  };
}

export function getCaptureRepainter(
  paneId: string,
): CaptureRepainter | undefined {
  return registry.get(paneId);
}

/**
 * Redraw one canvas into its clone. `target` is the cloned `<canvas>`,
 * already attached inside the light-themed offscreen container, so a
 * renderer that reads its colours from the canvas (`readCanvasTokens`)
 * gets the light values. Must draw synchronously.
 */
export type CanvasRepainter = (target: HTMLCanvasElement) => void;

// Keyed by the live canvas element and held weakly, so a renderer can
// register on every draw without an unmount hook and nothing leaks.
let canvasRegistry = new WeakMap<HTMLCanvasElement, CanvasRepainter>();

/**
 * Register how to redraw a live canvas for a light-mode capture. Re-register
 * replaces (register on every draw so the latest data wins). Returns an
 * unregister callback that only removes its own registration.
 */
export function registerCanvasRepainter(
  canvas: HTMLCanvasElement,
  fn: CanvasRepainter,
): () => void {
  canvasRegistry.set(canvas, fn);
  return () => {
    if (canvasRegistry.get(canvas) === fn) canvasRegistry.delete(canvas);
  };
}

export function getCanvasRepainter(
  canvas: HTMLCanvasElement,
): CanvasRepainter | undefined {
  return canvasRegistry.get(canvas);
}

/** Test-only: clear both registries between cases. */
export function clearCaptureRepaintersForTesting(): void {
  registry.clear();
  canvasRegistry = new WeakMap();
}
