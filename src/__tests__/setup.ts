/**
 * Vitest setup — runs in each test file's environment BEFORE the file's
 * imports are evaluated. Loaded via the `setupFiles` entry in
 * vitest.config.ts.
 *
 * Stubs `window.matchMedia` because uPlot calls it at module load to set
 * up devicePixelRatio listeners, and jsdom does not implement it.
 */

if (typeof window !== 'undefined' && typeof window.matchMedia !== 'function') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}
