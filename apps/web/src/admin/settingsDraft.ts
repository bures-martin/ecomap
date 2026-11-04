import type { CommunitySettings, ContributionArea } from '@ecomap/shared';

/** The settings form's own state: numbers are kept as typed text until submit. */
export interface SettingsDraft {
  name: string;
  tagline: string;
  aboutMarkdown: string;
  privacyMarkdown: string;
  primaryColor: string;
  accentColor: string;
  defaultLocale: CommunitySettings['defaultLocale'];
  basemap: CommunitySettings['basemap'];
  lat: string;
  lng: string;
  zoom: string;
  /** Drawn on the map in `AreaEditor`; null means contributions are allowed anywhere. */
  contributionArea: ContributionArea | null;
  allowPublicRegistration: boolean;
}

export function toSettingsDraft(settings: CommunitySettings): SettingsDraft {
  return {
    name: settings.name,
    tagline: settings.tagline,
    aboutMarkdown: settings.aboutMarkdown,
    privacyMarkdown: settings.privacyMarkdown,
    primaryColor: settings.primaryColor,
    accentColor: settings.accentColor,
    defaultLocale: settings.defaultLocale,
    basemap: settings.basemap,
    lat: String(settings.initialView.lat),
    lng: String(settings.initialView.lng),
    zoom: String(settings.initialView.zoom),
    contributionArea: settings.contributionArea,
    allowPublicRegistration: settings.allowPublicRegistration,
  };
}
