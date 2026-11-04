import { z } from 'zod';
import { contributionAreaSchema } from './area.js';
import { latitudeSchema, longitudeSchema } from './geometry.js';
import { hexColorSchema } from './layers.js';
import { localeSchema } from './locales.js';

/**
 * Per-community configuration. One row, edited by an admin, so the same codebase
 * can run for Bornholm, for a municipality elsewhere, or for an NGO, without a
 * fork: name, colours, where the map opens and where contributions are allowed.
 */

/**
 * Free background maps, in the order the map's switcher lists them. The admin
 * picks the community's default; each visitor can switch for themselves.
 */
export const BASEMAPS = [
  'streets',
  'osm',
  'light',
  'dark',
  'satellite',
  'topo',
  'cyclosm',
] as const;
export type Basemap = (typeof BASEMAPS)[number];
export const basemapSchema = z.enum(BASEMAPS);

export const mapViewSchema = z.object({
  lat: latitudeSchema,
  lng: longitudeSchema,
  zoom: z.number().min(1).max(19),
});
export type MapView = z.infer<typeof mapViewSchema>;

export const communitySettingsSchema = z.object({
  name: z.string(),
  tagline: z.string(),
  aboutMarkdown: z.string(),
  /** The privacy notice; empty means the web app shows its template. */
  privacyMarkdown: z.string(),
  primaryColor: hexColorSchema,
  accentColor: hexColorSchema,
  defaultLocale: localeSchema,
  basemap: basemapSchema,
  initialView: mapViewSchema,
  /**
   * Optional region, drawn by an admin, outside which nothing may be added. The
   * map itself can still be panned and zoomed anywhere; this only constrains
   * contributions: "allow to make the map bigger, but allow to add points only
   * where we can".
   */
  contributionArea: contributionAreaSchema.nullable(),
  /** Whether visitors may register themselves, or an admin invites them. */
  allowPublicRegistration: z.boolean(),
  updatedAt: z.iso.datetime(),
});
export type CommunitySettings = z.infer<typeof communitySettingsSchema>;

export const updateCommunitySettingsInputSchema = z
  .object({
    name: z.string().trim().min(2).max(80),
    tagline: z.string().trim().max(200),
    aboutMarkdown: z.string().trim().max(20_000),
    privacyMarkdown: z.string().trim().max(20_000),
    primaryColor: hexColorSchema,
    accentColor: hexColorSchema,
    defaultLocale: localeSchema,
    basemap: basemapSchema,
    initialView: mapViewSchema,
    contributionArea: contributionAreaSchema.nullable(),
    allowPublicRegistration: z.boolean(),
  })
  .partial();
export type UpdateCommunitySettingsInput = z.infer<typeof updateCommunitySettingsInputSchema>;

/** Used before the API responds and as the seed row - Bornholm, Denmark. */
export const DEFAULT_COMMUNITY_SETTINGS = {
  name: 'EcoMap Community',
  tagline: 'Find and share the green things happening around you.',
  aboutMarkdown: '',
  privacyMarkdown: '',
  primaryColor: '#2f855a',
  accentColor: '#b7791f',
  defaultLocale: 'en',
  basemap: 'streets',
  initialView: { lat: 55.1, lng: 14.9, zoom: 10 },
  contributionArea: null,
  allowPublicRegistration: true,
} as const satisfies Omit<CommunitySettings, 'updatedAt'>;
