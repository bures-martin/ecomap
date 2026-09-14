import { featureStatusSchema, type FeatureStatus } from '@ecomap/shared';

/**
 * Map filters live in the URL so that a filtered view is a shareable link and
 * the browser's back button undoes a filter change - the behaviour people
 * already expect from every other website.
 *
 * The viewport is deliberately *not* a filter: the API supports a `bbox` query
 * for when a community outgrows loading its features in one go, but refetching
 * on every pan buys nothing at the scale of a single island.
 */
export interface MapFilters {
  /** Layer slugs; empty means "every layer the viewer can see". */
  layers: string[];
  q: string;
  status: FeatureStatus | null;
  /** Only the signed-in user's own contributions. */
  mine: boolean;
}

export const EMPTY_FILTERS: MapFilters = {
  layers: [],
  q: '',
  status: null,
  mine: false,
};

export function readFilters(params: URLSearchParams): MapFilters {
  const status = featureStatusSchema.safeParse(params.get('status') ?? undefined);

  return {
    layers: (params.get('layers') ?? '')
      .split(',')
      .map((slug) => slug.trim())
      .filter((slug) => slug.length > 0),
    q: params.get('q') ?? '',
    status: status.success ? status.data : null,
    mine: params.get('mine') === 'true',
  };
}

/**
 * Writes filters back into search params, dropping empty values so the URL stays
 * short and two equivalent filter states produce the same string.
 */
export function writeFilters(filters: MapFilters, base: URLSearchParams): URLSearchParams {
  const params = new URLSearchParams(base);

  setOrDelete(params, 'layers', filters.layers.join(','));
  setOrDelete(params, 'q', filters.q.trim());
  setOrDelete(params, 'status', filters.status ?? '');
  setOrDelete(params, 'mine', filters.mine ? 'true' : '');

  return params;
}

function setOrDelete(params: URLSearchParams, key: string, value: string): void {
  if (value) {
    params.set(key, value);
  } else {
    params.delete(key);
  }
}

export function hasActiveFilters(filters: MapFilters): boolean {
  return (
    filters.layers.length > 0 || filters.q.trim() !== '' || filters.status !== null || filters.mine
  );
}

/** Stable cache key: equivalent filters must produce an identical string. */
export function filtersKey(filters: MapFilters): string {
  return JSON.stringify([
    [...filters.layers].sort((a, b) => a.localeCompare(b)),
    filters.q.trim(),
    filters.status,
    filters.mine,
  ]);
}
