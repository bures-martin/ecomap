import type { Feature } from '@ecomap/shared';
import Supercluster from 'supercluster';

/**
 * Grouping nearby places when the map is zoomed out, so the first view of a
 * whole island reads as "there is plenty here" rather than a pile of
 * overlapping pins. Only points are grouped: routes and areas are shapes whose
 * outline is the information, so they are always drawn.
 *
 * supercluster does the maths (a spatial index, rebuilt whenever the places
 * change); MapCanvas asks it what to draw for the current view and zoom.
 */

export interface PointProperties {
  featureId: string;
}

export type PointIndex = Supercluster<PointProperties>;

/**
 * Beyond this zoom every place is shown on its own: at street level a group
 * hides more than it helps, and zooming to a small group lands about here.
 */
export const CLUSTER_MAX_ZOOM = 13;

/**
 * Clicking a group this small zooms straight to all of its places, instead of
 * splitting it one level at a time; bigger groups still open step by step.
 */
export const OPEN_ALL_UP_TO = 20;

export function buildPointIndex(
  features: readonly Feature[],
  /** Kept out of the groups, so the selected place is always visible. */
  excludeId: string | null,
): PointIndex {
  const index = new Supercluster<PointProperties>({
    radius: 50,
    maxZoom: CLUSTER_MAX_ZOOM,
    minPoints: 2,
  });
  index.load(
    features.flatMap((feature) =>
      feature.geometry.type === 'Point' && feature.id !== excludeId
        ? [
            {
              type: 'Feature' as const,
              properties: { featureId: feature.id },
              geometry: { type: 'Point' as const, coordinates: feature.geometry.coordinates },
            },
          ]
        : [],
    ),
  );
  return index;
}
