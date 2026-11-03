import { describe, expect, it } from 'vitest';
import { googleMapsDirectionsUrl, navigationTarget } from './navigation.js';

describe('navigationTarget', () => {
  it('goes to a point itself', () => {
    expect(navigationTarget({ type: 'Point', coordinates: [14.7, 55.1] })).toEqual([14.7, 55.1]);
  });

  it('goes to the start of a route, not its middle', () => {
    expect(
      navigationTarget({
        type: 'LineString',
        coordinates: [
          [14.8, 55.12],
          [14.9, 55.15],
          [15.0, 55.2],
        ],
      }),
    ).toEqual([14.8, 55.12]);
  });

  it('aims at the middle of an area', () => {
    const [lng, lat] = navigationTarget({
      type: 'Polygon',
      coordinates: [
        [
          [14.0, 55.0],
          [15.0, 55.0],
          [15.0, 56.0],
          [14.0, 56.0],
          [14.0, 55.0],
        ],
      ],
    });
    expect(lng).toBeGreaterThan(14.0);
    expect(lng).toBeLessThan(15.0);
    expect(lat).toBeGreaterThan(55.0);
    expect(lat).toBeLessThan(56.0);
  });
});

describe('googleMapsDirectionsUrl', () => {
  it('asks Google Maps for directions, latitude first', () => {
    expect(googleMapsDirectionsUrl([14.69156, 55.10208])).toBe(
      'https://www.google.com/maps/dir/?api=1&destination=55.102080%2C14.691560',
    );
  });
});
