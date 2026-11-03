import type { Basemap } from '@ecomap/shared';
import L from 'leaflet';

/**
 * Background maps.
 *
 * Mapy.com (by Seznam.cz) draws the nicest maps of the lot, but needs an API
 * key: set `VITE_MAPY_API_KEY`. The key ends up in the browser, as every tile
 * key does, so restrict it to your domain in the Mapy.com developer portal.
 * Without a key, a Mapy.com basemap quietly falls back to OpenStreetMap.
 *
 * Attribution is a condition of using any of them. Leaflet's attribution
 * control renders the copyright line; Mapy.com also requires its logo, linked
 * to mapy.com and at least 30 px tall, on the map - see `createBasemap`.
 */
export interface BasemapDefinition {
  url: string;
  attribution: string;
  maxZoom: number;
  subdomains?: string[];
  /** Mapy.com's terms require its logo on the map, not just a text credit. */
  requiresMapyLogo?: boolean;
}

const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

const MAPY_ATTRIBUTION =
  '<a href="https://api.mapy.com/copyright" target="_blank" rel="noopener">&copy; Seznam.cz a.s. and others</a>';

const MAPY_API_KEY = import.meta.env.VITE_MAPY_API_KEY?.trim() ?? '';

export function hasMapyKey(): boolean {
  return MAPY_API_KEY.length > 0;
}

/** Retina tiles exist for Basic and Outdoor; they look sharp on high-density screens. */
function mapy(mapset: 'outdoor' | 'basic' | 'aerial', maxZoom: number): BasemapDefinition {
  const size = mapset !== 'aerial' && L.Browser.retina ? '256@2x' : '256';
  return {
    url: `https://api.mapy.com/v1/maptiles/${mapset}/${size}/{z}/{x}/{y}?apikey=${encodeURIComponent(MAPY_API_KEY)}`,
    attribution: MAPY_ATTRIBUTION,
    maxZoom,
    requiresMapyLogo: true,
  };
}

const OSM: BasemapDefinition = {
  url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  attribution: OSM_ATTRIBUTION,
  maxZoom: 19,
};

const DEFINITIONS: Readonly<Record<Basemap, () => BasemapDefinition>> = {
  'mapy-outdoor': () => mapy('outdoor', 19),
  'mapy-basic': () => mapy('basic', 19),
  'mapy-aerial': () => mapy('aerial', 19),
  osm: () => OSM,
  topo: () => ({
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: `${OSM_ATTRIBUTION}, <a href="https://opentopomap.org">OpenTopoMap</a> (CC-BY-SA)`,
    maxZoom: 17,
    subdomains: ['a', 'b', 'c'],
  }),
  cyclosm: () => ({
    url: 'https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png',
    attribution: `${OSM_ATTRIBUTION}, tiles by <a href="https://www.cyclosm.org/">CyclOSM</a>`,
    maxZoom: 19,
    subdomains: ['a', 'b', 'c'],
  }),
  humanitarian: () => ({
    url: 'https://tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
    attribution: `${OSM_ATTRIBUTION}, tiles by <a href="https://www.hotosm.org/">HOT</a>`,
    maxZoom: 19,
  }),
};

export function isMapyBasemap(basemap: Basemap): boolean {
  return basemap.startsWith('mapy-');
}

/** The definition to use, falling back to OpenStreetMap when Mapy.com has no key. */
export function basemapDefinition(basemap: Basemap): BasemapDefinition {
  if (isMapyBasemap(basemap) && !hasMapyKey()) return OSM;
  return DEFINITIONS[basemap]();
}

/** The Mapy.com logo, linked to mapy.com as their terms ask. */
function mapyLogo(): L.Control {
  const control = new L.Control({ position: 'bottomleft' });
  control.onAdd = () => {
    const link = L.DomUtil.create('a', 'mapy-logo');
    link.href = 'https://mapy.com/';
    link.target = '_blank';
    link.rel = 'noopener';
    link.setAttribute('aria-label', 'Mapy.com');
    const image = L.DomUtil.create('img', '', link);
    image.src = 'https://api.mapy.com/img/api/logo.svg';
    image.alt = 'Mapy.com';
    image.height = 30;
    return link;
  };
  return control;
}

/**
 * Puts a basemap on a map, with whatever credit it needs, and returns a
 * function that takes it off again - so switching basemaps never leaves a
 * stray logo behind.
 */
export function addBasemap(map: L.Map, basemap: Basemap): () => void {
  const definition = basemapDefinition(basemap);
  const tiles = L.tileLayer(definition.url, {
    attribution: definition.attribution,
    maxZoom: definition.maxZoom,
    ...(definition.subdomains ? { subdomains: definition.subdomains } : {}),
  }).addTo(map);
  const logo = definition.requiresMapyLogo ? mapyLogo().addTo(map) : null;

  return () => {
    tiles.remove();
    logo?.remove();
  };
}
