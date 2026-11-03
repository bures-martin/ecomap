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

/* ------------------------------------------------- which layers show ---- */

type LayerVisibility = Pick<Layer, 'slug' | 'visibleByDefault'>;

/**
 * "No layer ticked" - an empty map on purpose, after unticking every layer.
 * Kept apart from an empty list, which means "the starting view". A single
 * dash can never be a layer slug (those are at least two characters).
 */
export const NO_LAYERS = '-';

export function showsNoLayers(filters: MapFilters): boolean {
  return filters.layers.length === 1 && filters.layers[0] === NO_LAYERS;
}

/**
 * The layers the map asks the API for. An explicit pick (a ticked box or a
 * chip) always wins; a search looks through every layer, so "charger" finds
 * the chargers even when that layer starts switched off; otherwise the map
 * shows the layers an admin marked "show when the map opens".
 *
 * Empty means every layer - the API's meaning - so it is also what this
 * returns when all layers are on by default, or (to avoid an empty map) when
 * none are.
 */
export function effectiveLayers(filters: MapFilters, layers: readonly LayerVisibility[]): string[] {
  if (filters.layers.length > 0) return filters.layers;
  if (filters.q.trim() !== '') return [];
  const defaults = layers.filter((layer) => layer.visibleByDefault).map((layer) => layer.slug);
  return defaults.length === 0 || defaults.length === layers.length ? [] : defaults;
}

/** The layers currently on the map, for the ticks in the layer list. */
export function visibleLayerSlugs(
  filters: MapFilters,
  layers: readonly LayerVisibility[],
): Set<string> {
  if (showsNoLayers(filters)) return new Set();
  const effective = effectiveLayers(filters, layers);
  return new Set(effective.length > 0 ? effective : layers.map((layer) => layer.slug));
}

/**
 * The new explicit pick after ticking or unticking one layer. It starts from
 * what is visible, and drops back to "no pick" when the result is just the
 * default set again, so the URL stays clean.
 */
export function layersAfterToggle(
  filters: MapFilters,
  layers: readonly LayerVisibility[],
  slug: string,
  on: boolean,
): string[] {
  const visible = visibleLayerSlugs(filters, layers);
  if (on) visible.add(slug);
  else visible.delete(slug);

  const next = layers.map((layer) => layer.slug).filter((candidate) => visible.has(candidate));
  /* Unticking the last layer leaves the map empty, as the ticks say. */
  if (next.length === 0) return [NO_LAYERS];
  const defaults = visibleLayerSlugs({ ...filters, layers: [], q: '' }, layers);
  const isDefault =
    next.length === defaults.size && next.every((candidate) => defaults.has(candidate));
  return isDefault ? [] : next;
}

/** A chip shows a single topic: tapping it picks just that layer, tapping again lets go. */
export function layersAfterChip(filters: MapFilters, slug: string): string[] {
  return isOnlyLayer(filters, slug) ? [] : [slug];
}

export function isOnlyLayer(filters: MapFilters, slug: string): boolean {
  return filters.layers.length === 1 && filters.layers[0] === slug;
}
