import {
  canDeleteFeature,
  canEditFeature,
  hasPermission,
  isGeometryWithinBBox,
  layerPropertiesSchema,
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
import { getCommunitySettings } from '../settings/repository.js';
import { deleteFeature, findFeatureById, insertFeature, updateFeature } from './repository.js';

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
  await assertWithinContributionBounds(db, input.geometry);

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

  if (!canEditFeature({ id: actor.userId, role: actor.role }, existing)) {
    throw ApiError.forbidden('You can only edit contributions you added');
  }

  const layer = await requireLayer(db, existing.layerId);

  if (input.geometry) {
    assertGeometryAllowed(layer, input.geometry.type);
    await assertWithinContributionBounds(db, input.geometry);
  }

  const properties =
    input.properties === undefined ? undefined : validateProperties(layer, input.properties);

  /*
   * An edit by the author sends a moderated feature back for review; an edit by
   * a moderator does not, since they could approve it again immediately anyway.
   */
  const status: FeatureStatus | undefined =
    layer.requiresModeration &&
    existing.status === 'published' &&
    !hasPermission(actor.role, 'feature:moderate')
      ? 'pending'
      : undefined;

  const updated = await updateFeature(
    db,
    featureId,
    {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.geometry !== undefined ? { geometry: input.geometry } : {}),
      ...(properties !== undefined ? { properties } : {}),
      ...(status !== undefined ? { status } : {}),
    },
    actor.userId,
  );

  if (!updated) throw ApiError.notFound('That contribution');
  return updated;
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

async function assertWithinContributionBounds(
  db: Sql,
  geometry: Feature['geometry'],
): Promise<void> {
  const settings = await getCommunitySettings(db);
  if (!settings.contributionBounds) return;

  if (!isGeometryWithinBBox(geometry, settings.contributionBounds)) {
    throw ApiError.badRequest(`Contributions have to be inside the ${settings.name} area`);
  }
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
