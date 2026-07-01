/**
 * Sub-focus bus + plugin hook — the SDK-side surface for the workstation
 * mode's per-pane sub-selection (the channels / bands / sub-items a
 * clinician picks before pressing F to mark a finding).
 *
 * Mirrors the sync-bus pattern in ./sync.ts:
 *   - Desktop calls setSubFocusBus(adapter) once at workstation bootstrap
 *     with closures over WorkstationContext's subFocus state.
 *   - Plugin renderers consume useSubSelect({ paneId, items }) — the hook
 *     reads the current state, returns a click handler that does the
 *     right Shift / Cmd / plain semantics, and installs the keyboard
 *     sub-select dispatcher (arrows / Space / Enter / Esc) when the
 *     plugin's pane is the active sub-select target.
 *
 * Plugins can't import from desktop directly — this is the only path.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

export interface SubFocusItem {
  paneId: string;
  /** Sub-item identifier (channel / band name). Omit for whole-pane
   *  fragments — used by the cross-pane compose Shift-click on bare
   *  pane chrome. */
  channel?: string;
}

export interface SubFocusSnapshot {
  /** All sub-focused items across all panes. */
  items: readonly SubFocusItem[];
  /** The pane in keyboard sub-select mode, if any. */
  subSelectPaneId: string | null;
  /** The currently focused pane, if any. */
  focusedPaneId: string | null;
}

export interface SubFocusBus {
  /** Subscribe to changes; returns an unsubscribe. */
  subscribe(listener: () => void): () => void;
  /** Read current state. Stable identity within a render frame. */
  getSnapshot(): SubFocusSnapshot;
  /** Replace the sub-focus list entirely. Pane-id mismatch handling
   *  (same-pane-only invariant) lives on the host side. */
  setItems(items: readonly SubFocusItem[]): void;
  /** Add to the list (no-op if already present; replaces if paneId differs). */
  addItem(item: SubFocusItem): void;
  /** Remove a single item by (paneId, channel) match. */
  removeItem(item: SubFocusItem): void;
  /** Add-or-remove (replaces on paneId mismatch). */
  toggleItem(item: SubFocusItem): void;
  /** Clear all sub-focus. */
  clear(): void;
  /** Set the focused pane id. The host's auto-clear effect picks this up. */
  setFocusedPane(paneId: string | null): void;
  /** Set the keyboard sub-select target. Pass null to exit. */
  setSubSelectPane(paneId: string | null): void;
}

let _bus: SubFocusBus | null = null;

/* Bus-ready notifier. The host's WorkstationContext installs the bus
 * inside a useEffect, which fires AFTER children's effects (React
 * commits children's effects bottom-up). A plugin pane that calls
 * useSubSelect during its own mount would otherwise miss the install
 * — its subscription gets a null bus and never recovers.
 *
 * setSubFocusBus fires these listeners so any already-mounted hook
 * can re-subscribe and read the freshly-installed snapshot. */
const busReadyListeners = new Set<() => void>();

/** Production setter. Desktop calls this once at workstation bootstrap. */
export function setSubFocusBus(bus: SubFocusBus): void {
  _bus = bus;
  for (const l of busReadyListeners) {
    try {
      l();
    } catch (e) {
      console.warn('[subFocusBus] busReady listener threw', e);
    }
  }
}

/** Get the current bus, or null if none configured. */
export function getSubFocusBus(): SubFocusBus | null {
  return _bus;
}

/** Test helper. */
export function setSubFocusBusForTests(bus: SubFocusBus): void {
  _bus = bus;
  for (const l of busReadyListeners) l();
}

/** Test helper. */
export function resetSubFocusBusForTests(): void {
  _bus = null;
  for (const l of busReadyListeners) l();
}

const DEFAULT_SNAPSHOT: SubFocusSnapshot = {
  items: [],
  subSelectPaneId: null,
  focusedPaneId: null,
};

export interface UseSubSelectArgs {
  /** Stable pane instance id (the same id the host registers under). */
  paneId: string;
  /** Ordered list of sub-items the keyboard cursor cycles through.
   *  Pass channels for spectra/butterfly grids, band names for topomap
   *  suites, or any sub-item identifier — the hook is content-neutral. */
  items: readonly string[];
}

export interface UseSubSelectResult {
  /** Items currently in sub-focus for this pane. */
  subFocused: ReadonlySet<string>;
  /** Item under the keyboard cursor, or null when not in sub-select mode. */
  cursorItem: string | null;
  /** True when this pane is the active keyboard sub-select target. */
  inSubSelect: boolean;
  /** Pointer-driven click handler: plain replaces, Shift adds, Cmd/Ctrl removes.
   *  Pass straight to the cell's onClick. */
  onItemClick: (item: string, e: { shiftKey: boolean; metaKey: boolean; ctrlKey: boolean }) => void;
}

