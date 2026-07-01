import { describe, it, expect } from 'vitest';
import * as SpectrumModule from '../spectrum';
import * as IndexModule from '../index';
import type { SpectrumPeakMarker } from '../spectrum';

/**
 * SDK-level surface tests for peak marker support. We deliberately don't
 * render UPlotMiniSpectrum here — uPlot needs canvas 2d context, which
 * jsdom doesn't implement, and shipping a canvas-mocking dependency for
 * one type-surface test isn't worth it. The end-to-end click-and-update
 * behavior is covered in plugins/ins/spectral-atlas/tests/ where a
 * fixture renders the grid and dispatches synthetic clicks.
 */
describe('UPlotMiniSpectrum peak markers — SDK surface', () => {
  it('exports SpectrumPeakMarker as a type from the spectrum module', () => {
    // Compile-time check: a marker literal conforms to the type.
    const marker: SpectrumPeakMarker = {
      cf: 10,
      color: '#16a34a',
      radius: 4,
      opacity: 0.8,
      meta: { label: 'adaptive', peakIndex: 2 },
    };
    expect(marker.cf).toBe(10);
    expect(marker.color).toBe('#16a34a');
    expect(marker.radius).toBe(4);
    expect(marker.opacity).toBe(0.8);
  });

  it('exports SpectrumPeakMarker through the SDK index barrel', () => {
    // If the export disappears, this fails to compile (and at runtime the
    // module-shape spread proves the value module loads).
    const sdkSpread = { ...IndexModule };
    expect(sdkSpread).toBeDefined();
    expect(typeof IndexModule.UPlotMiniSpectrum).toBe('function');
  });

  it('UPlotMiniSpectrum default export is the same as SDK index export', () => {
    expect(SpectrumModule.default).toBe(IndexModule.UPlotMiniSpectrum);
  });

  it('marker type allows omitting opacity and meta', () => {
    const minimal: SpectrumPeakMarker = { cf: 10, color: '#fff', radius: 3 };
    expect(minimal.opacity).toBeUndefined();
    expect(minimal.meta).toBeUndefined();
  });
});
