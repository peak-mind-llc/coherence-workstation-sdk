import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  WorkstationToolbar,
  ToolbarMeta,
} from '../toolbar/WorkstationToolbar';

describe('<WorkstationToolbar>', () => {
  it('renders a var(--workstation-header-height)-tall row with bottom border and gap-2', () => {
    const { container } = render(
      <WorkstationToolbar>
        <span data-testid="child">x</span>
      </WorkstationToolbar>,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.style.height).toBe('var(--workstation-header-height)');
    expect(root.className).toContain('flex');
    expect(root.className).toContain('items-center');
    expect(root.className).toContain('gap-2');
    expect(root.className).toContain('border-b');
    expect(root.querySelector('[data-testid="child"]')).not.toBeNull();
  });
});

describe('<ToolbarMeta>', () => {
  it('renders dimmed metadata at tertiary color', () => {
    render(<ToolbarMeta>149.0–159.0s / 300s</ToolbarMeta>);
    const node = screen.getByText('149.0–159.0s / 300s');
    expect(node.className).toContain('text-[var(--text-tertiary)]');
    expect(node.className).toContain('tabular-nums');
  });
});
