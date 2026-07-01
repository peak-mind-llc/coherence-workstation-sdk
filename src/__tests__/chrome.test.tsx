import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { wrapWithChrome } from '../chrome';

describe('wrapWithChrome', () => {
  function Inner() {
    return <div data-testid="inner">inner</div>;
  }

  it('renders descriptive content with no extra chrome', () => {
    const Wrapped = wrapWithChrome(Inner, {
      evidenceGrade: 'clinical',
      outputRegister: 'descriptive',
    });
    render(<Wrapped />);
    expect(screen.getByTestId('inner')).toBeDefined();
    expect(screen.queryByText(/research-grade/i)).toBeNull();
    expect(screen.queryByText(/interpretive/i)).toBeNull();
  });

  it('wraps research-grade content with research-grade chrome', () => {
    const Wrapped = wrapWithChrome(Inner, {
      evidenceGrade: 'research',
      outputRegister: 'descriptive',
    });
    render(<Wrapped />);
    expect(screen.getByText(/research-grade/i)).toBeDefined();
  });

  it('wraps inferential content with interpretive chrome', () => {
    const Wrapped = wrapWithChrome(Inner, {
      evidenceGrade: 'research',
      outputRegister: 'inferential',
    });
    render(<Wrapped />);
    expect(screen.getByText(/interpretive/i)).toBeDefined();
  });

  it('marks self-comparative content with comparative chrome', () => {
    const Wrapped = wrapWithChrome(Inner, {
      evidenceGrade: 'clinical',
      outputRegister: 'self-comparative',
    });
    render(<Wrapped />);
    expect(screen.getByText(/comparative/i)).toBeDefined();
  });
});
