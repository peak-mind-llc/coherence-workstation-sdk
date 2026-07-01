import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { useRef } from 'react';
import { useClickOutsideRef } from '../toolbar/useClickOutsideRef';

function Probe({ onOutside }: { onOutside: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useClickOutsideRef(ref, onOutside);
  return (
    <div>
      <div ref={ref} data-testid="inside">inside</div>
      <div data-testid="outside">outside</div>
    </div>
  );
}

describe('useClickOutsideRef', () => {
  it('does not fire on mousedown inside the ref', () => {
    const handler = vi.fn();
    const { getByTestId } = render(<Probe onOutside={handler} />);
    fireEvent.mouseDown(getByTestId('inside'));
    expect(handler).not.toHaveBeenCalled();
  });

  it('fires on mousedown outside the ref', () => {
    const handler = vi.fn();
    const { getByTestId } = render(<Probe onOutside={handler} />);
    fireEvent.mouseDown(getByTestId('outside'));
    expect(handler).toHaveBeenCalledTimes(1);
  });
});
