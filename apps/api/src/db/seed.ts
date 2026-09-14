import {
  createLayerInputSchema,
  type CreateLayerInput,
  type Geometry,
  type PropertyBag,
} from '@ecomap/shared';
import { hashPassword } from '../auth/password.js';
import { env } from '../env.js';
import { logger } from '../logger.js';
import { isMainModule } from '../lib/main-module.js';
import { findLayerBySlug, insertLayer } from '../modules/layers/repository.js';
import { insertFeature, listFeatures } from '../modules/features/repository.js';
import { findUserByEmail, insertUser } from '../modules/users/repository.js';
import { createSql, type Sql } from './client.js';
import { migrate } from './migrate.js';

/**
 * Idempotent demo data: an admin account, a starter set of layers drawn from the
 * project's topic list, and a handful of features around Bornholm so the map is
 * not empty on first run. Running it twice changes nothing.
 */

const LAYER_SEEDS: CreateLayerInput[] = [
  createLayerInputSchema.parse({
    slug: 'community-gardens',
    name: 'Community gardens',
    description: 'Shared growing space anyone can join, from allotments to a bed outside a school.',
    color: '#2f855a',
    icon: 'basket',
    allowedGeometries: ['Point', 'Polygon'],
    sortOrder: 10,
    fields: [
      { key: 'openingHours', label: 'When is it open?', type: 'text' },
      { key: 'contact', label: 'Who to contact', type: 'text' },
      { key: 'website', label: 'Website', type: 'url' },
      { key: 'acceptsNewMembers', label: 'Taking new members', type: 'boolean' },
    ],
  }),
  createLayerInputSchema.parse({
    slug: 'recycling-and-repair',
    name: 'Recycling & repair',
    description: 'Recycling points, repair cafés and places that take things others throw away.',
    color: '#2b6cb0',
    icon: 'recycle',
    allowedGeometries: ['Point'],
    sortOrder: 20,
    fields: [
      {
        key: 'accepts',
        label: 'What they take',
        type: 'select',
        options: ['Electronics', 'Textiles', 'Furniture', 'Bicycles', 'Everything'],
      },
      { key: 'openingHours', label: 'Opening hours', type: 'text' },
    ],
  }),
  createLayerInputSchema.parse({
    slug: 'wildlife-sightings',
    name: 'Wildlife sightings',
    description: 'Species people have spotted, and the biodiversity hotspots worth protecting.',
    color: '#975a16',
    icon: 'paw',
    allowedGeometries: ['Point', 'Polygon'],
    sortOrder: 30,
    requiresModeration: true,
    fields: [
      { key: 'species', label: 'Species', type: 'text', required: true },
      { key: 'observedOn', label: 'Seen on', type: 'date' },
      { key: 'count', label: 'How many', type: 'number' },
      { key: 'notes', label: 'Notes', type: 'longtext' },
    ],
  }),
  createLayerInputSchema.parse({
    slug: 'nature-trails',
    name: 'Nature trails',
    description: 'Walking and cycling routes through green space.',
    color: '#276749',
    icon: 'tree',
    allowedGeometries: ['LineString'],
    sortOrder: 40,
    fields: [
      { key: 'lengthKm', label: 'Length (km)', type: 'number' },
      {
        key: 'difficulty',
        label: 'Difficulty',
        type: 'select',
        options: ['Easy', 'Moderate', 'Demanding'],
      },
      { key: 'wheelchairFriendly', label: 'Wheelchair friendly', type: 'boolean' },
    ],
  }),
  createLayerInputSchema.parse({
    slug: 'renewable-energy',
    name: 'Renewable energy',
    description: 'Wind, solar, biogas and district heating projects, community-owned or not.',
    color: '#b7791f',
    icon: 'sun',
    allowedGeometries: ['Point', 'Polygon'],
    sortOrder: 50,
    fields: [
      {
        key: 'source',
        label: 'Energy source',
        type: 'select',
        options: ['Wind', 'Solar', 'Biogas', 'District heating', 'Other'],
      },
      { key: 'communityOwned', label: 'Community owned', type: 'boolean' },
      { key: 'capacityMw', label: 'Capacity (MW)', type: 'number' },
    ],
  }),
  createLayerInputSchema.parse({
    slug: 'eco-businesses',
    name: 'Eco-friendly businesses',
    description: 'Shops, cafés and makers working with local, organic or zero-waste practices.',
    color: '#805ad5',
    icon: 'leaf',
    allowedGeometries: ['Point'],
    sortOrder: 60,
    fields: [
      { key: 'website', label: 'Website', type: 'url' },
      { key: 'whatMakesItGreen', label: 'What makes it green?', type: 'longtext' },
    ],
  }),
  createLayerInputSchema.parse({
    slug: 'events-and-volunteering',
    name: 'Events & volunteering',
    description: 'Beach clean-ups, planting days, talks and anything else you can turn up to.',
    color: '#c05621',
    icon: 'people',
    allowedGeometries: ['Point', 'Polygon'],
    sortOrder: 70,
    fields: [
      { key: 'startsOn', label: 'Date', type: 'date', required: true },
      { key: 'organiser', label: 'Organiser', type: 'text' },
      { key: 'signUpUrl', label: 'Sign-up link', type: 'url' },
    ],
  }),
];

interface FeatureSeed {
  layerSlug: string;
  name: string;
  description: string;
  geometry: Geometry;
  properties: PropertyBag;
}

