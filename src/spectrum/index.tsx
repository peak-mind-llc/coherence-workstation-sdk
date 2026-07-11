/**
 * UPlotMiniSpectrum — single-channel mini PSD plot, uPlot-rendered.
 *
 * SDK primitive. Host AND plugins consume from here so spectrum visuals stay
 * consistent. "If you want a per-channel spectrum cell, use ours."
 *
 * Supports:
 *   - Optional ±1σ / ±2σ shaded bands (deviation overlay) via uPlot's native
 *     `bands` feature (filled regions linked to series)
 *   - Optional `technical` mode: shows X/Y axes, ticks, grid
 *   - Vertical band tints (δθαβγ) painted under the curve at standard EEG
 *     band ranges (override via `bands` prop)
 *   - Y-axis modes (log / lin / z) and Cmd+wheel y-zoom
 *   - Cross-cell crosshair sync via crosshairFreq + onHoverFreq
 *   - PSD overlay curves for channel comparisons
 *
 * Reads CSS variables at runtime for theme-correct strokes/fills; no host
 * imports required. uplot is a peerDependency — plugins and host bundle it.
 */

import { useEffect, useMemo, useRef } from 'react';
import uPlot from 'uplot';
import { readCanvasTokens } from '../canvas-tokens';

export type SpectrumYMode = 'log' | 'lin' | 'z';

export interface BandRange {
  loHz: number;
  hiHz: number;
}

/** Standard EEG clinical bands. Pass as `bands` prop to override. */
export const DEFAULT_BANDS: Readonly<Record<string, BandRange>> = {
  delta: { loHz: 1, hiHz: 4 },
  theta: { loHz: 4, hiHz: 8 },
  alpha: { loHz: 8, hiHz: 13 },
  beta: { loHz: 13, hiHz: 30 },
  gamma: { loHz: 30, hiHz: 45 },
} as const;

const BAND_TINT_KEYS = ['delta', 'theta', 'alpha', 'beta', 'gamma'] as const;
/* Band tint opacity tuned to match the dashboard's StackedSpectraGrid
 * "fill" mode (~13–15% per band). The previous 7% read as washed out
 * against the dark surface; 14% restores the ribbon-like color regions
 * that make alpha/theta peaks legible at a glance. */
const BAND_TINT_OPACITY = 0.14;
/* Opacity for the WinEEG-style "fill area under the curve" rendering
 * used in linear mode. The fill paints below the trace, not over it,
 * so it can be far more opaque than the vertical-stripe overlay — and
 * needs to be, to read as a saturated band identity at a glance. */
const UNDER_CURVE_BAND_ALPHA = 0.7;

const ALPHA_LO = 8;
const ALPHA_HI = 13;
const F_MIN_HZ = 1;
const F_MAX_HZ = 45;

/**
 * A clickable peak marker rendered on the spectrum curve. Plugins (e.g.
 * Spectral Atlas) populate `peakMarkers` to display SpecParam-detected
 * peaks; the marker dot sits on the curve at its center frequency, and
 * `onPeakClick` fires when the user clicks within the marker's hit
 * radius.
 */
/**
 * SHARED PEAK-MARKER DESIGN — SOURCE OF TRUTH.
 *
 * Both spectrum renderers should look identical at the marker level so
 * a clinician's eye reads them as the same affordance regardless of
 * which pane they're in:
 *
 *   - `head-spectra` (canvas, uPlot) — `UPlotMiniSpectrum` consumes
 *     this via `SpectrumPeakMarker` instances built in `HeadSpectraPane`.
 *   - `ic-spectrum` (SVG, hand-built) — `ICSpectraChart` reads these
 *     constants directly when drawing its peak markers.
 *
 * If you change a value here, BOTH renderers automatically pick it up
 * (head-spectra reads `.color` etc. when constructing markers;
 * ic-spectrum reads them at draw time). Do not fork the design in
 * either renderer; if you need a per-pane override, add a new field
 * here so the contract stays explicit.
 *
 * `radius` and `hitRadius` are in **canvas pixels** for head-spectra.
 * `ic-spectrum` renders SVG with a 440-wide viewBox and uses these
 * values directly as SVG units; they don't map 1:1 to display pixels
 * but the relative-size and color contract still matches what the eye
 * reads as "a clickable peak marker on a spectrum."
 */
export const SPECTRUM_PEAK_MARKER_DESIGN = {
  // Default (unmarked) peak — what every newly-detected FOOOF peak
  // gets. Cool blue, no halo — recedes into the chart.
  color: '#7aa2f7',
  radius: 2.5,
  opacity: 0.95,
  strokeColor: 'var(--surface-base)',
  strokeWidth: 1,
  haloRadius: 0,
  hitRadius: 14,

  // Marked variant — peak has a clinician annotation (label and/or
  // notes). Slightly larger, brighter, with a soft halo so the eye
  // finds annotated peaks at a glance across the head grid.
  // Color is overridden per-marker by the LABEL color (see
  // `peakMarkerStyleForAnnotation` below) when the annotation has a
  // label set; this fallback is for annotations without a label
  // (notes-only marks).
  marked: {
    color: '#facc15', // amber — neutral "this peak has a clinical note"
    radius: 3.5,
    haloRadius: 5,
    strokeWidth: 1.5,
  },

  // Tracked variant — peak has been promoted to a longitudinal
  // fingerprint. Builds ON the marked variant — same label color, but
  // an even larger halo so a tracked peak reads as "watch this one
  // across sessions."
  tracked: {
    radius: 4,
    haloRadius: 7,
    strokeWidth: 1.5,
  },
} as const;

/**
 * Valley marker visual — the deficit-side counterpart to
 * SPECTRUM_PEAK_MARKER_DESIGN. Rendered as a downward triangle (see the
 * `shape` field on SpectrumPeakMarker) in a cool teal so valleys read as the
 * mirror of peaks at a glance. `marked`/`tracked` mirror the peak treatment;
 * the per-marker color is overridden by the VALLEY_LABELS color when a label
 * is set (see clinical-sdk's valleyMarkerStyleForAnnotation).
 */
export const SPECTRUM_VALLEY_MARKER_DESIGN = {
  color: '#38bdf8',
  radius: 3,
  opacity: 0.95,
  strokeColor: 'var(--surface-base)',
  strokeWidth: 1,
  haloRadius: 0,
  hitRadius: 14,
  marked: { color: '#0891b2', radius: 3.5, haloRadius: 5, strokeWidth: 1.5 },
  tracked: { radius: 4, haloRadius: 7, strokeWidth: 1.5 },
} as const;

