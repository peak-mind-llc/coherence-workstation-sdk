import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Tooltip } from '../tooltip';

describe('<Tooltip>', () => {
  it('hides the popover by default', () => {
    render(
      <Tooltip content="hello">
        <span tabIndex={0}>trigger</span>
      </Tooltip>,
    );
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('shows on mouseenter and hides on mouseleave', () => {
    render(
      <Tooltip content="hello">
        <span data-testid="trigger" tabIndex={0}>
          trigger
        </span>
      </Tooltip>,
    );
    const wrapper = screen.getByTestId('trigger').parentElement!;
    fireEvent.mouseEnter(wrapper);
    expect(screen.getByRole('tooltip').textContent).toBe('hello');
    fireEvent.mouseLeave(wrapper);
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('shows on focus and hides on blur (keyboard path)', () => {
    render(
      <Tooltip content="kb-hello">
        <span data-testid="trigger" tabIndex={0}>
          trigger
        </span>
      </Tooltip>,
    );
    const wrapper = screen.getByTestId('trigger').parentElement!;
    fireEvent.focus(wrapper);
    expect(screen.getByRole('tooltip').textContent).toBe('kb-hello');
    fireEvent.blur(wrapper);
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('dismisses when Escape is pressed', () => {
    render(
      <Tooltip content="esc-hello">
        <span data-testid="trigger" tabIndex={0}>
          trigger
        </span>
      </Tooltip>,
    );
    const wrapper = screen.getByTestId('trigger').parentElement!;
    fireEvent.focus(wrapper);
    expect(screen.getByRole('tooltip')).not.toBeNull();
    fireEvent.keyDown(wrapper, { key: 'Escape' });
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('wires aria-describedby to the popover when open', () => {
    render(
      <Tooltip content="aria-hello">
        <span data-testid="trigger" tabIndex={0}>
          trigger
        </span>
      </Tooltip>,
    );
    const wrapper = screen.getByTestId('trigger').parentElement!;
    fireEvent.mouseEnter(wrapper);
    const tip = screen.getByRole('tooltip');
    expect(wrapper.getAttribute('aria-describedby')).toBe(tip.id);
  });

  it('renders ReactNode content', () => {
    render(
      <Tooltip
        content={
          <div>
            <strong>bold</strong> rich
          </div>
        }
      >
        <span data-testid="trigger" tabIndex={0}>
          trigger
        </span>
      </Tooltip>,
    );
    fireEvent.mouseEnter(screen.getByTestId('trigger').parentElement!);
    const tip = screen.getByRole('tooltip');
    expect(tip.querySelector('strong')?.textContent).toBe('bold');
  });
});
