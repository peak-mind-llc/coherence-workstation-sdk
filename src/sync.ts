/**
 * Sync-bus injection point — gives plugin renderers cursor read/emit access.
 *
 * Workstation panes share a typed-axis pub/sub bus (the synchronizer in
 * desktop/src/lib/workstation/core/synchronizer.ts). Plugins can't import
 * from desktop directly — that would violate the dual-mode boundary — so
 * the SDK exposes a slim interface and a setter, mirroring the bus client
 * pattern in ./bus.ts.
 *
 * At workstation startup, desktop calls setSyncBus(adapter) once with an
 * adapter over the real synchronizer. From then on, plugin renderers use
 * useSyncValue / getSyncBus to read and emit cursor values.
 *
 * Tests inject a mock via setSyncBusForTests; resetSyncBusForTests clears it.
 */

import { useEffect, useState } from 'react';

export interface SyncBus {
  /**
   * Subscribe to value changes on (group, axis). The listener fires
   * whenever a *different* pane emits. Return value is an unsubscribe.
   * `paneId` lets the bus skip echoing the listener's own emits.
   */
  subscribe(
    group: string,
    axis: string,
    fn: (value: number) => void,
    paneId?: string,
  ): () => void;

  /** Emit a value on (group, axis) tagged with the source pane id. */
  emit(group: string, axis: string, value: number, sourceId: string): void;

  /** Last emitted value on (group, axis), or undefined if nothing yet. */
  getValue(group: string, axis: string): number | undefined;
}

let _sync: SyncBus | null = null;

/** Production setter. Desktop calls this once at workstation bootstrap. */
export function setSyncBus(bus: SyncBus): void {
  _sync = bus;
}

/** Get the current sync bus, or null if none configured. */
export function getSyncBus(): SyncBus | null {
  return _sync;
}

/** Test helper. */
export function setSyncBusForTests(bus: SyncBus): void {
  _sync = bus;
}

/** Test helper. */
export function resetSyncBusForTests(): void {
  _sync = null;
}

/**
 * React hook: subscribe to (group, axis) and return the current value.
 * Re-renders when the value changes. Returns undefined if no value has
 * been emitted yet, or if no sync bus is configured.
 *
 * @param paneId optional pane id; the hook will not be re-fired by the
 *   pane's own emits.
 */
export function useSyncValue(
  group: string,
  axis: string,
  paneId?: string,
): number | undefined {
  const [value, setValue] = useState<number | undefined>(() =>
    _sync?.getValue(group, axis),
  );

  useEffect(() => {
    const bus = _sync;
    if (!bus) return;
    // Seed from the bus in case it was set after the initial useState.
    setValue(bus.getValue(group, axis));
    return bus.subscribe(group, axis, (v) => setValue(v), paneId);
  }, [group, axis, paneId]);

  return value;
}
