import { z } from 'zod';
import { bboxStringSchema, geometrySchema } from './geometry.js';
import { featureImageSchema } from './images.js';
import { propertyValueSchema, slugSchema } from './layers.js';

/**
 * Moderation states. A layer with `requiresModeration` puts new contributions in
 * `pending`; everything else is `published` straight away. `draft` lets an author
 * park something half-finished, `rejected` keeps a record instead of deleting.
 */
export const FEATURE_STATUSES = ['draft', 'pending', 'published', 'rejected'] as const;
export type FeatureStatus = (typeof FEATURE_STATUSES)[number];
export const featureStatusSchema = z.enum(FEATURE_STATUSES);

export const featurePropertiesSchema = z.record(z.string(), propertyValueSchema);

export const featureSchema = z.object({
  id: z.uuid(),
  layerId: z.uuid(),
  layerSlug: slugSchema,
  name: z.string(),
  description: z.string(),
  geometry: geometrySchema,
  properties: featurePropertiesSchema,
  status: featureStatusSchema,
  createdById: z.uuid().nullable(),
  createdByName: z.string().nullable(),
  /** Versioned path of the author's profile picture, or null if they have none. */
  createdByAvatarUrl: z.string().nullable(),
  /** Photos, in display order. */
  images: z.array(featureImageSchema),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export type Feature = z.infer<typeof featureSchema>;

export const createFeatureInputSchema = z.object({
  layerId: z.uuid(),
  name: z.string().trim().min(2, 'Give it a short name').max(160),
  description: z.string().trim().max(4000).default(''),
  geometry: geometrySchema,
  properties: featurePropertiesSchema.default({}),
  /**
   * Authors may submit a draft; anything else is decided by the server from the
   * layer's moderation setting and the author's permissions.
   */
  isDraft: z.boolean().default(false),
});
export type CreateFeatureInput = z.infer<typeof createFeatureInputSchema>;

/**
 * Only what the caller sends changes. Built without the create schema's
 * defaults: a partial of it would turn a missing description into an empty one
 * and wipe the place's fields on every rename.
 */
export const updateFeatureInputSchema = z
  .object({
    name: createFeatureInputSchema.shape.name,
    description: z.string().trim().max(4000),
    geometry: geometrySchema,
    properties: featurePropertiesSchema,
  })
  .partial();
export type UpdateFeatureInput = z.infer<typeof updateFeatureInputSchema>;

export const moderateFeatureInputSchema = z.object({
  status: featureStatusSchema,
});
export type ModerateFeatureInput = z.infer<typeof moderateFeatureInputSchema>;

export const FEATURE_PAGE_SIZE = 200;
export const FEATURE_MAX_PAGE_SIZE = 1000;

/**
 * Filters live in the URL (`?layers=gardens,repair&q=bee&status=pending`), so a
 * filtered map is shareable and the back button works. One schema parses the
 * browser's `URLSearchParams` and the API's `req.query`.
 */
export const featureQuerySchema = z.object({
  /** Comma-separated layer slugs; empty means "every visible layer". */
  layers: z
    .string()
    .optional()
    .transform((value) =>
      (value ?? '')
        .split(',')
        .map((part) => part.trim().toLowerCase())
        .filter((part) => part.length > 0),
    )
    .pipe(z.array(slugSchema).max(50)),
  q: z.string().trim().max(120).optional(),
  bbox: bboxStringSchema.optional(),
  status: featureStatusSchema.optional(),
  /** Only features created by the signed-in user. */
  mine: z
    .string()
    .optional()
    .transform((value) => value === 'true' || value === '1'),
  limit: z.coerce.number().int().min(1).max(FEATURE_MAX_PAGE_SIZE).default(FEATURE_PAGE_SIZE),
  offset: z.coerce.number().int().min(0).default(0),
});
export type FeatureQuery = z.infer<typeof featureQuerySchema>;

export type FeatureQueryInput = z.input<typeof featureQuerySchema>;

export const featureCollectionSchema = z.object({
  type: z.literal('FeatureCollection'),
  features: z.array(
    z.object({
      type: z.literal('Feature'),
      id: z.uuid(),
      geometry: geometrySchema,
      properties: featureSchema.omit({ geometry: true }),
    }),
  ),
  /** Total matches ignoring `limit`, so the UI can say "showing 200 of 1,340". */
  total: z.number().int().nonnegative(),
});
export type FeatureCollection = z.infer<typeof featureCollectionSchema>;

/** Wraps domain features as GeoJSON, the format every map library understands. */
export function toFeatureCollection(
  features: readonly Feature[],
  total = features.length,
): FeatureCollection {
  return {
    type: 'FeatureCollection',
    total,
    features: features.map(({ geometry, ...rest }) => ({
      type: 'Feature' as const,
      id: rest.id,
      geometry,
      properties: rest,
    })),
  };
}

/** Flattens a GeoJSON collection back into the domain shape the UI works with. */
export function fromFeatureCollection(collection: FeatureCollection): Feature[] {
  return collection.features.map((feature) => ({
    ...feature.properties,
    geometry: feature.geometry,
  }));
}
