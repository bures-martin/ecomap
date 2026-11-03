import { describe, expect, it } from 'vitest';
import {
  areaBBox,
  areaFromBBox,
  areaFromCorners,
  contributionAreaSchema,
  isGeometryWithinArea,
  isPositionInArea,
  isRingSimple,
} from './area.js';
import type { Position } from './geometry.js';

/*
 * A "C"-shaped (concave) area, open to the east:
 *
 *   (0,10) +--------+ (10,10)
 *          |   +----+ (10,7)
 *          |   | (3,7)
 *          |   | (3,3)
 *          |   +----+ (10,3)
 *    (0,0) +--------+ (10,0)
 */
const cShape = areaFromCorners([
  [0, 0],
  [10, 0],
  [10, 3],
  [3, 3],
  [3, 7],
  [10, 7],
  [10, 10],
  [0, 10],
]);

describe('isPositionInArea', () => {
  it('finds points inside, outside and in the notch', () => {
    expect(isPositionInArea([1, 5], cShape)).toBe(true);
    expect(isPositionInArea([8, 1], cShape)).toBe(true);
    expect(isPositionInArea([8, 5], cShape)).toBe(false);
    expect(isPositionInArea([20, 5], cShape)).toBe(false);
  });

  it('counts the outline itself as inside', () => {
    expect(isPositionInArea([0, 5], cShape)).toBe(true);
    expect(isPositionInArea([10, 0], cShape)).toBe(true);
  });
});

describe('isGeometryWithinArea', () => {
  it('accepts a point inside', () => {
    expect(isGeometryWithinArea({ type: 'Point', coordinates: [1, 1] }, cShape)).toBe(true);
  });

  it('refuses a line whose ends are inside but which cuts across the notch', () => {
    const line = {
      type: 'LineString' as const,
      coordinates: [
        [8, 1],
        [8, 9],
      ] as Position[],
    };
    expect(isGeometryWithinArea(line, cShape)).toBe(false);
  });

  it('accepts a line that goes round the notch', () => {
    const line = {
      type: 'LineString' as const,
      coordinates: [
        [8, 1],
        [1, 1],
        [1, 9],
        [8, 9],
      ] as Position[],
    };
    expect(isGeometryWithinArea(line, cShape)).toBe(true);
  });

  it('refuses a polygon that pokes out of the area', () => {
    const polygon = {
      type: 'Polygon' as const,
      coordinates: [
        [
          [1, 1],
          [12, 1],
          [1, 2],
          [1, 1],
        ],
      ] as Position[][],
    };
    expect(isGeometryWithinArea(polygon, cShape)).toBe(false);
  });

  it('accepts a line running along the outline', () => {
    const line = {
      type: 'LineString' as const,
      coordinates: [
        [0, 0],
        [0, 10],
      ] as Position[],
    };
    expect(isGeometryWithinArea(line, cShape)).toBe(true);
  });
});

describe('isRingSimple', () => {
  it('accepts an ordinary outline', () => {
    expect(isRingSimple(cShape.coordinates[0].slice(0, -1))).toBe(true);
  });

  it('refuses a bow tie, whose edges cross', () => {
    expect(
      isRingSimple([
        [0, 0],
        [10, 10],
        [10, 0],
        [0, 10],
      ]),
    ).toBe(false);
  });
});

describe('contributionAreaSchema', () => {
  it('accepts a drawn area', () => {
    expect(contributionAreaSchema.safeParse(cShape).success).toBe(true);
  });

  it('refuses a crossing outline with a message an admin can act on', () => {
    const result = contributionAreaSchema.safeParse(
      areaFromCorners([
        [0, 0],
        [10, 10],
        [10, 0],
        [0, 10],
      ]),
    );
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toMatch(/crosses itself/);
  });

  it('refuses fewer than three distinct corners', () => {
    expect(
      contributionAreaSchema.safeParse(
        areaFromCorners([
          [0, 0],
          [1, 1],
          [0, 0],
        ]),
      ).success,
    ).toBe(false);
  });

  it('refuses holes', () => {
    const square = areaFromBBox([0, 0, 10, 10]).coordinates[0];
    expect(
      contributionAreaSchema.safeParse({ type: 'Polygon', coordinates: [square, square] }).success,
    ).toBe(false);
  });
});

describe('areaFromBBox and areaBBox', () => {
  it('round-trip a rectangle', () => {
    expect(areaBBox(areaFromBBox([14.6, 54.9, 15.2, 55.3]))).toEqual([14.6, 54.9, 15.2, 55.3]);
  });
});
