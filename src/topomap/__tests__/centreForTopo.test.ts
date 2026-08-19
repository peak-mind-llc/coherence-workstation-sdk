import { describe, it, expect } from 'vitest';
import { centreForTopo } from '../centreForTopo';

describe('centreForTopo', () => {
  it('shifts values so the midrange sits at zero', () => {
    const { shifted, mid } = centreForTopo({ a: 0.1, b: 0.3, c: 0.5 });
    expect(mid).toBeCloseTo(0.3, 12);
    expect(shifted.a).toBeCloseTo(-0.2, 12);
    expect(shifted.b).toBeCloseTo(0, 12);
    expect(shifted.c).toBeCloseTo(0.2, 12);
  });

  it('reports halfRange as half the full spread', () => {
    const { halfRange } = centreForTopo({ a: 0.1, b: 0.5 });
    expect(halfRange).toBeCloseTo(0.2, 12);
  });

  it('places the extremes exactly at ±halfRange', () => {
    /* This is the contract renderTopomap relies on: it maps the painted
     * values across [-absMax, +absMax], so the coolest and hottest sites
     * must land on the ends of the colormap, not inside it. */
    const raw = { a: 1.2, b: 4.4, c: 2.0, d: 3.1 };
    const { shifted, halfRange } = centreForTopo(raw);
    const vals = Object.values(shifted);
    expect(Math.min(...vals)).toBeCloseTo(-halfRange, 12);
    expect(Math.max(...vals)).toBeCloseTo(halfRange, 12);
  });

  it('round-trips a scale bound back into raw units via mid', () => {
    /* The property whose absence caused the network-topomap-strip defect
     * (PR #1159): a colorbar drawn over the painted range must be labelled
     * mid ± halfRange, which has to bracket the raw data it colours. */
    const raw = { Fp1: 0.18, Fp2: 0.298, O1: 0.02, O2: 0.15 };
    const { mid, halfRange } = centreForTopo(raw);
    const barTop = mid + halfRange;
    const barBottom = mid - halfRange;
    const vals = Object.values(raw);

    expect(barTop).toBeCloseTo(Math.max(...vals), 12);
    expect(barBottom).toBeCloseTo(Math.min(...vals), 12);
    for (const v of vals) {
      expect(v).toBeGreaterThanOrEqual(barBottom - 1e-12);
      expect(v).toBeLessThanOrEqual(barTop + 1e-12);
    }
  });

  it('floors halfRange above zero for a flat map so scaling cannot divide by zero', () => {
    const { halfRange, shifted } = centreForTopo({ a: 2, b: 2, c: 2 });
    expect(halfRange).toBeGreaterThan(0);
    expect(shifted.a).toBe(0);
  });

  it('returns an empty map for empty input', () => {
    const { shifted, mid, halfRange } = centreForTopo({});
    expect(shifted).toEqual({});
    expect(mid).toBe(0);
    expect(halfRange).toBeGreaterThan(0);
  });

  it('handles a single channel', () => {
    const { shifted, mid, halfRange } = centreForTopo({ Cz: 7 });
    expect(mid).toBe(7);
    expect(shifted.Cz).toBe(0);
    expect(halfRange).toBeGreaterThan(0);
  });

  it('centres signed values (ICA weights) the same way', () => {
    const { shifted, mid, halfRange } = centreForTopo({ a: -3, b: 1 });
    expect(mid).toBeCloseTo(-1, 12);
    expect(halfRange).toBeCloseTo(2, 12);
    expect(shifted.a).toBeCloseTo(-2, 12);
    expect(shifted.b).toBeCloseTo(2, 12);
  });
});
