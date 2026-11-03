import { z } from 'zod';
import {
  closeRing,
  geometryPositions,
  positionSchema,
  type BBox,
  type Geometry,
  type Position,
} from './geometry.js';

/**
 * The contribution area: the region of a community, drawn by an admin as one
 * polygon. Contributions must lie entirely inside it; the map itself stays free
 * to pan and zoom anywhere.
 *
 * These checks run in the browser for instant feedback. The API repeats the
 * decision with PostGIS (`ST_CoveredBy`), which is the one that counts.
 */

export const AREA_MAX_CORNERS = 500;

/** Open ring (first corner not repeated): what the editor works with. */
export type AreaRing = Position[];

export const contributionAreaSchema = z
  .object({
    type: z.literal('Polygon'),
    /* One outer ring and no holes: a region, not a doughnut. */
    coordinates: z.tuple([
      z
        .array(positionSchema)
        .min(4)
        .max(AREA_MAX_CORNERS + 1),
    ]),
  })
  .refine(({ coordinates: [ring] }) => isRingClosedExactly(ring), {
    message: 'The first and last corner must be the same point',
  })
  .refine(({ coordinates: [ring] }) => distinctCorners(openRing(ring)) >= 3, {
    message: 'An area needs at least three different corners',
  })
  .refine(({ coordinates: [ring] }) => isRingSimple(openRing(ring)), {
    message: 'The area outline crosses itself - move a corner so its edges do not cross',
  });

export type ContributionArea = z.infer<typeof contributionAreaSchema>;

function isRingClosedExactly(ring: readonly Position[]): boolean {
  const first = ring.at(0);
  const last = ring.at(-1);
  if (!first || !last) return false;
  return first[0] === last[0] && first[1] === last[1];
}

function distinctCorners(ring: readonly Position[]): number {
  return new Set(ring.map(([lng, lat]) => `${String(lng)},${String(lat)}`)).size;
}

/** Drops the repeated closing corner, if present. */
export function openRing(ring: readonly Position[]): AreaRing {
  return isRingClosedExactly(ring) && ring.length > 1 ? ring.slice(0, -1) : [...ring];
}

/** Builds a valid area from the corners an admin placed, in order. */
export function areaFromCorners(corners: readonly Position[]): ContributionArea {
  return { type: 'Polygon', coordinates: [closeRing(corners)] };
}

export function areaFromBBox([west, south, east, north]: BBox): ContributionArea {
  return areaFromCorners([
    [west, south],
    [east, south],
    [east, north],
    [west, north],
  ]);
}

/** The bounding box of an area - for fitting the map to it. */
export function areaBBox(area: ContributionArea): BBox {
  const ring = area.coordinates[0];
  const lngs = ring.map(([lng]) => lng);
  const lats = ring.map(([, lat]) => lat);
  return [Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats)];
}

/* ------------------------------------------------------------ geometry ---- */

/** Twice the signed area of the triangle a-b-c: >0 left turn, <0 right turn, 0 straight. */
function cross(a: Position, b: Position, c: Position): number {
  return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
}

function onSegment(a: Position, b: Position, p: Position): boolean {
  return (
    cross(a, b, p) === 0 &&
    Math.min(a[0], b[0]) <= p[0] &&
    p[0] <= Math.max(a[0], b[0]) &&
    Math.min(a[1], b[1]) <= p[1] &&
    p[1] <= Math.max(a[1], b[1])
  );
}

/** Whether segments a-b and c-d share any point, touching included. */
export function segmentsIntersect(a: Position, b: Position, c: Position, d: Position): boolean {
  const d1 = cross(c, d, a);
  const d2 = cross(c, d, b);
  const d3 = cross(a, b, c);
  const d4 = cross(a, b, d);
  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) {
    return true;
  }
  return onSegment(c, d, a) || onSegment(c, d, b) || onSegment(a, b, c) || onSegment(a, b, d);
}

/** Whether segments a-b and c-d cross each other, rather than merely touch. */
function segmentsCross(a: Position, b: Position, c: Position, d: Position): boolean {
  const d1 = cross(c, d, a);
  const d2 = cross(c, d, b);
  const d3 = cross(a, b, c);
  const d4 = cross(a, b, d);
  return d1 * d2 < 0 && d3 * d4 < 0;
}

function ringEdges(ring: readonly Position[]): [Position, Position][] {
  return ring.map((corner, index) => [corner, ring[(index + 1) % ring.length] ?? corner]);
}

/** True when no two non-neighbouring edges of the (open) ring meet. */
export function isRingSimple(ring: readonly Position[]): boolean {
  const edges = ringEdges(ring);
  for (let i = 0; i < edges.length; i += 1) {
    for (let j = i + 1; j < edges.length; j += 1) {
      /* Neighbours share a corner by definition; the first and last edge too. */
      const neighbours = j === i + 1 || (i === 0 && j === edges.length - 1);
      if (neighbours) continue;
      const [a, b] = edges[i] ?? [];
      const [c, d] = edges[j] ?? [];
      if (a && b && c && d && segmentsIntersect(a, b, c, d)) return false;
    }
  }
  return true;
}

/** Point in polygon by ray casting; a point on the outline counts as inside. */
export function isPositionInArea(position: Position, area: ContributionArea): boolean {
  const ring = openRing(area.coordinates[0]);
  const edges = ringEdges(ring);
  if (edges.some(([a, b]) => onSegment(a, b, position))) return true;

  const [x, y] = position;
  let inside = false;
  for (const [[x1, y1], [x2, y2]] of edges) {
    const straddles = y1 > y !== y2 > y;
    if (straddles && x < ((x2 - x1) * (y - y1)) / (y2 - y1) + x1) inside = !inside;
  }
  return inside;
}

/**
 * True when the whole geometry lies inside the area: every corner inside, and
 * - for lines and polygons - no edge crossing the area's outline on the way,
 * which a concave area would otherwise let slip through.
 */
export function isGeometryWithinArea(geometry: Geometry, area: ContributionArea): boolean {
  if (!geometryPositions(geometry).every((position) => isPositionInArea(position, area))) {
    return false;
  }
  if (geometry.type === 'Point') return true;

  const segments: [Position, Position][] =
    geometry.type === 'LineString'
      ? geometry.coordinates.slice(1).map((end, i) => [geometry.coordinates[i] ?? end, end])
      : geometry.coordinates.flatMap((ring) =>
          ring.slice(1).map((end, i): [Position, Position] => [ring[i] ?? end, end]),
        );
  const outline = ringEdges(openRing(area.coordinates[0]));

  return segments.every(([a, b]) => outline.every(([c, d]) => !segmentsCross(a, b, c, d)));
}
