import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setBusClientForTests, resetBusForTests, isBusWarmSettled, busIndexHas } from '../bus';
import { armBusIndexWatch, disarmBusIndexWatch } from '../busIndexWatch';

function makeClient(snapshots: Set<string>[]) {
  let i = 0;
  const invalidate = vi.fn();
  return {
    invalidate,
    readArtifact: () => null,
    fetchIndex: vi.fn(async () => snapshots[Math.min(i++, snapshots.length - 1)]),
  };
}

describe('busIndexWatch', () => {
  beforeEach(() => {
    resetBusForTests();
    vi.useFakeTimers();
  });
  afterEach(() => {
    disarmBusIndexWatch();
    vi.useRealTimers();
  });

  it('invalidates when the index changes and publishes the snapshot', async () => {
    const client = makeClient([new Set(['a']), new Set(['a', 'b'])]);
    setBusClientForTests(client);
    armBusIndexWatch();

    await vi.advanceTimersByTimeAsync(1); // first poll (t=0)
    expect(busIndexHas('a')).toBe(true);
    expect(client.invalidate).toHaveBeenCalledTimes(1); // first snapshot = change

    await vi.advanceTimersByTimeAsync(2000); // second poll — set grew
    expect(busIndexHas('b')).toBe(true);
    expect(client.invalidate).toHaveBeenCalledTimes(2);
  });

  it('marks the warm settled after ~60s of unchanged polls and stops polling', async () => {
    const client = makeClient([new Set(['a'])]); // same set every poll
    setBusClientForTests(client);
    armBusIndexWatch();

    await vi.advanceTimersByTimeAsync(1); // poll 1 (change vs null)
    expect(isBusWarmSettled()).toBe(false);

    // Still well within the settle window — proves it really widened past the
    // old 6s (3-poll) behavior, which would have settled by now.
    await vi.advanceTimersByTimeAsync(40 * 1000);
    expect(isBusWarmSettled()).toBe(false);

    // Past the full ~60s window → settled.
    await vi.advanceTimersByTimeAsync(30 * 1000);
    expect(isBusWarmSettled()).toBe(true);

    const callsAfterSettle = client.fetchIndex.mock.calls.length;
    await vi.advanceTimersByTimeAsync(10 * 1000);
    expect(client.fetchIndex.mock.calls.length).toBe(callsAfterSettle); // stopped
  });

  it('settles and stops polling when the index endpoint is permanently down', async () => {
    const fetchIndex = vi.fn(async () => {
      throw new Error('backend down');
    });
    const client = { invalidate: vi.fn(), readArtifact: () => null, fetchIndex };
    setBusClientForTests(client);
    armBusIndexWatch();

    // Run past the backstop cap (WATCH_MAX_MS = 8 min) — every poll rejects.
    await vi.advanceTimersByTimeAsync(8 * 60 * 1000 + 2000);
    expect(isBusWarmSettled()).toBe(true); // backstop settled it despite throws

    const callsAfterSettle = fetchIndex.mock.calls.length;
    await vi.advanceTimersByTimeAsync(10000);
    expect(fetchIndex.mock.calls.length).toBe(callsAfterSettle); // polling stopped
  });

  it('a stale in-flight poll does not clobber state after disarm', async () => {
    let resolveFetch: (s: Set<string>) => void = () => {};
    const fetchIndex = vi.fn(
      () => new Promise<Set<string>>((res) => { resolveFetch = res; }),
    );
    const client = { invalidate: vi.fn(), readArtifact: () => null, fetchIndex };
    setBusClientForTests(client);
    armBusIndexWatch();
    await vi.advanceTimersByTimeAsync(1); // poll started, awaiting fetchIndex

    disarmBusIndexWatch();
    expect(isBusWarmSettled()).toBe(true); // disarm returned to at-rest

    resolveFetch(new Set(['a'])); // the stale continuation now runs
    await Promise.resolve();
    await Promise.resolve();
    expect(isBusWarmSettled()).toBe(true); // not flipped back to active
    expect(busIndexHas('a')).toBe(false); // stale snapshot was not published
  });
});
