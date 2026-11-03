import {
  FEATURE_IMAGE_MAX_COUNT,
  canDeleteFeature,
  canEditFeature,
  editIsSuggestion,
  hasPermission,
  layerPropertiesSchema,
  sniffImageContentType,
  type CreateFeatureInput,
  type Feature,
  type FeatureStatus,
  type Layer,
  type ModerateFeatureInput,
  type PropertyBag,
  type UpdateFeatureInput,
} from '@ecomap/shared';
import type { AuthContext } from '../../auth/context.js';
import type { Sql } from '../../db/client.js';
import { ApiError, parseOrThrow } from '../../http/api-error.js';
import { findLayerById } from '../layers/repository.js';
import { getCommunitySettings, isWithinContributionArea } from '../settings/repository.js';
import {
  countFeatureImages,
  deleteFeatureImage,
  insertFeatureImage,
  updateFeatureImageAlt,
} from './images.repository.js';
import {
  deleteFeature,
  findFeatureById,
  insertFeature,
  updateFeature,
  type UpdateFeatureFields,
} from './repository.js';

/**
 * Business rules for contributions. Kept out of the router so the checks read as
 * prose and can be tested without an HTTP layer.
 */

export async function createFeature(
  db: Sql,
  actor: AuthContext,
  input: CreateFeatureInput,
): Promise<Feature> {
  const layer = await requireLayer(db, input.layerId);

  if (!layer.isPublished && !hasPermission(actor.role, 'layer:read:unpublished')) {
    throw ApiError.notFound('That layer');
  }

  assertGeometryAllowed(layer, input.geometry.type);
  await assertWithinContributionArea(db, input.geometry);

  const properties = validateProperties(layer, input.properties);
  const status = initialStatus(layer, actor, input.isDraft);

  return insertFeature(db, {
    layerId: layer.id,
    name: input.name,
    description: input.description,
    geometry: input.geometry,
    properties,
    status,
    createdBy: actor.userId,
  });
}

export async function editFeature(
  db: Sql,
  actor: AuthContext,
  featureId: string,
  input: UpdateFeatureInput,
): Promise<Feature> {
  const existing = await requireFeature(db, featureId);
  const viewer = { id: actor.userId, role: actor.role };
  const layer = await requireLayer(db, existing.layerId);

  /* The live place stays as it is: this change goes through a suggestion. */
  if (editIsSuggestion(viewer, layer, existing)) {
    throw ApiError.conflict('This change needs a moderator’s approval - suggest it instead');
  }
  if (!canEditFeature(viewer, existing)) {
    throw ApiError.forbidden('You can only edit contributions you added');
  }

  const changes = await checkEdit(db, existing, input, layer);
  const status = statusAfterEdit(layer, existing, actor);

  const updated = await updateFeature(
    db,
    featureId,
    { ...changes, ...(status !== undefined ? { status } : {}) },
    actor.userId,
  );

  if (!updated) throw ApiError.notFound('That contribution');
  return updated;
}

/**
 * Checks a change against the place's layer - geometry it accepts, inside the
 * community area, fields that fit - and returns just the parts that change.
 * Shared by direct edits and suggestions, so both follow the same rules.
 */
export async function checkEdit(
  db: Sql,
  feature: Feature,
  input: UpdateFeatureInput,
  knownLayer?: Layer,
): Promise<Omit<UpdateFeatureFields, 'status'>> {
  const layer = knownLayer ?? (await requireLayer(db, feature.layerId));

  if (input.geometry) {
    assertGeometryAllowed(layer, input.geometry.type);
    await assertWithinContributionArea(db, input.geometry);
  }

  const properties =
    input.properties === undefined ? undefined : validateProperties(layer, input.properties);

  return {
    ...(input.name !== undefined ? { name: input.name } : {}),
    ...(input.description !== undefined ? { description: input.description } : {}),
    ...(input.geometry !== undefined ? { geometry: input.geometry } : {}),
    ...(properties !== undefined ? { properties } : {}),
  };
}

export async function removeFeature(db: Sql, actor: AuthContext, featureId: string): Promise<void> {
  const existing = await requireFeature(db, featureId);

  if (!canDeleteFeature({ id: actor.userId, role: actor.role }, existing)) {
    throw ApiError.forbidden('You can only delete contributions you added');
  }

  await deleteFeature(db, featureId);
}

export async function moderateFeature(
  db: Sql,
  actor: AuthContext,
  featureId: string,
  input: ModerateFeatureInput,
): Promise<Feature> {
  await requireFeature(db, featureId);

  const updated = await updateFeature(db, featureId, { status: input.status }, actor.userId);
  if (!updated) throw ApiError.notFound('That contribution');
  return updated;
}

/** A moderated layer holds new contributions until somebody approves them. */
function initialStatus(layer: Layer, actor: AuthContext, isDraft: boolean): FeatureStatus {
  if (isDraft) return 'draft';
  if (layer.requiresModeration && !hasPermission(actor.role, 'feature:moderate')) return 'pending';
  return 'published';
}

