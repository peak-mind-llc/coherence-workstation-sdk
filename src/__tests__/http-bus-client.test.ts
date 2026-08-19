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

  it('fetchIndex returns the set of artifact-type keys', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        latest: {
          'psd.welch.per_channel.resting_ec': 'abc',
          'normative.report.resting_ec': 'def',
        },
      }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const client = new HttpBusClient({ baseUrl: 'http://localhost:9147', sessionId: 's1' });
    const index = await client.fetchIndex();
    expect(index.types).toEqual(
      new Set(['psd.welch.per_channel.resting_ec', 'normative.report.resting_ec']),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:9147/api/bus/s1/index',
      expect.any(Object),
    );
  });

  it('fetchIndex reports whether a warm is still in flight', async () => {
    const withWarming = (warming: unknown) =>
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ latest: { 'psd.welch.per_channel': 'abc' }, warming }),
      });
    const client = new HttpBusClient({ baseUrl: 'http://localhost:9147', sessionId: 's1' });

    vi.stubGlobal('fetch', withWarming(true));
    expect((await client.fetchIndex()).warming).toBe(true);

    vi.stubGlobal('fetch', withWarming(false));
    expect((await client.fetchIndex()).warming).toBe(false);

    // A backend that predates the field says nothing about warm state — the
    // watcher must fall back to its stability heuristic, not assume "idle".
    vi.stubGlobal('fetch', withWarming(undefined));
    expect((await client.fetchIndex()).warming).toBeNull();
  });

  it('fetchIndex returns an empty set when the index is missing', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }));
    const client = new HttpBusClient({ baseUrl: 'http://localhost:9147', sessionId: 's1' });
    expect((await client.fetchIndex()).types).toEqual(new Set());
  });

  const _env = (data: unknown) => ({
    provenance: {
      producer: 'test', producer_version: '0.0.0', produced_at: '2026-05-01T00:00:00Z',
      evidence_grade: 'research', output_register: 'descriptive',
      consumed_from: [], parameters_hash: '0'.repeat(64),
    },
    data,
  });

  it('coalesces concurrent identical reads into a single GET', async () => {
    let resolveFetch: (v: unknown) => void = () => {};
    const fetchMock = vi.fn().mockImplementation(
      () => new Promise((res) => { resolveFetch = res; }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const client = new HttpBusClient({ baseUrl: 'http://localhost:9147', sessionId: 's1' });
    const p1 = client.readArtifactAsync('psd.welch.per_channel');
    const p2 = client.readArtifactAsync('psd.welch.per_channel');

    expect(fetchMock).toHaveBeenCalledTimes(1);

    resolveFetch({ ok: true, status: 200, json: async () => _env({ v: 1 }) });
    const [a1, a2] = await Promise.all([p1, p2]);
    expect(a1).toBe(a2);
    expect((a1 as { data: { v: number } }).data.v).toBe(1);
  });

  it('does not coalesce distinct artifact types', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => _env({}) });
    vi.stubGlobal('fetch', fetchMock);
    const client = new HttpBusClient({ baseUrl: 'http://localhost:9147', sessionId: 's1' });
    await Promise.all([client.readArtifactAsync('a'), client.readArtifactAsync('b')]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('issues a fresh GET after the in-flight request settles', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => _env({}) });
    vi.stubGlobal('fetch', fetchMock);
    const client = new HttpBusClient({ baseUrl: 'http://localhost:9147', sessionId: 's1' });
    await client.readArtifactAsync('a');
    await client.readArtifactAsync('a');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('invalidate() clears in-flight so post-invalidate reads do not join a stale request', async () => {
    const resolvers: Array<(v: unknown) => void> = [];
    const fetchMock = vi.fn().mockImplementation(
      () => new Promise((res) => { resolvers.push(res); }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const client = new HttpBusClient({ baseUrl: 'http://localhost:9147', sessionId: 's1' });
    const p1 = client.readArtifactAsync('a');
    client.invalidate();
    const p2 = client.readArtifactAsync('a');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    resolvers.forEach(res => res({ ok: true, status: 200, json: async () => _env({}) }));
    await Promise.all([p1, p2]);
  });

  it('identity-guards in-flight delete so a settled old request does not evict a new entry', async () => {
    const resolvers: Array<(v: unknown) => void> = [];
    const fetchMock = vi.fn().mockImplementation(
      () => new Promise((res) => { resolvers.push(res); }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const client = new HttpBusClient({ baseUrl: 'http://localhost:9147', sessionId: 's1' });

    // Fetch #1 pending
    const p1 = client.readArtifactAsync('x');
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Invalidate clears the inflight map, but p1's .finally is still chained
    client.invalidate();

    // Fetch #2 pending (fresh entry in the now-empty inflight map)
    const p2 = client.readArtifactAsync('x');
    expect(fetchMock).toHaveBeenCalledTimes(2);

    // Resolve fetch #1 synchronously (its .finally will queue a microtask)
    resolvers[0]({ ok: true, status: 200, json: async () => _env({}) });

    // Await p1 to guarantee its .finally has run before the 3rd read
    await p1;

    // Read 'x' again — with the identity guard, this should join p2, not fetch again
    const p3 = client.readArtifactAsync('x');
    expect(fetchMock).toHaveBeenCalledTimes(2); // MUST still be 2, not 3

    // Resolve fetch #2 and wait
    resolvers[1]({ ok: true, status: 200, json: async () => _env({}) });
    await Promise.all([p1, p2, p3]);
  });
});
