/**
 * TopoMapRenderer — EEGLAB/MNE-style scalp topographic map renderer.
 *
 * Renders smooth, interpolated topomaps to a <canvas> element using:
 *   - Gaussian-weighted (Nadaraya-Watson) spatial interpolation
 *   - Multi-pass Gaussian blur for extra smoothness
 *   - Configurable colormap (default: jet, EEGLAB style)
 *   - Contour lines (marching squares)
 *   - Head outline with nose and ears
 *
 * SDK primitive — host AND plugins both consume from here so visuals stay
 * consistent. Reads CSS custom properties at runtime for theme-aware
 * stroke colors; no host imports required.
 *
 * Two surfaces:
 *   - `renderTopomap(canvas, values, absMax, opts)` — imperative; for host code
 *     that already manages its own canvas refs and effects.
 *   - `<Topomap values={...} absMax={3} />` — declarative React component for
 *     plugins; wraps a canvas and re-renders on prop changes.
 */

import { useEffect, useRef } from 'react';
import { getColormap, type ColormapName, type ColormapFn } from '../colormap';
import { readCanvasTokens } from '../canvas-tokens';

/* ------------------------------------------------------------------ */
/*  Standard 10-20 electrode positions (normalised 0–1)                */
/* ------------------------------------------------------------------ */

export const ELECTRODE_POSITIONS: Record<string, { x: number; y: number }> = {
  Fp1: { x: 0.36, y: 0.12 }, Fp2: { x: 0.64, y: 0.12 },
  F7:  { x: 0.18, y: 0.30 }, F3:  { x: 0.35, y: 0.30 }, Fz: { x: 0.50, y: 0.28 },
  F4:  { x: 0.65, y: 0.30 }, F8:  { x: 0.82, y: 0.30 },
  T3:  { x: 0.09, y: 0.50 }, C3:  { x: 0.32, y: 0.50 }, Cz: { x: 0.50, y: 0.50 },
  C4:  { x: 0.68, y: 0.50 }, T4:  { x: 0.91, y: 0.50 },
  T5:  { x: 0.18, y: 0.70 }, P3:  { x: 0.35, y: 0.70 }, Pz: { x: 0.50, y: 0.72 },
  P4:  { x: 0.65, y: 0.70 }, T6:  { x: 0.82, y: 0.70 },
  O1:  { x: 0.36, y: 0.88 }, O2:  { x: 0.64, y: 0.88 },
  // Extended 10-10 positions (Neurofield Q21 View B)
  Fpz: { x: 0.50, y: 0.10 },
  AF3: { x: 0.38, y: 0.20 }, AF4: { x: 0.62, y: 0.20 },
  FC5: { x: 0.22, y: 0.39 }, FC1: { x: 0.40, y: 0.39 },
  FC2: { x: 0.60, y: 0.39 }, FC6: { x: 0.78, y: 0.39 },
  FT9: { x: 0.05, y: 0.39 }, FT10: { x: 0.95, y: 0.39 },
  CP5: { x: 0.22, y: 0.61 }, CP1: { x: 0.40, y: 0.61 },
  CP2: { x: 0.60, y: 0.61 }, CP6: { x: 0.78, y: 0.61 },
  TP9: { x: 0.05, y: 0.68 }, TP10: { x: 0.95, y: 0.68 },
  PO3: { x: 0.38, y: 0.80 }, PO4: { x: 0.62, y: 0.80 },
  Oz:  { x: 0.50, y: 0.90 },
  // Alternate 10-20 names
  T7:  { x: 0.09, y: 0.50 }, T8:  { x: 0.91, y: 0.50 },
  P7:  { x: 0.18, y: 0.70 }, P8:  { x: 0.82, y: 0.70 },
};

