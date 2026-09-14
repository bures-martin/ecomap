import {
  DEFAULT_COMMUNITY_SETTINGS,
  bboxSchema,
  communitySettingsSchema,
  type CommunitySettings,
  type UpdateCommunitySettingsInput,
} from '@ecomap/shared';
import type { Sql } from '../../db/client.js';

interface SettingsRow {
  name: string;
  tagline: string;
  aboutMarkdown: string;
  primaryColor: string;
  accentColor: string;
  defaultLocale: string;
  basemap: string;
  initialLat: number;
  initialLng: number;
  initialZoom: number;
  contributionBounds: unknown;
  allowPublicRegistration: boolean;
  updatedAt: string;
}

function settingsColumns(db: Sql) {
  return db`
    name,
    tagline,
    about_markdown            as "aboutMarkdown",
    primary_color             as "primaryColor",
    accent_color              as "accentColor",
    default_locale            as "defaultLocale",
    basemap,
    initial_lat               as "initialLat",
    initial_lng               as "initialLng",
    initial_zoom              as "initialZoom",
    contribution_bounds       as "contributionBounds",
    allow_public_registration as "allowPublicRegistration",
    updated_at                as "updatedAt"
  `;
}

export async function getCommunitySettings(db: Sql): Promise<CommunitySettings> {
  const [row] = await db<SettingsRow[]>`
    select ${settingsColumns(db)} from community_settings where id = true
  `;
  if (!row) {
    /* The migration seeds the row; this only guards a hand-edited database. */
    return { ...DEFAULT_COMMUNITY_SETTINGS, updatedAt: new Date().toISOString() };
  }
  return toCommunitySettings(row);
}

export async function updateCommunitySettings(
  db: Sql,
  input: UpdateCommunitySettingsInput,
): Promise<CommunitySettings> {
  const assignments: Record<string, unknown> = {};

  if (input.name !== undefined) assignments['name'] = input.name;
  if (input.tagline !== undefined) assignments['tagline'] = input.tagline;
  if (input.aboutMarkdown !== undefined) assignments['about_markdown'] = input.aboutMarkdown;
  if (input.primaryColor !== undefined) assignments['primary_color'] = input.primaryColor;
  if (input.accentColor !== undefined) assignments['accent_color'] = input.accentColor;
  if (input.defaultLocale !== undefined) assignments['default_locale'] = input.defaultLocale;
  if (input.basemap !== undefined) assignments['basemap'] = input.basemap;
  if (input.initialView !== undefined) {
    assignments['initial_lat'] = input.initialView.lat;
    assignments['initial_lng'] = input.initialView.lng;
    assignments['initial_zoom'] = input.initialView.zoom;
  }
  if (input.contributionBounds !== undefined) {
    assignments['contribution_bounds'] = input.contributionBounds
      ? JSON.stringify(input.contributionBounds)
      : null;
  }
  if (input.allowPublicRegistration !== undefined) {
    assignments['allow_public_registration'] = input.allowPublicRegistration;
  }

  if (Object.keys(assignments).length === 0) {
    return getCommunitySettings(db);
  }

  const [row] = await db<SettingsRow[]>`
    update community_settings set ${db(assignments)}
    where id = true
    returning ${settingsColumns(db)}
  `;
  if (!row) throw new Error('community_settings row is missing');
  return toCommunitySettings(row);
}

function toCommunitySettings(row: SettingsRow): CommunitySettings {
  const bounds = bboxSchema.safeParse(row.contributionBounds);

  return communitySettingsSchema.parse({
    name: row.name,
    tagline: row.tagline,
    aboutMarkdown: row.aboutMarkdown,
    primaryColor: row.primaryColor,
    accentColor: row.accentColor,
    defaultLocale: row.defaultLocale,
    basemap: row.basemap,
    initialView: { lat: row.initialLat, lng: row.initialLng, zoom: row.initialZoom },
    contributionBounds: bounds.success ? bounds.data : null,
    allowPublicRegistration: row.allowPublicRegistration,
    updatedAt: row.updatedAt,
  });
}
