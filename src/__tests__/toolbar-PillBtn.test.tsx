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

  /* These two asserted the SPEC-016 design: an accent-subtle tint under a 2px
   * accent underline, with both states carrying `border-b-2` so the height
   * never shifted. That design was deliberately replaced — the component's own
   * note records it: "Per user feedback the underline is gone; the fill alone
   * carries the active signal, which makes ProgramTabs + PhaseStrip read as
   * actual pills." Nobody updated the tests, and nobody noticed, because this
   * package's 29 test files resolved nowhere and had never run. They run now
   * (desktop/vite.config.mts), and these assert the design that shipped. */
  it('shows active state as a solid accent fill with on-accent text', () => {
    render(<PillBtn title="t" onClick={() => {}} active>x</PillBtn>);
    const btn = screen.getByTitle('t');
    expect(btn.className).toContain('bg-[var(--accent-primary)]');
    // `--text-on-accent`, not `--surface-ground`: the latter resolved to the
    // dark page background on dark themes, i.e. dark-on-blue.
    expect(btn.className).toContain('text-[var(--text-on-accent,#fff)]');
    expect(btn.className).toContain('font-bold');
    // The underline is gone in BOTH states, so no layout compensation is needed.
    expect(btn.className).not.toContain('border-b-2');
  });

  it('renders inactive as muted text with no fill and no underline', () => {
    render(<PillBtn title="t" onClick={() => {}}>x</PillBtn>);
    const btn = screen.getByTitle('t');
    expect(btn.className).toContain('text-[var(--text-secondary)]');
    expect(btn.className).not.toContain('bg-[var(--accent-primary)]');
    expect(btn.className).not.toContain('border-b-2');
  });
});
