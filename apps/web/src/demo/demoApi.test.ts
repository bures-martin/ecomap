import type { FeatureCollection, Layer } from '@ecomap/shared';
import { describe, expect, it } from 'vitest';
import { filterCollection, matchesSearch } from './demoApi.js';

const place = (overrides: Partial<Parameters<typeof matchesSearch>[0]> = {}) => ({
  name: 'Kirkens Korshær Møbelgenbrug',
  description: 'Genbrugsbutik i Aakirkeby.',
  layerName: 'Genbrug og reparation',
  values: ['Genbrugsbutik', 'Møbler'],
  ...overrides,
});

describe('matchesSearch - the same rules as the API', () => {
  it('finds a place name anywhere in it, Danish compound words included', () => {
    expect(matchesSearch(place(), 'møbelgenbrug')).toBe(true);
    expect(matchesSearch(place({ description: '', layerName: '', values: [] }), 'genbrug')).toBe(
      true,
    );
  });

  it('finds descriptions, layer names and field values only from the start of a word', () => {
    expect(matchesSearch(place({ name: 'X' }), 'aakirkeby')).toBe(true);
    expect(matchesSearch(place({ name: 'X' }), 'reparation')).toBe(true);
    expect(matchesSearch(place({ name: 'X' }), 'møbler')).toBe(true);
    /* "cycling" must not drag in "Recycling". */
    expect(
      matchesSearch(
        { name: 'X', description: 'Recycling centre', layerName: 'Recycling', values: [] },
        'cycling',
      ),
    ).toBe(false);
  });

  it('treats the search as text, not as a pattern', () => {
    expect(matchesSearch(place({ name: 'X' }), '(')).toBe(false);
  });
});

describe('filterCollection', () => {
  const feature = (id: string, layerSlug: string, name: string) => ({
    type: 'Feature' as const,
    id,
    geometry: { type: 'Point' as const, coordinates: [14.9, 55.1] as [number, number] },
    properties: { id, layerSlug, name, description: '', properties: {} },
  });
  const collection = {
    type: 'FeatureCollection',
    total: 2,
    features: [
      feature('11111111-1111-4111-8111-111111111111', 'from-the-farm', 'Hammersly'),
      feature('22222222-2222-4222-8222-222222222222', 'cycling', 'Cykeludlejning'),
    ],
  } as unknown as FeatureCollection;
  const layers = [
    { slug: 'from-the-farm', name: 'Fra gården' },
    { slug: 'cycling', name: 'Cykling' },
  ] as Layer[];

  it('keeps only the ticked layers, and counts what is left', () => {
    const result = filterCollection(collection, layers, new URLSearchParams('layers=cycling'));
    expect(result.features.map((f) => f.properties.name)).toEqual(['Cykeludlejning']);
    expect(result.total).toBe(1);
  });

  it('searches by layer name too', () => {
    const result = filterCollection(collection, layers, new URLSearchParams('q=gården'));
    expect(result.features.map((f) => f.properties.name)).toEqual(['Hammersly']);
  });
});
