import { afterEach, describe, expect, it, vi } from 'vitest';

/* The key is read when the module loads, so each case imports a fresh copy. */
async function loadWithKey(key: string | undefined) {
  vi.resetModules();
  vi.stubEnv('VITE_MAPY_API_KEY', key ?? '');
  return import('./basemaps.js');
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('basemapDefinition', () => {
  it('falls back to OpenStreetMap when there is no Mapy.com key', async () => {
    const { basemapDefinition, hasMapyKey } = await loadWithKey(undefined);
    expect(hasMapyKey()).toBe(false);
    const definition = basemapDefinition('mapy-outdoor');
    expect(definition.url).toContain('tile.openstreetmap.org');
    expect(definition.requiresMapyLogo).toBeFalsy();
  });

  it('uses the Mapy.com tile API, with the key and the logo requirement, when a key is set', async () => {
    const { basemapDefinition } = await loadWithKey('test-key');
    const definition = basemapDefinition('mapy-outdoor');
    expect(definition.url).toMatch(
      /^https:\/\/api\.mapy\.com\/v1\/maptiles\/outdoor\/256(@2x)?\/\{z\}\/\{x\}\/\{y\}\?apikey=test-key$/,
    );
    expect(definition.attribution).toContain('Seznam.cz');
    expect(definition.requiresMapyLogo).toBe(true);
  });

  it('never asks for retina aerial tiles, which Mapy.com does not offer', async () => {
    const { basemapDefinition } = await loadWithKey('test-key');
    expect(basemapDefinition('mapy-aerial').url).toContain('/aerial/256/');
  });

  it('leaves the OpenStreetMap-based maps alone', async () => {
    const { basemapDefinition } = await loadWithKey('test-key');
    expect(basemapDefinition('cyclosm').url).toContain('cyclosm');
  });
});
