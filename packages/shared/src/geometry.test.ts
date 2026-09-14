import { describe, expect, it } from 'vitest';
import {
  bboxStringSchema,
  bboxToString,
  closeRing,
  geometryAnchor,
  geometrySchema,
  isGeometryWithinBBox,
  type BBox,
  type Position,
} from './geometry.js';

describe('geometrySchema', () => {
  it('accepts a point in lng/lat order', () => {
    const result = geometrySchema.safeParse({ type: 'Point', coordinates: [14.9, 55.1] });
    expect(result.success).toBe(true);
  });

  it('rejects a point with swapped lng/lat that leaves the valid range', () => {
    const result = geometrySchema.safeParse({ type: 'Point', coordinates: [55.1, 194.9] });
    expect(result.success).toBe(false);
  });

  it('rejects a line with a single position', () => {
    const result = geometrySchema.safeParse({ type: 'LineString', coordinates: [[14.9, 55.1]] });
    expect(result.success).toBe(false);
  });

  it('rejects an unclosed polygon ring', () => {
    const result = geometrySchema.safeParse({
      type: 'Polygon',
      coordinates: [
        [
          [14.9, 55.1],
          [15.0, 55.1],
          [15.0, 55.2],
          [14.9, 55.2],
        ],
      ],
    });
    expect(result.success).toBe(false);
  });

  it('accepts a closed polygon ring', () => {
    const result = geometrySchema.safeParse({
      type: 'Polygon',
      coordinates: [
        [
          [14.9, 55.1],
          [15.0, 55.1],
          [15.0, 55.2],
          [14.9, 55.1],
        ],
      ],
    });
    expect(result.success).toBe(true);
  });
});

describe('closeRing', () => {
  it('appends the first position when the ring is open', () => {
    const ring: Position[] = [
      [14.9, 55.1],
      [15.0, 55.1],
      [15.0, 55.2],
    ];
    expect(closeRing(ring)).toHaveLength(4);
    expect(closeRing(ring).at(-1)).toEqual([14.9, 55.1]);
  });

  it('leaves an already closed ring alone', () => {
    const ring: Position[] = [
      [14.9, 55.1],
      [15.0, 55.1],
      [15.0, 55.2],
      [14.9, 55.1],
    ];
    expect(closeRing(ring)).toHaveLength(4);
  });
});

describe('geometryAnchor', () => {
  it('returns the point itself', () => {
    expect(geometryAnchor({ type: 'Point', coordinates: [14.9, 55.1] })).toEqual([14.9, 55.1]);
  });

  it('averages the positions of a line', () => {
    expect(
      geometryAnchor({
        type: 'LineString',
        coordinates: [
          [14, 55],
          [16, 57],
        ],
      }),
    ).toEqual([15, 56]);
  });
});

describe('bbox parsing', () => {
  it('parses "west,south,east,north"', () => {
    const result = bboxStringSchema.safeParse('14.6,54.9,15.2,55.4');
    expect(result.success).toBe(true);
    expect(result.success && result.data).toEqual([14.6, 54.9, 15.2, 55.4]);
  });

  it('rejects a bbox whose south is north of its north', () => {
    expect(bboxStringSchema.safeParse('14.6,55.4,15.2,54.9').success).toBe(false);
  });

  it('rejects garbage', () => {
    expect(bboxStringSchema.safeParse('not-a-bbox').success).toBe(false);
  });

  it('round-trips through bboxToString', () => {
    const bbox: BBox = [14.6, 54.9, 15.2, 55.4];
    const parsed = bboxStringSchema.parse(bboxToString(bbox));
    expect(parsed).toEqual(bbox);
  });
});

describe('isGeometryWithinBBox', () => {
  const bornholm: BBox = [14.6, 54.9, 15.2, 55.4];

  it('accepts a point inside', () => {
    expect(isGeometryWithinBBox({ type: 'Point', coordinates: [14.9, 55.1] }, bornholm)).toBe(true);
  });

  it('rejects a line that leaves the box', () => {
    expect(
      isGeometryWithinBBox(
        {
          type: 'LineString',
          coordinates: [
            [14.9, 55.1],
            [18.0, 55.1],
          ],
        },
        bornholm,
      ),
    ).toBe(false);
  });
});
