import { z } from 'zod';
import { slugSchema } from './layers.js';

/**
 * Short links (`/s/k7m2qx`) for sharing a place or a filtered map - by
 * message, or printed as a QR code in a brochure.
 *
 * A short link stores only the map's own query string, never a whole URL: it
 * can open the map on a place, a set of layers or a search, and nothing else,
 * so it cannot be turned into a redirect to another site. Personal views (only
 * my places, a moderator's status filter) are not shareable and are dropped.
 */

/**
 * Lower case without look-alikes (0/o, 1/l/i), so a code read off paper can be
 * typed back in. 31 characters, 6 long: almost 900 million codes.
 */
export const SHORT_CODE_ALPHABET = '23456789abcdefghjkmnpqrstuvwxyz';
export const SHORT_CODE_LENGTH = 6;

export const shortCodeSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(new RegExp(`^[${SHORT_CODE_ALPHABET}]{${SHORT_CODE_LENGTH}}$`), 'Not a short link');

export const SHAREABLE_SEARCH_MAX = 120;

/** What `shareableQuery` reads from - a `URLSearchParams` in the browser and on the server. */
export interface QueryReader {
  get(name: string): string | null;
}

/**
 * The shareable part of a map URL's query, in one canonical form - the same
 * view always gives the same string, so it gets the same short link.
 * Anything unknown or malformed is left out rather than rejected.
 *
 * Built by hand rather than with `URLSearchParams`, which this package does
 * not assume exists; any `URLSearchParams` reads the result back the same.
 */
export function shareableQuery(params: QueryReader): string {
  const out: [string, string][] = [];

  const feature = z.uuid().safeParse(params.get('feature') ?? '');
  if (feature.success) out.push(['feature', feature.data.toLowerCase()]);

  const layers = (params.get('layers') ?? '')
    .split(',')
    .map((slug) => slugSchema.safeParse(slug))
    .flatMap((result) => (result.success ? [result.data] : []));
  const uniqueLayers = [...new Set(layers)];
  if (uniqueLayers.length > 0) out.push(['layers', uniqueLayers.join(',')]);

  const q = (params.get('q') ?? '').trim().slice(0, SHAREABLE_SEARCH_MAX);
  if (q) out.push(['q', q]);

  return out.map(([key, value]) => `${key}=${encodeURIComponent(value)}`).join('&');
}

export const createShortLinkInputSchema = z.object({
  /** The map's query string, with or without the leading "?". */
  query: z.string().max(2000),
});
export type CreateShortLinkInput = z.infer<typeof createShortLinkInputSchema>;

export const shortLinkSchema = z.object({
  code: z.string(),
  /** Canonical, shareable query string; empty means the whole map. */
  query: z.string(),
});
export type ShortLink = z.infer<typeof shortLinkSchema>;
