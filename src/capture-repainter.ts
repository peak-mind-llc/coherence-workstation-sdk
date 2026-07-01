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

/** Test-only: clear the registry between cases. */
export function clearCaptureRepaintersForTesting(): void {
  registry.clear();
}
