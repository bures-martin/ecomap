import {
  canSuggestEdit,
  type DecideSuggestionInput,
  type Feature,
  type FeatureSuggestion,
  type SuggestFeatureInput,
} from '@ecomap/shared';
import type { AuthContext } from '../../auth/context.js';
import type { Sql } from '../../db/client.js';
import { ApiError } from '../../http/api-error.js';
import { checkEdit } from '../features/service.js';
import { findFeatureById, updateFeature } from '../features/repository.js';
import { findSuggestionById, insertSuggestion, markSuggestionDecided } from './repository.js';

/**
 * A member's suggested change is checked exactly like a direct edit - geometry
 * the layer accepts, inside the community area, fields that fit the layer -
 * so a moderator only ever has to judge whether it is right, not whether it
 * is valid.
 */
export async function suggestEdit(
  db: Sql,
  actor: AuthContext,
  featureId: string,
  input: SuggestFeatureInput,
): Promise<FeatureSuggestion> {
  const feature = await findFeatureById(db, featureId);
  if (feature?.status !== 'published') throw ApiError.notFound('That place');
  if (!canSuggestEdit({ id: actor.userId, role: actor.role }, feature)) {
    throw ApiError.forbidden('Sign in as a member to suggest a change');
  }

  const changes = await checkEdit(db, feature, input);
  return insertSuggestion(db, featureId, changes, actor.userId);
}

/**
 * Approving applies the change and publishes it in one go; the fields are
 * checked again, as the layer may have changed since the suggestion came in.
 */
export async function decideSuggestion(
  db: Sql,
  actor: AuthContext,
  suggestionId: string,
  input: DecideSuggestionInput,
): Promise<{ suggestion: FeatureSuggestion; feature: Feature | null }> {
  const suggestion = await findSuggestionById(db, suggestionId);
  if (!suggestion) throw ApiError.notFound('That suggestion');
  if (suggestion.status !== 'pending')
    throw ApiError.conflict('That suggestion was decided already');

  if (input.decision === 'reject') {
    await markSuggestionDecided(db, suggestionId, 'rejected', actor.userId);
    return { suggestion: await requireSuggestion(db, suggestionId), feature: null };
  }

  const feature = await findFeatureById(db, suggestion.featureId);
  if (!feature) throw ApiError.notFound('That place');
  const changes = await checkEdit(db, feature, suggestion.changes);

  const updated = await db.begin(async (tx) => {
    const decided = await markSuggestionDecided(tx, suggestionId, 'approved', actor.userId);
    if (!decided) throw ApiError.conflict('That suggestion was decided already');
    return updateFeature(tx, feature.id, changes, actor.userId);
  });

  return { suggestion: await requireSuggestion(db, suggestionId), feature: updated };
}

async function requireSuggestion(db: Sql, id: string): Promise<FeatureSuggestion> {
  const suggestion = await findSuggestionById(db, id);
  if (!suggestion) throw ApiError.notFound('That suggestion');
  return suggestion;
}
