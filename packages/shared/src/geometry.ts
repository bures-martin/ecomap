import { z } from 'zod';

/**
 * GeoJSON (RFC 7946) subset used by EcoMap.
 *
 * A layer may allow any combination of these, which covers the four things a
 * contributor can draw: a point, a path/line, an area/shape and (as a polygon)
 * a zone. Everything is stored in WGS84 / EPSG:4326, longitude first.
 */
export const GEOMETRY_KINDS = ['Point', 'LineString', 'Polygon'] as const;
export type GeometryKind = (typeof GEOMETRY_KINDS)[number];

export const geometryKindSchema = z.enum(GEOMETRY_KINDS);

export const longitudeSchema = z.number().min(-180).max(180);
export const latitudeSchema = z.number().min(-90).max(90);

/** GeoJSON positions are `[longitude, latitude]` - the opposite of Leaflet's order. */
export const positionSchema = z.tuple([longitudeSchema, latitudeSchema]);
export type Position = z.infer<typeof positionSchema>;

export const pointSchema = z.object({
  type: z.literal('Point'),
  coordinates: positionSchema,
});

export const lineStringSchema = z.object({
  type: z.literal('LineString'),
  coordinates: z.array(positionSchema).min(2, 'A line needs at least two points'),
});

const linearRingSchema = z
  .array(positionSchema)
  .min(4, 'A ring needs at least four positions (the last repeats the first)')
  .refine((ring) => isRingClosed(ring), { message: 'The first and last position must be equal' });

export const polygonSchema = z.object({
  type: z.literal('Polygon'),
  coordinates: z.array(linearRingSchema).min(1, 'A polygon needs an outer ring'),
});

export const geometrySchema = z.discriminatedUnion('type', [
  pointSchema,
  lineStringSchema,
  polygonSchema,
]);

export type Point = z.infer<typeof pointSchema>;
export type LineString = z.infer<typeof lineStringSchema>;
export type Polygon = z.infer<typeof polygonSchema>;
export type Geometry = z.infer<typeof geometrySchema>;

function isRingClosed(ring: readonly Position[]): boolean {
  const first = ring.at(0);
  const last = ring.at(-1);
  if (!first || !last) return false;
  return first[0] === last[0] && first[1] === last[1];
}

/** Closes a ring in place-safe fashion, so callers can hand us an open ring. */
export function closeRing(ring: readonly Position[]): Position[] {
  if (isRingClosed(ring)) return [...ring];
  const first = ring.at(0);
  return first ? [...ring, first] : [...ring];
}

/**
 * A bounding box as `[west, south, east, north]`.
 *
 * Used for map-viewport queries and for the optional contribution bounds an
 * admin can configure, so a community map can be restricted to its own region.
 */
export const bboxSchema = z
  .tuple([longitudeSchema, latitudeSchema, longitudeSchema, latitudeSchema])
  .refine(([, south, , north]) => south <= north, {
    message: 'South must not be north of north',
  });

export type BBox = z.infer<typeof bboxSchema>;

/** Parses the `bbox=w,s,e,n` query/URL parameter used by the API and the web app. */
export const bboxStringSchema = z.string().transform((value, ctx): BBox => {
  const parts = value.split(',').map((part) => Number(part.trim()));
  const parsed = bboxSchema.safeParse(parts);
  if (!parsed.success) {
    ctx.addIssue({ code: 'custom', message: 'Expected "west,south,east,north"' });
    return z.NEVER;
  }
  return parsed.data;
});

export function bboxToString(bbox: BBox): string {
  return bbox.map((n) => n.toFixed(6)).join(',');
}

/** Every position in a geometry, flattened - handy for bounds checks and centroids. */
export function geometryPositions(geometry: Geometry): Position[] {
  switch (geometry.type) {
    case 'Point':
      return [geometry.coordinates];
    case 'LineString':
      return geometry.coordinates;
    case 'Polygon':
      return geometry.coordinates.flat();
  }
}

/**
 * Representative point of a geometry - the average of its positions.
 *
 * Good enough to place a label or fly the map to a feature; it is deliberately
 * not a true centroid, which PostGIS computes server-side when we need one.
 */
export function geometryAnchor(geometry: Geometry): Position {
  if (geometry.type === 'Point') return geometry.coordinates;
  const positions = geometryPositions(geometry);
  const total = positions.reduce<[number, number]>(
    (acc, [lng, lat]) => [acc[0] + lng, acc[1] + lat],
    [0, 0],
  );
  return [total[0] / positions.length, total[1] / positions.length];
}

/** True when every position of `geometry` falls inside `bbox`. */
export function isGeometryWithinBBox(geometry: Geometry, bbox: BBox): boolean {
  const [west, south, east, north] = bbox;
  return geometryPositions(geometry).every(
    ([lng, lat]) => lng >= west && lng <= east && lat >= south && lat <= north,
  );
}
