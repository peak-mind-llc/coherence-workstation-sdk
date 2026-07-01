/**
 * <CompareSpectrumChart> — winEEG-style two-trace + diff chart.
 *
 * One uPlot per cell, one shared y-axis. All three series in
 * amplitude domain (µV/√Hz, i.e. `sqrt(power * 1e12)`):
 *   - blue  : prior recording amplitude
 *   - red   : current recording amplitude
 *   - gray  : diff = current_amp − prior_amp (signed; crosses zero)
 *
 * The y-axis spans from a slightly-negative bottom (where the diff
 * goes) to a positive top (where the amplitude traces live). Zero is
 * a real shared baseline drawn as a dashed line — clinically
 * meaningful: above zero the patient gained spectral amplitude in
 * the band; below zero they lost it.
 *
 * No log mode, no µV²/Hz chrome — plain amplitude. Cell scaling
 * comes from caller-provided `yMin`/`yMax` so the head-grid can use
 * percentile-robust bounds across all 19 cells (F8-style outliers
 * don't compress the rest of the grid).
 */
import { useEffect, useMemo, useRef } from 'react';
import uPlot from 'uplot';
import { DEFAULT_BANDS, type BandRange } from './index';
import { readCanvasTokens } from '../canvas-tokens';

const F_MIN_HZ = 1;
const F_MAX_HZ = 45;

const BAND_TINT_KEYS = ['delta', 'theta', 'alpha', 'beta', 'gamma'] as const;
const BAND_TINT_OPACITY_DEFAULT = 0.14;

export interface CompareSpectrumChartProps {
  /** Frequency axis (Hz). */
  freqs: number[];
  /** Current-recording PSD power values (µV²/Hz, before sqrt). */
  currentPsd: number[];
  /** Prior-recording PSD power values. Must align with `freqs`. */
  priorPsd: number[];
  /** Channel label drawn in the upper-left. */
  channel: string;
  /**
   * Shared y-axis range across all cells in amplitude (µV/√Hz). Pass
   * percentile-derived bounds so a single outlier channel doesn't
   * compress the rest of the grid. Should satisfy `yMin <= 0 <= yMax`
   * so the zero baseline is in the visible range.
   */
  yMin: number;
  yMax: number;
  /**
   * Y-range zoom multiplier. >1 zooms in (smaller visible range);
   * applies to the magnitude on both sides of zero so the zero
   * baseline stays in place.
   */
  yZoom?: number;
  /** Render subtle vertical band tints (δθαβγ) behind the curves. */
  showBandTints?: boolean;
  /** Opacity of the vertical band tints (0..1). */
  bandTintOpacity?: number;
  /** Override the default EEG band ranges used for tint rendering. */
  bands?: Readonly<Record<string, BandRange>>;
  /** Optional ISO-date sublabel for the prior recording. */
  priorLabel?: string;
  /** Show axes / ticks / grid (technical / zoomed mode). */
  technical?: boolean;
  /**
   * Optional normative ±SD overlay, ALREADY CONVERTED TO AMPLITUDE
   * (µV/√Hz). Caller is responsible for converting log10(µV²/Hz) bands
   * via `Math.pow(10, x/2)` before passing — keeps the SDK primitive
   * domain-agnostic. Arrays must be aligned with `freqs`. Drawn as
   * filled regions behind the current/prior curves (outer ±2σ at
   * lower opacity, inner ±1σ at higher), with the optional normative
   * mean as a dashed line.
   */
  band1Upper?: number[];
  band1Lower?: number[];
  band2Upper?: number[];
  band2Lower?: number[];
  /** Optional normative-mean curve in amplitude (µV/√Hz). */
  normMean?: number[];
}

interface Bundle {
  xs: number[];
  current: number[];
  prior: number[];
  diff: number[];
  /** Optional norm overlays — present only when the caller supplies
   *  the matching props. Filtered to the same indices as `xs`. */
  band1Upper?: number[];
  band1Lower?: number[];
  band2Upper?: number[];
  band2Lower?: number[];
  normMean?: number[];
}