// SPEC-029: `peakMarkerStyleForAnnotation` (which mapped a clinical
// PeakLabel → marker style) moved to @coherence/clinical-sdk — it bridges
// the clinical annotation vocabulary to these generic design tokens. The
// generic `SPECTRUM_PEAK_MARKER_DESIGN` + `SpectrumPeakMarker` stay public;
// the clinical-aware mapping lives in the closed package and imports those
// tokens back from here.

export interface SpectrumPeakMarker {
  /** Center frequency in Hz. */
  cf: number;
  /** Fill color. */
  color: string;
  /** Visual radius in canvas pixels. */
  radius: number;
  /**
   * Click hit radius in canvas pixels. Defaults to ``max(radius * 2, 14)``
   * so the user can land near the marker without having to pixel-hunt
   * the visual dot — particularly important on small head-grid cells
   * where the curve eats most of the cell's width.
   */
  hitRadius?: number;
  /** Optional opacity 0..1; defaults to 1. */
  opacity?: number;
  /** Optional stroke color for the marker outline; rendered AFTER the fill. */
  strokeColor?: string;
  /** Optional stroke width in canvas pixels (default 0 = no stroke). */
  strokeWidth?: number;
  /**
   * Optional soft halo radius in canvas pixels — drawn under the fill at
   * 25% opacity. Use to make small markers visible on busy spectra.
   */
  haloRadius?: number;
  /** Optional halo color; defaults to the marker's `color`. */
  haloColor?: string;
  /**
   * Glyph shape. 'dot' (default) for peaks; 'down-triangle' for valleys
   * (sub-slope deficits), so the two read as mirror images on the spectrum.
   */
  shape?: 'dot' | 'down-triangle';
  /** Arbitrary payload returned by `onPeakClick`. */
  meta?: unknown;
}

/** Format absolute PSD power compactly for the hover readout. */
function formatPower(p: number, unit: string): string {
  if (!Number.isFinite(p) || p <= 0) return '—';
  const u = unit ? ` ${unit}` : '';
  if (p >= 100) return `${p.toFixed(0)}${u}`;
  if (p >= 1) return `${p.toFixed(2)}${u}`;
  if (p >= 0.01) return `${p.toFixed(3)}${u}`;
  return `${p.toExponential(1)}${u}`;
}

/**
 * Place the hover readout pill in the chart's upper-right corner, fully
 * inside the plot box, so the whole `Hz · value` pill is always visible
 * (never clipped at the cell edge) and never chases the cursor. The
 * channel label lives in the upper-LEFT, so the upper-right is the clear,
 * predictable home. When the pill is wider than the plot, it clamps to the
 * left edge rather than overflowing off-screen.
 */
export function placeReadoutTopRight(
  bbox: { left: number; top: number; width: number; height: number },
  tipW: number,
  margin = 2,
): { left: number; top: number } {
  const right = bbox.left + bbox.width - tipW - margin;
  const left = Math.max(bbox.left + margin, right);
  return { left, top: bbox.top + margin };
}

const DEFAULT_UNIT = 'µV²/Hz';

export interface UPlotMiniSpectrumProps {
  /** Subject PSD frequencies (Hz). */
  freqs: number[];
  /** Subject PSD power values (µV²/Hz). */
  psd: number[];
  /** Channel label. Drawn in upper-left. */
  channel: string;
  /** Highlight (thicker stroke + accent color). */
  highlight?: boolean;
  /** Show axes / ticks / grid (technical mode). Turns on BOTH x and y
   *  full axes — used by the maximized "deep-read" view. The compact
   *  head-grid intentionally renders no axes; channels share a global
   *  log10(µV²/Hz) range so per-cell axis numerals would be redundant
   *  noise at thumbnail scale. */
  technical?: boolean;
  /**
   * Shared y-min and y-max in log10(µV²/Hz). Passing this from the parent
   * keeps all 19 cells on the same scale so cross-channel comparisons are
   * visually meaningful.
   */
  logMin: number;
  logMax: number;
  /** Y-axis mode. 'z' falls back to 'log' when norm is missing. */
  yMode?: SpectrumYMode;
  /** Y-range zoom multiplier. >1 zooms in (smaller visible range). */
  yZoom?: number;
  /** Optional ±1σ / ±2σ bounds in log10(µV²/Hz), already projected to subject freqs. */
  band1Upper?: number[];
  band1Lower?: number[];
  band2Upper?: number[];
  band2Lower?: number[];
  /** Optional normative mean curve (log10 µV²/Hz), aligned to freqs. */
  normMean?: number[];
  /** Optional normative SD curve (log10 µV²/Hz), aligned to freqs. */
  normSd?: number[];
  /**
   * Synchronized crosshair frequency (Hz) driven externally — the parent
   * broadcasts another cell's hover. Null clears.
   */
  crosshairFreq?: number | null;
  /**
   * Hover callback. Fires with the frequency under the cursor when the
   * user is mousing over THIS cell, and null when the mouse leaves.
   */
  onHoverFreq?: (freq: number | null) => void;
  /** Render subtle vertical band tints (δθαβγ) behind the curve. */
  showBandTints?: boolean;
  /**
   * Opacity of the vertical band tints (0..1). Defaults to 0.07 — barely
   * visible by design (band ranges are reference, not the foreground).
   * Push higher (e.g. 0.18) when band identity is the surface's primary
   * cue (e.g. Spectral Atlas's stacked-spectra grid).
   */
  bandTintOpacity?: number;
  /**
   * Override the default EEG band ranges used for tint rendering. Defaults
   * to DEFAULT_BANDS (1-45 Hz across delta/theta/alpha/beta/gamma).
   */
  bands?: Readonly<Record<string, BandRange>>;
  /**
   * Overlay PSD curves from other cells (channel comparisons). Drawn over
   * the subject curve in contrasting colors.
   */
  overlayCurves?: ReadonlyArray<{ srcCh: string; psd: number[] }>;
  /**
   * Optional clickable peak markers rendered as colored dots sitting on
   * the curve at each marker's `cf`. Draw order: after band tints and
   * curves, before the channel label.
   */
  peakMarkers?: ReadonlyArray<SpectrumPeakMarker>;
  /**
   * Click handler fired when the user clicks within a marker's hit
   * radius (`max(radius, 8)` CSS pixels). Markers stack in `peakMarkers`
   * order; if multiple overlap, the last-drawn (topmost) wins.
   */
  onPeakClick?: (
    marker: SpectrumPeakMarker,
    event: { clientX: number; clientY: number },
  ) => void;
  /**
   * Display unit for the y-axis label and hover tooltip. Defaults to
   * `µV²/Hz` (the canonical PSD unit). Pass an alternative when the
   * caller has pre-converted the values to a different scale, e.g.
   * `µV` for amplitude (sqrt of PSD), or just `Power` to drop units.
   */
  unit?: string;
  /**
   * Override the y-axis label entirely. When omitted, the label is
   * computed from `yMode` + `unit` (e.g. `µV²/Hz` for lin mode,
   * `log₁₀ µV²/Hz` for log mode).
   */
  yLabelOverride?: string;
  /**
   * Distribution-honest percentile ribbons (v2 norms data). Each entry
   * is a back-to-front shaded band — earlier entries render BELOW later
   * ones, so callers pass the widest band first (e.g. p2.5–p97.5) and
   * narrowest last (e.g. p25–p75). Values are in the same space as
   * `band1Upper/Lower` (log10(µV²/Hz)) and converted to lin/log/z per
   * yMode internally.
   *
   * When `ribbons` is provided, the legacy `band1Upper/Lower` and
   * `band2Upper/Lower` are ignored, AND the legacy dashed `normMean`
   * ref line is suppressed — callers pick one mode or the other. v1
   * callers (no ribbons) continue to use band1/band2 + normMean and
   * get today's render.
   */
  ribbons?: ReadonlyArray<{
    upper: number[];
    lower: number[];
    /** Fill color (rgba/hex). Drawn at full opacity — bake alpha into the rgba. */
    fill: string;
  }>;
  /**
   * Optional dashed center line (typically the distribution median p50)
   * in log10(µV²/Hz). Pass this *instead of* `normMean` when using
   * `ribbons` — when `ribbons` are set the SDK suppresses the legacy
   * normMean dashed ref line, so `medianLine` is the only center line
   * rendered. Independent of `ribbons` otherwise: passing `medianLine`
   * alone (no ribbons) draws the dashed line without any bands.
   */
  medianLine?: number[];
  /**
   * Caller-supplied suffix appended to the hover tooltip as
   * ` · ${extra}`. Receives the index into the cell's freqs array AND
   * the frequency in Hz; return null to suppress the suffix.
   *
   * Used by the Spectra plugin to inject per-frequency `rank=… · z=…`
   * from the cell's percentile row.
   */
  hoverExtra?: (freqIdx: number, freqHz: number) => string | null;
  /**
   * When true, the hover readout also appears on cells whose crosshair is
   * driven by the SHARED `crosshairFreq` broadcast — not just the cell
   * directly under the cursor. In a grid (e.g. head-spectra) this makes
   * every cell show its own value at the hovered frequency: a comparison
   * comb. Default false — only the locally-hovered cell shows a readout
   * (single-chart consumers and the Spectral Atlas keep today's behavior).
   */
  readoutOnCrosshair?: boolean;
}

