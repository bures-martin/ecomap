import type { ImageContentType } from '@ecomap/shared';
import type { Sql } from '../../db/client.js';

export interface StoredImage {
  contentType: ImageContentType;
  data: Buffer;
}

export async function countFeatureImages(db: Sql, featureId: string): Promise<number> {
  const [row] = await db<{ count: number }[]>`
    select count(*)::int as count from feature_images where feature_id = ${featureId}
  `;
  return row?.count ?? 0;
}

/** Appends a photo after the existing ones. */
export async function insertFeatureImage(
  db: Sql,
  input: {
    featureId: string;
    contentType: ImageContentType;
    data: Buffer;
    alt: string;
    createdBy: string;
  },
): Promise<string> {
  const [row] = await db<{ id: string }[]>`
    insert into feature_images (feature_id, content_type, data, alt, created_by, sort_order)
    values (
      ${input.featureId}, ${input.contentType}, ${input.data}, ${input.alt}, ${input.createdBy},
      (select coalesce(max(sort_order), -1) + 1 from feature_images where feature_id = ${input.featureId})
    )
    returning id
  `;
  if (!row) throw new Error('Insert returned no row');
  return row.id;
}

export async function findFeatureImage(
  db: Sql,
  featureId: string,
  imageId: string,
): Promise<StoredImage | null> {
  const [row] = await db<StoredImage[]>`
    select content_type as "contentType", data
    from feature_images where id = ${imageId} and feature_id = ${featureId}
  `;
  return row ?? null;
}

/** Returns whether a photo with that id belonged to that contribution. */
export async function updateFeatureImageAlt(
  db: Sql,
  featureId: string,
  imageId: string,
  alt: string,
): Promise<boolean> {
  const rows = await db`
    update feature_images set alt = ${alt}
    where id = ${imageId} and feature_id = ${featureId}
    returning id
  `;
  return rows.length > 0;
}

export async function deleteFeatureImage(
  db: Sql,
  featureId: string,
  imageId: string,
): Promise<boolean> {
  const rows = await db`
    delete from feature_images where id = ${imageId} and feature_id = ${featureId} returning id
  `;
  return rows.length > 0;
}
