/**
 * TopoValueHover — wraps a topomap canvas and shows a per-electrode value
 * tooltip on hover. On mousemove, finds the nearest registered electrode
 * within `hitRadius` (normalised 0–1 distance in the canvas's coordinate
 * space) and renders an absolute-positioned tooltip with `ch: value unit`.
 *
 * Ported from legacy dashboard BandTopoGrid.tsx (lines 101-115, 246-266,
 * 307-319) into the SDK so all topomap consumers can adopt it.
 *
 * The wrapper does NOT own the canvas — it expects a square child element
 * (typically a canvas rendered by renderTopomap or <Topomap>) and resolves
 * mouse coordinates against that child's bounding rect.
 *
 * Hit-testing is `hitTestElectrode` — the SAME call a click uses — so the
 * tooltip can never name an electrode a click would miss. It had its own
 * copy of that search until SPEC-049R, and the two drifted: the tooltip
 * reached 0.15 while the click reached 0.04, which made the head-map click
 * target unusable while the tooltip looked fine.
 */

import { useCallback, useRef, useState, type ReactNode } from 'react';
import { ELECTRODE_HIT_RADIUS, hitTestElectrode } from './index';

export interface TopoValueHoverProps {
  /** Channel-name → value mapping. Only channels present here participate
   *  in hit-test and tooltip display. */
  values: Record<string, number>;
  /** Display unit for the tooltip (e.g. "µV", "%"). */
  unit: string;
  /** Maximum normalised distance (0–1) from electrode position to register
   *  a hit. Defaults to 0.15 (legacy default). */
  hitRadius?: number;
  /** Optional value formatter. Defaults to the standard precision rules. */
  formatValue?: (v: number) => string;
  /** The topomap canvas (or <Topomap>) the wrapper sits above. */
  children: ReactNode;
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

export function TopoValueHover({
  values,
  unit,
  hitRadius = ELECTRODE_HIT_RADIUS,
  formatValue,
  children,
}: TopoValueHoverProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<{
    ch: string;
    val: number;
    x: number;
    y: number;
  } | null>(null);

  const fmt = formatValue ?? defaultFormatValue;
  const channels = Object.keys(values);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const nx = (e.clientX - rect.left) / rect.width;
      const ny = (e.clientY - rect.top) / rect.height;
      // The SAME hit test a click uses, so the tooltip cannot name an
      // electrode the click would miss (SPEC-049R).
      const ch = hitTestElectrode(nx, ny, channels, hitRadius);
      if (ch && values[ch] !== undefined) {
        setHover({
          ch,
          val: values[ch],
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        });
      } else {
        setHover(null);
      }
    },
    [channels, values, hitRadius],
  );

  const handleMouseLeave = useCallback(() => setHover(null), []);

  return (
    <div
      ref={containerRef}
      className="relative cursor-crosshair"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {hover && (
        <div
          data-testid="topo-value-tooltip"
          data-capture-hide
          className="absolute pointer-events-none z-10"
          style={{
            left: `${hover.x + 10}px`,
            top: `${Math.max(hover.y - 30, 0)}px`,
          }}
        >
          <div className="bg-surface-overlay text-text-primary border border-border text-xs font-mono font-semibold px-2 py-1 rounded whitespace-nowrap shadow-lg">
            {hover.ch}: {fmt(hover.val)} {unit}
          </div>
        </div>
      )}
    </div>
  );
}
