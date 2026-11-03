import '@testing-library/jest-dom/vitest';

/**
 * Leaflet and Vuetify both measure elements; jsdom has no layout engine, so a couple
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

/* Vuetify positions overlays (dialogs, menus) against the visual viewport. */
if (
  typeof browserGlobals['visualViewport'] !== 'object' ||
  browserGlobals['visualViewport'] === null
) {
  const viewport = Object.assign(new EventTarget(), {
    width: 1024,
    height: 768,
    offsetLeft: 0,
    offsetTop: 0,
    pageLeft: 0,
    pageTop: 0,
    scale: 1,
  });
  browserGlobals['visualViewport'] = viewport;
}
