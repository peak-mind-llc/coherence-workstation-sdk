/* Shared resolver for the theme-aware data-canvas color tokens.
 *
 * Spectra, topomap, and IC-plot renderers paint to a <canvas> whose pixels
 * are baked at draw time, so they cannot rely on CSS cascade like SVG/DOM.
 * They must read the resolved color tokens at draw time. These canvases are
 * THEME-AWARE: dark-on-near-black in Dark mode, dark-on-white in Light mode.
 *
 * CRITICAL: read from the canvas's HOST element, never document.documentElement
 * / :root. The workstation theme is applied via `data-workstation-theme` on a
 * subtree (not :root), so :root resolves the wrong theme's values inside the
 * workstation. Passing the canvas (or its container) picks up the right theme.
 *
 * The raw-EEG trace canvas does NOT use these --data-canvas-* tokens. It has its
 * own theme-aware --signal-canvas-* family (background via --signal-canvas-bg),
 * which the desktop raw-trace pane reads and the user can override via the
 * Signal-color presets (Settings → Appearance). ERP and MRI / glass-brain
 * imaging keep the always-dark --surface-inset (DICOM viewport).
 */

export interface CanvasTokens {
  /** Canvas background. */
  bg: string;
  /** Primary text / value labels. */
  text: string;
  /** Axis lines + tick labels. */
  axis: string;
  /** Gridlines (low-alpha). */
  grid: string;
  /** Secondary labels (channel names, units). */
  label: string;
  /** Primary data trace stroke (PSD curve, time series). */
  trace: string;
  /** Topomap head/ear outline. */
  outline: string;
}

/** Dark-mode fallbacks — used when a token is unset (e.g. SSR / detached node). */
const DARK_FALLBACK: CanvasTokens = {
  bg: '#0a0a0c',
  text: '#e8eaed',
  axis: '#8a8f97',
  grid: 'rgba(255,255,255,0.08)',
  label: '#b8bcc4',
  trace: 'rgb(96,165,250)',
  outline: '#e8eaed',
};

/**
 * Resolve the `--data-canvas-*` tokens from a host element's computed style.
 * Pass the canvas element itself (or its container) so the values reflect the
 * workstation theme active in that subtree.
 */
export function readCanvasTokens(host: Element | null | undefined): CanvasTokens {
  if (typeof window === 'undefined' || !host) return { ...DARK_FALLBACK };
  const styles = getComputedStyle(host);
  const v = (name: string, fallback: string) =>
    styles.getPropertyValue(name).trim() || fallback;
  return {
    bg: v('--data-canvas-bg', DARK_FALLBACK.bg),
    text: v('--data-canvas-text', DARK_FALLBACK.text),
    axis: v('--data-canvas-axis', DARK_FALLBACK.axis),
    grid: v('--data-canvas-grid', DARK_FALLBACK.grid),
    label: v('--data-canvas-label', DARK_FALLBACK.label),
    trace: v('--data-canvas-trace', DARK_FALLBACK.trace),
    outline: v('--data-canvas-outline', DARK_FALLBACK.outline),
  };
}
