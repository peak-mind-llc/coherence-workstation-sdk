import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/react';
import { PrimaryAction } from '../actions/PrimaryAction';

describe('<PrimaryAction>', () => {
  it('renders the label', () => {
    render(<PrimaryAction label="Lock + advance" />);
    expect(screen.getByRole('button', { name: /Lock \+ advance/ })).toBeTruthy();
  });

  it('fires onClick when clicked', () => {
    const onClick = vi.fn();
    render(<PrimaryAction label="Save" onClick={onClick} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('does not fire onClick when disabled', () => {
    const onClick = vi.fn();
    render(<PrimaryAction label="Save" onClick={onClick} disabled />);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('marks disabled state via aria-disabled and the disabled attribute', () => {
    render(<PrimaryAction label="Save" disabled />);
    const btn = screen.getByRole('button');
    expect(btn.hasAttribute('disabled')).toBe(true);
    expect(btn.getAttribute('aria-disabled')).toBe('true');
  });

  it('drops the border on disabled (border-transparent + opacity-50)', () => {
    render(<PrimaryAction label="Save" disabled />);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('border-transparent');
    expect(btn.className).toContain('opacity-50');
    expect(btn.className).toContain('cursor-not-allowed');
  });

  it('renders kbd hint inline when provided', () => {
    render(<PrimaryAction label="Lock + advance" kbd="]" />);
    expect(screen.getByRole('button').textContent).toContain(']');
  });

  it('does not render kbd region when omitted', () => {
    render(<PrimaryAction label="Save" />);
    const btn = screen.getByRole('button');
    expect(btn.querySelector('span.ml-1')).toBeNull();
  });

  it('renders leadingIcon and trailingIcon nodes', () => {
    render(
      <PrimaryAction
        label="Lock + advance"
        leadingIcon={<span data-testid="li">L</span>}
        trailingIcon={<span data-testid="ti">T</span>}
      />,
    );
    expect(screen.getByTestId('li')).toBeTruthy();
    expect(screen.getByTestId('ti')).toBeTruthy();
  });

  it('uses sans (font-ui) and label-size token', () => {
    render(<PrimaryAction label="Save" />);
    const btn = screen.getByRole('button');
    expect(btn.style.fontFamily).toContain('--font-ui');
    expect(btn.style.fontSize).toContain('--workstation-font-label');
  });

  it('honors type="submit"', () => {
    render(<PrimaryAction label="Submit" type="submit" />);
    expect(screen.getByRole('button').getAttribute('type')).toBe('submit');
  });
});
