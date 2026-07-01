import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  registerPlugin,
  resetRegistryForTests,
  useBusArtifact,
  setBusClientForTests,
  resetBusForTests,
  useActiveLayers,
  setActiveLayersForTests,
  resetActiveLayersForTests,
  wrapWithChrome,
} from '../index';

describe('SDK smoke test', () => {
  beforeEach(() => {
    resetRegistryForTests();
    resetBusForTests();
    resetActiveLayersForTests();
  });

  it('registers a plugin, mounts its renderer, reads from bus, applies chrome', () => {
    setActiveLayersForTests(new Set([0, 1, 2]));
    setBusClientForTests({
      readArtifact: (type) =>
        type === 'fooof.per_channel'
          ? {
              provenance: {
                producer: 'fooof@0.1.0',
                producer_version: '0.1.0',
                produced_at: '2026-05-01T00:00:00Z',
                evidence_grade: 'research',
                output_register: 'descriptive',
                consumed_from: ['psd.welch.per_channel@abc123'],
                parameters_hash: '0'.repeat(64),
              },
              data: { per_channel: [{ channel: 'Cz' }] },
            }
          : null,
    });

    function AperiodicTopomap() {
      const { isVisible } = useActiveLayers([1, 2]);
      const fooof = useBusArtifact<{ per_channel: { channel: string }[] }>('fooof.per_channel');
      if (!isVisible) return null;
      if (!fooof) return <div>loading</div>;
      return <div data-testid="topomap">{fooof.data.per_channel.length} channels</div>;
    }

    const Wrapped = wrapWithChrome(AperiodicTopomap, {
      evidenceGrade: 'research',
      outputRegister: 'descriptive',
    });

    registerPlugin({
      name: 'fooof',
      consumes: ['fooof.per_channel'],
      renderers: [
        {
          slot: 'phase7.spectral.aperiodic-topomap',
          component: Wrapped,
          kindId: 'spectral',
        },
      ],
      evidenceGrade: 'research',
      outputRegister: 'descriptive',
    });

    render(<Wrapped />);
    expect(screen.getByTestId('topomap').textContent).toBe('1 channels');
    expect(screen.getByText(/research-grade/i)).toBeDefined();
  });
});
