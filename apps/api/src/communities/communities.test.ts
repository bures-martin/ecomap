import { createLayerInputSchema, updateCommunitySettingsInputSchema } from '@ecomap/shared';
import { describe, expect, it } from 'vitest';
import { COMMUNITIES } from './index.js';

describe.each(Object.entries(COMMUNITIES))('community "%s"', (key, community) => {
  it('is registered under its own name', () => {
    expect(community.slug).toBe(key);
  });

  it('has settings the settings form would accept', () => {
    expect(updateCommunitySettingsInputSchema.safeParse(community.settings).success).toBe(true);
  });

  it('has valid layers with unique addresses', () => {
    for (const layer of community.layers) {
      expect(createLayerInputSchema.safeParse(layer).success, layer.slug).toBe(true);
    }
    const slugs = community.layers.map((layer) => layer.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('puts every place on one of its own layers', () => {
    const slugs = new Set(community.layers.map((layer) => layer.slug));
    for (const place of community.places) {
      expect(slugs.has(place.layerSlug), place.name).toBe(true);
    }
  });
});
