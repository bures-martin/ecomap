import { describe, expect, it } from 'vitest';
import {
  FEATURE_PAGE_SIZE,
  featureQuerySchema,
  fromFeatureCollection,
  toFeatureCollection,
  type Feature,
} from './features.js';

describe('featureQuerySchema', () => {
  it('defaults to no filters and the standard page size', () => {
    const query = featureQuerySchema.parse({});
    expect(query.layers).toEqual([]);
    expect(query.limit).toBe(FEATURE_PAGE_SIZE);
    expect(query.offset).toBe(0);
    expect(query.mine).toBe(false);
  });

  it('splits and normalises the comma-separated layer list', () => {
    const query = featureQuerySchema.parse({ layers: 'Gardens, repair-cafe ,' });
    expect(query.layers).toEqual(['gardens', 'repair-cafe']);
  });

  it('parses a bbox into numbers', () => {
    const query = featureQuerySchema.parse({ bbox: '14.6,54.9,15.2,55.4' });
    expect(query.bbox).toEqual([14.6, 54.9, 15.2, 55.4]);
  });

  it('coerces limit and offset from strings, as they arrive from a URL', () => {
    const query = featureQuerySchema.parse({ limit: '50', offset: '100' });
    expect(query.limit).toBe(50);
    expect(query.offset).toBe(100);
  });

  it('rejects an oversized limit rather than silently clamping', () => {
    expect(featureQuerySchema.safeParse({ limit: '100000' }).success).toBe(false);
  });

  it('rejects an unknown status', () => {
    expect(featureQuerySchema.safeParse({ status: 'archived' }).success).toBe(false);
  });

  it('reads "mine" as a flag', () => {
    expect(featureQuerySchema.parse({ mine: 'true' }).mine).toBe(true);
    expect(featureQuerySchema.parse({ mine: '1' }).mine).toBe(true);
    expect(featureQuerySchema.parse({ mine: 'false' }).mine).toBe(false);
  });
});

describe('GeoJSON conversion', () => {
  const feature: Feature = {
    id: '11111111-2222-4333-8444-555555555555',
    layerId: '66666666-7777-4888-8999-aaaaaaaaaaaa',
    layerSlug: 'community-gardens',
    name: 'Nexø kitchen garden',
    description: 'Shared beds behind the library.',
    geometry: { type: 'Point', coordinates: [15.13, 55.06] },
    properties: { openingHours: 'Sat 10-14' },
    status: 'published',
    createdById: null,
    createdByName: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  it('wraps features as a GeoJSON FeatureCollection', () => {
    const collection = toFeatureCollection([feature], 12);
    expect(collection.type).toBe('FeatureCollection');
    expect(collection.total).toBe(12);
    expect(collection.features[0]?.geometry).toEqual(feature.geometry);
    expect(collection.features[0]?.properties.name).toBe(feature.name);
  });

  it('round-trips back to the domain shape', () => {
    expect(fromFeatureCollection(toFeatureCollection([feature]))).toEqual([feature]);
  });

  it('defaults total to the number of features given', () => {
    expect(toFeatureCollection([feature]).total).toBe(1);
  });
});
