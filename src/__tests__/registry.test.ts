import { describe, it, expect, beforeEach } from 'vitest';
import {
  registerPlugin,
  getRegisteredPlugins,
  resetRegistryForTests,
  type PluginRegistration,
} from '../registry';

describe('plugin registry', () => {
  beforeEach(() => {
    resetRegistryForTests();
  });

  it('registers a plugin and exposes it via getRegisteredPlugins', () => {
    const reg: PluginRegistration = {
      name: 'fooof',
      consumes: ['fooof.per_channel'],
      renderers: [],
      evidenceGrade: 'research',
      outputRegister: 'descriptive',
    };
    registerPlugin(reg);
    const plugins = getRegisteredPlugins();
    expect(plugins).toHaveLength(1);
    expect(plugins[0].name).toBe('fooof');
  });

  it('rejects duplicate plugin registration', () => {
    const reg: PluginRegistration = {
      name: 'fooof',
      consumes: [],
      renderers: [],
      evidenceGrade: 'research',
      outputRegister: 'descriptive',
    };
    registerPlugin(reg);
    expect(() => registerPlugin(reg)).toThrow(/already registered/);
  });

  it('rejects registration with empty name', () => {
    expect(() =>
      registerPlugin({
        name: '',
        consumes: [],
        renderers: [],
        evidenceGrade: 'research',
        outputRegister: 'descriptive',
      }),
    ).toThrow(/name/);
  });

  it('registers a plugin with analytical kinds', () => {
    registerPlugin({
      name: 'fooof',
      consumes: ['fooof.per_channel'],
      renderers: [],
      evidenceGrade: 'research',
      outputRegister: 'descriptive',
      kinds: [
        { id: 'spectral', label: 'Spectral parameterization', order: 100 },
      ],
    });
    const plugins = getRegisteredPlugins();
    expect(plugins[0].kinds).toHaveLength(1);
    expect(plugins[0].kinds![0].id).toBe('spectral');
  });

  it('registers a plugin without kinds (legacy: kinds defaults to empty)', () => {
    registerPlugin({
      name: 'legacy',
      consumes: [],
      renderers: [],
      evidenceGrade: 'research',
      outputRegister: 'descriptive',
    });
    const plugins = getRegisteredPlugins();
    expect(plugins[0].kinds ?? []).toEqual([]);
  });

  it('registers renderers carrying kindId + order + grid hints', () => {
    const Stub = () => null;
    registerPlugin({
      name: 'fooof',
      consumes: ['fooof.per_channel'],
      renderers: [
        {
          slot: 'phase7.spectral.aperiodic-topomap',
          component: Stub,
          kindId: 'spectral',
          order: 1,
          rowSpan: 1,
          colSpan: 12,
        },
      ],
      evidenceGrade: 'research',
      outputRegister: 'descriptive',
      kinds: [{ id: 'spectral', label: 'Spectral parameterization' }],
    });
    const plugins = getRegisteredPlugins();
    const renderer = plugins[0].renderers[0];
    expect(renderer.kindId).toBe('spectral');
    expect(renderer.order).toBe(1);
    expect(renderer.rowSpan).toBe(1);
    expect(renderer.colSpan).toBe(12);
  });
});
