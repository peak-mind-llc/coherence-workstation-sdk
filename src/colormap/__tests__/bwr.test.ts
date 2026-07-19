import { describe, expect, test } from 'vitest';
import { bwrColormap, resolveDivergingColormap } from '../index';

describe('bwrColormap', () => {
  test('is white at midpoint, blue low, red high', () => {
    // Exact midpoint value derived from the copied color stops (verified by
    // hand: t=0.5 lands on the second branch with k=0, i.e. [255,255,255]).
    expect(bwrColormap(0.5)).toEqual([255, 255, 255]);

    const lo = bwrColormap(0);
    const hi = bwrColormap(1);
    expect(lo[2]).toBeGreaterThan(lo[0]); // blue dominant at low
    expect(hi[0]).toBeGreaterThan(hi[2]); // red dominant at high
  });
});

describe('resolveDivergingColormap', () => {
  test('classic resolves to jet, perceptual/colorblind resolve to bwr', () => {
    const classic = resolveDivergingColormap('classic')(0.25);
    const perceptual = resolveDivergingColormap('perceptual')(0.25);
    const colorblind = resolveDivergingColormap('colorblind')(0.25);

    expect(classic).not.toEqual(perceptual);
    expect(perceptual).toEqual(bwrColormap(0.25));
    expect(colorblind).toEqual(bwrColormap(0.25));
  });
});
