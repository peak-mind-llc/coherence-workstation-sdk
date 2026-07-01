import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { DiffTopomap } from '../topomap/DiffTopomap';

describe('<DiffTopomap>', () => {
  it('renders a canvas wrapping a Topomap', () => {
    const { container } = render(
      <DiffTopomap values={{ Fz: 0.5, Cz: -0.3, Pz: 0.1 }} />,
    );
    const canvas = container.querySelector('canvas');
    expect(canvas).not.toBeNull();
  });

  it('accepts a custom absMax to share scale across instances', () => {
    // Smoke check — the visual scale is canvas-internal; we can't easily
    // assert the rendered colors in jsdom, but the component should
    // accept the prop without throwing.
    const { container } = render(
      <DiffTopomap values={{ Fz: 0.5, Cz: -0.3 }} absMax={1.0} />,
    );
    expect(container.querySelector('canvas')).not.toBeNull();
  });

  it('handles all-zero values without crashing (computeAbsMax fallback)', () => {
    // Branch where computeAbsMax returns 0; component must not divide
    // by zero in the absMax fallback (uses `|| 1`).
    const { container } = render(
      <DiffTopomap values={{ Fz: 0, Cz: 0, Pz: 0 }} />,
    );
    expect(container.querySelector('canvas')).not.toBeNull();
  });
});
