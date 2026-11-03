import {
  DEFAULT_COMMUNITY_SETTINGS,
  communitySettingsSchema,
  contributionAreaSchema,
  type CommunitySettings,
  type ContributionArea,
  type Geometry,
  type UpdateCommunitySettingsInput,
} from '@ecomap/shared';
import type { Queryable, Sql } from '../../db/client.js';

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
  contributionArea: unknown;
  allowPublicRegistration: boolean;
  updatedAt: string;
}

function settingsColumns(db: Queryable) {
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
    ST_AsGeoJSON(contribution_area)::json as "contributionArea",
    allow_public_registration as "allowPublicRegistration",
    updated_at                as "updatedAt"
  `;
}

export async function getCommunitySettings(db: Queryable): Promise<CommunitySettings> {
  const [row] = await db<SettingsRow[]>`
    select ${settingsColumns(db)} from community_settings where id = true
  `;
  if (!row) {
    /* The migration seeds the row; this only guards a hand-edited database. */
    return { ...DEFAULT_COMMUNITY_SETTINGS, updatedAt: new Date().toISOString() };
  }
  return toCommunitySettings(row);
}

/**
 * PostGIS's own opinion of a drawn area. The shared schema already refuses a
 * crossing outline; this is the second check, with the reason in words.
 */
export async function checkAreaValidity(
  db: Sql,
  area: ContributionArea,
): Promise<{ valid: boolean; reason: string }> {
  const [row] = await db<{ valid: boolean; reason: string }[]>`
    select ST_IsValid(g) as valid, ST_IsValidReason(g) as reason
    from (select ST_SetSRID(ST_GeomFromGeoJSON(${JSON.stringify(area)}), 4326) as g) drawn
  `;
  return row ?? { valid: false, reason: 'No result' };
}

/**
 * Whether a geometry lies entirely inside the contribution area - `true` when
 * no area is set. `ST_CoveredBy` also catches a line that leaves a concave area
 * and comes back, and counts the outline itself as inside.
 */
export async function isWithinContributionArea(db: Sql, geometry: Geometry): Promise<boolean> {
  const [row] = await db<{ inside: boolean }[]>`
    select contribution_area is null
        or ST_CoveredBy(
             ST_SetSRID(ST_GeomFromGeoJSON(${JSON.stringify(geometry)}), 4326),
             contribution_area
           ) as inside
    from community_settings where id = true
  `;
  return row?.inside ?? true;
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
  if (input.allowPublicRegistration !== undefined) {
    assignments['allow_public_registration'] = input.allowPublicRegistration;
  }

  return db.begin(async (tx) => {
    /* The area is a PostGIS geometry, so it is set with its own expression. */
    if (input.contributionArea !== undefined) {
      const area = input.contributionArea;
      await tx`
        update community_settings
        set contribution_area = ${
          area ? tx`ST_SetSRID(ST_GeomFromGeoJSON(${JSON.stringify(area)}), 4326)` : null
        }
        where id = true
      `;
    }
    if (Object.keys(assignments).length > 0) {
      await tx`update community_settings set ${tx(assignments)} where id = true`;
    }
    return getCommunitySettings(tx);
  });
}

function toCommunitySettings(row: SettingsRow): CommunitySettings {
  const area = contributionAreaSchema.safeParse(row.contributionArea);

  return communitySettingsSchema.parse({
    name: row.name,
    tagline: row.tagline,
    aboutMarkdown: row.aboutMarkdown,
    primaryColor: row.primaryColor,
    accentColor: row.accentColor,
    defaultLocale: row.defaultLocale,
    basemap: row.basemap,
    initialView: { lat: row.initialLat, lng: row.initialLng, zoom: row.initialZoom },
    contributionArea: area.success ? area.data : null,
    allowPublicRegistration: row.allowPublicRegistration,
    updatedAt: row.updatedAt,
  });
}
