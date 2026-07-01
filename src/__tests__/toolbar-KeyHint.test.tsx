import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { KeyHint } from '../toolbar/KeyHint';

describe('<KeyHint>', () => {
  it('renders K, separator dot, and label', () => {
    const { container } = render(<KeyHint kbd="A" label="annotate" />);
    expect(container.textContent).toBe('A · annotate');
  });

  it('appends count when > 0', () => {
    const { container } = render(<KeyHint kbd="E" label="mask" count={3} />);
    expect(container.textContent).toBe('E · mask (3)');
  });

  it('omits count when 0 or undefined', () => {
    const { container } = render(<KeyHint kbd="B" label="bad" count={0} />);
    expect(container.textContent).toBe('B · bad');
  });

  it('renders the dot in a tertiary-text span (for styling)', () => {
    const { container } = render(<KeyHint kbd="A" label="annotate" />);
    const dot = container.querySelector('.text-\\[var\\(--text-tertiary\\)\\]');
    expect(dot?.textContent).toBe(' · ');
  });
});
