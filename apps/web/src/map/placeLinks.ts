import type { Feature, Layer } from '@ecomap/shared';
import {
  mdiFacebook,
  mdiInstagram,
  mdiLeaf,
  mdiLinkVariant,
  mdiMapMarkerStar,
  mdiOwl,
  mdiWeb,
} from '@mdi/js';

/**
 * The "find them online" buttons under a place: one per link field the layer
 * has and the place filled in, in the layer's own order and with the layer's
 * own label. Nothing here is specific to a site - a field called `tripadvisor`
 * just gets a recognisable icon; any other link gets a plain one.
 */
export interface PlaceLink {
  key: string;
  label: string;
  url: string;
  icon: string;
}

const ICON_BY_KEY: Readonly<Record<string, string>> = {
  website: mdiWeb,
  facebook: mdiFacebook,
  instagram: mdiInstagram,
  tripadvisor: mdiOwl,
  bornholmInfo: mdiMapMarkerStar,
  happyCow: mdiLeaf,
};

export function placeLinks(feature: Feature, layer: Layer): PlaceLink[] {
  return layer.fields.flatMap((field) => {
    if (field.type !== 'url') return [];
    const url = safeUrl(feature.properties[field.key]);
    if (!url) return [];
    return [
      { key: field.key, label: field.label, url, icon: ICON_BY_KEY[field.key] ?? mdiLinkVariant },
    ];
  });
}

/**
 * Only web links become buttons. The API checks URL fields too, but a value
 * saved before a field became a URL field could be anything - and an href is
 * no place for a `javascript:` link.
 */
function safeUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value.trim());
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null;
  } catch {
    return null;
  }
}
