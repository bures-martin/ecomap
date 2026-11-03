import type { LocationQuery, LocationQueryRaw } from 'vue-router';

/**
 * vue-router keeps the query as a record; the filter helpers speak
 * `URLSearchParams`, which is also what ends up in the address bar. These two
 * convert between them without losing repeated keys.
 */

export function toSearchParams(query: LocationQuery): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    const values = Array.isArray(value) ? value : [value];
    for (const item of values) {
      if (item !== null) params.append(key, item);
    }
  }
  return params;
}

export function fromSearchParams(params: URLSearchParams): LocationQueryRaw {
  const query: Record<string, string | string[]> = {};
  for (const key of new Set(params.keys())) {
    const values = params.getAll(key);
    query[key] = values.length === 1 && values[0] !== undefined ? values[0] : values;
  }
  return query;
}
