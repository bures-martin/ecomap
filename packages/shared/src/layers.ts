import { z } from 'zod';
import { GEOMETRY_KINDS, geometryKindSchema } from './geometry.js';

/**
 * A layer is the generic container for everything on the map. Nothing about
 * "wildlife sightings" or "recycling centres" is hard-coded: an admin creates a
 * layer, says which geometries it accepts and which extra fields it wants, and
 * both the map and the contribution form adapt.
 */

/** Icon names the web app ships; stored as a plain string so new ones are additive. */
export const LAYER_ICONS = [
  'leaf',
  'tree',
  'paw',
  'bike',
  'recycle',
  'sun',
  'droplet',
  'basket',
  'people',
  'book',
  'landmark',
  'alert',
  'heart',
  'pin',
  'plug',
] as const;
export type LayerIcon = (typeof LAYER_ICONS)[number];

export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(2)
  .max(60)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase words separated by single hyphens');

export const hexColorSchema = z
  .string()
  .trim()
  .regex(/^#[0-9a-fA-F]{6}$/, 'Use a hex colour such as #2f855a');

/**
 * Extra per-layer fields. A "community garden" layer might add `openingHours`
 * and `contact`; a "wildlife sighting" layer might add `species` and `count`.
 */
export const FIELD_TYPES = [
  'text',
  'longtext',
  'number',
  'boolean',
  'url',
  'date',
  'select',
] as const;
export type FieldType = (typeof FIELD_TYPES)[number];

export const layerFieldSchema = z
  .object({
    key: z
      .string()
      .trim()
      .min(1)
      .max(40)
      .regex(/^[a-z][a-zA-Z0-9]*$/, 'Use a camelCase key, e.g. openingHours'),
    label: z.string().trim().min(1).max(80),
    type: z.enum(FIELD_TYPES),
    required: z.boolean().default(false),
    helpText: z.string().trim().max(240).default(''),
    /** Only meaningful for `select`. */
    options: z.array(z.string().trim().min(1).max(80)).max(50).default([]),
  })
  .refine((field) => field.type !== 'select' || field.options.length > 0, {
    message: 'A select field needs at least one option',
    path: ['options'],
  });

export type LayerField = z.infer<typeof layerFieldSchema>;

export const layerSchema = z.object({
  id: z.uuid(),
  slug: slugSchema,
  name: z.string(),
  description: z.string(),
  color: hexColorSchema,
  icon: z.string(),
  allowedGeometries: z.array(geometryKindSchema).min(1),
  fields: z.array(layerFieldSchema),
  sortOrder: z.number().int(),
  isPublished: z.boolean(),
  /** Whether contributors may add features, or only moderators and above. */
  requiresModeration: z.boolean(),
  /**
   * Whether the layer is switched on when somebody opens the map. Off means
   * one tap away - its chip, the layer list or a search - rather than hidden.
   */
  visibleByDefault: z.boolean(),
  featureCount: z.number().int().nonnegative(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export type Layer = z.infer<typeof layerSchema>;

export const createLayerInputSchema = z.object({
  slug: slugSchema,
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(2000).default(''),
  color: hexColorSchema.default('#2f855a'),
  icon: z.string().trim().min(1).max(40).default('leaf'),
  allowedGeometries: z
    .array(geometryKindSchema)
    .min(1)
    .default([...GEOMETRY_KINDS]),
  fields: z.array(layerFieldSchema).max(30).default([]),
  sortOrder: z.number().int().min(0).max(9999).default(0),
  isPublished: z.boolean().default(true),
  requiresModeration: z.boolean().default(false),
  visibleByDefault: z.boolean().default(true),
});
export type CreateLayerInput = z.infer<typeof createLayerInputSchema>;

/**
 * The same shape *before* defaults are applied - what a caller actually has to
 * provide. Handy for forms and fixtures that only set a few properties.
 */
export type CreateLayerInputDraft = z.input<typeof createLayerInputSchema>;

/** Everything except the slug is editable; the slug is part of shareable URLs. */
export const updateLayerInputSchema = createLayerInputSchema.omit({ slug: true }).partial();
export type UpdateLayerInput = z.infer<typeof updateLayerInputSchema>;

export const propertyValueSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);
export type PropertyValue = z.infer<typeof propertyValueSchema>;
export type PropertyBag = Record<string, PropertyValue>;

/**
 * Builds a Zod schema for one layer's custom fields, so the same definition
 * validates the contribution form in the browser and the request on the server.
 *
 * Unknown keys are kept rather than stripped: a field removed from a layer
 * should not silently erase the values contributors already entered.
 */
export function layerPropertiesSchema(fields: readonly LayerField[]): z.ZodType<PropertyBag> {
  return z.record(z.string(), propertyValueSchema).superRefine((bag, ctx) => {
    for (const field of fields) {
      const value = bag[field.key];

      if (!isProvided(value)) {
        if (field.required) {
          ctx.addIssue({
            code: 'custom',
            message: `${field.label} is required`,
            path: [field.key],
          });
        }
        continue;
      }

      const result = fieldValueSchema(field).safeParse(value);
      if (!result.success) {
        for (const issue of result.error.issues) {
          ctx.addIssue({
            code: 'custom',
            message: issue.message,
            path: [field.key, ...issue.path],
          });
        }
      }
    }
  });
}

/** Empty string and null both mean "the contributor left this blank". */
function isProvided(value: PropertyValue | undefined): boolean {
  return value !== undefined && value !== null && value !== '';
}

function fieldValueSchema(field: LayerField): z.ZodType<PropertyValue> {
  switch (field.type) {
    case 'text':
      return z.string().max(300);
    case 'longtext':
      return z.string().max(4000);
    case 'number':
      /* Zod 4 rejects Infinity and NaN for `z.number()` already. */
      return z.number();
    case 'boolean':
      return z.boolean();
    case 'url':
      return z.string().max(500).pipe(z.url());
    case 'date':
      return z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use the format YYYY-MM-DD');
    case 'select':
      return z.string().refine((value) => field.options.includes(value), {
        message: `Choose one of: ${field.options.join(', ')}`,
      });
  }
}
