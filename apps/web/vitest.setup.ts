import '@testing-library/jest-dom/vitest';

/**
 * Leaflet and MUI both measure elements; jsdom has no layout engine, so a couple
 * of browser APIs need standing in for.
 *
 * The globals are reached through an untyped view of `globalThis` on purpose:
 * the DOM type definitions claim these always exist, which is exactly the
 * assumption jsdom breaks.
 */
const browserGlobals = globalThis as unknown as Record<string, unknown>;

class ResizeObserverStub {
  observe(): void {
    /* no layout in jsdom */
  }
  unobserve(): void {
    /* no layout in jsdom */
  }
  disconnect(): void {
    /* no layout in jsdom */
  }
}

if (typeof browserGlobals['ResizeObserver'] !== 'function') {
  browserGlobals['ResizeObserver'] = ResizeObserverStub;
}

if (typeof browserGlobals['matchMedia'] !== 'function') {
  browserGlobals['matchMedia'] = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  });
}
