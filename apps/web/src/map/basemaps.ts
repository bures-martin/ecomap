import type { Basemap } from '@ecomap/shared';

/**
 * Background maps, all from open data sources so the project carries no tile
 * licence and no API key.
 *
 * Attribution is a condition of using them - it is rendered by Leaflet's
 * attribution control and must not be removed.
 */
export interface BasemapDefinition {
  url: string;
  attribution: string;
  maxZoom: number;
  subdomains?: string[];
}

const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

export const BASEMAP_DEFINITIONS: Readonly<Record<Basemap, BasemapDefinition>> = {
  osm: {
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: OSM_ATTRIBUTION,
    maxZoom: 19,
  },
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
  humanitarian: {
    url: 'https://tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
    attribution: `${OSM_ATTRIBUTION}, tiles by <a href="https://www.hotosm.org/">HOT</a>`,
    maxZoom: 19,
  },
};

export function basemapDefinition(basemap: Basemap): BasemapDefinition {
  return BASEMAP_DEFINITIONS[basemap];
}
