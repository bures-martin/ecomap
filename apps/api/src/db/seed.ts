import {
  DEFAULT_COMMUNITY_SETTINGS,
  type CommunitySettings,
  type UpdateCommunitySettingsInput,
} from '@ecomap/shared';
import { hashPassword } from '../auth/password.js';
import { COMMUNITIES, type Community } from '../communities/index.js';
import { env } from '../env.js';
import { logger } from '../logger.js';
import { isMainModule } from '../lib/main-module.js';
import { insertFeature } from '../modules/features/repository.js';
import { findLayerBySlug, insertLayer } from '../modules/layers/repository.js';
import { getCommunitySettings, updateCommunitySettings } from '../modules/settings/repository.js';
import { findUserByEmail, insertUser, type UserRow } from '../modules/users/repository.js';
import { createSql, type Sql } from './client.js';
import { migrate } from './migrate.js';

/**
 * Writes one community into the database: the superadmin account, then the
 * community's settings, layers and places (see `src/communities`). Which one
 * comes from the COMMUNITY variable - "bornholm", or "neutral" (the default:
 * a few English layers and no places, for a community anywhere).
 *
 * Safe to run again: it creates only what is missing and never changes an
 * existing account, a layer an admin has edited, or a setting an admin has
 * changed.
 */

export interface SeedResult {
  admin: UserRow;
  layerIdBySlug: Map<string, string>;
  placesAdded: number;
}

export async function seed(db: Sql, community: Community): Promise<SeedResult> {
  await migrate(db);

  const admin =
    (await findUserByEmail(db, env.SEED_ADMIN_EMAIL)) ??
    (await insertUser(db, {
      email: env.SEED_ADMIN_EMAIL,
      displayName: env.SEED_ADMIN_NAME,
      passwordHash: await hashPassword(env.SEED_ADMIN_PASSWORD),
      role: 'superadmin',
    }));
  logger.info({ email: admin.email, role: admin.role }, 'Admin account ready');

  await applySettings(db, community.settings);

  const layerIdBySlug = new Map<string, string>();
  for (const input of community.layers) {
    const existing = await findLayerBySlug(db, input.slug);
    const layer = existing ?? (await insertLayer(db, input, admin.id));
    layerIdBySlug.set(layer.slug, layer.id);
    logger.info({ slug: layer.slug, created: !existing }, 'Layer ready');
  }

  if (community.retiredPlaceNames?.length) {
    const removed = await db`
      delete from features
      where created_by = ${admin.id} and name in ${db(community.retiredPlaceNames)}
      returning id
    `;
    if (removed.length > 0) logger.info({ count: removed.length }, 'Removed retired places');
  }

  const placesAdded = await addPlaces(db, community, admin, layerIdBySlug);
  logger.info(
    { community: community.slug, added: placesAdded, total: community.places.length },
    'Places ready',
  );

  return { admin, layerIdBySlug, placesAdded };
}

/**
 * The community's settings, each one only while it still has the built-in
 * default - so an admin's own name, colours or texts survive a second run.
 */
async function applySettings(db: Sql, wanted: UpdateCommunitySettingsInput): Promise<void> {
  const current = await getCommunitySettings(db);
  const changes: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(wanted)) {
    const field = key as keyof typeof DEFAULT_COMMUNITY_SETTINGS & keyof CommunitySettings;
    const untouched =
      JSON.stringify(current[field]) === JSON.stringify(DEFAULT_COMMUNITY_SETTINGS[field]);
    if (untouched) changes[key] = value;
  }
  if (Object.keys(changes).length === 0) return;
  await updateCommunitySettings(db, changes);
  logger.info({ fields: Object.keys(changes) }, 'Community settings written');
}

/** Adds the places that are not on the map yet (same layer, same name). */
async function addPlaces(
  db: Sql,
  community: Community,
  admin: UserRow,
  layerIdBySlug: ReadonlyMap<string, string>,
): Promise<number> {
  let added = 0;
  for (const place of community.places) {
    const layerId = layerIdBySlug.get(place.layerSlug);
    if (!layerId) {
      logger.warn({ slug: place.layerSlug }, 'Place on a layer the community lacks - skipped');
      continue;
    }

    const [existing] = await db`
      select 1 from features where layer_id = ${layerId} and name = ${place.name} limit 1
    `;
    if (existing) continue;

    await insertFeature(db, {
      layerId,
      name: place.name,
      description: place.description,
      geometry: { type: 'Point', coordinates: place.coordinates },
      properties: place.properties,
      status: 'published',
      createdBy: admin.id,
    });
    added += 1;
  }
  return added;
}

async function main(): Promise<void> {
  const db = createSql(env.DATABASE_URL);
  try {
    const community = COMMUNITIES[env.COMMUNITY];
    logger.info({ community: community.slug }, 'Seeding community');
    await seed(db, community);
    logger.info('Seed complete');
  } finally {
    await db.end({ timeout: 5 });
  }
}

if (isMainModule(import.meta.url)) {
  main().catch((error: unknown) => {
    logger.error({ err: error }, 'Seed failed');
    process.exitCode = 1;
  });
}