/**
 * How far from an electrode a pointer can be and still count as on it.
 *
 * This is REACH, not disambiguation. The search below returns the NEAREST
 * electrode and then range-checks it, so a larger radius can never blur two
 * neighbours together — it only decides how much of the head counts as "not on
 * any electrode". An earlier version of this comment justified 0.04 by the
 * closest distinct pair being 0.0825 apart; that reasoning describes a
 * different algorithm (one returning any electrode in range) and was wrong.
 * The consequence was a click target four times smaller than it needed to be.
 *
 * 0.15 is the value TopoValueHover has used since it was ported from the
 * legacy dashboard. Sharing it is the point: the hover tooltip names the
 * electrode a click will hit, so what a clinician aims at is what they get.
 *
 * Four pairs ARE co-located and always will be — P7/T5, P8/T6, T3/T7, T4/T8
 * are the 10-20 and 10-10 names for one electrode. A hit there is ambiguous by
 * construction; which name comes back is decided by the montage passed in.
 */
export const ELECTRODE_HIT_RADIUS = 0.15;

/**
 * The electrode at a normalised (0-1) point on a topomap, or null.
 *
 * `nx`/`ny` are the topomap's own coordinate space — the same one
 * ELECTRODE_POSITIONS uses and `drawTopomap` paints from (`e.nx * S`), so a
 * hit test cannot drift from where the dot actually is. To go from a DOM click:
 *
 *     const r = canvas.getBoundingClientRect();
 *     hitTestElectrode((e.clientX - r.left) / r.width,
 *                      (e.clientY - r.top) / r.height, channels);
 *
 * Returns null for a click on empty scalp rather than snapping to whatever is
 * nearest. Marking a claim the clinician did not point at is worse than
 * marking nothing.
 *
 * Only `channels` are considered, and names with no known position are
 * skipped — so a montage without T3 never resolves a click to it, and
 * non-scalp channels (EKG, A1) can be passed through harmlessly.
 */
export function hitTestElectrode(
  nx: number,
  ny: number,
  channels: readonly string[],
  radius: number = ELECTRODE_HIT_RADIUS,
): string | null {
  if (!Number.isFinite(nx) || !Number.isFinite(ny)) return null;
  let best: string | null = null;
  let bestD2 = radius * radius;
  for (const ch of channels) {
    const pos = ELECTRODE_POSITIONS[ch];
    if (!pos) continue;
    const d2 = (nx - pos.x) ** 2 + (ny - pos.y) ** 2;
    // Strictly less-than, so on an exact tie the FIRST channel given wins.
    // That only arises for the co-located alias pairs, where it makes the
    // result predictable from the caller's montage order rather than from
    // iteration accident.
    if (d2 < bestD2) {
      bestD2 = d2;
      best = ch;
    }
  }
  return best;
}



const HEAD_CX = 0.50;
const HEAD_CY = 0.50;
const HEAD_R  = 0.44;

/* ------------------------------------------------------------------ */
/*  Separable Gaussian blur on Float32Array                            */
/* ------------------------------------------------------------------ */

function gaussBlur(data: Float32Array, w: number, h: number, radius: number): Float32Array {
  const sigma = radius * 0.45;
  const kLen = radius * 2 + 1;
  const kernel = new Float32Array(kLen);
  let kSum = 0;
  for (let i = 0; i < kLen; i++) {
    const d = i - radius;
    kernel[i] = Math.exp(-(d * d) / (2 * sigma * sigma));
    kSum += kernel[i];
  }
  for (let i = 0; i < kLen; i++) kernel[i] /= kSum;

  const tmp = new Float32Array(w * h);
  const out = new Float32Array(w * h);

  // Horizontal
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sum = 0, wt = 0;
      for (let k = -radius; k <= radius; k++) {
        const sx = x + k;
        if (sx >= 0 && sx < w) {
          const v = data[y * w + sx];
          if (Number.isFinite(v)) {
            const kw = kernel[k + radius];
            sum += v * kw;
            wt += kw;
          }
        }
      }
      tmp[y * w + x] = wt > 0 ? sum / wt : 0;
    }
  }

  // Vertical
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sum = 0, wt = 0;
      for (let k = -radius; k <= radius; k++) {
        const sy = y + k;
        if (sy >= 0 && sy < h) {
          const v = tmp[sy * w + x];
          if (Number.isFinite(v)) {
            const kw = kernel[k + radius];
            sum += v * kw;
            wt += kw;
          }
        }
      }
      out[y * w + x] = wt > 0 ? sum / wt : 0;
    }
  }

  return out;
}

