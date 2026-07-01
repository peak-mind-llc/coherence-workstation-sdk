import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { HeadMap } from '../components/HeadMap';

describe('HeadMap', () => {
  it('renders a dot per requested electrode', () => {
    render(<HeadMap electrodes={['Fp1', 'Fp2', 'O1']} />);
    expect(screen.getAllByTestId(/^electrode-/)).toHaveLength(3);
    expect(screen.getByTestId('electrode-Fp1')).not.toBeNull();
  });

  it('renders all known positions when electrodes is omitted', () => {
    render(<HeadMap />);
    // 19 standard + 18 extended = 37 known positions.
    expect(screen.getAllByTestId(/^electrode-/).length).toBeGreaterThanOrEqual(37);
  });

  it('drops sites with no known position', () => {
    render(<HeadMap electrodes={['Fp1', 'NOT_A_SITE']} />);
    expect(screen.getAllByTestId(/^electrode-/)).toHaveLength(1);
    expect(screen.getByTestId('electrode-Fp1')).not.toBeNull();
  });

  it('marks highlighted sites', () => {
    render(<HeadMap electrodes={['Fp1', 'Fp2']} highlightedSites={['Fp1']} />);
    expect(screen.getByTestId('electrode-Fp1').getAttribute('data-highlighted')).toBe('true');
    expect(screen.getByTestId('electrode-Fp2').getAttribute('data-highlighted')).toBe('false');
  });

  it('calls onElectrodeClick with the site name when interactive', () => {
    const onClick = vi.fn();
    render(<HeadMap electrodes={['Fp1']} onElectrodeClick={onClick} />);
    fireEvent.click(screen.getByTestId('electrode-Fp1'));
    expect(onClick).toHaveBeenCalledWith('Fp1');
  });

  it('renders site labels by default and hides them when showLabels=false', () => {
    const { rerender } = render(<HeadMap electrodes={['Fp1']} />);
    expect(screen.queryByText('Fp1')).not.toBeNull();
    rerender(<HeadMap electrodes={['Fp1']} showLabels={false} />);
    expect(screen.queryByText('Fp1')).toBeNull();
  });

  it('renders per-site badges', () => {
    render(<HeadMap electrodes={['O1', 'O2']} badges={{ O1: '1', O2: '2' }} />);
    expect(screen.queryByText('1')).not.toBeNull();
    expect(screen.queryByText('2')).not.toBeNull();
  });
});
