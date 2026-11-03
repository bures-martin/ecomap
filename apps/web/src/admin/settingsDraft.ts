import type { CommunitySettings } from '@ecomap/shared';

/** The settings form's own state: numbers are kept as typed text until submit. */
export interface SettingsDraft {
  name: string;
  tagline: string;
  aboutMarkdown: string;
  primaryColor: string;
  accentColor: string;
  defaultLocale: CommunitySettings['defaultLocale'];
  basemap: CommunitySettings['basemap'];
  lat: string;
  lng: string;
  zoom: string;
  boundsEnabled: boolean;
  west: string;
  south: string;
  east: string;
  north: string;
  allowPublicRegistration: boolean;
}

export function toSettingsDraft(settings: CommunitySettings): SettingsDraft {
  const bounds = settings.contributionBounds;
  return {
    name: settings.name,
    tagline: settings.tagline,
    aboutMarkdown: settings.aboutMarkdown,
    primaryColor: settings.primaryColor,
    accentColor: settings.accentColor,
    defaultLocale: settings.defaultLocale,
    basemap: settings.basemap,
    lat: String(settings.initialView.lat),
    lng: String(settings.initialView.lng),
    zoom: String(settings.initialView.zoom),
    boundsEnabled: bounds !== null,
    west: bounds ? String(bounds[0]) : '',
    south: bounds ? String(bounds[1]) : '',
    east: bounds ? String(bounds[2]) : '',
    north: bounds ? String(bounds[3]) : '',
    allowPublicRegistration: settings.allowPublicRegistration,
  };
}