/* ------------------------------------------------------------------ */
/*  Marching-squares contour lines                                     */
/* ------------------------------------------------------------------ */

interface Segment { x1: number; y1: number; x2: number; y2: number }

function contourLines(
  field: Float32Array,
  w: number,
  h: number,
  threshold: number,
): Segment[] {
  const segs: Segment[] = [];

  for (let y = 0; y < h - 1; y++) {
    for (let x = 0; x < w - 1; x++) {
      const tl = field[y * w + x];
      const tr = field[y * w + x + 1];
      const bl = field[(y + 1) * w + x];
      const br = field[(y + 1) * w + x + 1];

      if (!Number.isFinite(tl) || !Number.isFinite(tr) ||
          !Number.isFinite(bl) || !Number.isFinite(br)) continue;

      let caseIdx = 0;
      if (tl >= threshold) caseIdx |= 8;
      if (tr >= threshold) caseIdx |= 4;
      if (br >= threshold) caseIdx |= 2;
      if (bl >= threshold) caseIdx |= 1;

      if (caseIdx === 0 || caseIdx === 15) continue;

      const top    = (threshold - tl) / (tr - tl || 1e-10);
      const bottom = (threshold - bl) / (br - bl || 1e-10);
      const left   = (threshold - tl) / (bl - tl || 1e-10);
      const right  = (threshold - tr) / (br - tr || 1e-10);

      const pts: Array<[number, number]> = [];

      const addTop    = () => pts.push([x + Math.max(0, Math.min(1, top)), y]);
      const addBottom = () => pts.push([x + Math.max(0, Math.min(1, bottom)), y + 1]);
      const addLeft   = () => pts.push([x, y + Math.max(0, Math.min(1, left))]);
      const addRight  = () => pts.push([x + 1, y + Math.max(0, Math.min(1, right))]);

      switch (caseIdx) {
        case 1:  addLeft(); addBottom(); break;
        case 2:  addBottom(); addRight(); break;
        case 3:  addLeft(); addRight(); break;
        case 4:  addTop(); addRight(); break;
        case 5:  addTop(); addLeft(); addBottom(); addRight(); break;
        case 6:  addTop(); addBottom(); break;
        case 7:  addTop(); addLeft(); break;
        case 8:  addTop(); addLeft(); break;
        case 9:  addTop(); addBottom(); break;
        case 10: addTop(); addRight(); addLeft(); addBottom(); break;
        case 11: addTop(); addRight(); break;
        case 12: addLeft(); addRight(); break;
        case 13: addBottom(); addRight(); break;
        case 14: addLeft(); addBottom(); break;
      }

      for (let i = 0; i < pts.length - 1; i += 2) {
        segs.push({
          x1: pts[i][0] / w,
          y1: pts[i][1] / h,
          x2: pts[i + 1][0] / w,
          y2: pts[i + 1][1] / h,
        });
      }
    }
  }

  return segs;
}

/* ------------------------------------------------------------------ */
/*  Main render function                                               */
/* ------------------------------------------------------------------ */

