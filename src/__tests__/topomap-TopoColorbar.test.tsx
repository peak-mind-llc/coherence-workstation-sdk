import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { TopoColorbar } from '../topomap/TopoColorbar';

describe('TopoColorbar', () => {
  it('renders without crashing with positive range', () => {
    const { container } = render(
      <TopoColorbar vMin={0.984} vMax={2.04} unit="µV" height={180} />
    );
    expect(container.querySelector('canvas')).toBeTruthy();
  });

  it('renders 6 tick labels (5 intervals) between vMin and vMax', () => {
    const { container } = render(
      <TopoColorbar vMin={0} vMax={10} unit="µV" height={180} />
    );
    const ticks = container.querySelectorAll('span');
    // 6 numeric ticks + 1 unit label
    expect(ticks.length).toBeGreaterThanOrEqual(6);
  });

  it('handles zero range without dividing by zero', () => {
    const { container } = render(
      <TopoColorbar vMin={1.5} vMax={1.5} unit="µV" height={180} />
    );
    expect(container.querySelector('canvas')).toBeTruthy();
  });

  it('renders in responsive mode (default) with percentage tick positions', () => {
    const { container } = render(
      <TopoColorbar vMin={0} vMax={10} unit="µV" />
    );
    expect(container.querySelector('canvas')).toBeTruthy();
    const tickSpans = Array.from(container.querySelectorAll('span'));
    const numericTicks = tickSpans.filter((s) => /^\d/.test(s.textContent ?? ''));
    expect(numericTicks.length).toBeGreaterThanOrEqual(6);
    for (const tick of numericTicks) {
      const top = (tick as HTMLElement).style.top;
      expect(top.endsWith('%')).toBe(true);
    }
  });

  it('renders when height is explicitly "auto"', () => {
    const { container } = render(
      <TopoColorbar vMin={0} vMax={10} unit="µV" height="auto" />
    );
    expect(container.querySelector('canvas')).toBeTruthy();
  });
});