/**
 * usePaneSubSelect — workstation sub-select for a pane.
 *
 * Returns the sub-focused set, the keyboard cursor item, and a click
 * handler with the standard Shift/Cmd/plain semantics. While this
 * pane is the keyboard sub-select target (after `.` is pressed) the
 * hook installs a capture-phase keydown listener:
 *
 *   Arrow keys — cycle the cursor through `items` (wraps)
 *   Space      — toggle the cursor item into sub-focus
 *   Enter      — exit sub-select; sub-focus retained
 *   Esc        — clear sub-focus AND exit sub-select
 *
 * Idle / no-op when no bus is configured (e.g. dashboard mode, tests
 * without a bus injection). Safe to call unconditionally from any
 * plugin pane.
 */
export function useSubSelect(args: UseSubSelectArgs): UseSubSelectResult {
  const { paneId, items } = args;

  // Subscribe to the bus snapshot. The bus may not be installed at
  // mount (parent effects run after children's), so we register a
  // bus-ready listener that re-subscribes when the bus comes online.
  const [snapshot, setSnapshot] = useState<SubFocusSnapshot>(() =>
    _bus ? _bus.getSnapshot() : DEFAULT_SNAPSHOT,
  );
  useEffect(() => {
    let busUnsub: (() => void) | undefined;
    const refresh = () => {
      setSnapshot(_bus ? _bus.getSnapshot() : DEFAULT_SNAPSHOT);
    };
    const wireToBus = () => {
      if (busUnsub) busUnsub();
      busUnsub = _bus ? _bus.subscribe(refresh) : undefined;
      refresh();
    };
    wireToBus();
    busReadyListeners.add(wireToBus);
    return () => {
      if (busUnsub) busUnsub();
      busReadyListeners.delete(wireToBus);
    };
  }, []);

  const inSubSelect = snapshot.subSelectPaneId === paneId;

  const subFocused = useRef(new Set<string>()).current;
  subFocused.clear();
  for (const f of snapshot.items) {
    if (f.paneId === paneId && f.channel !== undefined) {
      subFocused.add(f.channel);
    }
  }

  const [cursorIdx, setCursorIdx] = useState(0);
  useEffect(() => {
    if (inSubSelect) setCursorIdx(0);
  }, [inSubSelect]);
  useEffect(() => {
    if (items.length > 0 && cursorIdx >= items.length) setCursorIdx(0);
  }, [items.length, cursorIdx]);

  const stateRef = useRef({ paneId, items, cursorIdx });
  stateRef.current = { paneId, items, cursorIdx };

  /* Keyboard sub-select dispatcher. Capture phase + stopImmediatePropagation
   * so the host's instrument keyboard dispatcher doesn't also act on the
   * arrows / Space / Enter / Esc while sub-select is active. */
  useEffect(() => {
    if (!inSubSelect) return;
    const onKeyDown = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t) {
        const tag = t.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || t.isContentEditable) {
          return;
        }
      }
      const bus = _bus;
      if (!bus) return;
      const { paneId, items, cursorIdx } = stateRef.current;
      const len = items.length;
      switch (e.key) {
        case 'ArrowUp':
        case 'ArrowLeft':
          if (len === 0) return;
          e.preventDefault();
          e.stopImmediatePropagation();
          setCursorIdx((i) => (i - 1 + len) % len);
          return;
        case 'ArrowDown':
        case 'ArrowRight':
          if (len === 0) return;
          e.preventDefault();
          e.stopImmediatePropagation();
          setCursorIdx((i) => (i + 1) % len);
          return;
        case ' ':
          if (len === 0) return;
          e.preventDefault();
          e.stopImmediatePropagation();
          bus.toggleItem({ paneId, channel: items[cursorIdx] });
          return;
        case 'Enter':
          e.preventDefault();
          e.stopImmediatePropagation();
          bus.setSubSelectPane(null);
          return;
        case 'Escape':
          e.preventDefault();
          e.stopImmediatePropagation();
          bus.clear();
          bus.setSubSelectPane(null);
          return;
      }
    };
    document.addEventListener('keydown', onKeyDown, { capture: true });
    return () =>
      document.removeEventListener('keydown', onKeyDown, { capture: true });
  }, [inSubSelect]);

  const onItemClick = useCallback(
    (channel: string, e: { shiftKey: boolean; metaKey: boolean; ctrlKey: boolean }) => {
      const bus = _bus;
      if (!bus) return;
      bus.setFocusedPane(paneId);
      const item: SubFocusItem = { paneId, channel };
      if (e.shiftKey) {
        bus.addItem(item);
      } else if (e.metaKey || e.ctrlKey) {
        bus.removeItem(item);
      } else {
        bus.setItems([item]);
      }
    },
    [paneId],
  );

  return {
    subFocused,
    cursorItem:
      inSubSelect && items.length > 0 ? items[cursorIdx] ?? null : null,
    inSubSelect,
    onItemClick,
  };
}
