import { z } from 'zod';
import { updateFeatureInputSchema, type FeatureStatus } from './features.js';
import { geometrySchema } from './geometry.js';
import { propertyValueSchema, slugSchema } from './layers.js';
import { hasPermission, type Role } from './permissions.js';

/**
 * Suggested changes to a place that is already on the map.
 *
 * Any signed-in member can suggest a fix to any published place - new opening
 * hours, a moved shop, a better description. The place stays exactly as it is
 * until a moderator approves the suggestion, which then applies it; rejecting
 * leaves the place untouched. Photos are not part of a suggestion.
 */

export const SUGGESTION_STATUSES = ['pending', 'approved', 'rejected'] as const;
export type SuggestionStatus = (typeof SUGGESTION_STATUSES)[number];
export const suggestionStatusSchema = z.enum(SUGGESTION_STATUSES);

/** What a suggestion changes: any of the editable parts, at least one of them. */
export const suggestFeatureInputSchema = updateFeatureInputSchema.refine(
  (changes) => Object.values(changes).some((value) => value !== undefined),
  { message: 'Change at least one thing' },
);
export type SuggestFeatureInput = z.infer<typeof suggestFeatureInputSchema>;

const featureContentSchema = z.object({
  name: z.string(),
  description: z.string(),
  geometry: geometrySchema,
  properties: z.record(z.string(), propertyValueSchema),
});

export const featureSuggestionSchema = z.object({
  id: z.uuid(),
  featureId: z.uuid(),
  layerId: z.uuid(),
  layerSlug: slugSchema,
  /** The place as it is now, for a before/after view. */
  current: featureContentSchema,
  /** Only the parts the suggestion changes. */
  changes: featureContentSchema.partial(),
  status: suggestionStatusSchema,
  proposedById: z.uuid().nullable(),
  proposedByName: z.string().nullable(),
  createdAt: z.iso.datetime(),
  decidedAt: z.iso.datetime().nullable(),
});
export type FeatureSuggestion = z.infer<typeof featureSuggestionSchema>;

export const decideSuggestionInputSchema = z.object({
  decision: z.enum(['approve', 'reject']),
});
export type DecideSuggestionInput = z.infer<typeof decideSuggestionInputSchema>;

type Actor = { id: string; role: Role } | null | undefined;

/** Whether someone may suggest a change to a place: any member, on a published place. */
export function canSuggestEdit(actor: Actor, feature: { status: FeatureStatus }): boolean {
  return (
    actor !== null &&
    actor !== undefined &&
    hasPermission(actor.role, 'feature:suggest') &&
    feature.status === 'published'
  );
}

/**
 * Whether an edit goes in as a suggestion rather than straight onto the map.
 *
 * Moderators always edit directly. Everybody else suggests, except authors
 * editing their own place where nothing needs approving - a draft, something
 * still waiting for review, or a place on a layer without review.
 */
export function editIsSuggestion(
  actor: Actor,
  layer: { requiresModeration: boolean },
  feature: { createdById: string | null; status: FeatureStatus },
): boolean {
  if (!actor || hasPermission(actor.role, 'feature:moderate')) return false;
  if (feature.createdById !== actor.id) return true;
  return layer.requiresModeration && feature.status === 'published';
}
