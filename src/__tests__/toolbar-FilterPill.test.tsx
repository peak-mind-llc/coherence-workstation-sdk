import { describe, it, expect } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/react';
import { FilterPill } from '../toolbar/FilterPill';

describe('<FilterPill>', () => {
  it('renders the trigger label and is closed by default', () => {
    render(
      <FilterPill label="0.5–45 Hz" title="filters">
        <div data-testid="popover-body">body</div>
      </FilterPill>,
    );
    expect(screen.getByText('0.5–45 Hz')).not.toBeNull();
    expect(screen.queryByTestId('popover-body')).toBeNull();
  });

  it('opens the popover on trigger click and shows children', () => {
    render(
      <FilterPill label="0.5–45 Hz" title="filters">
        <div data-testid="popover-body">body</div>
      </FilterPill>,
    );
    fireEvent.click(screen.getByText('0.5–45 Hz'));
    expect(screen.getByTestId('popover-body')).not.toBeNull();
  });

  it('closes the popover on click-outside (mousedown on document)', () => {
    render(
      <div>
        <FilterPill label="x" title="t">
          <div data-testid="popover-body">body</div>
        </FilterPill>
        <div data-testid="outside">outside</div>
      </div>,
    );
    fireEvent.click(screen.getByText('x'));
    expect(screen.getByTestId('popover-body')).not.toBeNull();
    fireEvent.mouseDown(screen.getByTestId('outside'));
    expect(screen.queryByTestId('popover-body')).toBeNull();
  });

  it('renders a modifier dot when modifierActive is true', () => {
    const { container } = render(
      <FilterPill
        label="x"
        title="t"
        iconLeft={<span data-testid="icon">I</span>}
        modifierActive
      >
        <div>body</div>
      </FilterPill>,
    );
    expect(
      container.querySelector('.bg-\\[var\\(--status-warning\\)\\]'),
    ).not.toBeNull();
  });

  it('renders a leading icon when iconLeft is provided', () => {
    render(
      <FilterPill
        label="x"
        title="t"
        iconLeft={<span data-testid="icon">I</span>}
      >
        <div>body</div>
      </FilterPill>,
    );
    expect(screen.getByTestId('icon')).not.toBeNull();
  });
});
