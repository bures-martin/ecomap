import { describe, expect, it } from 'vitest';
import { BORNHOLM } from '../communities/bornholm/index.js';
import { buildStaticDemo, stableUuid } from './exportStatic.js';

describe('buildStaticDemo', () => {
  const data = buildStaticDemo(BORNHOLM, new Date('2026-11-05T00:00:00Z'));

  it('shows a visitor what the API would: published layers and their places only', () => {
    const published = BORNHOLM.layers.filter((layer) => layer.isPublished).map((l) => l.slug);
    expect([...data.layers.map((layer) => layer.slug)].sort()).toEqual([...published].sort());
    expect(data.features.features.every((f) => published.includes(f.properties.layerSlug))).toBe(
      true,
    );
    const expected = BORNHOLM.places.filter((place) => published.includes(place.layerSlug));
    expect(data.features.total).toBe(expected.length);
  });

  it('lists the layers in the same order as the API: by sort order', () => {
    const orders = data.layers.map((layer) => layer.sortOrder);
    expect(orders).toEqual([...orders].sort((a, b) => a - b));
  });

  it('counts each layer’s places', () => {
    for (const layer of data.layers) {
      const count = data.features.features.filter(
        (f) => f.properties.layerSlug === layer.slug,
      ).length;
      expect(layer.featureCount).toBe(count);
    }
  });

  it('says on its privacy page that the demo keeps nothing', () => {
    expect(data.settings.privacyMarkdown).toContain('demo');
    expect(data.settings.allowPublicRegistration).toBe(false);
  });
});

describe('stableUuid', () => {
  it('gives the same id for the same name, so shared demo links keep working', () => {
    expect(stableUuid('place:node/1')).toBe(stableUuid('place:node/1'));
    expect(stableUuid('place:node/1')).not.toBe(stableUuid('place:node/2'));
    expect(stableUuid('x')).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });
});
