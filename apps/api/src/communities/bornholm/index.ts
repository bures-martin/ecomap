import type { Community } from '../types.js';
import { BORNHOLM_ABOUT } from './about.js';
import { BORNHOLM_LAYERS } from './layers.js';
import { BORNHOLM_OSM } from './osm.js';
import { BORNHOLM_PLACES } from './places.js';
import { BORNHOLM_PRIVACY } from './privacy.js';

/**
 * The green map of Bornholm, Denmark - the first community. Its layers, places
 * and texts are Danish; the places come from OpenStreetMap (see `places.ts`).
 */
export const BORNHOLM: Community = {
  slug: 'bornholm',
  settings: {
    defaultLocale: 'da',
    initialView: { lat: 55.1, lng: 14.9, zoom: 10 },
    aboutMarkdown: BORNHOLM_ABOUT,
    privacyMarkdown: BORNHOLM_PRIVACY,
  },
  layers: BORNHOLM_LAYERS,
  places: BORNHOLM_PLACES,
  osm: BORNHOLM_OSM,
  /*
   * Made-up sample places that the very first version of the seed created.
   * They look real but do not exist.
   */
  retiredPlaceNames: [
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
  ],
};
