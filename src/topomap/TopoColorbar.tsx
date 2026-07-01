/**
 * TopoColorbar — vertical viridis colorbar rendered as a canvas with tick
 * labels. Sibling primitive to renderTopomap; consumers compose it next to a
 * topomap canvas to communicate value range.
 *
 * Ported from legacy dashboard BandTopoGrid.tsx (lines 121-193) into the SDK
 * so all topomap consumers (host + plugins) can adopt it.
 */

import { useEffect, useMemo, useRef } from 'react';
import { getColormap, type ColormapFn } from '../colormap';

export interface TopoColorbarProps {
  /** Value at the bottom of the bar. */
  vMin: number;
  /** Value at the top of the bar. */
  vMax: number;
  /** Display unit shown below the ticks (e.g. "µV", "%"). */
  unit: string;
  /**
   * Bar height. Number = fixed px. Omitted or 'auto' = fill parent's height
   * (the wrapper is height:100% and the canvas CSS-stretches; ticks
   * position by percentage so they align regardless of rendered height).
   */
  height?: number | 'auto';
  /** Bar width in px. Defaults to 18 to match legacy. */
  width?: number;
  /** Optional explicit colormap. Defaults to the user's preference via getColormap(). */
  colormapFn?: ColormapFn;
  /** Number of tick intervals (default 5 → 6 labels). */
  ticks?: number;
  /** Optional tick-label formatter. Defaults to the standard precision rules.
   *  Use to display a transformed value (e.g. raw ratio = 10^v for a
   *  log-scaled ratio bar) while the bar positions stay in the raw value space. */
  formatValue?: (v: number) => string;
}

/**
 * Canvas backing-buffer height used when the colorbar is in responsive
 * (`height: 'auto'`) mode. The gradient is a smooth vertical interpolation,
 * so CSS-stretching from 256px to any displayed height is artifact-free.
 */
const RESPONSIVE_CANVAS_HEIGHT = 256;

/**
 * Paint a vertical viridis-style gradient into an existing canvas using the
 * provided (or default) colormap. The canvas's current `width` / `height`
 * backing-buffer values are used — caller is responsible for sizing the
 * canvas before calling.
 *
 * Exposed as a separate primitive so screenshot-capture pipelines can
 * re-paint cloned colorbar canvases (cloneNode loses canvas pixel data,
 * and TopoColorbar's useEffect doesn't fire in the offscreen clone).
 */
export function renderColorbarCanvas(
  canvas: HTMLCanvasElement,
  options: { colormapFn?: ColormapFn } = {},
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const cmap = options.colormapFn ?? getColormap();
  const h = canvas.height;
  const w = canvas.width;
  for (let y = 0; y < h; y++) {
    const t = 1 - y / Math.max(h - 1, 1); // 1 at top, 0 at bottom
    const [r, g, b] = cmap(t);
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.fillRect(0, y, w, 1);
  }
}

function defaultFormatValue(v: number): string {
  if (Math.abs(v) >= 100) return v.toFixed(1);
  if (Math.abs(v) >= 1) return v.toFixed(2);
  if (Math.abs(v) >= 0.01) return v.toFixed(3);
  if (Math.abs(v) >= 0.001) return v.toFixed(4);
  if (v === 0) return '0';
  const exp = Math.floor(Math.log10(Math.abs(v)));
  const mantissa = v / Math.pow(10, exp);
  return `${mantissa.toFixed(1)}e${exp}`;
}

export function TopoColorbar({
  vMin,
  vMax,
  unit,
  height = 'auto',
  width = 18,
  colormapFn,
  ticks = 5,
  formatValue,
}: TopoColorbarProps) {
  const fmt = formatValue ?? defaultFormatValue;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const responsive = height === 'auto';
  const canvasBufferH = responsive ? RESPONSIVE_CANVAS_HEIGHT : height;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = width;
    canvas.height = canvasBufferH;
    renderColorbarCanvas(canvas, { colormapFn });
  }, [canvasBufferH, width, colormapFn]);

  /* Tick positions as a percentage of total height — bottom = 0%, top = 100%.
   * Stays correct whether the colorbar is fixed-height or CSS-stretched to
   * fill its parent. */
  const tickPoints = useMemo(() => {
    const range = vMax - vMin;
    if (range <= 0) return [{ val: vMin, pct: 100 }];
    const result: { val: number; pct: number }[] = [];
    for (let i = 0; i <= ticks; i++) {
      const val = vMin + (i / ticks) * range;
      const pct = 100 - (i / ticks) * 100; // i=0 → bottom (100% from top), i=ticks → top (0%)
      result.push({ val, pct });
    }
    return result;
  }, [vMin, vMax, ticks]);

  const wrapperStyle = responsive
    ? { height: '100%' as const }
    : { height: `${height}px` };
  const canvasStyle = {
    width: `${width - 4}px`,
    height: '100%' as const,
    borderRadius: '2px',
  };

  /* Bar + ticks share a flex-1 row; the unit label sits in its own row
   * below so the gradient doesn't visually run into the "µV" text and
   * the bottom tick label doesn't overlap the bar's lower edge. */
  return (
    <div className="flex flex-col flex-shrink-0 ml-1" style={wrapperStyle}>
      <div className="flex flex-1 min-h-0">
        <canvas ref={canvasRef} style={canvasStyle} />
        <div className="relative ml-0.5" style={{ width: '52px' }}>
          {tickPoints.map((t, i) => {
            /* Clamp edge labels INSIDE the bar bounds so the top
             * tick's upper half doesn't overflow into the band-name
             * row above, and the bottom tick's lower half doesn't
             * overflow into the chip row below. Middle labels stay
             * centered on their tick line via `translateY(-50%)`. */
            const isTop = t.pct <= 0.001;
            const isBottom = t.pct >= 99.999;
            const transform = isTop
              ? 'translateY(0)'
              : isBottom
                ? 'translateY(-100%)'
                : 'translateY(-50%)';
            return (
              <span
                key={i}
                className="absolute text-[11px] font-mono text-text-secondary leading-none whitespace-nowrap"
                style={{ top: `${t.pct}%`, transform }}
              >
                {fmt(t.val)}
              </span>
            );
          })}
        </div>
      </div>
      <div
        className="text-[10px] font-mono text-text-tertiary italic leading-none mt-1 ml-1"
      >
        {unit}
      </div>
    </div>
  );
}
