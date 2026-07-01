import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/react';
import { PillBtn } from '../toolbar/PillBtn';

describe('<PillBtn>', () => {
  it('renders the title attribute', () => {
    render(<PillBtn title="zoom in" onClick={() => {}}>+</PillBtn>);
    expect(screen.getByTitle('zoom in').textContent).toBe('+');
  });

  it('fires onClick when clicked', () => {
    const onClick = vi.fn();
    render(<PillBtn title="t" onClick={onClick}>x</PillBtn>);
    fireEvent.click(screen.getByTitle('t'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('shows active state via accent tint + accent text + accent border-bottom', () => {
    /* SPEC-016 follow-up: selection is accent-tinted background +
     * accent text + 2px accent bottom border. Border-bottom (not inset
     * boxShadow) is used so adjacent pills in a WorkstationPill don't
     * pick up ghost fragments at their joins. */
    render(<PillBtn title="t" onClick={() => {}} active>x</PillBtn>);
    const btn = screen.getByTitle('t');
    expect(btn.className).toContain('bg-[var(--accent-subtle)]');
    expect(btn.className).toContain('text-[var(--accent-primary)]');
    expect(btn.className).toContain('border-b-2');
    expect(btn.style.borderBottomColor).toBe('var(--accent-primary)');
  });

  it('renders a transparent border-bottom when inactive (preserves layout)', () => {
    /* Both states ship border-b-2 so the pill height never shifts when
     * the active marker appears/disappears. Inactive just has transparent
     * border-bottom-color. */
    render(<PillBtn title="t" onClick={() => {}}>x</PillBtn>);
    const btn = screen.getByTitle('t');
    expect(btn.className).toContain('border-b-2');
    expect(btn.style.borderBottomColor).toBe('transparent');
  });
});
