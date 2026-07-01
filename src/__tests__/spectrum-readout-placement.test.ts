import { describe, it, expect } from 'vitest';
import { placeReadoutTopRight } from '../spectrum';

/**
 * The hover readout pill is pinned to the chart's upper-right corner and must
 * always fit fully inside the plot box — this is what fixes the old
 * cursor-following placement that ran off the cell edge and got cut off.
 */
describe('placeReadoutTopRight', () => {
  const bbox = { left: 10, top: 5, width: 200, height: 100 };

  it('pins to the upper-right, inside the plot box', () => {
    const { left, top } = placeReadoutTopRight(bbox, 50);
    expect(left).toBe(10 + 200 - 50 - 2); // 158
    expect(top).toBe(5 + 2); // 7
  });

  it('never lets the pill exceed the right edge (no cut-off)', () => {
    const tipW = 64;
    const { left } = placeReadoutTopRight(bbox, tipW);
    expect(left + tipW).toBeLessThanOrEqual(bbox.left + bbox.width);
  });

  it('clamps to the left edge when the pill is wider than the plot', () => {
    const { left } = placeReadoutTopRight(bbox, 500);
    expect(left).toBe(bbox.left + 2); // aligned to left, not off-screen
  });

  it('honors a custom margin', () => {
    const { left, top } = placeReadoutTopRight(bbox, 50, 8);
    expect(left).toBe(10 + 200 - 50 - 8); // 152
    expect(top).toBe(5 + 8); // 13
  });

  it('anchors at the top regardless of pill height (top-aligned)', () => {
    const a = placeReadoutTopRight(bbox, 50);
    const b = placeReadoutTopRight({ ...bbox, height: 999 }, 50);
    expect(a.top).toBe(b.top);
  });
});
