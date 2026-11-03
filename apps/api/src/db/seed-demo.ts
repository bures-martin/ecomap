import { env } from '../env.js';
import { logger } from '../logger.js';
import { isMainModule } from '../lib/main-module.js';
import { insertFeature } from '../modules/features/repository.js';
import { createSql, type Sql } from './client.js';
import { BORNHOLM_DEMO_PLACES } from './demo/bornholm.js';
import { BORNHOLM_ABOUT } from './demo/bornholmAbout.js';
import { seed } from './seed.js';

/**
 * Opt-in example content: real eco places on Bornholm, taken from
 * OpenStreetMap (see `demo/bornholm.ts` for the source and licence).
 *
 * For a demo or a portfolio instance - not for a real community, which should
 * start empty. Safe to run again: a place already on the map (same layer, same
 * name) is skipped.
 */

/**
 * Made-up sample places that earlier versions of the seed created. They look
 * real but do not exist, so they are removed - only when the seed's own admin
 * account created them, never anything a person added.
 */
const RETIRED_FICTIONAL_PLACES = [
  'Nexø shared kitchen garden',
  'Rønne allotments',
  'Rønne repair café',
  'Bicycle rescue, Allinge',
  'Common toads crossing at Ekkodalen',
  'Ekkodalen valley walk',
  'Hammerknuden coast path',
  'Community wind turbines, Klemensker',
  'Zero-waste grocer, Svaneke',
  'Spring beach clean, Dueodde',
  'Hedgerow planting weekend',
] as const;

export async function seedDemo(db: Sql): Promise<{ added: number; removed: number }> {
  const { admin, layerIdBySlug } = await seed(db);

  const removed = await db`
    delete from features
    where created_by = ${admin.id} and name in ${db(RETIRED_FICTIONAL_PLACES)}
    returning id
  `;
  if (removed.length > 0) {
    logger.info({ count: removed.length }, 'Removed the old made-up sample places');
  }

  let added = 0;
  for (const place of BORNHOLM_DEMO_PLACES) {
    const layerId = layerIdBySlug.get(place.layerSlug);
    if (!layerId) {
      logger.warn({ slug: place.layerSlug }, 'Unknown layer in demo data - skipped');
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

  /* The showcase's About text, unless an admin has written one already. */
  await db`
    update community_settings set about_markdown = ${BORNHOLM_ABOUT}
    where about_markdown = ''
  `;

  logger.info(
    { added, alreadyThere: BORNHOLM_DEMO_PLACES.length - added },
    'Bornholm demo places ready (data © OpenStreetMap contributors, ODbL)',
  );
  return { added, removed: removed.length };
}

async function main(): Promise<void> {
  const db = createSql(env.DATABASE_URL);
  try {
    await seedDemo(db);
    logger.info('Demo seed complete');
  } finally {
    await db.end({ timeout: 5 });
  }
}

if (isMainModule(import.meta.url)) {
  main().catch((error: unknown) => {
    logger.error({ err: error }, 'Demo seed failed');
    process.exitCode = 1;
  });
}
