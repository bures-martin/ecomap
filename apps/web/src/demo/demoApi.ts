import type { FeatureCollection, Layer } from '@ecomap/shared';
import { ApiRequestError } from '../api/client.js';
import { readFilters } from '../map/filters.js';

/**
 * The read-only demo's stand-in for the API: settings, layers and places come
 * from three JSON files built next to the app (`npm run demo:export -w
 * @ecomap/api`); anything that would change something, or needs an account,
 * is refused with a message the app already knows how to show.
 */

const BASE = import.meta.env.BASE_URL;
const cache = new Map<string, Promise<unknown>>();

function load(file: 'settings' | 'layers' | 'features'): Promise<unknown> {
  let pending = cache.get(file);
  if (!pending) {
    pending = fetch(`${BASE}demo/${file}.json`).then((response) => {
      if (!response.ok)
        throw new ApiRequestError(response.status, 'internal_error', 'Demo data missing');
      return response.json() as Promise<unknown>;
    });
    cache.set(file, pending);
  }
  return pending;
}

export async function demoRequest(path: string, method: string): Promise<unknown> {
  const url = new URL(path, 'https://demo.invalid');

  if (method === 'GET' && url.pathname === '/api/settings') return load('settings');
  if (method === 'GET' && url.pathname === '/api/layers') return load('layers');
  if (method === 'GET' && url.pathname === '/api/features') {
    const [collection, layers] = await Promise.all([load('features'), load('layers')]);
    return filterCollection(collection as FeatureCollection, layers as Layer[], url.searchParams);
  }

  throw new ApiRequestError(403, 'forbidden', 'This is a demo - nothing can be changed here');
}

/** The layer and search filters, by the same rules as the API (see features/repository.ts). */
export function filterCollection(
  collection: FeatureCollection,
  layers: readonly Layer[],
  params: URLSearchParams,
): FeatureCollection {
  const filters = readFilters(params);
  const layerNames = new Map(layers.map((layer) => [layer.slug, layer.name]));
  const term = filters.q.trim();

  const features = collection.features.filter(({ properties: place }) => {
    if (filters.layers.length > 0 && !filters.layers.includes(place.layerSlug)) return false;
    if (!term) return true;
    return matchesSearch(
      {
        name: place.name,
        description: place.description,
        layerName: layerNames.get(place.layerSlug) ?? '',
        values: Object.values(place.properties).map((value) => String(value ?? '')),
      },
      term,
    );
  });

  return { ...collection, features, total: features.length };
}

/**
 * A place name matches anywhere ("genbrug" finds "Møbelgenbrug"); the
 * description, the layer name and the field values only from the start of a
 * word ("cycling" does not find "Recycling").
 */
export function matchesSearch(
  place: { name: string; description: string; layerName: string; values: readonly string[] },
  term: string,
): boolean {
  const needle = term.toLocaleLowerCase();
  if (place.name.toLocaleLowerCase().includes(needle)) return true;
  const wordStart = new RegExp(`(^|[^\\p{L}\\p{N}_])${escapeRegex(term)}`, 'iu');
  return [place.description, place.layerName, ...place.values].some((text) => wordStart.test(text));
}

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
