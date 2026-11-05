import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import {
  DEFAULT_COMMUNITY_SETTINGS,
  communitySettingsSchema,
  featureCollectionSchema,
  layerSchema,
  toFeatureCollection,
  type CommunitySettings,
  type Feature,
  type Layer,
} from '@ecomap/shared';
import { COMMUNITIES, type Community, type CommunitySlug } from '../communities/index.js';
import { isMainModule } from '../lib/main-module.js';

/**
 * The read-only demo (GitHub Pages, no server): writes what the API would
 * answer a visitor - settings, layers, places - as three JSON files the web
 * app reads instead (see apps/web/src/demo).
 *
 * Built from the same community folder the seed uses, so the demo and a real
 * install show the same map. Everything goes through the shared schemas, so a
 * file the app cannot read fails here, not in a visitor's browser.
 */

export interface StaticDemoData {
  settings: CommunitySettings;
  layers: Layer[];
  features: ReturnType<typeof toFeatureCollection>;
}

/** The demo has no accounts and keeps nothing - its privacy page says so. */
const DEMO_PRIVACY_MARKDOWN = `## Privatliv på demoen

Dette er en **demo** af kortet. Den har ingen konti, ingen formularer og gemmer intet om dig.

- **Siden** ligger på GitHub Pages (GitHub, Inc.). GitHub registrerer, som enhver webserver, din IP-adresse, når du åbner siden.
- **Baggrundskortet** hentes direkte fra kortleverandøren (fx Esri eller OpenStreetMap), som også ser din IP-adresse.
- **"Vis min placering"** bruger din placering kun i din egen browser - den sendes ikke nogen steder hen.
- Et par indstillinger (fx mørk tilstand) huskes i din browser og kan slettes der.

Kortets steder kommer fra OpenStreetMap (© OpenStreetMap contributors, ODbL).`;

export function buildStaticDemo(community: Community, at: Date): StaticDemoData {
  const timestamp = at.toISOString();

  const settings = communitySettingsSchema.parse({
    ...DEFAULT_COMMUNITY_SETTINGS,
    ...community.settings,
    privacyMarkdown: DEMO_PRIVACY_MARKDOWN,
    /* Nobody can register on a demo; this keeps sign-up texts out of view. */
    allowPublicRegistration: false,
    updatedAt: timestamp,
  });

  /* Visitors see published layers only - and only their places - in the API's order. */
  const published = community.layers
    .filter((layer) => layer.isPublished)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'da'));
  const layerIdBySlug = new Map(
    published.map((layer) => [layer.slug, stableUuid(`layer:${layer.slug}`)]),
  );

  const features: Feature[] = community.places.flatMap((place) => {
    const layerId = layerIdBySlug.get(place.layerSlug);
    if (!layerId) return [];
    return [
      {
        id: stableUuid(`place:${place.osmId}`),
        layerId,
        layerSlug: place.layerSlug,
        name: place.name,
        description: place.description,
        geometry: { type: 'Point' as const, coordinates: place.coordinates },
        properties: place.properties,
        status: 'published' as const,
        createdById: null,
        /* Not "a former member": every demo place comes from OpenStreetMap. */
        createdByName: 'OpenStreetMap',
        createdByAvatarUrl: null,
        images: [],
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    ];
  });

  const layers = published.map((input) =>
    layerSchema.parse({
      ...input,
      id: layerIdBySlug.get(input.slug),
      featureCount: features.filter((feature) => feature.layerSlug === input.slug).length,
      createdAt: timestamp,
      updatedAt: timestamp,
    }),
  );

  return {
    settings,
    layers,
    features: featureCollectionSchema.parse(toFeatureCollection(features)),
  };
}

/**
 * The same name always gives the same id, so a shared demo link to a place
 * keeps working from one build to the next. Shaped as a version-5 UUID.
 */
export function stableUuid(name: string): string {
  const bytes = createHash('sha1').update(`ecomap-demo:${name}`).digest().subarray(0, 16);
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x50;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** `tsx src/demo/exportStatic.ts <out-dir> [community]` - e.g. into the web app's build. */
if (isMainModule(import.meta.url)) {
  const [outArg, slugArg = 'bornholm'] = process.argv.slice(2);
  if (!outArg) {
    console.error('Usage: tsx src/demo/exportStatic.ts <out-dir> [community]');
    process.exit(1);
  }
  if (!(slugArg in COMMUNITIES)) {
    console.error(`Unknown community "${slugArg}". Known: ${Object.keys(COMMUNITIES).join(', ')}`);
    process.exit(1);
  }
  const data = buildStaticDemo(COMMUNITIES[slugArg as CommunitySlug], new Date());
  const out = resolve(outArg);
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, 'settings.json'), JSON.stringify(data.settings));
  writeFileSync(join(out, 'layers.json'), JSON.stringify(data.layers));
  writeFileSync(join(out, 'features.json'), JSON.stringify(data.features));
  process.stdout.write(
    `Demo data for ${slugArg}: ${data.layers.length} layers, ${data.features.features.length} places -> ${out}\n`,
  );
}