const FEATURE_SEEDS: FeatureSeed[] = [
  {
    layerSlug: 'community-gardens',
    name: 'Nexø shared kitchen garden',
    description: 'Raised beds behind the library, tended by whoever turns up on a Saturday.',
    geometry: { type: 'Point', coordinates: [15.1289, 55.0605] },
    properties: { openingHours: 'Saturdays 10:00-14:00', acceptsNewMembers: true },
  },
  {
    layerSlug: 'community-gardens',
    name: 'Rønne allotments',
    description: 'Long-standing allotment site on the edge of town.',
    geometry: { type: 'Point', coordinates: [14.7065, 55.0987] },
    properties: { openingHours: 'Daylight hours', acceptsNewMembers: false },
  },
  {
    layerSlug: 'recycling-and-repair',
    name: 'Rønne repair café',
    description: 'Bring a broken appliance, leave with a working one - and learn how.',
    geometry: { type: 'Point', coordinates: [14.7011, 55.0994] },
    properties: { accepts: 'Electronics', openingHours: 'First Sunday each month, 13:00-16:00' },
  },
  {
    layerSlug: 'recycling-and-repair',
    name: 'Bicycle rescue, Allinge',
    description: 'Volunteer-run workshop that rebuilds abandoned bikes.',
    geometry: { type: 'Point', coordinates: [14.8032, 55.2786] },
    properties: { accepts: 'Bicycles', openingHours: 'Wednesdays 16:00-19:00' },
  },
  {
    layerSlug: 'wildlife-sightings',
    name: 'Common toads crossing at Ekkodalen',
    description: 'Dozens cross the road here on the first warm rainy evenings of spring.',
    geometry: { type: 'Point', coordinates: [14.8942, 55.1204] },
    properties: { species: 'Bufo bufo', observedOn: '2026-03-28', count: 40 },
  },
  {
    layerSlug: 'nature-trails',
    name: 'Ekkodalen valley walk',
    description: 'Through the rift valley, with the echo wall at the northern end.',
    geometry: {
      type: 'LineString',
      coordinates: [
        [14.8785, 55.1279],
        [14.8871, 55.1236],
        [14.8968, 55.1188],
        [14.9052, 55.1151],
      ],
    },
    properties: { lengthKm: 4.2, difficulty: 'Easy', wheelchairFriendly: false },
  },
  {
    layerSlug: 'nature-trails',
    name: 'Hammerknuden coast path',
    description: 'Cliff-top route around the northern headland.',
    geometry: {
      type: 'LineString',
      coordinates: [
        [14.7649, 55.2965],
        [14.7712, 55.3009],
        [14.7803, 55.3021],
        [14.7871, 55.2978],
      ],
    },
    properties: { lengthKm: 3.1, difficulty: 'Moderate', wheelchairFriendly: false },
  },
  {
    layerSlug: 'renewable-energy',
    name: 'Community wind turbines, Klemensker',
    description: 'Two turbines part-owned by a local co-operative.',
    geometry: { type: 'Point', coordinates: [14.8112, 55.1671] },
    properties: { source: 'Wind', communityOwned: true, capacityMw: 4.5 },
  },
  {
    layerSlug: 'eco-businesses',
    name: 'Zero-waste grocer, Svaneke',
    description: 'Dry goods by weight - bring your own containers.',
    geometry: { type: 'Point', coordinates: [15.1416, 55.1364] },
    properties: { whatMakesItGreen: 'Package-free dry goods, local suppliers only.' },
  },
  {
    layerSlug: 'events-and-volunteering',
    name: 'Spring beach clean, Dueodde',
    description: 'Meet at the car park; bags and gloves provided.',
    geometry: { type: 'Point', coordinates: [15.0793, 54.9942] },
    properties: { startsOn: '2026-04-18', organiser: 'Bornholms Naturgruppe' },
  },
  {
    layerSlug: 'events-and-volunteering',
    name: 'Hedgerow planting weekend',
    description: 'Planting a 400 m hedge as a wildlife corridor between two farms.',
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [14.9312, 55.0871],
          [14.9401, 55.0871],
          [14.9401, 55.0921],
          [14.9312, 55.0921],
          [14.9312, 55.0871],
        ],
      ],
    },
    properties: { startsOn: '2026-11-07', organiser: 'Bomef' },
  },
];

export async function seed(db: Sql): Promise<void> {
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
  for (const input of LAYER_SEEDS) {
    const existing = await findLayerBySlug(db, input.slug);
    const layer = existing ?? (await insertLayer(db, input, admin.id));
    layerIdBySlug.set(layer.slug, layer.id);
    logger.info({ slug: layer.slug, created: !existing }, 'Layer ready');
  }

  /* Only seed features into an empty map, so a real database is never polluted. */
  const { total } = await listFeatures(db, {
    layerIds: [],
    bbox: undefined,
    search: undefined,
    status: undefined,
    onlyMine: false,
    viewerId: null,
    canReadUnpublished: true,
    includeUnpublishedLayers: true,
    limit: 1,
    offset: 0,
  });

  if (total > 0) {
    logger.info({ total }, 'Features already present - skipping feature seed');
    return;
  }

  for (const feature of FEATURE_SEEDS) {
    const layerId = layerIdBySlug.get(feature.layerSlug);
    if (!layerId) {
      logger.warn({ slug: feature.layerSlug }, 'Unknown layer in feature seed - skipped');
      continue;
    }

    await insertFeature(db, {
      layerId,
      name: feature.name,
      description: feature.description,
      geometry: feature.geometry,
      properties: feature.properties,
      status: 'published',
      createdBy: admin.id,
    });
  }

  logger.info({ count: FEATURE_SEEDS.length }, 'Seeded features');
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