export interface TopoRenderOptions {
  /** Canvas resolution in pixels (default 200) */
  resolution?: number;
  /** Gaussian interpolation sigma in normalised coords (default 0.10) */
  sigma?: number;
  /** Number of contour lines (default 8, 0 to disable) */
  contourCount?: number;
  /** Contour line color (default 'rgba(0,0,0,0.35)') */
  contourColor?: string;
  /** Show electrode dots (default true) */
  showElectrodes?: boolean;
  /** Show head outline (default true) */
  showHead?: boolean;
  /** Colormap preference (reads from localStorage if omitted) */
  colormap?: ColormapName;
  /** Custom colormap function — overrides colormap name if provided */
  colormapFn?: ColormapFn;
  /**
   * Override the head-outline stroke color. When omitted, reads
   * --text-primary from documentElement. Set explicitly when rendering
   * outside the live UI (e.g. screenshot capture into an offscreen
   * light-themed container) where the document root's CSS vars don't
   * reflect the intended capture theme.
   */
  headOutlineColor?: string;
  /**
   * Override the electrode-label fill color. When omitted, reads
   * --text-tertiary from documentElement. Same use case as
   * headOutlineColor — capture-time theme overrides.
   */
  electrodeLabelColor?: string;
  /**
   * Explicit lower bound for color mapping. When both ``vMin`` and
   * ``vMax`` are provided, the renderer uses ``[vMin, vMax]`` instead
   * of the symmetric ``[-absMax, +absMax]`` default. Use this for
   * one-sided (sequential) data — e.g. absolute band power — so the
   * colormap spans the full visible range rather than only the warm
   * half (which is what happens when 0..max gets squashed into the
   * upper half of a diverging colormap by the default symmetric
   * scaling). Diverging data (z-scores, deltas) should leave both
   * undefined and let ``absMax`` drive the symmetric range.
   */
  vMin?: number;
  /** Explicit upper bound for color mapping (see ``vMin``). */
  vMax?: number;
  /**
   * Draw a ring around these electrodes (by channel name) on top of the field —
   * used by the AI Technician to highlight the channel(s) a finding names (the
   * topomap analogue of the head-spectra gold peak markers). Channels not in
   * ``values`` / not in the montage are ignored.
   */
  highlightChannels?: readonly string[];
  /** Ring color for ``highlightChannels`` (default workstation gold #FFCC33). */
  highlightColor?: string;
}

/* ── Off-screen render gating ─────────────────────────────────────────────
 * Topomap synthesis (Gaussian interpolation + contours + colormap) is the
 * single most expensive thing these panes do. Because every workstation pane
 * shares one React context, an unrelated interaction (e.g. scrolling the raw
 * trace) re-renders ALL mounted panes — including topomap panes in background
 * tabs / inactive phases that are `display:none`. Re-synthesizing a scalp
 * field onto a canvas nobody can see is pure waste, and it was the dominant
 * cost behind janky scrolling.
 *
 * renderTopomap therefore skips the work when its target canvas is reported
 * off-screen, stashes the latest args, and replays them once the canvas is
 * shown again — so revealing a hidden pane never leaves a stale/blank map.
 *
 * Visibility is tracked with a single shared IntersectionObserver. Canvases
 * are assumed VISIBLE until the observer says otherwise, so the first paint
 * always lands and environments without IntersectionObserver (jsdom tests,
 * SSR) never gate. The observer holds only weak references to its targets, so
 * unmounted pane canvases are still garbage-collected. */
interface PendingTopomap {
  values: Record<string, number>;
  absMax: number;
  options: TopoRenderOptions;
}
const offscreenTopomapCanvases = new WeakSet<HTMLCanvasElement>();
const pendingTopomaps = new WeakMap<HTMLCanvasElement, PendingTopomap>();
const observedTopomapCanvases = new WeakSet<HTMLCanvasElement>();
let topomapVisibilityObserver: IntersectionObserver | null = null;

function ensureTopomapObserved(canvas: HTMLCanvasElement): void {
  if (typeof IntersectionObserver === 'undefined') return; // jsdom / SSR
  if (!topomapVisibilityObserver) {
    topomapVisibilityObserver = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        const c = entry.target as HTMLCanvasElement;
        if (entry.isIntersecting) {
          offscreenTopomapCanvases.delete(c);
          const pending = pendingTopomaps.get(c);
          if (pending) {
            pendingTopomaps.delete(c);
            drawTopomap(c, pending.values, pending.absMax, pending.options);
          }
        } else {
          offscreenTopomapCanvases.add(c);
        }
      }
    });
  }
  if (!observedTopomapCanvases.has(canvas)) {
    observedTopomapCanvases.add(canvas);
    topomapVisibilityObserver.observe(canvas);
  }
}

