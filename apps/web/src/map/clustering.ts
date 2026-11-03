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

/** Beyond this zoom every place is shown on its own - street level. */
export const CLUSTER_MAX_ZOOM = 15;

export function buildPointIndex(
  features: readonly Feature[],
  /** Kept out of the groups, so the selected place is always visible. */
  excludeId: string | null,
): PointIndex {
  const index = new Supercluster<PointProperties>({
    radius: 60,
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
