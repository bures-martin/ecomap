import type { CreateLayerInput, PropertyBag, UpdateCommunitySettingsInput } from '@ecomap/shared';

/**
 * Everything that makes one deployment "Bornholm" (or anywhere else) rather
 * than a blank map: its settings, its layers and its places. The code is the
 * same for every community; `npm run db:seed` writes the community picked by
 * the COMMUNITY variable into that deployment's database, and from then on an
 * admin changes it in the app.
 *
 * To start a new community, copy a folder next to this file, edit it, and add
 * it to `COMMUNITIES` in `index.ts`.
 */
export interface Community {
  /** What COMMUNITY is set to, e.g. "bornholm". */
  slug: string;
  /**
   * Written only into settings that still have the built-in default, so
   * running the seed again never overwrites what an admin changed.
   */
  settings: UpdateCommunitySettingsInput;
  /** Created if missing; a layer an admin has edited is left alone. */
  layers: readonly CreateLayerInput[];
  /** Added if missing (same layer, same name), by the seed's admin account. */
  places: readonly CommunityPlace[];
  /**
   * Places an earlier version of the seed created and that should go again -
   * only ever removed when the seed's own admin account created them.
   */
  retiredPlaceNames?: readonly string[];
  /** Where its places come from in OpenStreetMap - for `npm run data:check`. */
  osm?: OsmSource;
}

export interface OsmSource {
  /** [south, west, north, east] - the area searched for new places. */
  bbox: readonly [number, number, number, number];
  /** Per layer slug: Overpass filters for the kinds of places the layer is about. */
  searches: Readonly<Record<string, readonly string[]>>;
}

export interface CommunityPlace {
  /** The source object, e.g. "node/1330908050" on openstreetmap.org. */
  osmId: string;
  layerSlug: string;
  name: string;
  description: string;
  /** [longitude, latitude] */
  coordinates: [number, number];
  properties: PropertyBag;
}
