import {
  layerFieldSchema,
  layerSchema,
  type CreateLayerInput,
  type GeometryKind,
  type Layer,
  type LayerField,
  type UpdateLayerInput,
} from '@ecomap/shared';
import { z } from 'zod';
import type { Sql } from '../../db/client.js';

interface LayerRow {
  id: string;
  slug: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  allowedGeometries: string[];
  fields: unknown;
  sortOrder: number;
  isPublished: boolean;
  requiresModeration: boolean;
  featureCount: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * `featureCount` counts published features only - it drives the "42 places"
 * label in the legend, which should not include things awaiting moderation.
 */
function layerColumns(db: Sql) {
  return db`
    l.id,
    l.slug,
    l.name,
    l.description,
    l.color,
    l.icon,
    l.allowed_geometries  as "allowedGeometries",
    l.fields,
    l.sort_order          as "sortOrder",
    l.is_published        as "isPublished",
    l.requires_moderation as "requiresModeration",
    l.created_at          as "createdAt",
    l.updated_at          as "updatedAt",
    (
      select count(*)::text
      from features f
      where f.layer_id = l.id and f.status = 'published'
    ) as "featureCount"
  `;
}

export async function listLayers(db: Sql, includeUnpublished: boolean): Promise<Layer[]> {
  const rows = await db<LayerRow[]>`
    select ${layerColumns(db)}
    from layers l
    ${includeUnpublished ? db`` : db`where l.is_published = true`}
    order by l.sort_order asc, l.name asc
  `;
  return rows.map(toLayer);
}

export async function findLayerById(db: Sql, id: string): Promise<Layer | null> {
  const [row] = await db<LayerRow[]>`
    select ${layerColumns(db)} from layers l where l.id = ${id}
  `;
  return row ? toLayer(row) : null;
}

export async function findLayerBySlug(db: Sql, slug: string): Promise<Layer | null> {
  const [row] = await db<LayerRow[]>`
    select ${layerColumns(db)} from layers l where l.slug = ${slug}
  `;
  return row ? toLayer(row) : null;
}

export async function insertLayer(
  db: Sql,
  input: CreateLayerInput,
  createdBy: string | null,
): Promise<Layer> {
  /*
   * Two statements rather than one CTE: a data-modifying CTE's rows are not
   * visible to the SELECT in the same statement, so the join would find nothing.
   */
  const [inserted] = await db<{ id: string }[]>`
    insert into layers (
      slug, name, description, color, icon,
      allowed_geometries, fields, sort_order, is_published, requires_moderation,
      created_by
    )
    values (
      ${input.slug}, ${input.name}, ${input.description}, ${input.color}, ${input.icon},
      ${db.array(input.allowedGeometries)}, ${db.json(input.fields)}, ${input.sortOrder},
      ${input.isPublished}, ${input.requiresModeration}, ${createdBy}
    )
    returning id
  `;
  if (!inserted) throw new Error('Insert returned no row');

  const layer = await findLayerById(db, inserted.id);
  if (!layer) throw new Error('Inserted layer disappeared');
  return layer;
}

export async function updateLayer(
  db: Sql,
  id: string,
  input: UpdateLayerInput,
): Promise<Layer | null> {
  const assignments: Record<string, unknown> = {};

  if (input.name !== undefined) assignments['name'] = input.name;
  if (input.description !== undefined) assignments['description'] = input.description;
  if (input.color !== undefined) assignments['color'] = input.color;
  if (input.icon !== undefined) assignments['icon'] = input.icon;
  if (input.allowedGeometries !== undefined) {
    assignments['allowed_geometries'] = db.array(input.allowedGeometries);
  }
  if (input.fields !== undefined) assignments['fields'] = db.json(input.fields);
  if (input.sortOrder !== undefined) assignments['sort_order'] = input.sortOrder;
  if (input.isPublished !== undefined) assignments['is_published'] = input.isPublished;
  if (input.requiresModeration !== undefined) {
    assignments['requires_moderation'] = input.requiresModeration;
  }

  if (Object.keys(assignments).length === 0) {
    return findLayerById(db, id);
  }

  const [updated] = await db<{ id: string }[]>`
    update layers set ${db(assignments)} where id = ${id} returning id
  `;
  return updated ? findLayerById(db, id) : null;
}

export async function deleteLayer(db: Sql, id: string): Promise<boolean> {
  const rows = await db`delete from layers where id = ${id} returning id`;
  return rows.length > 0;
}

export async function findLayerIdsBySlugs(db: Sql, slugs: readonly string[]): Promise<string[]> {
  if (slugs.length === 0) return [];
  const rows = await db<{ id: string }[]>`
    select id from layers where slug in ${db(slugs)}
  `;
  return rows.map((row) => row.id);
}

const fieldsSchema = z.array(layerFieldSchema).catch([]);

function toLayer(row: LayerRow): Layer {
  return layerSchema.parse({
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    color: row.color,
    icon: row.icon,
    allowedGeometries: row.allowedGeometries as GeometryKind[],
    fields: fieldsSchema.parse(row.fields) satisfies LayerField[],
    sortOrder: row.sortOrder,
    isPublished: row.isPublished,
    requiresModeration: row.requiresModeration,
    featureCount: Number(row.featureCount),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}
