import type { Feature } from '@ecomap/shared';
import { featureCenter } from './geo.js';

/** What the map shows right now, in Leaflet's [lat, lng] order. */
export interface MapView {
  south: number;
  west: number;
  north: number;
  east: number;
  center: [number, number];
}

export interface ListedPlace {
  feature: Feature;
  /** From the person's own location when known, otherwise from the map's middle. */
  distanceKm: number;
}

/** Enough to scan; more is a sign to zoom in. */
export const LIST_LIMIT = 100;

const EARTH_RADIUS_KM = 6371;

/** Straight-line distance on the globe (haversine). */
export function distanceKm(from: [number, number], to: [number, number]): number {
  const rad = (degrees: number): number => (degrees * Math.PI) / 180;
  const dLat = rad(to[0] - from[0]);
  const dLng = rad(to[1] - from[1]);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(from[0])) * Math.cos(rad(to[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
}

/**
 * The places on screen, nearest first - the list beside the map. It shows
 * exactly what the map shows (same filters and search), limited to the view,
 * so the two never disagree.
 */
export function placesInView(
  features: readonly Feature[],
  view: MapView,
  from: [number, number] | null,
): { places: ListedPlace[]; total: number } {
  const origin = from ?? view.center;
  const inView = features
    .map((feature) => ({ feature, center: featureCenter(feature) }))
    .filter(
      ({ center: [lat, lng] }) =>
        lat >= view.south && lat <= view.north && lng >= view.west && lng <= view.east,
    )
    .map(({ feature, center }) => ({ feature, distanceKm: distanceKm(origin, center) }))
    .sort((a, b) => a.distanceKm - b.distanceKm || a.feature.name.localeCompare(b.feature.name));
  return { places: inView.slice(0, LIST_LIMIT), total: inView.length };
}

/** "350 m" or "2,4 km", in the reader's own number format. */
export function formatDistance(km: number, locale: string): string {
  if (km < 1) {
    const metres = Math.max(10, Math.round((km * 1000) / 10) * 10);
    return `${metres.toLocaleString(locale)} m`;
  }
  return `${km.toLocaleString(locale, { maximumFractionDigits: km < 10 ? 1 : 0 })} km`;
}
