import { layerPropertiesSchema, positionSchema } from '@ecomap/shared';
import { describe, expect, it } from 'vitest';
import { STARTER_LAYERS } from '../starterLayers.js';
import { BORNHOLM_DEMO_PLACES } from './bornholm.js';

/* A generous box round the island, Ertholmene included. */
const BORNHOLM = { west: 14.6, south: 54.95, east: 15.25, north: 55.35 };

describe('Bornholm demo places', () => {
  it('only uses starter layers that accept points', () => {
    for (const place of BORNHOLM_DEMO_PLACES) {
      const layer = STARTER_LAYERS.find((candidate) => candidate.slug === place.layerSlug);
      expect(layer, place.name).toBeDefined();
      expect(layer?.allowedGeometries, place.name).toContain('Point');
    }
  });

  it('fills in only fields the layer defines, with values it accepts', () => {
    for (const place of BORNHOLM_DEMO_PLACES) {
      const layer = STARTER_LAYERS.find((candidate) => candidate.slug === place.layerSlug);
      const result = layerPropertiesSchema(layer?.fields ?? []).safeParse(place.properties);
      expect(result.success, `${place.name}: ${JSON.stringify(result.error?.issues)}`).toBe(true);
      const known = new Set(layer?.fields.map((field) => field.key));
      for (const key of Object.keys(place.properties)) {
        expect(known.has(key), `${place.name}: unknown field ${key}`).toBe(true);
      }
    }
  });

  it('lies on Bornholm', () => {
    for (const place of BORNHOLM_DEMO_PLACES) {
      expect(positionSchema.safeParse(place.coordinates).success).toBe(true);
      const [lng, lat] = place.coordinates;
      expect(lng, place.name).toBeGreaterThan(BORNHOLM.west);
      expect(lng, place.name).toBeLessThan(BORNHOLM.east);
      expect(lat, place.name).toBeGreaterThan(BORNHOLM.south);
      expect(lat, place.name).toBeLessThan(BORNHOLM.north);
    }
  });

  it('names every place once per layer, so re-running the seed adds nothing twice', () => {
    const keys = BORNHOLM_DEMO_PLACES.map((place) => `${place.layerSlug}:${place.name}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('keeps a pointer to the OpenStreetMap object behind every place', () => {
    for (const place of BORNHOLM_DEMO_PLACES) {
      expect(place.osmId).toMatch(/^(node|way|relation)\/\d+$/);
    }
  });
});