function assertGeometryAllowed(layer: Layer, kind: Feature['geometry']['type']): void {
  if (!layer.allowedGeometries.includes(kind)) {
    throw ApiError.badRequest(
      `The "${layer.name}" layer accepts ${layer.allowedGeometries.join(', ')} - not ${kind}`,
    );
  }
}

/** PostGIS has the last word: the browser's check is only there for quick feedback. */
async function assertWithinContributionArea(db: Sql, geometry: Feature['geometry']): Promise<void> {
  if (await isWithinContributionArea(db, geometry)) return;
  const settings = await getCommunitySettings(db);
  throw ApiError.badRequest(`Contributions have to be inside the ${settings.name} area`);
}

/** Validates the custom properties against this layer's own field definitions. */
function validateProperties(layer: Layer, properties: PropertyBag): PropertyBag {
  return parseOrThrow(
    layerPropertiesSchema(layer.fields),
    properties,
    'Some of this layer’s fields need attention',
  );
}

async function requireLayer(db: Sql, layerId: string): Promise<Layer> {
  const layer = await findLayerById(db, layerId);
  if (!layer) throw ApiError.notFound('That layer');
  return layer;
}

async function requireFeature(db: Sql, featureId: string): Promise<Feature> {
  const feature = await findFeatureById(db, featureId);
  if (!feature) throw ApiError.notFound('That contribution');
  return feature;
}

/**
 * An edit by the author sends a moderated feature back for review; an edit by
 * a moderator does not, since they could approve it again immediately anyway.
 * Photos count as edits: a new picture deserves the same look as new text.
 */
function statusAfterEdit(
  layer: Layer,
  existing: Feature,
  actor: AuthContext,
): FeatureStatus | undefined {
  return layer.requiresModeration &&
    existing.status === 'published' &&
    !hasPermission(actor.role, 'feature:moderate')
    ? 'pending'
    : undefined;
}

/**
 * Who may see a contribution - and therefore its photos: everyone once it is
 * published, moderators always, and its author while it is not.
 */
export function canViewFeature(viewer: AuthContext | null, feature: Feature): boolean {
  return (
    feature.status === 'published' ||
    hasPermission(viewer?.role, 'feature:read:unpublished') ||
    (viewer !== null && feature.createdById === viewer.userId)
  );
}

/* ------------------------------------------------------------- photos ---- */

async function requireEditableFeature(
  db: Sql,
  actor: AuthContext,
  featureId: string,
): Promise<Feature> {
  const feature = await requireFeature(db, featureId);
  if (!canEditFeature({ id: actor.userId, role: actor.role }, feature)) {
    throw ApiError.forbidden('You can only change photos of contributions you added');
  }
  return feature;
}

/** Applies the review rule after a photo change and returns the fresh contribution. */
async function afterPhotoChange(db: Sql, actor: AuthContext, feature: Feature): Promise<Feature> {
  const layer = await requireLayer(db, feature.layerId);
  const status = statusAfterEdit(layer, feature, actor);
  if (status) await updateFeature(db, feature.id, { status }, actor.userId);
  return requireFeature(db, feature.id);
}

export async function addFeatureImage(
  db: Sql,
  actor: AuthContext,
  featureId: string,
  bytes: Buffer,
  alt: string,
): Promise<Feature> {
  const feature = await requireEditableFeature(db, actor, featureId);

  if ((await countFeatureImages(db, featureId)) >= FEATURE_IMAGE_MAX_COUNT) {
    throw ApiError.conflict(
      `A contribution can have up to ${String(FEATURE_IMAGE_MAX_COUNT)} photos`,
    );
  }

  const contentType = sniffImageContentType(bytes);
  if (!contentType) throw ApiError.badRequest('That file is not a PNG, JPEG or WebP image');

  await insertFeatureImage(db, {
    featureId,
    contentType,
    data: bytes,
    alt,
    createdBy: actor.userId,
  });
  return afterPhotoChange(db, actor, feature);
}

export async function updateFeatureImage(
  db: Sql,
  actor: AuthContext,
  featureId: string,
  imageId: string,
  alt: string,
): Promise<Feature> {
  await requireEditableFeature(db, actor, featureId);
  if (!(await updateFeatureImageAlt(db, featureId, imageId, alt))) {
    throw ApiError.notFound('That photo');
  }
  /* A changed description is not a new picture; no second review needed. */
  return requireFeature(db, featureId);
}

export async function removeFeatureImage(
  db: Sql,
  actor: AuthContext,
  featureId: string,
  imageId: string,
): Promise<Feature> {
  await requireEditableFeature(db, actor, featureId);
  if (!(await deleteFeatureImage(db, featureId, imageId))) {
    throw ApiError.notFound('That photo');
  }
  return requireFeature(db, featureId);
}
