import type { OsmSource } from '../types.js';

/**
 * Where the Bornholm places come from in OpenStreetMap, so the data can be
 * checked and refreshed (`npm run data:check` - see docs/data.md).
 *
 * `searches` are Overpass filters, one or more per layer: what to look for on
 * the island when hunting for places the map does not have yet. They describe
 * the kinds of places each layer is about; the check only reports matches, a
 * person decides what goes on the map.
 */
export const BORNHOLM_OSM: OsmSource = {
  /* south, west, north, east - the island and Ertholmene. */
  bbox: [54.95, 14.6, 55.35, 15.25],
  searches: {
    'local-food': [
      'nwr["shop"="farm"]',
      'nwr["craft"~"^(brewery|distillery|winery|cider|confectionery)$"]',
      'nwr["shop"~"^(chocolate|confectionery|cheese|honey|deli)$"]',
      'nwr["amenity"="marketplace"]',
    ],
    'recycling-and-repair': [
      'nwr["amenity"="recycling"]["recycling_type"="centre"]',
      'nwr["shop"~"^(second_hand|charity)$"]',
      'nwr["repair_cafe"="yes"]',
    ],
    cycling: [
      'nwr["shop"="bicycle"]',
      'nwr["amenity"~"^(bicycle_repair_station|bicycle_rental)$"]',
    ],
    'ev-charging': ['nwr["amenity"="charging_station"]'],
    'drinking-water': ['node["amenity"="drinking_water"]'],
    'nature-areas': ['nwr["leisure"="nature_reserve"]["name"]'],
    'renewable-energy': ['nwr["power"="plant"]["plant:source"~"^(wind|solar|biomass|biogas)$"]'],
    'community-gardens': [
      'nwr["leisure"="garden"]["garden:type"="community"]',
      'nwr["landuse"="allotments"]["name"]',
    ],
    'green-shops': ['nwr["shop"~"^(organic|zero_waste)$"]', 'nwr["bulk_purchase"~"^(yes|only)$"]'],
  },
};
