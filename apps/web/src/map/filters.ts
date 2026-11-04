import { featureStatusSchema, type FeatureStatus, type Layer } from '@ecomap/shared';

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
      /* A lone "-" was the old "every layer off" marker; now nothing ticked shows all. */
      .filter((slug) => slug.length > 0 && slug !== '-'),
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

/* ------------------------------------------------- which layers show ---- */

/**
 * The layer list works like the filters on any shop or map site: nothing
 * ticked shows every layer, and ticking narrows the map to just those. So an
 * empty `layers` is both "no filter" and "everything", and the map can never
 * end up empty by accident.
 *
 * Ticking or unticking one layer gives the new pick, kept in the order of the
 * layer list so the URL is the same however the boxes were clicked.
 */
export function layersAfterToggle(
  filters: MapFilters,
  layers: readonly Pick<Layer, 'slug'>[],
  slug: string,
  on: boolean,
): string[] {
  const picked = new Set(filters.layers);
  if (on) picked.add(slug);
  else picked.delete(slug);
  return layers.map((layer) => layer.slug).filter((candidate) => picked.has(candidate));
}

/** A chip shows a single topic: tapping it picks just that layer, tapping again lets go. */
export function layersAfterChip(filters: MapFilters, slug: string): string[] {
  return isOnlyLayer(filters, slug) ? [] : [slug];
}

export function isOnlyLayer(filters: MapFilters, slug: string): boolean {
  return filters.layers.length === 1 && filters.layers[0] === slug;
}
