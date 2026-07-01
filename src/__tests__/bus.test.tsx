import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import {
  useBusArtifact,
  setBusClient,
  setBusClientForTests,
  setBusFetchGate,
  resetBusForTests,
  type BusArtifact,
} from '../bus';

describe('useBusArtifact', () => {
  beforeEach(() => {
    resetBusForTests();
  });

  it('returns null when no bus client is configured', () => {
    const { result } = renderHook(() => useBusArtifact('fooof.per_channel'));
    expect(result.current).toBeNull();
  });

  it('returns the artifact when the bus client has it', () => {
    setBusClientForTests({
      readArtifact: <T,>(type: string): BusArtifact<T> | null =>
        type === 'fooof.per_channel'
          ? ({
              provenance: {
                producer: 'mock',
                producer_version: '0.0.0',
                produced_at: '2026-05-01T00:00:00Z',
                evidence_grade: 'research',
                output_register: 'descriptive',
                consumed_from: [],
                parameters_hash: '0'.repeat(64),
              },
              data: { per_channel: [] } as unknown as T,
            } satisfies BusArtifact<T>)
          : null,
    });
    const { result } = renderHook(() => useBusArtifact('fooof.per_channel'));
    expect(result.current?.provenance.producer).toBe('mock');
  });
});

describe('setBusClient (production)', () => {
  beforeEach(() => {
    resetBusForTests();
  });

  it('sets the global bus client used by useBusArtifact', () => {
    const stub = {
      readArtifact: (type: string) =>
        type === 'foo'
          ? {
              provenance: {
                producer: 'p',
                producer_version: '1',
                produced_at: 'x',
                evidence_grade: 'research',
                output_register: 'descriptive',
                consumed_from: [],
                parameters_hash: '0',
              },
              data: { value: 1 },
            }
          : null,
    };
    setBusClient(stub);
    const { result } = renderHook(() =>
      useBusArtifact<{ value: number }>('foo'),
    );
    expect(result.current?.data.value).toBe(1);
  });
});

describe('useBusArtifact async fetch resilience', () => {
  beforeEach(() => {
    resetBusForTests();
  });

  const artifact = (value: number): BusArtifact<{ value: number }> => ({
    provenance: {
      producer: 'mock',
      producer_version: '0.0.0',
      produced_at: '2026-06-04T00:00:00Z',
      evidence_grade: 'research',
      output_register: 'descriptive',
      consumed_from: [],
      parameters_hash: '0'.repeat(64),
    },
    data: { value },
  });

  it('retries a transient fetch failure and recovers without a reload', async () => {
    // Simulates the backend being briefly unreachable (mid-restart / busy
    // warming) when a late artifact like normative.report is first fetched.
    let calls = 0;
    setBusClientForTests({
      // Always a sync-cache miss so the async path runs.
      readArtifact: () => null,
      readArtifactAsync: async <T,>() => {
        calls += 1;
        if (calls < 3) throw new Error('backend unreachable');
        return artifact(42) as unknown as BusArtifact<T>;
      },
    });
    const { result } = renderHook(() =>
      useBusArtifact<{ value: number }>('normative.report.resting_eo'),
    );
    await waitFor(() => expect(result.current?.data.value).toBe(42), {
      timeout: 4000,
    });
    expect(calls).toBeGreaterThanOrEqual(3);
  });

  it('polls a not-yet-emitted (404) artifact and renders it once it lands', async () => {
    // During an active warm a 404 means "this producer hasn't emitted yet"
    // (norms land late; the second resting condition's norms land only after
    // the first condition's whole sweep — the EC head-map blank). The hook
    // polls the 404 and picks the artifact up when it lands, no reload.
    let calls = 0;
    setBusClientForTests({
      readArtifact: () => null,
      readArtifactAsync: async <T,>() => {
        calls += 1;
        if (calls < 3) return null; // 404 — not emitted yet
        return artifact(7) as unknown as BusArtifact<T>;
      },
    });
    const { result } = renderHook(() =>
      useBusArtifact<{ value: number }>('normative.report.resting_ec'),
    );
    await waitFor(() => expect(result.current?.data.value).toBe(7), {
      timeout: 4000,
    });
    expect(calls).toBeGreaterThanOrEqual(3); // it re-polled the 404s
  });
});

describe('useBusArtifact fetch gate (sign-off gating)', () => {
  beforeEach(() => {
    resetBusForTests();
  });

  const artifact = (value: number): BusArtifact<{ value: number }> => ({
    provenance: {
      producer: 'mock',
      producer_version: '0.0.0',
      produced_at: '2026-06-05T00:00:00Z',
      evidence_grade: 'research',
      output_register: 'inferential',
      consumed_from: [],
      parameters_hash: '0'.repeat(64),
    },
    data: { value },
  });

  it('does not fetch or poll a gated artifact', async () => {
    // Cold read: analysis artifacts are gated because the warm hasn't emitted
    // them (no sign-off). The hook must NOT run the 404-poll — that's the
    // console/network flood we're fixing.
    let calls = 0;
    setBusFetchGate((name) => name.startsWith('normative.'));
    setBusClientForTests({
      readArtifact: () => null,
      readArtifactAsync: async () => {
        calls += 1;
        return null;
      },
    });
    const { result } = renderHook(() =>
      useBusArtifact('normative.report.resting_ec'),
    );
    await new Promise((r) => setTimeout(r, 60));
    expect(result.current).toBeNull();
    expect(calls).toBe(0); // gated → the 404-poll never runs
  });

  it('still fetches a non-gated artifact while the gate is active', async () => {
    // signal.raw / ica.* are cold-read inputs — available before sign-off, so
    // the gate must not suppress them.
    let calls = 0;
    setBusFetchGate((name) => name.startsWith('normative.'));
    setBusClientForTests({
      readArtifact: () => null,
      readArtifactAsync: async <T,>() => {
        calls += 1;
        return artifact(5) as unknown as BusArtifact<T>;
      },
    });
    const { result } = renderHook(() =>
      useBusArtifact<{ value: number }>('signal.raw'),
    );
    await waitFor(() => expect(result.current?.data.value).toBe(5));
    expect(calls).toBeGreaterThanOrEqual(1);
  });

  it('fetches a previously-gated artifact once the gate lifts (sign-off)', async () => {
    let calls = 0;
    setBusFetchGate(() => true); // everything gated (cold read)
    setBusClientForTests({
      readArtifact: () => null,
      readArtifactAsync: async <T,>() => {
        calls += 1;
        return artifact(9) as unknown as BusArtifact<T>;
      },
    });
    const { result } = renderHook(() =>
      useBusArtifact<{ value: number }>('normative.report'),
    );
    await new Promise((r) => setTimeout(r, 40));
    expect(calls).toBe(0); // gated while not signed off

    act(() => {
      setBusFetchGate(null); // sign-off lifts the gate
    });
    await waitFor(() => expect(result.current?.data.value).toBe(9));
    expect(calls).toBeGreaterThanOrEqual(1);
  });
});
