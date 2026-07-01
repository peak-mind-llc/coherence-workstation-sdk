/**
 * Pane-keybinding registration for plugins.
 *
 * Plugins call `registerPaneKeys(paneType, bindings)` at module load time.
 * The host shell consults `getRegisteredPaneKeys()` at bootstrap and forwards
 * each entry into the workstation's keyboard registry as a `paneOverride`
 * binding.
 *
 * Plugins may only write to the `paneOverride` layer — `phaseSignal` and
 * `global` layers are framework-owned and not exposed here.
 */

export interface PaneKeyBinding {
  /**
   * Key descriptor. Plain keys are bare ('L', '?'); modifier chords use
   * 'Cmd+', 'Shift+', 'Alt+', 'Ctrl+' prefixes (e.g. 'Cmd+\\').
   */
  key: string;
  /** Logical action id; resolved by the dispatcher's action map. */
  action: string;
  /** Shown in the help overlay and command palette. */
  description: string;
}

interface RegisteredEntry {
  paneType: string;
  binding: PaneKeyBinding;
}

const _entries: RegisteredEntry[] = [];

export function registerPaneKeys(
  paneType: string,
  bindings: readonly PaneKeyBinding[],
): void {
  if (!paneType) {
    throw new Error('registerPaneKeys: paneType is required');
  }
  for (const binding of bindings) {
    _entries.push({ paneType, binding });
  }
}

export function getRegisteredPaneKeys(): readonly RegisteredEntry[] {
  return _entries;
}

/** Test helper. Do not use outside tests. */
export function resetPaneKeysForTests(): void {
  _entries.length = 0;
}
