import { geometryAnchor, type Geometry, type Position } from '@ecomap/shared';

/**
 * Directions to a contribution, handed off to Google Maps.
 *
 * Where to go depends on the shape: a point is the place itself, a route
 * starts at its first point - that is where you would begin walking or
 * cycling it - and an area is aimed at its middle.
 */
export function navigationTarget(geometry: Geometry): Position {
  switch (geometry.type) {
    case 'Point':
      return geometry.coordinates;
    case 'LineString':
      return geometry.coordinates[0] ?? geometryAnchor(geometry);
    case 'Polygon':
      return geometryAnchor(geometry);
  }
}

/**
 * Google's documented "Maps URLs" link: no API key, opens the Google Maps app
 * on phones that have it and the website elsewhere, and asks for directions
 * from wherever the person is now. Six decimals is about 10 cm.
 */
export function googleMapsDirectionsUrl([lng, lat]: Position): string {
  const destination = `${lat.toFixed(6)},${lng.toFixed(6)}`;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
}
