import type { Feature, Position } from '@ecomap/shared';
import { describe, expect, it } from 'vitest';
import { CLUSTER_MAX_ZOOM, buildPointIndex } from './clustering.js';

function place(id: string, coordinates: Position): Feature {
  return {
    id,
    layerId: '11111111-2222-4333-8444-555555555555',
    layerSlug: 'cycling',
    name: id,
    description: '',
    geometry: { type: 'Point', coordinates },
    properties: {},
    status: 'published',
    createdById: null,
    createdByName: null,
    createdByAvatarUrl: null,
    images: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

const WORLD: [number, number, number, number] = [-180, -85, 180, 85];

/* Two places a few hundred metres apart in Rønne, one far away in Nexø. */
const places = [place('a', [14.7, 55.1]), place('b', [14.703, 55.101]), place('c', [15.13, 55.06])];

describe('buildPointIndex', () => {
  it('groups places that are close together when zoomed out', () => {
    const groups = buildPointIndex(places, null).getClusters(WORLD, 9);
    const sizes = groups
      .map((group) => ('cluster' in group.properties ? group.properties.point_count : 1))
      .sort();
    expect(sizes).toEqual([1, 2]);
  });

  it('shows every place on its own at street level', () => {
    const groups = buildPointIndex(places, null).getClusters(WORLD, CLUSTER_MAX_ZOOM + 1);
    expect(groups).toHaveLength(3);
  });

  it('keeps the selected place out of any group', () => {
    const groups = buildPointIndex(places, 'a').getClusters(WORLD, 9);
    expect(groups).toHaveLength(2);
    expect(groups.every((group) => !('cluster' in group.properties))).toBe(true);
  });

  it('leaves routes and areas out - they are always drawn as shapes', () => {
    const route: Feature = {
      ...place('r', [14.7, 55.1]),
      geometry: {
        type: 'LineString',
        coordinates: [
          [14.7, 55.1],
          [14.8, 55.2],
        ],
      },
    };
    expect(buildPointIndex([route], null).getClusters(WORLD, 9)).toHaveLength(0);
  });
});
