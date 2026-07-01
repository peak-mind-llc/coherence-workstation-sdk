import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act, render, renderHook } from '@testing-library/react';
import {
  getSyncBus,
  resetSyncBusForTests,
  setSyncBusForTests,
  useSyncValue,
  type SyncBus,
} from '../sync';

function makeMockBus(): SyncBus {
  const listeners = new Map<string, Set<(v: number) => void>>();
  const last = new Map<string, number>();
  const key = (g: string, a: string) => `${g}::${a}`;
  return {
    subscribe(group, axis, fn) {
      const k = key(group, axis);
      const set = listeners.get(k) ?? new Set();
      listeners.set(k, set);
      set.add(fn);
      return () => set.delete(fn);
    },
    emit(group, axis, value) {
      const k = key(group, axis);
      last.set(k, value);
      listeners.get(k)?.forEach((fn) => fn(value));
    },
    getValue(group, axis) {
      return last.get(key(group, axis));
    },
  };
}

describe('sync bus', () => {
  beforeEach(() => {
    resetSyncBusForTests();
  });

  it('returns null until configured', () => {
    expect(getSyncBus()).toBeNull();
  });

  it('useSyncValue returns undefined when no bus is set', () => {
    const { result } = renderHook(() => useSyncValue('g', 'session-time'));
    expect(result.current).toBeUndefined();
  });

  it('useSyncValue seeds from the bus', () => {
    const bus = makeMockBus();
    bus.emit('g', 'session-time', 12.5, 'someone-else');
    setSyncBusForTests(bus);

    const { result } = renderHook(() => useSyncValue('g', 'session-time'));
    expect(result.current).toBe(12.5);
  });

  it('useSyncValue updates on subsequent emits', () => {
    const bus = makeMockBus();
    setSyncBusForTests(bus);

    const { result } = renderHook(() => useSyncValue('g', 'session-time', 'pane-a'));
    expect(result.current).toBeUndefined();

    act(() => bus.emit('g', 'session-time', 3.14, 'pane-b'));
    expect(result.current).toBe(3.14);

    act(() => bus.emit('g', 'session-time', 6.28, 'pane-b'));
    expect(result.current).toBe(6.28);
  });

  it('emit goes through the configured bus', () => {
    const emit = vi.fn();
    setSyncBusForTests({
      subscribe: () => () => undefined,
      emit,
      getValue: () => undefined,
    });
    getSyncBus()!.emit('g', 'session-time', 1.0, 'pane-a');
    expect(emit).toHaveBeenCalledWith('g', 'session-time', 1.0, 'pane-a');
  });

  it('unsubscribes on unmount', () => {
    const unsubscribe = vi.fn();
    setSyncBusForTests({
      subscribe: () => unsubscribe,
      emit: () => undefined,
      getValue: () => undefined,
    });

    function Probe() {
      useSyncValue('g', 'session-time');
      return null;
    }
    const { unmount } = render(<Probe />);
    unmount();
    expect(unsubscribe).toHaveBeenCalled();
  });
});
