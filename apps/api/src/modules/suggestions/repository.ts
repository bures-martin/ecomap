import {
  featureSuggestionSchema,
  type FeatureSuggestion,
  type SuggestFeatureInput,
  type SuggestionStatus,
} from '@ecomap/shared';
import type { Queryable, Sql } from '../../db/client.js';

interface SuggestionRow {
  id: string;
  featureId: string;
  layerId: string;
  layerSlug: string;
  currentName: string;
  currentDescription: string;
  currentGeometry: unknown;
  currentProperties: unknown;
  changes: unknown;
  status: SuggestionStatus;
  proposedById: string | null;
  proposedByName: string | null;
  createdAt: string;
  decidedAt: string | null;
}

function selectSuggestions(db: Sql) {
  return db`
    select
      s.id,
      s.feature_id                  as "featureId",
      f.layer_id                    as "layerId",
      l.slug                        as "layerSlug",
      f.name                        as "currentName",
      f.description                 as "currentDescription",
      ST_AsGeoJSON(f.geom)::json    as "currentGeometry",
      f.properties                  as "currentProperties",
      s.changes,
      s.status,
      s.proposed_by                 as "proposedById",
      u.display_name                as "proposedByName",
      s.created_at                  as "createdAt",
      s.decided_at                  as "decidedAt"
    from feature_suggestions s
    join features f on f.id = s.feature_id
    join layers l on l.id = f.layer_id
    left join users u on u.id = s.proposed_by
  `;
}

function toSuggestion(row: SuggestionRow): FeatureSuggestion {
  return featureSuggestionSchema.parse({
    id: row.id,
    featureId: row.featureId,
    layerId: row.layerId,
    layerSlug: row.layerSlug,
    current: {
      name: row.currentName,
      description: row.currentDescription,
      geometry: row.currentGeometry,
      properties: row.currentProperties,
    },
    changes: row.changes,
    status: row.status,
    proposedById: row.proposedById,
    proposedByName: row.proposedByName,
    createdAt: row.createdAt,
    decidedAt: row.decidedAt,
  });
}

export async function insertSuggestion(
  db: Sql,
  featureId: string,
  changes: SuggestFeatureInput,
  proposedBy: string,
): Promise<FeatureSuggestion> {
  const [row] = await db<{ id: string }[]>`
    insert into feature_suggestions (feature_id, proposed_by, changes)
    values (${featureId}, ${proposedBy}, ${db.json(changes)})
    returning id
  `;
  const created = row ? await findSuggestionById(db, row.id) : null;
  if (!created) throw new Error('The suggestion was not stored');
  return created;
}

export async function findSuggestionById(db: Sql, id: string): Promise<FeatureSuggestion | null> {
  const [row] = await db<SuggestionRow[]>`${selectSuggestions(db)} where s.id = ${id}`;
  return row ? toSuggestion(row) : null;
}

/** Oldest first, so the queue is worked through in order. */
export async function listSuggestions(
  db: Sql,
  status: SuggestionStatus,
): Promise<FeatureSuggestion[]> {
  const rows = await db<SuggestionRow[]>`
    ${selectSuggestions(db)} where s.status = ${status} order by s.created_at
  `;
  return rows.map(toSuggestion);
}

export async function countPendingSuggestions(db: Sql): Promise<number> {
  const [row] = await db<{ count: string }[]>`
    select count(*)::text as count from feature_suggestions where status = 'pending'
  `;
  return Number(row?.count ?? 0);
}

/** Marks a pending suggestion decided; false when it was decided already. */
export async function markSuggestionDecided(
  db: Queryable,
  id: string,
  status: Exclude<SuggestionStatus, 'pending'>,
  decidedBy: string,
): Promise<boolean> {
  const rows = await db`
    update feature_suggestions
    set status = ${status}, decided_by = ${decidedBy}, decided_at = now()
    where id = ${id} and status = 'pending'
    returning id
  `;
  return rows.length > 0;
}
