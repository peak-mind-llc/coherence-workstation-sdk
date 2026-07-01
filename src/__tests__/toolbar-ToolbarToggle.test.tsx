import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/react';
import { ToolbarToggle } from '../toolbar/ToolbarToggle';

describe('<ToolbarToggle>', () => {
  it('renders K · label and fires onClick', () => {
    const onClick = vi.fn();
    render(
      <ToolbarToggle
        kbd="A"
        label="annotate"
        active={false}
        onClick={onClick}
        title="toggle annotation"
      />,
    );
    const btn = screen.getByTitle('toggle annotation');
    expect(btn.textContent).toBe('A · annotate');
    fireEvent.click(btn);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('renders count when provided', () => {
    render(
      <ToolbarToggle
        kbd="E"
        label="mask"
        count={2}
        active={false}
        onClick={() => {}}
        title="t"
      />,
    );
    expect(screen.getByTitle('t').textContent).toBe('E · mask (2)');
  });

  it('applies tone classes when active', () => {
    render(
      <ToolbarToggle
        kbd="B"
        label="bad"
        tone="warning"
        active
        onClick={() => {}}
        title="t"
      />,
    );
    expect(screen.getByTitle('t').className).toContain(
      'bg-[var(--status-warning)]',
    );
  });

  it('uses subtle tone for active without explicit tone', () => {
    render(
      <ToolbarToggle
        kbd="A"
        label="a"
        active
        onClick={() => {}}
        title="t"
      />,
    );
    expect(screen.getByTitle('t').className).toContain(
      'bg-[var(--accent-primary)]',
    );
  });

  it('sets aria-pressed to reflect active state', () => {
    const { rerender } = render(
      <ToolbarToggle kbd="A" label="a" active={false} onClick={() => {}} title="t" />,
    );
    expect(screen.getByTitle('t').getAttribute('aria-pressed')).toBe('false');
    rerender(
      <ToolbarToggle kbd="A" label="a" active onClick={() => {}} title="t" />,
    );
    expect(screen.getByTitle('t').getAttribute('aria-pressed')).toBe('true');
  });
});