/**
 * Render an EEGLAB/MNE-style topomap to a canvas element.
 *
 * Skips synthesis when the canvas is off-screen (background tab / inactive
 * phase) and replays the latest values when it becomes visible again — see
 * the gating note above.
 *
 * @param canvas - Target canvas element
 * @param values - Channel name → value mapping (e.g. { Fz: 3.2, Cz: -1.5, ... })
 * @param absMax - Absolute maximum for symmetric color scaling
 * @param options - Rendering options
 */
export function renderTopomap(
  canvas: HTMLCanvasElement,
  values: Record<string, number>,
  absMax: number,
  options: TopoRenderOptions = {},
): void {
  ensureTopomapObserved(canvas);
  if (offscreenTopomapCanvases.has(canvas)) {
    pendingTopomaps.set(canvas, { values, absMax, options });
    return;
  }
  drawTopomap(canvas, values, absMax, options);
}

/** Internal: unconditional topomap draw. External callers use renderTopomap,
 *  which adds the off-screen gating above. */
function drawTopomap(
  canvas: HTMLCanvasElement,
  values: Record<string, number>,
  absMax: number,
  options: TopoRenderOptions = {},
): void {
  const {
    resolution = 200,
    sigma = 0.10,
    contourCount = 8,
    contourColor = 'rgba(0,0,0,0.35)',
    showElectrodes = true,
    showHead = true,
    colormap,
    colormapFn: customColormapFn,
    headOutlineColor,
    electrodeLabelColor,
    vMin,
    vMax,
    highlightChannels,
    highlightColor,
  } = options;

  const colormapFn = customColormapFn ?? getColormap(colormap);

  /* Theme-aware outline/label colors, read from the canvas host (NOT :root,
   * which resolves the wrong theme inside the workstation subtree). Explicit
   * options still win — capture-time passes resolved colors for the clone. */
  const ct = readCanvasTokens(canvas);

  // Resolve color-range bounds. Explicit vMin+vMax win (sequential
  // mode), otherwise fall back to symmetric ±absMax (diverging mode).
  // The branch must agree across pixel mapping AND contour drawing
  // below — if it doesn't, contour lines won't sit on the iso-values
  // that the visible colormap implies.
  const haveExplicitRange =
    typeof vMin === 'number' &&
    typeof vMax === 'number' &&
    Number.isFinite(vMin) &&
    Number.isFinite(vMax) &&
    vMax > vMin;
  const rangeLo = haveExplicitRange ? (vMin as number) : -absMax;
  const rangeHi = haveExplicitRange ? (vMax as number) : absMax;
  const rangeSpan = rangeHi - rangeLo;

  const elecs: Array<{ ch: string; nx: number; ny: number; val: number }> = [];
  for (const [ch, val] of Object.entries(values)) {
    const pos = ELECTRODE_POSITIONS[ch];
    if (pos) elecs.push({ ch, nx: pos.x, ny: pos.y, val });
  }
  if (elecs.length === 0) return;

  const S = resolution;
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const sig2 = 2 * sigma * sigma;
  const cutoff2 = (3 * sigma) * (3 * sigma);

  const field = new Float32Array(S * S);
  const mask = new Uint8Array(S * S);

  for (let py = 0; py < S; py++) {
    for (let px = 0; px < S; px++) {
      const nx = px / S;
      const ny = py / S;
      const dist = Math.sqrt((nx - HEAD_CX) ** 2 + (ny - HEAD_CY) ** 2);
      const idx = py * S + px;

      if (dist > HEAD_R * 1.01) {
        field[idx] = NaN;
        mask[idx] = 0;
        continue;
      }
      mask[idx] = 1;

      let wSum = 0;
      let vSum = 0;
      for (const e of elecs) {
        const d2 = (nx - e.nx) ** 2 + (ny - e.ny) ** 2;
        if (d2 > cutoff2) continue;
        const w = Math.exp(-d2 / sig2);
        wSum += w;
        vSum += w * e.val;
      }

      if (wSum > 0) {
        field[idx] = vSum / wSum;
      } else {
        let nearestVal = 0;
        let nearestD2 = Infinity;
        for (const e of elecs) {
          const d2 = (nx - e.nx) ** 2 + (ny - e.ny) ** 2;
          if (d2 < nearestD2) { nearestD2 = d2; nearestVal = e.val; }
        }
        field[idx] = nearestVal;
      }
    }
  }

  const smoothed = gaussBlur(field, S, S, 3);

  for (let i = 0; i < S * S; i++) {
    if (!mask[i]) smoothed[i] = NaN;
  }

  const imgData = ctx.createImageData(S, S);
  const pixels = imgData.data;

  for (let py = 0; py < S; py++) {
    for (let px = 0; px < S; px++) {
      const idx = py * S + px;
      const pidx = idx * 4;

      if (!mask[idx]) {
        pixels[pidx + 3] = 0;
        continue;
      }

      const val = smoothed[idx];
      const tNorm = rangeSpan > 0 ? (val - rangeLo) / rangeSpan : 0.5;
      const [r, g, b] = colormapFn(tNorm);

      const nx = px / S;
      const ny = py / S;
      const dist = Math.sqrt((nx - HEAD_CX) ** 2 + (ny - HEAD_CY) ** 2);
      const fade = dist > HEAD_R * 0.94
        ? Math.max(0, 1 - (dist - HEAD_R * 0.94) / (HEAD_R * 0.06))
        : 1;

      pixels[pidx] = r;
      pixels[pidx + 1] = g;
      pixels[pidx + 2] = b;
      pixels[pidx + 3] = Math.round(255 * fade);
    }
  }

  ctx.putImageData(imgData, 0, 0);

  if (contourCount > 0) {
    const vMinContour = rangeLo;
    const vMaxContour = rangeHi;
    const step = (vMaxContour - vMinContour) / (contourCount + 1);

    ctx.save();
    ctx.strokeStyle = contourColor;
    ctx.lineWidth = 0.8;

    for (let ci = 1; ci <= contourCount; ci++) {
      const thresh = vMinContour + ci * step;
      const segs = contourLines(smoothed, S, S, thresh);

      ctx.beginPath();
      for (const seg of segs) {
        const d1 = Math.sqrt((seg.x1 - HEAD_CX) ** 2 + (seg.y1 - HEAD_CY) ** 2);
        const d2 = Math.sqrt((seg.x2 - HEAD_CX) ** 2 + (seg.y2 - HEAD_CY) ** 2);
        if (d1 > HEAD_R * 0.96 || d2 > HEAD_R * 0.96) continue;

        ctx.moveTo(seg.x1 * S, seg.y1 * S);
        ctx.lineTo(seg.x2 * S, seg.y2 * S);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  if (showHead) {
    ctx.save();
    ctx.strokeStyle = headOutlineColor || ct.outline;
    ctx.lineWidth = 1.8;

    ctx.beginPath();
    ctx.arc(HEAD_CX * S, HEAD_CY * S, HEAD_R * S, 0, Math.PI * 2);
    ctx.stroke();

    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(0.50 * S, (HEAD_CY - HEAD_R - 0.005) * S);
    ctx.lineTo(0.455 * S, (HEAD_CY - HEAD_R + 0.055) * S);
    ctx.moveTo(0.50 * S, (HEAD_CY - HEAD_R - 0.005) * S);
    ctx.lineTo(0.545 * S, (HEAD_CY - HEAD_R + 0.055) * S);
    ctx.stroke();

    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo((HEAD_CX - HEAD_R) * S, 0.45 * S);
    ctx.quadraticCurveTo((HEAD_CX - HEAD_R - 0.035) * S, 0.50 * S, (HEAD_CX - HEAD_R) * S, 0.55 * S);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo((HEAD_CX + HEAD_R) * S, 0.45 * S);
    ctx.quadraticCurveTo((HEAD_CX + HEAD_R + 0.035) * S, 0.50 * S, (HEAD_CX + HEAD_R) * S, 0.55 * S);
    ctx.stroke();

    ctx.restore();
  }

  if (showElectrodes) {
    ctx.save();
    ctx.fillStyle = electrodeLabelColor || ct.label;
    for (const e of elecs) {
      ctx.beginPath();
      ctx.arc(e.nx * S, e.ny * S, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // AI-Technician highlight: bold, glowing gold ring around the named
  // electrode(s) — the topomap analogue of the head-spectra gold peak marker's
  // halo. Drawn on top of the field + dots.
  //
  // The highlighted electrode is usually the hotspot itself, so the field
  // underneath it is warm (yellow/red) — a plain gold ring there is "light on
  // light" and vanishes. To stay legible on ANY field color we draw a three-
  // layer ring: (1) a dark contrast halo underneath that frames the ring on
  // warm/light regions; (2) the gold ring with a gold glow, which reads as the
  // highlight on cool/dark regions; (3) a crisp white inner edge. The dark and
  // white edges together guarantee contrast regardless of the underlying color.
  if (highlightChannels && highlightChannels.length > 0) {
    const wanted = new Set(highlightChannels);
    const gold = highlightColor || '#FFCC33';
    const r = Math.max(7, S * 0.05);
    ctx.save();
    for (const e of elecs) {
      if (!wanted.has(e.ch)) continue;
      const cx = e.nx * S;
      const cy = e.ny * S;
      // 1. Dark contrast halo — wider than the gold ring so it peeks out as a
      //    dark fringe, keeping the ring legible over warm/light field colors.
      ctx.shadowColor = 'rgba(0,0,0,0.45)';
      ctx.shadowBlur = Math.max(6, S * 0.05);
      ctx.strokeStyle = 'rgba(0,0,0,0.6)';
      ctx.lineWidth = Math.max(5, S * 0.05);
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
      // 2. Gold ring with a gold glow (the highlight; reads on cool/dark field).
      ctx.shadowColor = gold;
      ctx.shadowBlur = Math.max(8, S * 0.08);
      ctx.strokeStyle = gold;
      ctx.lineWidth = Math.max(3, S * 0.028);
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
      // 3. Crisp white inner edge (no shadow) for a hard, bright boundary.
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = Math.max(1, S * 0.01);
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.86, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }
}

/* ------------------------------------------------------------------ */
/*  React component — declarative wrapper for plugins                  */
/* ------------------------------------------------------------------ */

export interface TopomapProps extends TopoRenderOptions {
  /** Channel name → value mapping. */
  values: Record<string, number>;
  /** Absolute maximum for symmetric color scaling. */
  absMax: number;
  /** CSS class on the wrapper canvas. */
  className?: string;
  /** Title attribute (hover tooltip). */
  title?: string;
  /** Optional aria-label for accessibility. */
  ariaLabel?: string;
}

/**
 * Declarative React wrapper around `renderTopomap`. Plugins use this so they
 * don't need to manage canvas refs and useEffect cycles themselves.
 *
 * Sized via the parent's CSS (the canvas fills its wrapper). Re-renders
 * whenever values, absMax, or any rendering option changes.
 */
export function Topomap({
  values,
  absMax,
  className,
  title,
  ariaLabel,
  resolution,
  contourCount,
  showElectrodes,
  showHead,
  colormap,
  colormapFn,
  contourColor,
  sigma,
}: TopomapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    renderTopomap(canvas, values, absMax, {
      resolution,
      contourCount,
      showElectrodes,
      showHead,
      colormap,
      colormapFn,
      contourColor,
      sigma,
    });
  }, [
    values,
    absMax,
    resolution,
    contourCount,
    showElectrodes,
    showHead,
    colormap,
    colormapFn,
    contourColor,
    sigma,
  ]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      title={title}
      aria-label={ariaLabel}
      style={{ width: '100%', height: '100%', display: 'block' }}
    />
  );
}

export { TopoColorbar, renderColorbarCanvas } from './TopoColorbar';
export type { TopoColorbarProps } from './TopoColorbar';

export { TopoValueHover } from './TopoValueHover';
export type { TopoValueHoverProps } from './TopoValueHover';

export { centreForTopo } from './centreForTopo';
export type { CentredTopoValues } from './centreForTopo';