function buildCompareBundle(
  freqs: number[],
  currentPsd: number[],
  priorPsd: number[],
  norm?: {
    band1Upper?: number[];
    band1Lower?: number[];
    band2Upper?: number[];
    band2Lower?: number[];
    normMean?: number[];
  },
): Bundle {
  const xs: number[] = [];
  const current: number[] = [];
  const prior: number[] = [];
  const diff: number[] = [];
  const haveB1 = !!(norm?.band1Upper && norm?.band1Lower);
  const haveB2 = !!(norm?.band2Upper && norm?.band2Lower);
  const haveMean = !!norm?.normMean;
  const b1u: number[] = haveB1 ? [] : [];
  const b1l: number[] = haveB1 ? [] : [];
  const b2u: number[] = haveB2 ? [] : [];
  const b2l: number[] = haveB2 ? [] : [];
  const m: number[] = haveMean ? [] : [];

  for (let i = 0; i < freqs.length; i++) {
    const f = freqs[i];
    if (f < F_MIN_HZ || f > F_MAX_HZ) continue;
    const c = currentPsd[i];
    const p = priorPsd[i];
    if (!Number.isFinite(c) || !Number.isFinite(p) || c < 0 || p < 0) continue;
    xs.push(f);
    // Amplitude domain (µV/√Hz) = sqrt(PSD). The /op-spectral
    // endpoint returns PSD already in µV²/Hz (same format
    // UPlotMiniSpectrum displays as "µV²/Hz" with no further
    // conversion), so no scaling factor here. The legacy
    // comparison_report.py formula included `* 1e12` because it
    // received V²/Hz from MNE's raw PSD; that conversion is
    // already applied server-side now.
    const ca = Math.sqrt(c);
    const pa = Math.sqrt(p);
    current.push(ca);
    prior.push(pa);
    diff.push(ca - pa);
    /* Band arrays are in amplitude domain already (caller did the
     * log10 → amplitude conversion). NaN at an index is fine —
     * uPlot just skips the gap. */
    if (haveB1) {
      b1u.push(norm!.band1Upper![i] ?? NaN);
      b1l.push(norm!.band1Lower![i] ?? NaN);
    }
    if (haveB2) {
      b2u.push(norm!.band2Upper![i] ?? NaN);
      b2l.push(norm!.band2Lower![i] ?? NaN);
    }
    if (haveMean) {
      m.push(norm!.normMean![i] ?? NaN);
    }
  }

  return {
    xs,
    current,
    prior,
    diff,
    band1Upper: haveB1 ? b1u : undefined,
    band1Lower: haveB1 ? b1l : undefined,
    band2Upper: haveB2 ? b2u : undefined,
    band2Lower: haveB2 ? b2l : undefined,
    normMean: haveMean ? m : undefined,
  };
}

function compactNum(v: number): string {
  if (!Number.isFinite(v)) return '—';
  if (v === 0) return '0';
  const a = Math.abs(v);
  if (a >= 100) return v.toFixed(0);
  if (a >= 1) return v.toFixed(1);
  if (a >= 0.01) return v.toFixed(2);
  return v.toExponential(0);
}

