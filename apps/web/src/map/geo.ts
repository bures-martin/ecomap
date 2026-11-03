import { geometryAnchor, type Feature, type Position } from '@ecomap/shared';

/** GeoJSON `[lng, lat]` to Leaflet `[lat, lng]`. */
export function toLatLng(position: Position): [number, number] {
  return [position[1], position[0]];
}

/** Centre of a feature, in Leaflet's order - used to fly to a selected feature. */
export function featureCenter(feature: Feature): [number, number] {
  return toLatLng(geometryAnchor(feature.geometry));
}