interface ModeBundle {
  xs: number[];
  ys: number[];
  ref: number[] | null;
  band1: { upper: number[]; lower: number[] } | null;
  band2: { upper: number[]; lower: number[] } | null;
  /** Ribbons in y-mode space, aligned to xs. Earlier entries are
   *  widest / drawn first. */
  ribbons: Array<{ upper: number[]; lower: number[]; fill: string }>;
  /** Median curve in y-mode space, aligned to xs. */
  median: number[] | null;
  /** Indices into the SUBJECT psd array (not xs) for each xs sample, so
   *  callers can look up the percentile row for the hovered freq. */
  freqIndexByXs: number[];
  yRange: [number, number];
  yLabel: string;
  zMissingNorm: boolean;
}

function buildModeBundle(
  mode: SpectrumYMode,
  yZoom: number,
  freqs: number[],
  psd: number[],
  logMin: number,
  logMax: number,
  unit: string,
  normMean?: number[],
  normSd?: number[],
  band1Upper?: number[],
  band1Lower?: number[],
  band2Upper?: number[],
  band2Lower?: number[],
  ribbons?: ReadonlyArray<{ upper: number[]; lower: number[]; fill: string }>,
  medianLine?: number[],
): ModeBundle {
  const haveNorm = !!normMean && !!normSd;
  const effectiveMode: SpectrumYMode =
    mode === 'z' && !haveNorm ? 'log' : mode;
  const zMissingNorm = mode === 'z' && !haveNorm;

  const xs: number[] = [];
  const ys: number[] = [];
  const ref: number[] = [];
  const b1u: number[] = [];
  const b1l: number[] = [];
  const b2u: number[] = [];
  const b2l: number[] = [];

  const haveBand1 = !!(band1Upper && band1Lower);
  const haveBand2 = !!(band2Upper && band2Lower);
  const haveMean = !!normMean;

  const freqIndexByXs: number[] = [];
  const medianProj: number[] = [];
  const ribbonsProj: Array<{ upper: number[]; lower: number[]; fill: string }> =
    (ribbons ?? []).map((r) => ({ upper: [], lower: [], fill: r.fill }));
  const haveMedian = !!medianLine;

  for (let i = 0; i < freqs.length; i++) {
    const f = freqs[i];
    if (f < F_MIN_HZ || f > F_MAX_HZ) continue;
    const v = psd[i];
    if (!Number.isFinite(v) || v <= 0) continue;
    xs.push(f);
    freqIndexByXs.push(i);

    if (effectiveMode === 'z') {
      const m = normMean![i];
      const s = normSd![i];
      const logp = Math.log10(v);
      const canZ = Number.isFinite(m) && Number.isFinite(s) && s > 0;
      const z = canZ ? (logp - m) / s : NaN;
      ys.push(z);
      if (haveBand1) {
        b1u.push(1);
        b1l.push(-1);
      }
      if (haveBand2) {
        b2u.push(2);
        b2l.push(-2);
      }
      // Ribbons / median in z-mode require normMean/normSd to project
      // log10 → z. When the cell has no normMean/normSd (v2 still ships
      // them), fall back to NaN so the band collapses cleanly.
      if (ribbons) {
        for (let k = 0; k < ribbons.length; k++) {
          const u = ribbons[k].upper[i];
          const l = ribbons[k].lower[i];
          ribbonsProj[k].upper.push(canZ && Number.isFinite(u) ? (u - m) / s : NaN);
          ribbonsProj[k].lower.push(canZ && Number.isFinite(l) ? (l - m) / s : NaN);
        }
      }
      if (haveMedian) {
        const mm = medianLine![i];
        medianProj.push(canZ && Number.isFinite(mm) ? (mm - m) / s : NaN);
      }
    } else if (effectiveMode === 'lin') {
      ys.push(v);
      if (haveMean) ref.push(Math.pow(10, normMean![i] ?? NaN));
      if (haveBand1) {
        b1u.push(Math.pow(10, band1Upper![i] ?? NaN));
        b1l.push(Math.pow(10, band1Lower![i] ?? NaN));
      }
      if (haveBand2) {
        b2u.push(Math.pow(10, band2Upper![i] ?? NaN));
        b2l.push(Math.pow(10, band2Lower![i] ?? NaN));
      }
      if (ribbons) {
        for (let k = 0; k < ribbons.length; k++) {
          const u = ribbons[k].upper[i];
          const l = ribbons[k].lower[i];
          ribbonsProj[k].upper.push(Number.isFinite(u) ? Math.pow(10, u) : NaN);
          ribbonsProj[k].lower.push(Number.isFinite(l) ? Math.pow(10, l) : NaN);
        }
      }
      if (haveMedian) {
        const mm = medianLine![i];
        medianProj.push(Number.isFinite(mm) ? Math.pow(10, mm) : NaN);
      }
    } else {
      ys.push(Math.log10(v));
      if (haveMean) ref.push(normMean![i] ?? NaN);
      if (haveBand1) {
        b1u.push(band1Upper![i] ?? NaN);
        b1l.push(band1Lower![i] ?? NaN);
      }
      if (haveBand2) {
        b2u.push(band2Upper![i] ?? NaN);
        b2l.push(band2Lower![i] ?? NaN);
      }
      if (ribbons) {
        for (let k = 0; k < ribbons.length; k++) {
          ribbonsProj[k].upper.push(ribbons[k].upper[i] ?? NaN);
          ribbonsProj[k].lower.push(ribbons[k].lower[i] ?? NaN);
        }
      }
      if (haveMedian) {
        medianProj.push(medianLine![i] ?? NaN);
      }
    }
  }

  const z = Math.max(0.05, Math.min(100, yZoom));
  let yRange: [number, number];
  if (effectiveMode === 'z') {
    const half = 3 / z;
    yRange = [-half, half];
  } else if (effectiveMode === 'lin') {
    const linMax = Math.pow(10, logMax) / z;
    yRange = [0, linMax];
  } else {
    const center = (logMin + logMax) / 2;
    const half = (logMax - logMin) / 2 / z;
    yRange = [center - half, center + half];
  }

  const yLabel =
    effectiveMode === 'z'
      ? `z (log ${unit})`
      : effectiveMode === 'lin'
        ? unit
        : `log₁₀ ${unit}`;

  return {
    xs,
    ys,
    // When ribbons are present, the v2 caller's medianLine is the
    // dashed center line; the legacy normMean ref line would render
    // redundantly behind it. Suppress ref so v2 callers get a clean
    // ribbon + dashed-median display, while v1 callers (no ribbons)
    // keep the existing dashed normMean line.
    ref:
      effectiveMode === 'z' || ribbonsProj.length > 0
        ? null
        : haveMean
          ? ref
          : null,
    band1: haveBand1 ? { upper: b1u, lower: b1l } : null,
    band2: haveBand2 ? { upper: b2u, lower: b2l } : null,
    ribbons: ribbonsProj,
    median: haveMedian ? medianProj : null,
    freqIndexByXs,
    yRange,
    yLabel,
    zMissingNorm,
  };
}

