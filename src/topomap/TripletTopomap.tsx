/**
 * <TripletTopomap> — three-viewport ``A | B | Δ`` topomap layout.
 *
 * Implements the radiology three-up rule from the longitudinal-priors
 * spec: subtraction views are *additional*, never replacements — the
 * original baseline and current viewports are always visible alongside
 * the difference. Used by:
 *
 *   - the resting **head-map-with-diff** pane (Reference | Current | Δ
 *     in absolute power per band, with FDR + Cohen's d significance
 *     markers on the Δ viewport);
 *   - the resting **|z|-topomap triplet** pane (Baseline z | Current z
 *     | Δz when comparator = `vs norms`);
 *   - the ERP **topomap A | B | Δ at peak-window mean** pane.
 *
 * The component takes three ``values`` maps (channel → number) and a
 * single ``absMax`` so all three viewports share the same color scale.
 * Children rendered on top of each viewport (via the ``aOverlay`` /
 * ``bOverlay`` / ``deltaOverlay`` props) let callers stack
 * SignificanceMarkerOverlay over Δ without coupling that logic into
 * the SDK.
 */

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Topomap } from './index';
import {
  qeegClassicColormap,
  zScoreColormap,
  type ColormapFn,
} from '../colormap';

export interface TripletTopomapProps {
  /** Channel → value for the ``A`` (typically baseline) viewport. */
  aValues: Record<string, number>;
  /** Channel → value for the ``B`` (typically current) viewport. */
  bValues: Record<string, number>;
  /** Channel → value for the difference viewport (often ``B − A``). */
  deltaValues: Record<string, number>;

  /** Symmetric absolute maximum shared by ``A``, ``B``, and Δ. */
  absMax: number;

  /** Header labels per viewport. Defaults: ``A`` / ``B`` / ``Δ``. */
  aLabel?: string;
  bLabel?: string;
  deltaLabel?: string;

  /** Optional sublabel rendered under each header (date, condition…). */
  aSublabel?: string;
  bSublabel?: string;
  deltaSublabel?: string;

  /** Colormap fn for the A and B viewports. Defaults to ``qeegClassicColormap``. */
  colormapFn?: ColormapFn;
  /** Colormap fn for the Δ viewport. Defaults to ``zScoreColormap`` (blue-white-red). */
  deltaColormapFn?: ColormapFn;

  /** Children rendered absolute-positioned over each viewport's canvas. */
  aOverlay?: ReactNode;
  bOverlay?: ReactNode;
  deltaOverlay?: ReactNode;

  className?: string;
}

interface ViewportProps {
  values: Record<string, number>;
  absMax: number;
  label: string;
  sublabel?: string;
  colormapFn?: ColormapFn;
  overlay?: ReactNode;
  testId: string;
}

function Viewport({
  values,
  absMax,
  label,
  sublabel,
  colormapFn,
  overlay,
  testId,
}: ViewportProps) {
  return (
    <div
      className="flex flex-col items-stretch min-w-0"
      data-testid={testId}
    >
      <div
        className="text-[var(--text-tertiary)] uppercase tracking-wider px-1 pb-0.5"
        style={{
          fontFamily: 'var(--font-workstation)',
          fontSize: 'var(--workstation-font-meta)',
        }}
      >
        {label}
        {sublabel && (
          <span className="ml-1 text-[var(--text-secondary)] normal-case tracking-normal">
            {sublabel}
          </span>
        )}
      </div>
      {/* Measure the cell, render the canvas at min(width, height)
          pixels — the head stays round, never spills, scales with the
          pane. CSS aspect-ratio kept failing in this layout because the
          canvas's intrinsic 256×256 dominated when no parent had a
          definite height; explicit pixels are the reliable fix. */}
      <SquareTopomapCell>
        <Topomap
          values={values}
          absMax={absMax}
          colormapFn={colormapFn}
          showElectrodes
          showHead
        />
        {overlay && (
          <div className="absolute inset-0 pointer-events-none">{overlay}</div>
        )}
      </SquareTopomapCell>
    </div>
  );
}

export function TripletTopomap({
  aValues,
  bValues,
  deltaValues,
  absMax,
  aLabel = 'A',
  bLabel = 'B',
  deltaLabel = 'Δ',
  aSublabel,
  bSublabel,
  deltaSublabel,
  colormapFn = qeegClassicColormap,
  deltaColormapFn = zScoreColormap,
  aOverlay,
  bOverlay,
  deltaOverlay,
  className,
}: TripletTopomapProps) {
  return (
    <div
      className={[
        'grid grid-cols-3 gap-1 w-full h-full',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      data-testid="triplet-topomap"
    >
      <Viewport
        values={aValues}
        absMax={absMax}
        label={aLabel}
        sublabel={aSublabel}
        colormapFn={colormapFn}
        overlay={aOverlay}
        testId="triplet-topomap-a"
      />
      <Viewport
        values={bValues}
        absMax={absMax}
        label={bLabel}
        sublabel={bSublabel}
        colormapFn={colormapFn}
        overlay={bOverlay}
        testId="triplet-topomap-b"
      />
      <Viewport
        values={deltaValues}
        absMax={absMax}
        label={deltaLabel}
        sublabel={deltaSublabel}
        colormapFn={deltaColormapFn}
        overlay={deltaOverlay}
        testId="triplet-topomap-delta"
      />
    </div>
  );
}

/**
 * Render `children` (a Topomap canvas + optional overlay) inside a
 * pixel-exact square sized to fit the parent cell. Uses a
 * ResizeObserver to keep the box square as the pane resizes.
 *
 * Why JS instead of CSS aspect-ratio: the parent layout chain (workstation
 * pane → flex-row → grid cell → flex-col viewport) has a flex-determined
 * height with no definite px value, and the inner canvas has an
 * intrinsic 256×256 size that wins when CSS can't resolve `height: 100%`.
 * Measuring once per resize and writing exact px to the wrapper gives a
 * single source of truth that survives every layout context.
 */
function SquareTopomapCell({ children }: { children: ReactNode }) {
  const outerRef = useRef<HTMLDivElement>(null);
  const [side, setSide] = useState(0);
  useEffect(() => {
    const el = outerRef.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(() => {
      const rect = el.getBoundingClientRect();
      const next = Math.max(0, Math.floor(Math.min(rect.width, rect.height)));
      setSide((prev) => (prev === next ? prev : next));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div
      ref={outerRef}
      className="relative flex-1 min-h-0 flex items-center justify-center overflow-hidden"
      data-testid="square-topomap-cell"
    >
      {side > 0 && (
        <div className="relative" style={{ width: side, height: side }}>
          {children}
        </div>
      )}
    </div>
  );
}
