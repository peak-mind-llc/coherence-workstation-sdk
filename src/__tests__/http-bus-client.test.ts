import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HttpBusClient } from '../bus';

describe('HttpBusClient', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('reads an artifact via HTTP GET', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        provenance: {
          producer: 'test', producer_version: '0.0.0', produced_at: '2026-05-01T00:00:00Z',
          evidence_grade: 'research', output_register: 'descriptive',
          consumed_from: [], parameters_hash: '0'.repeat(64),
        },
        data: { channel_names: ['Cz'] },
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const client = new HttpBusClient({ baseUrl: 'http://localhost:9147', sessionId: 's1' });
    const artifact = await client.readArtifactAsync<{ channel_names: string[] }>('psd.welch.per_channel');
    expect(artifact?.data.channel_names).toEqual(['Cz']);
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:9147/api/bus/s1/psd.welch.per_channel',
      expect.any(Object),
    );
  });

  it('returns null on 404', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }));
    const client = new HttpBusClient({ baseUrl: 'http://localhost:9147', sessionId: 's1' });
    const artifact = await client.readArtifactAsync('not.present');
    expect(artifact).toBeNull();
  });

  it('throws on non-404 errors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }));
    const client = new HttpBusClient({ baseUrl: 'http://localhost:9147', sessionId: 's1' });
    await expect(client.readArtifactAsync('x')).rejects.toThrow(/500/);
  });

  it('prefetched artifact is available via sync readArtifact', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        provenance: {
          producer: 'test', producer_version: '0.0.0', produced_at: '2026-05-01T00:00:00Z',
          evidence_grade: 'research', output_register: 'descriptive',
          consumed_from: [], parameters_hash: '0'.repeat(64),
        },
        data: { value: 1 },
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const client = new HttpBusClient({ baseUrl: 'http://localhost:9147', sessionId: 's1' });
    expect(client.readArtifact('foo')).toBeNull();
    await client.prefetch('foo');
    const artifact = client.readArtifact<{ value: number }>('foo');
    expect(artifact?.data.value).toBe(1);
  });
});
