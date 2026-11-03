import {
  avatarPath,
  featureImagePath,
  featureSchema,
  type Feature,
  type FeatureStatus,
  type Geometry,
  type PropertyBag,
} from '@ecomap/shared';
import type { BBox } from '@ecomap/shared';
import type { Sql } from '../../db/client.js';

interface FeatureRow {
  id: string;
  layerId: string;
  layerSlug: string;
  name: string;
  description: string;
  geometry: unknown;
  properties: unknown;
  status: FeatureStatus;
  createdById: string | null;
  createdByName: string | null;
  createdByAvatarUpdatedAt: string | null;
  images: { id: string; alt: string }[];
  createdAt: string;
  updatedAt: string;
  totalCount?: string;
}

/**
 * PostGIS keeps the geometry in its own binary form; `ST_AsGeoJSON` hands it back
 * as the GeoJSON the client and the shared schemas already speak.
 */
function featureColumns(db: Sql) {
  return db`
    f.id,
    f.layer_id                   as "layerId",
    l.slug                       as "layerSlug",
    f.name,
    f.description,
    ST_AsGeoJSON(f.geom)::json   as geometry,
    f.properties,
    f.status,
    f.created_by                 as "createdById",
    u.display_name               as "createdByName",
    u.avatar_updated_at          as "createdByAvatarUpdatedAt",
    coalesce(
      (
        select json_agg(json_build_object('id', fi.id, 'alt', fi.alt)
                        order by fi.sort_order, fi.created_at)
        from feature_images fi
        where fi.feature_id = f.id
      ),
      '[]'::json
    )                            as images,
    f.created_at                 as "createdAt",
    f.updated_at                 as "updatedAt"
  `;
}

function featureJoins(db: Sql) {
  return db`
    from features f
    join layers l on l.id = f.layer_id
    left join users u on u.id = f.created_by
  `;
}

export interface ListFeaturesFilter {
  layerIds: readonly string[];
  bbox: BBox | undefined;
  search: string | undefined;
  status: FeatureStatus | undefined;
  onlyMine: boolean;
  viewerId: string | null;
  canReadUnpublished: boolean;
  includeUnpublishedLayers: boolean;
  limit: number;
  offset: number;
}

export interface ListFeaturesResult {
  features: Feature[];
  total: number;
}

export async function listFeatures(
  db: Sql,
  filter: ListFeaturesFilter,
): Promise<ListFeaturesResult> {
  /*
   * Visibility rule, in one place: moderators see everything, an author sees
   * their own unpublished work, everyone else sees only published features.
   */
  const visibility = filter.canReadUnpublished
    ? db`true`
    : filter.viewerId
      ? db`(f.status = 'published' or f.created_by = ${filter.viewerId})`
      : db`f.status = 'published'`;

  const rows = await db<FeatureRow[]>`
    select
      ${featureColumns(db)},
      count(*) over ()::text as "totalCount"
    ${featureJoins(db)}
    where ${visibility}
      and ${filter.includeUnpublishedLayers ? db`true` : db`l.is_published = true`}
      and ${filter.layerIds.length > 0 ? db`f.layer_id in ${db(filter.layerIds)}` : db`true`}
      and ${
        filter.bbox
          ? db`ST_Intersects(
              f.geom,
              ST_MakeEnvelope(
                ${filter.bbox[0]}, ${filter.bbox[1]}, ${filter.bbox[2]}, ${filter.bbox[3]}, 4326
              )
            )`
          : db`true`
      }
      and ${
        filter.search
          ? db`(f.name ilike ${`%${filter.search}%`} or f.description ilike ${`%${filter.search}%`})`
          : db`true`
      }
      and ${filter.status ? db`f.status = ${filter.status}` : db`true`}
      and ${filter.onlyMine && filter.viewerId ? db`f.created_by = ${filter.viewerId}` : db`true`}
    order by f.created_at desc
    limit ${filter.limit} offset ${filter.offset}
  `;

  return {
    features: rows.map(toFeature),
    /* The window count is evaluated before LIMIT, so it is the unpaged total. */
    total: Number(rows[0]?.totalCount ?? 0),
  };
}

export async function findFeatureById(db: Sql, id: string): Promise<Feature | null> {
  const [row] = await db<FeatureRow[]>`
    select ${featureColumns(db)} ${featureJoins(db)} where f.id = ${id}
  `;
  return row ? toFeature(row) : null;
}

export interface InsertFeatureInput {
  layerId: string;
  name: string;
  description: string;
  geometry: Geometry;
  properties: PropertyBag;
  status: FeatureStatus;
  createdBy: string | null;
}

export async function insertFeature(db: Sql, input: InsertFeatureInput): Promise<Feature> {
  const [row] = await db<{ id: string }[]>`
    insert into features (layer_id, name, description, geom, properties, status, created_by, updated_by)
    values (
      ${input.layerId},
      ${input.name},
      ${input.description},
      ST_SetSRID(ST_GeomFromGeoJSON(${db.json(input.geometry)}), 4326),
      ${db.json(input.properties)},
      ${input.status},
      ${input.createdBy},
      ${input.createdBy}
    )
    returning id
  `;
  if (!row) throw new Error('Insert returned no row');

  const feature = await findFeatureById(db, row.id);
  if (!feature) throw new Error('Inserted feature disappeared');
  return feature;
}

export interface UpdateFeatureFields {
  name?: string;
  description?: string;
  geometry?: Geometry;
  properties?: PropertyBag;
  status?: FeatureStatus;
}

export async function updateFeature(
  db: Sql,
  id: string,
  fields: UpdateFeatureFields,
  updatedBy: string | null,
): Promise<Feature | null> {
  const assignments: Record<string, unknown> = { updated_by: updatedBy };

  if (fields.name !== undefined) assignments['name'] = fields.name;
  if (fields.description !== undefined) assignments['description'] = fields.description;
  if (fields.properties !== undefined) assignments['properties'] = db.json(fields.properties);
  if (fields.status !== undefined) assignments['status'] = fields.status;

  const [updated] = await db<{ id: string }[]>`
    update features
    set ${db(assignments)}
        ${
          fields.geometry
            ? db`, geom = ST_SetSRID(ST_GeomFromGeoJSON(${db.json(fields.geometry)}), 4326)`
            : db``
        }
    where id = ${id}
    returning id
  `;

  return updated ? findFeatureById(db, id) : null;
}

export async function deleteFeature(db: Sql, id: string): Promise<boolean> {
  const rows = await db`delete from features where id = ${id} returning id`;
  return rows.length > 0;
}

export async function countPendingFeatures(db: Sql): Promise<number> {
  const [row] = await db<{ count: string }[]>`
    select count(*)::text as count from features where status = 'pending'
  `;
  return Number(row?.count ?? 0);
}

function toFeature(row: FeatureRow): Feature {
  return featureSchema.parse({
    id: row.id,
    layerId: row.layerId,
    layerSlug: row.layerSlug,
    name: row.name,
    description: row.description,
    geometry: row.geometry,
    properties: row.properties,
    status: row.status,
    createdById: row.createdById,
    createdByName: row.createdByName,
    createdByAvatarUrl:
      row.createdById && row.createdByAvatarUpdatedAt
        ? avatarPath(row.createdById, row.createdByAvatarUpdatedAt)
        : null,
    images: row.images.map((image) => ({
      id: image.id,
      alt: image.alt,
      url: featureImagePath(row.id, image.id),
    })),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}