export default function UPlotMiniSpectrum({
  freqs,
  psd,
  channel,
  highlight,
  technical,
  logMin,
  logMax,
  yMode = 'log',
  yZoom = 1,
  band1Upper,
  band1Lower,
  band2Upper,
  band2Lower,
  normMean,
  normSd,
  crosshairFreq,
  onHoverFreq,
  showBandTints = false,
  bandTintOpacity,
  bands = DEFAULT_BANDS,
  overlayCurves,
  peakMarkers,
  onPeakClick,
  unit = DEFAULT_UNIT,
  yLabelOverride,
  ribbons,
  medianLine,
  hoverExtra,
  readoutOnCrosshair = false,
}: UPlotMiniSpectrumProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const plotRef = useRef<uPlot | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const hoveredRef = useRef(false);
  const onHoverFreqRef = useRef(onHoverFreq);
  useEffect(() => {
    onHoverFreqRef.current = onHoverFreq;
  }, [onHoverFreq]);
  /* Read inside the once-created setCursor hook without recreating the plot
   * on every crosshair move. `crosshairFreqRef` is updated by the crosshair
   * effect below, just before it drives the cursor. */
  const crosshairFreqRef = useRef(crosshairFreq);
  const readoutOnCrosshairRef = useRef(readoutOnCrosshair);
  useEffect(() => {
    readoutOnCrosshairRef.current = readoutOnCrosshair;
  }, [readoutOnCrosshair]);
  const onHoverExtraRef = useRef(hoverExtra);
  useEffect(() => {
    onHoverExtraRef.current = hoverExtra;
  }, [hoverExtra]);
  /**
   * Hit-test positions for `peakMarkers`, expressed in CSS pixels relative
   * to the chart container. Updated each draw; consumed by the click
   * handler attached to the host div.
   */
  const markerHitsRef = useRef<
    Array<{ x: number; y: number; hitRadius: number; marker: SpectrumPeakMarker }>
  >([]);
  /**
   * Live mirror of ``peakMarkers`` for the click handler. The handler
   * computes hit positions on-demand from the live uPlot instance so
   * they're always correct after resize / scale changes / mode toggles
   * — caching in ``markerHitsRef`` was unreliable because uPlot's
   * resize redraws didn't always fire our ``draw`` hook in time,
   * leaving stale positions that didn't match the new canvas.
   */
  const peakMarkersRef = useRef<ReadonlyArray<SpectrumPeakMarker> | undefined>(
    peakMarkers,
  );
  useEffect(() => {
    peakMarkersRef.current = peakMarkers;
  }, [peakMarkers]);

  const onPeakClickRef = useRef(onPeakClick);
  useEffect(() => {
    onPeakClickRef.current = onPeakClick;
  }, [onPeakClick]);

  const inputs = useMemo(
    () => {
      const bundle = buildModeBundle(
        yMode,
        yZoom,
        freqs,
        psd,
        logMin,
        logMax,
        unit,
        normMean,
        normSd,
        band1Upper,
        band1Lower,
        band2Upper,
        band2Lower,
        ribbons,
        medianLine,
      );
      return yLabelOverride ? { ...bundle, yLabel: yLabelOverride } : bundle;
    },
    [
      yMode,
      yZoom,
      freqs,
      psd,
      logMin,
      logMax,
      unit,
      yLabelOverride,
      normMean,
      normSd,
      band1Upper,
      band1Lower,
      band2Upper,
      band2Lower,
      ribbons,
      medianLine,
    ],
  );

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    if (inputs.xs.length < 2) return;

    const styles = getComputedStyle(host);
    const cssVar = (name: string, fallback: string) =>
      styles.getPropertyValue(name).trim() || fallback;
    /* Marker colors arrive as CSS custom-property references — the clinical
     * label ramp (`var(--foreground-label-rigid)`), so the popover chip and
     * this canvas dot read ONE token and cannot drift, and the marker design's
     * own `strokeColor: 'var(--surface-base)'`. Canvas can't parse `var(…)`:
     * assigning it to fillStyle/strokeStyle is silently IGNORED, leaving the
     * previous color in place. Resolve here, against the host (not :root,
     * which returns light values inside a dark subtree). Cached — a busy grid
     * paints hundreds of markers per frame off a handful of distinct tokens. */
    const colorCache = new Map<string, string>();
    const resolveColor = (value: string): string => {
      const cached = colorCache.get(value);
      if (cached !== undefined) return cached;
      const match = /^var\(\s*(--[\w-]+)\s*(?:,([^)]*))?\)$/.exec(value.trim());
      const resolved = match
        ? styles.getPropertyValue(match[1]).trim() || (match[2] ?? '').trim() || value
        : value;
      colorCache.set(value, resolved);
      return resolved;
    };
    /* Theme-aware data-canvas colors — dark-on-near-black in Dark mode,
     * dark-on-white in Light mode. Read from the host so the workstation
     * theme (set on a subtree, not :root) resolves correctly. */
    const ct = readCanvasTokens(host);
    const traceColor = ct.text; /* channel labels + hover readout text */
    const accentColor = cssVar('--accent-primary', '#7B5E00');
    const tertiaryColor = ct.axis; /* axis ticks + labels */
    const gridColor = ct.grid;
    /* The PSD curve itself. Theme-aware: bright blue on dark, blue-700 on
     * light, so it pops against the cell backdrop + tinted bands in both. */
    const traceStroke = ct.trace;

    /* Font sizing — read workstation font tokens so the cells track the
     * density preference (regular vs comfortable). Maximized mode (a.k.a.
     * `technical`) gets a tier bigger across the board so ticks, labels,
     * and the hover readout are legible at full-pane size. Fallbacks
     * match the regular-density tokens for plugin hosts that don't
     * define these vars. */
    const monoFamily = 'ui-monospace, monospace';
    const fontMeta = cssVar('--workstation-font-meta', '11px');
    const fontLabel = cssVar('--workstation-font-label', '12px');
    const fontBody = cssVar('--workstation-font-body', '13px');
    const axisTickFont = `${fontLabel} ${monoFamily}`;
    const axisLabelFont = `${fontBody} ${monoFamily}`;
    /* Channel label font.
     *
     * uPlot's canvas backing store is DPR-scaled: a `width: Xpx` canvas
     * is internally `X × DPR` device-pixels wide, and ctx coords/text
     * are in device pixels. So `c.font = "14px ..."` renders at 14
     * DEVICE pixels — on a 2× display that's 7 CSS-pixels, much smaller
     * than a DOM 14px label. Multiply by DPR to draw at the intended
     * CSS-pixel size (same trick the raw-trace draw hook uses). The
     * label position below is multiplied for the same reason. */
    const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
    const channelLabelCssPx = technical ? 18 : 14;
    const channelLabelFont = `700 ${channelLabelCssPx * dpr}px ${monoFamily}`;
    const noNormFont = `600 ${fontMeta} ${monoFamily}`;
    const hoverFont = `${technical ? fontBody : fontMeta} ${monoFamily}`;
    const surfaceInset = ct.bg;
    const bandColors: Record<string, string> = {
      delta: cssVar('--band-delta', '#3B4CC0'),
      theta: cssVar('--band-theta', '#0D9488'),
      alpha: cssVar('--band-alpha', '#2D8A4E'),
      beta: cssVar('--band-beta', '#D4A012'),
      gamma: cssVar('--band-gamma', '#C0392B'),
    };

    const data: uPlot.AlignedData = [
      inputs.xs,
      inputs.ys,
    ];
    const seriesDefs: uPlot.Series[] = [
      {},
      {
        stroke: highlight ? accentColor : traceStroke,
        width: highlight ? 1.8 : 1.2,
        points: { show: false },
      },
    ];

    if (inputs.ref) {
      data.push(inputs.ref);
      seriesDefs.push({
        stroke: tertiaryColor,
        width: 0.85,
        dash: [3, 2],
        points: { show: false },
      });
    }

    const overlayColors = ['#E27B30', '#9d4edd', '#06b6d4'];
    if (overlayCurves && overlayCurves.length > 0) {
      overlayCurves.forEach((ov, ovIdx) => {
        const ys: number[] = new Array(inputs.xs.length).fill(NaN);
        let xi = 0;
        for (let i = 0; i < freqs.length; i++) {
          const f = freqs[i];
          if (f < F_MIN_HZ || f > F_MAX_HZ) continue;
          if (xi >= ys.length) break;
          const v = ov.psd[i];
          if (Number.isFinite(v) && v > 0) {
            if (yMode === 'lin') {
              ys[xi] = v;
            } else if (yMode === 'z' && normMean && normSd) {
              const m = normMean[i];
              const s = normSd[i];
              ys[xi] =
                Number.isFinite(m) && Number.isFinite(s) && s > 0
                  ? (Math.log10(v) - m) / s
                  : NaN;
            } else {
              ys[xi] = Math.log10(v);
            }
          }
          xi++;
        }
        data.push(ys);
        seriesDefs.push({
          stroke: overlayColors[ovIdx % overlayColors.length],
          width: 1.0,
          points: { show: false },
        });
      });
    }

    /* Distribution-honest percentile ribbons OR legacy ±σ bands.
     * When the caller passes `ribbons`, they own the back-to-front
     * order (widest first) and the per-band fill color. Legacy
     * band1/band2 keep their indigo defaults for v1 callers. */
    const upBands: uPlot.Band[] = [];
    if (inputs.ribbons.length > 0) {
      for (const r of inputs.ribbons) {
        const upperIdx = data.push(r.upper) - 1;
        seriesDefs.push({ stroke: 'transparent', points: { show: false } });
        const lowerIdx = data.push(r.lower) - 1;
        seriesDefs.push({ stroke: 'transparent', points: { show: false } });
        upBands.push({
          series: [upperIdx, lowerIdx],
          fill: r.fill,
        });
      }
    } else {
      if (inputs.band2) {
        const upperIdx = data.push(inputs.band2.upper) - 1;
        seriesDefs.push({ stroke: 'transparent', points: { show: false } });
        const lowerIdx = data.push(inputs.band2.lower) - 1;
        seriesDefs.push({ stroke: 'transparent', points: { show: false } });
        upBands.push({
          series: [upperIdx, lowerIdx],
          fill: 'rgba(120,140,180,0.22)',
        });
      }
      if (inputs.band1) {
        const upperIdx = data.push(inputs.band1.upper) - 1;
        seriesDefs.push({ stroke: 'transparent', points: { show: false } });
        const lowerIdx = data.push(inputs.band1.lower) - 1;
        seriesDefs.push({ stroke: 'transparent', points: { show: false } });
        upBands.push({
          series: [upperIdx, lowerIdx],
          fill: 'rgba(140,160,200,0.40)',
        });
      }
    }
    if (inputs.median) {
      // Median line over the ribbons needs more contrast than the
      // legacy ±σ ref line did — there it sat over a SINGLE band, here
      // it sits over three nested ribbons that wash out a thin gray
      // dash. Use the brighter trace text color + a slightly wider
      // stroke so the median reads as a real reference line, not noise.
      data.push(inputs.median);
      seriesDefs.push({
        stroke: traceColor,
        width: 1.4,
        dash: [4, 3],
        points: { show: false },
      });
    }

    const padding: uPlot.Padding = technical ? [4, 4, 4, 28] : [2, 2, 2, 2];

    const opts: uPlot.Options = {
      width: host.clientWidth || 100,
      height: host.clientHeight || 100,
      pxAlign: false,
      legend: { show: false },
      cursor: {
        x: true,
        y: false,
        drag: { x: false, y: false },
        points: { show: false },
      },
      scales: {
        x: { time: false, range: [F_MIN_HZ, F_MAX_HZ] },
        y: { range: inputs.yRange },
      },
      padding,
      axes: technical
        ? [
            {
              stroke: tertiaryColor,
              grid: { stroke: gridColor, width: 0.5 },
              ticks: { stroke: gridColor, width: 0.5, size: 3 },
              font: axisTickFont,
              size: 26,
              splits: [10, 20, 30, 40],
              values: (_u, vals) => vals.map((v) => `${v}`),
              label: 'Hz',
              labelFont: axisLabelFont,
              labelSize: 16,
            },
            {
              stroke: tertiaryColor,
              grid: { stroke: gridColor, width: 0.5 },
              ticks: { stroke: gridColor, width: 0.5, size: 3 },
              font: axisTickFont,
              size: 38,
              values: (_u, vals) =>
                vals.map((v) => (v % 1 === 0 ? `${v}` : v.toFixed(1))),
              label: inputs.yLabel,
              labelFont: axisLabelFont,
              labelSize: 18,
            },
          ]
        : [{ show: false }, { show: false }],
      series: seriesDefs,
      bands: upBands,
      hooks: {
        /* drawAxes fires AFTER axes/grid but BEFORE any series — anything
         * painted here ends up below the trace. We use it for the WinEEG-
         * style "fill area under the curve with band colors" rendering in
         * linear mode: the eye reads band identity from the colored area,
         * not from a vertical stripe over the whole panel. Log/z modes
         * keep the original vertical-stripe rendering in the `draw` hook
         * below — fill-under doesn't make sense when the baseline isn't
         * a meaningful zero. */
        drawAxes: [
          (u) => {
            if (!showBandTints || yMode !== 'lin') return;
            const xs = inputs.xs;
            const ys = inputs.ys;
            if (xs.length < 2) return;
            const c = u.ctx;
            const yZero = u.valToPos(inputs.yRange[0], 'y', true);
            c.save();
            // Polygon: trace the curve and close down to the y=0 baseline.
            // The clip mask makes the band-color rectangles below paint
            // only inside the area between curve and baseline.
            c.beginPath();
            const firstX = u.valToPos(xs[0], 'x', true);
            c.moveTo(firstX, yZero);
            for (let i = 0; i < xs.length; i++) {
              const v = ys[i];
              if (!Number.isFinite(v)) continue;
              c.lineTo(
                u.valToPos(xs[i], 'x', true),
                u.valToPos(v, 'y', true),
              );
            }
            const lastX = u.valToPos(xs[xs.length - 1], 'x', true);
            c.lineTo(lastX, yZero);
            c.closePath();
            c.clip();
            const yT = u.valToPos(inputs.yRange[1], 'y', true);
            const yB = yZero;
            c.globalAlpha = bandTintOpacity ?? UNDER_CURVE_BAND_ALPHA;
            for (const k of BAND_TINT_KEYS) {
              const range = bands[k];
              if (!range) continue;
              const xL = u.valToPos(range.loHz, 'x', true);
              const xR = u.valToPos(range.hiHz, 'x', true);
              c.fillStyle = bandColors[k];
              c.fillRect(xL, yT, xR - xL, yB - yT);
            }
            c.restore();
          },
        ],
        draw: [
          (u) => {
            const c = u.ctx;
            const yT = u.valToPos(inputs.yRange[1], 'y', true);
            const yB = u.valToPos(inputs.yRange[0], 'y', true);

            if (showBandTints && yMode !== 'lin') {
              c.save();
              c.globalAlpha = bandTintOpacity ?? BAND_TINT_OPACITY;
              for (const k of BAND_TINT_KEYS) {
                const range = bands[k];
                if (!range) continue;
                const xL = u.valToPos(range.loHz, 'x', true);
                const xR = u.valToPos(range.hiHz, 'x', true);
                c.fillStyle = bandColors[k];
                c.fillRect(xL, yT, xR - xL, yB - yT);
              }
              c.restore();
            }

            if (!showBandTints) {
              const xL = u.valToPos(ALPHA_LO, 'x', true);
              const xR = u.valToPos(ALPHA_HI, 'x', true);
              c.save();
              c.fillStyle = accentColor;
              c.globalAlpha = 0.06;
              c.fillRect(xL, yT, xR - xL, yB - yT);
              c.restore();
            }

            // Peak markers — colored dots on the curve at each marker's cf.
            // Hit positions are recorded in CSS pixels for the host-level
            // click handler below.
            if (peakMarkers && peakMarkers.length > 0) {
              const xs = inputs.xs;
              const ys = inputs.ys;
              const hits: typeof markerHitsRef.current = [];
              c.save();
              for (const m of peakMarkers) {
                if (!Number.isFinite(m.cf)) continue;
                if (m.cf < F_MIN_HZ || m.cf > F_MAX_HZ) continue;
                if (xs.length === 0) continue;
                let bestIdx = 0;
                let bestD = Math.abs(xs[0] - m.cf);
                for (let i = 1; i < xs.length; i++) {
                  const d = Math.abs(xs[i] - m.cf);
                  if (d < bestD) {
                    bestD = d;
                    bestIdx = i;
                  }
                }
                const yVal = ys[bestIdx];
                if (!Number.isFinite(yVal)) continue;
                const pxCanvas = u.valToPos(m.cf, 'x', true);
                const pyCanvas = u.valToPos(yVal, 'y', true);
                if (!Number.isFinite(pxCanvas) || !Number.isFinite(pyCanvas)) continue;
                const baseAlpha = m.opacity ?? 1.0;
                // Optional soft halo behind the dot — gives the marker a
                // legible silhouette on busy spectra without making the
                // dot itself larger.
                if (m.haloRadius && m.haloRadius > m.radius) {
                  c.globalAlpha = baseAlpha * 0.25;
                  c.fillStyle = resolveColor(m.haloColor ?? m.color);
                  c.beginPath();
                  c.arc(pxCanvas, pyCanvas, m.haloRadius, 0, Math.PI * 2);
                  c.fill();
                }
                // Solid fill — dot (peaks) or downward triangle (valleys).
                c.globalAlpha = baseAlpha;
                c.fillStyle = resolveColor(m.color);
                c.beginPath();
                if (m.shape === 'down-triangle') {
                  const r = m.radius + 0.5;
                  c.moveTo(pxCanvas - r, pyCanvas - r);
                  c.lineTo(pxCanvas + r, pyCanvas - r);
                  c.lineTo(pxCanvas, pyCanvas + r);
                  c.closePath();
                } else {
                  c.arc(pxCanvas, pyCanvas, m.radius, 0, Math.PI * 2);
                }
                c.fill();
                // Optional stroke ring for contrast / annotation tint.
                if (m.strokeColor && (m.strokeWidth ?? 0) > 0) {
                  c.lineWidth = m.strokeWidth!;
                  c.strokeStyle = resolveColor(m.strokeColor);
                  c.stroke();
                }
                const pxCss = u.valToPos(m.cf, 'x', false);
                const pyCss = u.valToPos(yVal, 'y', false);
                if (Number.isFinite(pxCss) && Number.isFinite(pyCss)) {
                  // Generous default hit radius — clinicians shouldn't
                  // have to pixel-hunt the dot. Caller can override per-
                  // marker via `hitRadius`.
                  const defaultHit = Math.max(m.radius * 2, m.haloRadius ?? 0, 14);
                  hits.push({
                    x: pxCss,
                    y: pyCss,
                    hitRadius: m.hitRadius ?? defaultHit,
                    marker: m,
                  });
                }
              }
              c.restore();
              markerHitsRef.current = hits;
            } else {
              markerHitsRef.current = [];
            }

            c.save();
            c.font = channelLabelFont;
            c.fillStyle = traceColor;
            c.textBaseline = 'top';
            /* Position in CSS pixels × DPR so the corner offset stays the
             * same physical size across DPR settings. Technical view nudges
             * further in to clear the y-axis ticks. */
            const labelX = (technical ? 44 : 5) * dpr;
            const labelY = (technical ? 6 : 3) * dpr;
            c.fillText(channel, labelX, labelY);
            c.restore();

            if (inputs.zMissingNorm) {
              c.save();
              c.font = noNormFont;
              c.fillStyle = tertiaryColor;
              c.textBaseline = 'middle';
              c.textAlign = 'center';
              c.fillText(
                'no norm',
                u.bbox.left + u.bbox.width / 2,
                u.bbox.top + u.bbox.height / 2,
              );
              c.restore();
            }
          },
        ],
        setCursor: [
          (u) => {
            const tip = tooltipRef.current;
            // Show on the locally-hovered cell, OR (opt-in) on cells whose
            // crosshair is driven by the shared broadcast — the comparison
            // comb across a grid.
            const showForCrosshair =
              readoutOnCrosshairRef.current && crosshairFreqRef.current != null;
            if (!hoveredRef.current && !showForCrosshair) {
              if (tip) tip.style.display = 'none';
              return;
            }
            const left = u.cursor.left;
            const top = u.cursor.top;
            if (left == null || top == null || left < 0) {
              if (tip) tip.style.display = 'none';
              return;
            }
            const xVal = u.posToVal(left, 'x');
            if (xVal == null || !Number.isFinite(xVal)) return;
            const xs = inputs.xs;
            const ys = inputs.ys;
            if (xs.length === 0) return;
            let bestIdx = 0;
            let bestD = Math.abs(xs[0] - xVal);
            for (let i = 1; i < xs.length; i++) {
              const d = Math.abs(xs[i] - xVal);
              if (d < bestD) {
                bestD = d;
                bestIdx = i;
              }
            }
            const f = xs[bestIdx];
            // Only the cell physically under the cursor broadcasts; cells
            // showing the readout via the shared crosshair must NOT re-emit
            // (that would feed back into the broadcast loop).
            if (hoveredRef.current) onHoverFreqRef.current?.(f);
            const yv = ys[bestIdx];
            let text: string;
            if (yMode === 'z') {
              text = Number.isFinite(yv)
                ? `${f.toFixed(1)} Hz · z=${yv.toFixed(2)}`
                : `${f.toFixed(1)} Hz · z=—`;
            } else if (yMode === 'lin') {
              text = `${f.toFixed(1)} Hz · ${formatPower(yv, unit)}`;
            } else {
              const p = Math.pow(10, yv);
              text = `${f.toFixed(1)} Hz · ${formatPower(p, unit)}`;
            }
            // Per-frequency suffix injected by the caller (Spectra uses
            // it to show `rank=… · z=…` from the percentile row). The
            // bundle's freqIndexByXs maps the xs index back to the
            // SUBJECT psd index — that's the index the caller indexes
            // its per-channel arrays with.
            if (onHoverExtraRef.current) {
              const srcIdx = inputs.freqIndexByXs[bestIdx];
              const extra = onHoverExtraRef.current(srcIdx, f);
              if (extra) text = `${text} · ${extra}`;
            }
            if (!tip) return;
            tip.textContent = text;
            tip.style.display = 'block';
            /* Fixed upper-right placement, fully inside the plot box, in
             * EVERY mode — the readout never chases the cursor and the whole
             * `Hz · value` pill is always visible. Top-left holds the channel
             * label, so top-right is the clear, predictable home. This fixes
             * both the maximized-mode cut-off and the compact-grid
             * invisibility of the old cursor-following placement. */
            // u.bbox is in CANVAS (device) pixels; the DOM tooltip is
            // positioned in CSS pixels. Divide by the device pixel ratio so
            // the pill lands inside the plot on HiDPI / retina screens —
            // without this it overshoots ~2x and clips into the corner (or
            // off-cell entirely on a large maximized chart).
            const ratio =
              (u as unknown as { pxRatio?: number }).pxRatio ||
              (typeof window !== 'undefined' ? window.devicePixelRatio : 1) ||
              1;
            const { left: tipLeft, top: tipTop } = placeReadoutTopRight(
              {
                left: u.bbox.left / ratio,
                top: u.bbox.top / ratio,
                width: u.bbox.width / ratio,
                height: u.bbox.height / ratio,
              },
              tip.offsetWidth,
            );
            tip.style.left = `${tipLeft}px`;
            tip.style.top = `${tipTop}px`;
          },
        ],
      },
    };

    host.style.background = surfaceInset;

    const u = new uPlot(opts, data, host);
    plotRef.current = u;

    /* DOM tooltip overlay — sibling to the uPlot canvas inside the host.
     * Updated imperatively from the setCursor hook (see opts.hooks
     * above). Using a DOM element instead of canvas-drawing avoids
     * uPlot's draw-cycle timing entirely: the tooltip never gets
     * clobbered by a redraw, and old positions vanish naturally
     * because we move one element rather than painting many. */
    /* Theme-aware tooltip pill: light surface + dark text in Light mode,
     * dark surface + light text in Dark mode (matches chrome, no heavy
     * black box over a light canvas). */
    const tipBg = cssVar('--surface-overlay', 'rgba(0,0,0,0.85)');
    const tipBorder = cssVar('--border-default', 'transparent');
    const tip = document.createElement('div');
    tip.style.cssText =
      'position:absolute;' +
      'pointer-events:none;' +
      'display:none;' +
      'z-index:5;' +
      'padding:2px 5px;' +
      'border-radius:3px;' +
      `background:${tipBg};` +
      `border:1px solid ${tipBorder};` +
      'box-shadow:0 1px 4px rgba(0,0,0,0.18);' +
      'white-space:nowrap;' +
      'font-variant-numeric:tabular-nums;';
    tip.style.color = traceColor;
    tip.style.font = hoverFont;
    host.appendChild(tip);
    tooltipRef.current = tip;

    const ro = new ResizeObserver(() => {
      const el = hostRef.current;
      if (!el || !plotRef.current) return;
      plotRef.current.setSize({ width: el.clientWidth, height: el.clientHeight });
    });
    ro.observe(host);

    return () => {
      ro.disconnect();
      u.destroy();
      plotRef.current = null;
      if (tooltipRef.current && tooltipRef.current.parentNode === host) {
        host.removeChild(tooltipRef.current);
      }
      tooltipRef.current = null;
    };
  }, [
    inputs,
    channel,
    highlight,
    technical,
    yMode,
    showBandTints,
    bands,
    overlayCurves,
    peakMarkers,
  ]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const onEnter = () => {
      hoveredRef.current = true;
    };
    const onLeave = () => {
      hoveredRef.current = false;
      onHoverFreqRef.current?.(null);
      if (tooltipRef.current) tooltipRef.current.style.display = 'none';
    };
    const onClick = (e: MouseEvent) => {
      const handler = onPeakClickRef.current;
      if (!handler) return;
      const u = plotRef.current;
      const markers = peakMarkersRef.current;
      if (!u || !markers || !markers.length) return;

      // Resolve hit positions LIVE from the uPlot instance — robust
      // against resize / mode toggles / scale changes that can leave
      // a cached hit list stale. Hit detection is x-only (column
      // forgiveness): if the click's x is within ``hitRadius`` of a
      // marker's frequency, it counts. Y is ignored — the markers
      // sit on the curve at varying heights and a clinician
      // shouldn't have to land on the exact dot. The closest marker
      // by x wins when several share a column.
      //
      // ``valToPos(_, _, false)`` returns CSS pixels relative to the
      // CANVAS top-left, so the click x must also be canvas-relative.
      //
      // Previous version used host.getBoundingClientRect() and assumed
      // canvas == host. That holds in technical (full-size) mode but
      // fails in compact head-grid cells, where the cell wraps the
      // canvas in a labelled container — the canvas is offset within
      // the host. Using host coords there shifts the cursor X by the
      // canvas-vs-host offset, which can land clicks on the wrong
      // marker (e.g. clicking 3.3 Hz registers as 17.7 Hz). Using
      // u.root or u.over is the canvas-relative reference frame
      // valToPos's coordinates live in.
      const canvasEl = u.root.querySelector<HTMLElement>('.u-over') ?? u.root;
      const rect = canvasEl.getBoundingClientRect();
      const x = e.clientX - rect.left;

      let bestMarker: SpectrumPeakMarker | null = null;
      let bestDx = Infinity;
      let bestHitR = 0;
      for (let i = markers.length - 1; i >= 0; i--) {
        const m = markers[i];
        if (!Number.isFinite(m.cf)) continue;
        const px = u.valToPos(m.cf, 'x', false);
        if (!Number.isFinite(px)) continue;
        const hitR =
          m.hitRadius ?? Math.max(m.radius * 2, m.haloRadius ?? 0, 14);
        const dx = Math.abs(px - x);
        if (dx <= hitR && dx < bestDx) {
          bestDx = dx;
          bestMarker = m;
          bestHitR = hitR;
        }
      }
      if (bestMarker) {
        void bestHitR; // documents that hitR was used to gate the match
        handler(bestMarker, { clientX: e.clientX, clientY: e.clientY });
      }
    };
    host.addEventListener('mouseenter', onEnter);
    host.addEventListener('mouseleave', onLeave);
    host.addEventListener('click', onClick);
    return () => {
      host.removeEventListener('mouseenter', onEnter);
      host.removeEventListener('mouseleave', onLeave);
      host.removeEventListener('click', onClick);
    };
  }, []);

  useEffect(() => {
    // Keep the ref fresh BEFORE driving the cursor, so the setCursor hook
    // (which reads crosshairFreqRef) sees the current value when it fires.
    crosshairFreqRef.current = crosshairFreq;
    const u = plotRef.current;
    if (!u) return;
    if (hoveredRef.current) return;
    if (crosshairFreq == null) {
      u.setCursor({ left: -10, top: -10 }, false);
      return;
    }
    const left = u.valToPos(crosshairFreq, 'x', false);
    if (Number.isFinite(left)) {
      u.setCursor({ left, top: 1 }, false);
    }
  }, [crosshairFreq]);

  return (
    <div
      ref={hostRef}
      className="absolute inset-0"
      data-testid={`mini-spectrum-${channel}`}
    />
  );
}