export function CompareSpectrumChart({
  freqs,
  currentPsd,
  priorPsd,
  channel,
  yMin,
  yMax,
  yZoom = 1,
  showBandTints = false,
  bandTintOpacity,
  bands = DEFAULT_BANDS,
  priorLabel,
  technical = false,
  band1Upper,
  band1Lower,
  band2Upper,
  band2Lower,
  normMean,
}: CompareSpectrumChartProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const plotRef = useRef<uPlot | null>(null);

  const bundle = useMemo(
    () =>
      buildCompareBundle(freqs, currentPsd, priorPsd, {
        band1Upper,
        band1Lower,
        band2Upper,
        band2Lower,
        normMean,
      }),
    [
      freqs,
      currentPsd,
      priorPsd,
      band1Upper,
      band1Lower,
      band2Upper,
      band2Lower,
      normMean,
    ],
  );

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    if (bundle.xs.length < 2) return;

    const styles = getComputedStyle(host);
    const cssVar = (name: string, fallback: string) =>
      styles.getPropertyValue(name).trim() || fallback;

    /* Theme-aware data-canvas colors (dark-on-white in Light mode). */
    const ct = readCanvasTokens(host);
    const traceColor = ct.text;
    const tertiaryColor = ct.axis;
    const gridColor = ct.grid;
    const surfaceInset = ct.bg;

    // winEEG convention: blue prior, red current, gray diff.
    const priorColor = cssVar('--workstation-compare-prior-stroke', 'rgb(99,179,237)');
    const currentColor = cssVar('--workstation-compare-current-stroke', 'rgb(245,101,101)');
    const diffColor = cssVar('--workstation-compare-diff-stroke', 'rgb(160,165,175)');

    const bandColors: Record<string, string> = {
      delta: cssVar('--band-delta', '#3B4CC0'),
      theta: cssVar('--band-theta', '#0D9488'),
      alpha: cssVar('--band-alpha', '#2D8A4E'),
      beta: cssVar('--band-beta', '#D4A012'),
      gamma: cssVar('--band-gamma', '#C0392B'),
    };

    const monoFamily = 'ui-monospace, monospace';
    const fontMeta = cssVar('--workstation-font-meta', '11px');
    const fontLabel = cssVar('--workstation-font-label', '12px');
    const fontBody = cssVar('--workstation-font-body', '13px');
    const axisTickFont = `${fontLabel} ${monoFamily}`;
    const channelLabelFont = technical
      ? `600 ${fontBody} ${monoFamily}`
      : `600 ${fontMeta} ${monoFamily}`;
    const sublabelFont = `${fontMeta} ${monoFamily}`;

    host.style.background = surfaceInset;

    // Apply zoom symmetrically around zero so the shared baseline
    // stays put. >1 shrinks the visible range (zooms in).
    const z = Math.max(0.05, Math.min(100, yZoom));
    const yMinZ = yMin / z;
    const yMaxZ = yMax / z;
    const tintOpacity = bandTintOpacity ?? BAND_TINT_OPACITY_DEFAULT;

    /* Norm-band overlay — outer ±2σ at lower opacity, inner ±1σ at
     * higher; optional dashed mean curve. Bands are pushed AFTER the
     * trace series so the indices in `bandsCfg` are valid, but uPlot
     * fills them behind their corresponding series — visually they
     * land beneath the current / prior / diff strokes. Mirrors
     * UPlotMiniSpectrum's overlay pattern exactly so the absolute and
     * compare views read as the same surface with different overlays. */
    const baseSeries: uPlot.Series[] = [
      {},
      // 1: current (drawn last → on top per winEEG convention)
      { stroke: currentColor, width: 1.4, points: { show: false } },
      // 2: prior
      { stroke: priorColor, width: 1.2, points: { show: false } },
      // 3: diff
      { stroke: diffColor, width: 1.0, points: { show: false } },
    ];
    const data: (number[] | (number | null)[])[] = [
      bundle.xs,
      bundle.current,
      bundle.prior,
      bundle.diff,
    ];
    const bandsCfg: uPlot.Band[] = [];
    /* Outer ±2σ first (lower opacity, larger fill). */
    if (bundle.band2Upper && bundle.band2Lower) {
      const uIdx = data.push(bundle.band2Upper) - 1;
      baseSeries.push({ stroke: 'transparent', points: { show: false } });
      const lIdx = data.push(bundle.band2Lower) - 1;
      baseSeries.push({ stroke: 'transparent', points: { show: false } });
      bandsCfg.push({
        series: [uIdx, lIdx],
        fill: 'rgba(120,140,180,0.22)',
      });
    }
    /* Inner ±1σ (higher opacity). */
    if (bundle.band1Upper && bundle.band1Lower) {
      const uIdx = data.push(bundle.band1Upper) - 1;
      baseSeries.push({ stroke: 'transparent', points: { show: false } });
      const lIdx = data.push(bundle.band1Lower) - 1;
      baseSeries.push({ stroke: 'transparent', points: { show: false } });
      bandsCfg.push({
        series: [uIdx, lIdx],
        fill: 'rgba(140,160,200,0.40)',
      });
    }
    /* Optional dashed mean line. */
    if (bundle.normMean) {
      data.push(bundle.normMean);
      baseSeries.push({
        stroke: tertiaryColor,
        width: 1,
        dash: [3, 3],
        points: { show: false },
      });
    }

    const opts: uPlot.Options = {
      width: host.clientWidth || 100,
      height: host.clientHeight || 100,
      pxAlign: false,
      legend: { show: false },
      cursor: { x: true, y: false, drag: { x: false, y: false }, points: { show: false } },
      scales: {
        x: { time: false, range: [F_MIN_HZ, F_MAX_HZ] },
        y: { range: [yMinZ, yMaxZ] },
      },
      padding: technical ? [4, 4, 4, 32] : [2, 2, 2, 2],
      axes: technical
        ? [
            {
              stroke: tertiaryColor,
              grid: { stroke: gridColor, width: 0.5 },
              ticks: { stroke: gridColor, width: 0.5, size: 3 },
              font: axisTickFont,
              size: 22,
              splits: [10, 20, 30, 40],
              values: (_u, vals) => vals.map((v) => `${v}`),
            },
            {
              stroke: tertiaryColor,
              grid: { stroke: gridColor, width: 0.5 },
              ticks: { stroke: gridColor, width: 0.5, size: 3 },
              font: axisTickFont,
              size: 38,
              values: (_u, vals) => vals.map(compactNum),
            },
          ]
        : [{ show: false }, { show: false }],
      series: baseSeries,
      bands: bandsCfg,
      hooks: {
        draw: [
          (u) => {
            const c = u.ctx;
            // Vertical band tints behind everything.
            if (showBandTints) {
              const yT = u.valToPos(yMaxZ, 'y', true);
              const yB = u.valToPos(yMinZ, 'y', true);
              c.save();
              c.globalAlpha = tintOpacity;
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
            // Shared zero baseline — dashed across the cell.
            const y0 = u.valToPos(0, 'y', true);
            c.save();
            c.strokeStyle = tertiaryColor;
            c.globalAlpha = 0.6;
            c.lineWidth = 1;
            c.setLineDash([3, 2]);
            c.beginPath();
            c.moveTo(u.bbox.left, y0);
            c.lineTo(u.bbox.left + u.bbox.width, y0);
            c.stroke();
            c.restore();
            // Channel label + prior sublabel.
            c.save();
            c.font = channelLabelFont;
            c.fillStyle = traceColor;
            c.textBaseline = 'top';
            c.fillText(channel, technical ? 44 : 5, technical ? 6 : 3);
            if (priorLabel) {
              c.font = sublabelFont;
              c.fillStyle = tertiaryColor;
              c.fillText(priorLabel, technical ? 44 : 5, technical ? 24 : 16);
            }
            c.restore();
          },
        ],
      },
    };

    const u = new uPlot(opts, data as uPlot.AlignedData, host);
    plotRef.current = u;

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
    };
  }, [
    bundle,
    channel,
    yMin,
    yMax,
    yZoom,
    technical,
    showBandTints,
    bandTintOpacity,
    bands,
    priorLabel,
  ]);

  return (
    <div
      ref={hostRef}
      className="absolute inset-0"
      data-testid={`compare-spectrum-${channel}`}
    />
  );
}
