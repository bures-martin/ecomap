import { BASEMAPS, type Basemap } from '@ecomap/shared';
import L from 'leaflet';

/**
 * Background maps: free, keyless tile services that are widely used with
 * Leaflet. Attribution is a condition of using every one of them; Leaflet's
 * attribution control shows the line of whichever map is on.
 *
 * Usage policies, for when traffic grows: OpenStreetMap's own tiles are for
 * light use only, and Esri's maps need their credit kept and are meant for
 * modest, non-commercial use without an ArcGIS account. A busy public instance
 * should move to a paid or self-hosted tile service. (CARTO's popular light and
 * dark maps now need an API key, so they are not offered.)
 */
export interface BasemapDefinition {
  url: string;
  attribution: string;
  maxZoom: number;
  /** The deepest zoom the service draws; beyond it Leaflet enlarges those tiles. */
  maxNativeZoom?: number;
  subdomains?: string[];
}

const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

const ESRI = '<a href="https://www.esri.com/">Esri</a>';

/** Esri's ArcGIS Online tile services; note their `{y}/{x}` order. */
function esri(service: string, attribution: string, maxNativeZoom: number): BasemapDefinition {
  return {
    url: `https://server.arcgisonline.com/ArcGIS/rest/services/${service}/MapServer/tile/{z}/{y}/{x}`,
    attribution: `Tiles &copy; ${ESRI} &mdash; ${attribution}`,
    maxZoom: 19,
    maxNativeZoom,
  };
}

const DEFINITIONS: Readonly<Record<Basemap, BasemapDefinition>> = {
  streets: esri('World_Street_Map', 'Esri, HERE, Garmin, OpenStreetMap', 19),
  osm: {
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: OSM_ATTRIBUTION,
    maxZoom: 19,
  },
  light: esri('Canvas/World_Light_Gray_Base', 'Esri, HERE, Garmin, OpenStreetMap', 16),
  dark: esri('Canvas/World_Dark_Gray_Base', 'Esri, HERE, Garmin, OpenStreetMap', 16),
  satellite: esri('World_Imagery', 'Esri, Maxar, Earthstar Geographics', 19),
  topo: {
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: `${OSM_ATTRIBUTION}, <a href="https://opentopomap.org">OpenTopoMap</a> (CC-BY-SA)`,
    maxZoom: 17,
    subdomains: ['a', 'b', 'c'],
  },
  cyclosm: {
    url: 'https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png',
    attribution: `${OSM_ATTRIBUTION}, tiles by <a href="https://www.cyclosm.org/">CyclOSM</a>`,
    maxZoom: 19,
    subdomains: ['a', 'b', 'c'],
  },
};

export function basemapDefinition(basemap: Basemap): BasemapDefinition {
  return DEFINITIONS[basemap];
}

export function isBasemap(value: unknown): value is Basemap {
  return typeof value === 'string' && (BASEMAPS as readonly string[]).includes(value);
}

function tileLayer(basemap: Basemap): L.TileLayer {
  const definition = basemapDefinition(basemap);
  return L.tileLayer(definition.url, {
    attribution: definition.attribution,
    maxZoom: definition.maxZoom,
    ...(definition.maxNativeZoom === undefined ? {} : { maxNativeZoom: definition.maxNativeZoom }),
    ...(definition.subdomains ? { subdomains: definition.subdomains } : {}),
  });
}

export interface BasemapSwitcher {
  /** Puts this background on, as if it had been picked in the switcher. */
  show(basemap: Basemap): void;
  /** Rebuilds the switcher's labels, e.g. after the language changed. */
  relabel(): void;
}

/**
 * The classic Leaflet layer switcher in the bottom-left corner, offering every
 * background map. `onPick` hears only what the person picks there, not the
 * calls to `show`, so a choice can be remembered without echoing it back.
 *
 * The labels are our own translated strings, never user input - Leaflet puts
 * them into the control as HTML.
 */
export function addBasemapSwitcher(
  map: L.Map,
  initial: Basemap,
  label: (basemap: Basemap) => string,
  onPick?: (basemap: Basemap) => void,
): BasemapSwitcher {
  const layers = Object.fromEntries(
    BASEMAPS.map((basemap) => [basemap, tileLayer(basemap)]),
  ) as Record<Basemap, L.TileLayer>;
  const layerOf = (basemap: Basemap): L.TileLayer => layers[basemap];
  let current = initial;
  let control: L.Control.Layers | null = null;

  const build = (): void => {
    control?.remove();
    const entries = Object.fromEntries(
      BASEMAPS.map((basemap) => [label(basemap), layerOf(basemap)]),
    );
    control = L.control.layers(entries, undefined, { position: 'bottomleft' }).addTo(map);
  };

  /*
   * Leaflet fires this for any background put on the map, so `show` mutes it
   * while it swaps: only a click in the switcher counts as a pick. The event
   * names the entry by its label, which is unique per map.
   */
  let swapping = false;
  map.on('baselayerchange', (event: L.LayersControlEvent) => {
    if (swapping) return;
    const picked = BASEMAPS.find((basemap) => label(basemap) === event.name);
    if (!picked) return;
    current = picked;
    onPick?.(picked);
  });

  const show = (basemap: Basemap): void => {
    if (basemap === current) return;
    swapping = true;
    layerOf(current).remove();
    current = basemap;
    layerOf(basemap).addTo(map);
    swapping = false;
  };

  layerOf(initial).addTo(map);
  build();

  return { show, relabel: build };
}
