import type { Feature } from '@ecomap/shared';
import { describe, expect, it } from 'vitest';
import { LIST_LIMIT, distanceKm, formatDistance, placesInView, type MapView } from './placeList.js';

function place(name: string, lat: number, lng: number): Feature {
  return {
    id: crypto.randomUUID(),
    layerId: crypto.randomUUID(),
    layerSlug: 'local-food',
    name,
    description: '',
    geometry: { type: 'Point', coordinates: [lng, lat] },
    properties: {},
    status: 'published',
    createdById: null,
    createdByName: null,
    createdByAvatarUrl: null,
    images: [],
    createdAt: '2026-11-04T10:00:00.000Z',
    updatedAt: '2026-11-04T10:00:00.000Z',
  };
}

/* Roughly Bornholm. */
const view: MapView = { south: 54.9, west: 14.6, north: 55.35, east: 15.2, center: [55.1, 14.9] };

describe('placesInView', () => {
  it('lists only what is on screen, nearest to the middle first', () => {
    const { places, total } = placesInView(
      [place('Far', 55.3, 15.1), place('Near', 55.11, 14.91), place('Copenhagen', 55.68, 12.57)],
      view,
      null,
    );
    expect(places.map((p) => p.feature.name)).toEqual(['Near', 'Far']);
    expect(total).toBe(2);
  });

  it('measures from the person when their location is known', () => {
    const { places } = placesInView(
      [place('Middle', 55.1, 14.9), place('North', 55.3, 14.9)],
      view,
      [55.31, 14.9],
    );
    expect(places[0]?.feature.name).toBe('North');
  });

  it('stops at the limit but still counts everything in view', () => {
    const many = Array.from({ length: LIST_LIMIT + 5 }, (_, i) =>
      place(`P${String(i)}`, 55.1, 14.9),
    );
    const { places, total } = placesInView(many, view, null);
    expect(places).toHaveLength(LIST_LIMIT);
    expect(total).toBe(LIST_LIMIT + 5);
  });
});

describe('distances', () => {
  it('measures about 111 km per degree of latitude', () => {
    expect(distanceKm([55, 15], [56, 15])).toBeCloseTo(111.2, 0);
  });

  it('reads like a person would say it', () => {
    expect(formatDistance(0.347, 'da')).toBe('350 m');
    expect(formatDistance(2.44, 'da')).toBe('2,4 km');
    expect(formatDistance(23.6, 'en')).toBe('24 km');
  });
});
