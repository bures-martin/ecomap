import type { CommunityPlace } from './types.js';

/**
 * Pure comparison between a community's places and what OpenStreetMap says
 * today - kept apart from the network code in `osm-check.ts` so it can be
 * tested. Nothing here changes data: it only lists what a person should look at.
 */

/** One object as Overpass returns it with `out center tags`. */
export interface OsmElement {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

export type Finding =
  | { kind: 'gone'; place: CommunityPlace }
  | { kind: 'closed'; place: CommunityPlace; why: string }
  | { kind: 'moved'; place: CommunityPlace; metres: number }
  | { kind: 'renamed'; place: CommunityPlace; osmName: string }
  | { kind: 'hours'; place: CommunityPlace; ours: string; osm: string }
  | { kind: 'website'; place: CommunityPlace; ours: string; osm: string };

/** Further than this and the pin is probably in the wrong spot now. */
export const MOVED_METRES = 100;

export function osmKey(element: Pick<OsmElement, 'type' | 'id'>): string {
  return `${element.type}/${String(element.id)}`;
}

function position(element: OsmElement): [number, number] | null {
  if (element.lat !== undefined && element.lon !== undefined) return [element.lon, element.lat];
  if (element.center) return [element.center.lon, element.center.lat];
  return null;
}

function metresBetween([lng1, lat1]: [number, number], [lng2, lat2]: [number, number]): number {
  const rad = (degrees: number): number => (degrees * Math.PI) / 180;
  const a =
    Math.sin(rad(lat2 - lat1) / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lng2 - lng1) / 2) ** 2;
  return 2 * 6_371_000 * Math.asin(Math.sqrt(a));
}

/** Tags OSM mappers use when a place has shut. */
function closedReason(tags: Record<string, string>): string | null {
  for (const [key, value] of Object.entries(tags)) {
    if (/^(disused|abandoned|was|demolished|removed):/.test(key)) return `${key}=${value}`;
  }
  if (tags['opening_hours'] === 'closed' || tags['opening_hours'] === 'off') {
    return `opening_hours=${tags['opening_hours']}`;
  }
  if (tags['shop'] === 'vacant') return 'shop=vacant';
  return null;
}

const normalise = (text: string): string => text.trim().replace(/\s+/g, ' ').toLowerCase();

/**
 * What changed for each place since it was taken from OSM. Names are only
 * compared when OSM has one and ours is not built from it ("Drikkevand ved
 * Gudhjem" stands for an unnamed tap); opening hours and websites only when
 * both sides have a value.
 */
export function compareWithOsm(
  places: readonly CommunityPlace[],
  current: ReadonlyMap<string, OsmElement>,
): Finding[] {
  const findings: Finding[] = [];
  for (const place of places) {
    const element = current.get(place.osmId);
    if (!element) {
      findings.push({ kind: 'gone', place });
      continue;
    }
    const tags = element.tags ?? {};

    const closed = closedReason(tags);
    if (closed) findings.push({ kind: 'closed', place, why: closed });

    const where = position(element);
    if (where) {
      const metres = Math.round(metresBetween(place.coordinates, where));
      if (metres > MOVED_METRES) findings.push({ kind: 'moved', place, metres });
    }

    const osmName = tags['name'];
    if (osmName && !normalise(place.name).includes(normalise(osmName))) {
      findings.push({ kind: 'renamed', place, osmName });
    }

    const ourHours = place.properties['openingHours'];
    const osmHours = tags['opening_hours'];
    if (typeof ourHours === 'string' && osmHours && ourHours.trim() !== osmHours.trim()) {
      findings.push({ kind: 'hours', place, ours: ourHours, osm: osmHours });
    }

    const ourSite = place.properties['website'];
    const osmSite = tags['website'] ?? tags['contact:website'];
    const site = (url: string): string =>
      normalise(url)
        .replace(/^https?:\/\/(www\.)?/, '')
        .replace(/\/$/, '');
    if (typeof ourSite === 'string' && osmSite && site(ourSite) !== site(osmSite)) {
      findings.push({ kind: 'website', place, ours: ourSite, osm: osmSite });
    }
  }
  return findings;
}

/** Named OSM objects matching a layer's searches that the community does not have yet. */
export function newCandidates(
  found: readonly OsmElement[],
  known: ReadonlySet<string>,
): OsmElement[] {
  const seen = new Set<string>();
  return found.filter((element) => {
    const key = osmKey(element);
    if (known.has(key) || seen.has(key) || !element.tags?.['name']) return false;
    seen.add(key);
    return true;
  });
}
