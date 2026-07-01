import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, screen, cleanup } from '@testing-library/react';
import { CompareTogglePill } from '../toolbar/CompareTogglePill';

describe('<CompareTogglePill>', () => {
  it('renders Current and Compare buttons; highlights the active side', () => {
    cleanup();
    const { rerender } = render(
      <CompareTogglePill active={false} onChange={() => {}} />,
    );
    const current = screen.getByText('Current').closest('button')!;
    const compare = screen.getByText('Compare').closest('button')!;
    expect(current.className).toContain('accent');
    expect(compare.className).not.toContain('accent');

    rerender(<CompareTogglePill active onChange={() => {}} />);
    expect(screen.getByText('Compare').closest('button')!.className).toContain(
      'accent',
    );
  });

  it('invokes onChange with the next state on click', () => {
    cleanup();
    const onChange = vi.fn();
    render(<CompareTogglePill active={false} onChange={onChange} />);
    fireEvent.click(screen.getByText('Compare'));
    expect(onChange).toHaveBeenCalledWith(true);
    fireEvent.click(screen.getByText('Current'));
    expect(onChange).toHaveBeenCalledWith(false);
  });

  it('disables both sides and surfaces the disabledTooltip when disabled', () => {
    cleanup();
    const onChange = vi.fn();
    render(
      <CompareTogglePill
        active={false}
        onChange={onChange}
        disabled
        disabledTooltip="No prior recording"
      />,
    );
    const compare = screen.getByText('Compare').closest('button')!;
    expect(compare.getAttribute('aria-disabled')).toBe('true');
    expect(compare.getAttribute('title')).toBe('No prior recording');
    fireEvent.click(compare);
    expect(onChange).not.toHaveBeenCalled();
  });
});
