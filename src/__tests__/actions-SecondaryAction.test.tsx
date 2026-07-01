import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/react';
import { SecondaryAction } from '../actions/SecondaryAction';

describe('<SecondaryAction>', () => {
  it('renders the label', () => {
    render(<SecondaryAction label="Cancel" />);
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeTruthy();
  });

  it('fires onClick when clicked', () => {
    const onClick = vi.fn();
    render(<SecondaryAction label="Retreat" onClick={onClick} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('does not fire onClick when disabled', () => {
    const onClick = vi.fn();
    render(<SecondaryAction label="Retreat" onClick={onClick} disabled />);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('marks disabled state via aria-disabled and the disabled attribute', () => {
    render(<SecondaryAction label="Retreat" disabled />);
    const btn = screen.getByRole('button');
    expect(btn.hasAttribute('disabled')).toBe(true);
    expect(btn.getAttribute('aria-disabled')).toBe('true');
  });

  it('drops the border on disabled (border-transparent + opacity-50)', () => {
    render(<SecondaryAction label="Retreat" disabled />);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('border-transparent');
    expect(btn.className).toContain('opacity-50');
    expect(btn.className).toContain('cursor-not-allowed');
  });

  it('keeps a visible border when enabled', () => {
    render(<SecondaryAction label="Retreat" />);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('border-[var(--border-default)]');
  });

  it('uses transparent fill (no accent background)', () => {
    render(<SecondaryAction label="Retreat" />);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('bg-transparent');
    expect(btn.className).not.toContain('accent-primary');
  });

  it('renders kbd hint inline when provided', () => {
    render(<SecondaryAction label="Retreat" kbd="[" />);
    expect(screen.getByRole('button').textContent).toContain('[');
  });

  it('renders leadingIcon and trailingIcon nodes', () => {
    render(
      <SecondaryAction
        label="Retreat"
        leadingIcon={<span data-testid="li">L</span>}
        trailingIcon={<span data-testid="ti">T</span>}
      />,
    );
    expect(screen.getByTestId('li')).toBeTruthy();
    expect(screen.getByTestId('ti')).toBeTruthy();
  });

  it('uses sans (font-ui) and label-size token', () => {
    render(<SecondaryAction label="Cancel" />);
    const btn = screen.getByRole('button');
    expect(btn.style.fontFamily).toContain('--font-ui');
    expect(btn.style.fontSize).toContain('--workstation-font-label');
  });
});
