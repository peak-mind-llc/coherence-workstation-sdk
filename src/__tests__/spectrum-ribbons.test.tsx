import { describe, it, expect } from 'vitest';
import * as SpectrumModule from '../spectrum';
import * as IndexModule from '../index';
import type { UPlotMiniSpectrumProps } from '../spectrum';

/**
 * SDK-level surface tests for the v2 ribbons / medianLine / hoverExtra
 * props. We deliberately don't render the canvas here (jsdom has no
 * 2d context); the end-to-end visual is covered in NormativeSpectra
 * + HeadGrid tests where the renderer runs against fixtures.
 */
describe('UPlotMiniSpectrum v2 props — SDK surface', () => {
  it('accepts ribbons as an optional array of { upper, lower, fill }', () => {
    const props: UPlotMiniSpectrumProps = {
      freqs: [1, 2, 3],
      psd: [1, 1, 1],
      channel: 'Fz',
      logMin: -1,
      logMax: 1,
      ribbons: [
        { upper: [2, 2, 2], lower: [-2, -2, -2], fill: 'rgba(120,140,180,0.22)' },
        { upper: [1, 1, 1], lower: [-1, -1, -1], fill: 'rgba(140,160,200,0.40)' },
      ],
    };
    expect(props.ribbons).toHaveLength(2);
    expect(props.ribbons![0].fill).toMatch(/^rgba/);
  });

  it('accepts medianLine as an optional aligned array', () => {
    const props: UPlotMiniSpectrumProps = {
      freqs: [1, 2, 3],
      psd: [1, 1, 1],
      channel: 'Fz',
      logMin: -1,
      logMax: 1,
      medianLine: [0.5, 0.5, 0.5],
    };
    expect(props.medianLine).toEqual([0.5, 0.5, 0.5]);
  });

  it('accepts hoverExtra as an optional callback returning string|null', () => {
    const props: UPlotMiniSpectrumProps = {
      freqs: [1, 2, 3],
      psd: [1, 1, 1],
      channel: 'Fz',
      logMin: -1,
      logMax: 1,
      hoverExtra: (_idx, _f) => 'rank=50 · z=0.00',
    };
    expect(typeof props.hoverExtra).toBe('function');
    expect(props.hoverExtra!(0, 1)).toBe('rank=50 · z=0.00');
  });

  it('UPlotMiniSpectrum default export still matches the index export', () => {
    expect(SpectrumModule.default).toBe(IndexModule.UPlotMiniSpectrum);
  });
});
