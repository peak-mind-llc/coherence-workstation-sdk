/**
 * <DiffTopomap> — single-canvas diverging-colormap topomap for SPEC-022
 * compare-prior overlays.
 *
 * Thin wrapper around `<Topomap>` that renders a `current − prior` map
 * with `zScoreColormap` (blue-white-red) and a zero-centered domain.
 * `absMax` defaults to `max(|±values|)` so the scale is symmetric and
 * zero crossings render white.
 *
 * For triplet views (Reference | Current | Δ shared color scale) keep
 * using `<TripletTopomap>`. This component is for the case where only
 * the diff matters — the SPEC-022 head-map-suite per-band-cell pattern.
 */
import { useMemo } from 'react';
import { Topomap } from './index';
import { zScoreColormap, type ColormapFn } from '../colormap';

export interface DiffTopomapProps {
  /** Channel → diff value (current − prior). Sign-preserving. */
  values: Record<string, number>;
  /**
   * Symmetric absolute maximum for color scaling. When omitted, auto-
   * computes from `max(|values|)`. Provide explicitly when sharing a
   * scale across multiple DiffTopomaps (e.g. a band grid where every
   * cell should compare against the same reference).
   */
  absMax?: number;
  /**
   * Diverging colormap for the diff. Defaults to `zScoreColormap`
   * (blue-white-red, same one TripletTopomap uses on its Δ viewport).
   */
  colormapFn?: ColormapFn;
  /** CSS class on the wrapper canvas. */
  className?: string;
  /** Title attribute (hover tooltip). */
  title?: string;
  /** Optional aria-label for accessibility. */
  ariaLabel?: string;
  /** Forwarded to `<Topomap>` — pixel render resolution. */
  resolution?: number;
  /** Forwarded to `<Topomap>` — Gaussian interpolation sigma. */
  sigma?: number;
  /** Forwarded to `<Topomap>` — number of contour lines. */
  contourCount?: number;
  /** Forwarded to `<Topomap>` — show electrode dots. */
  showElectrodes?: boolean;
  /** Forwarded to `<Topomap>` — show head outline. */
  showHead?: boolean;
}

function computeAbsMax(values: Record<string, number>): number {
  let max = 0;
  for (const v of Object.values(values)) {
    if (Number.isFinite(v)) {
      const a = Math.abs(v);
      if (a > max) max = a;
    }
  }
  return max;
}

export function DiffTopomap({
  values,
  absMax,
  colormapFn = zScoreColormap,
  className,
  title,
  ariaLabel,
  resolution,
  sigma,
  contourCount,
  showElectrodes = true,
  showHead = true,
}: DiffTopomapProps) {
  const resolvedAbsMax = useMemo(
    () => (absMax !== undefined ? absMax : computeAbsMax(values)),
    [absMax, values],
  );

  return (
    <Topomap
      values={values}
      absMax={resolvedAbsMax || 1}
      colormapFn={colormapFn}
      className={className}
      title={title}
      ariaLabel={ariaLabel}
      resolution={resolution}
      sigma={sigma}
      contourCount={contourCount}
      showElectrodes={showElectrodes}
      showHead={showHead}
    />
  );
}
