import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { WorkstationPill } from '../toolbar/WorkstationPill';

describe('<WorkstationPill>', () => {
  it('renders children inside a 32px-tall rounded bordered container', () => {
    const { container } = render(
      <WorkstationPill>
        <span data-testid="child">x</span>
      </WorkstationPill>,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toContain('h-7');
    expect(root.className).toContain('rounded-sm');
    expect(root.className).toContain('border');
    expect(root.className).toContain('overflow-hidden');
    expect(root.querySelector('[data-testid="child"]')).not.toBeNull();
  });
});
