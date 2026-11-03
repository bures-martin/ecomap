import { hashPassword } from '../auth/password.js';
import { env } from '../env.js';
import { logger } from '../logger.js';
import { isMainModule } from '../lib/main-module.js';
import { findLayerBySlug, insertLayer } from '../modules/layers/repository.js';
import { findUserByEmail, insertUser, type UserRow } from '../modules/users/repository.js';
import { createSql, type Sql } from './client.js';
import { migrate } from './migrate.js';
import { STARTER_LAYERS } from './starterLayers.js';

/**
 * What every new community needs, and nothing more: the superadmin account and
 * the starter layers. No places - a real instance starts with an empty map.
 * Example places are a separate, opt-in step: `npm run db:seed:demo`.
 *
 * Idempotent: running it again creates only what is missing, and never
 * changes an existing account or a layer an admin has already edited.
 */

export interface SeedResult {
  admin: UserRow;
  layerIdBySlug: Map<string, string>;
}

export async function seed(db: Sql): Promise<SeedResult> {
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

  const layerIdBySlug = new Map<string, string>();
  for (const input of STARTER_LAYERS) {
    const existing = await findLayerBySlug(db, input.slug);
    const layer = existing ?? (await insertLayer(db, input, admin.id));
    layerIdBySlug.set(layer.slug, layer.id);
    logger.info({ slug: layer.slug, created: !existing }, 'Layer ready');
  }

  return { admin, layerIdBySlug };
}

async function main(): Promise<void> {
  const db = createSql(env.DATABASE_URL);
  try {
    await seed(db);
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
