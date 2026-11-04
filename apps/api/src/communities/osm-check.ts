/**
 * `npm run data:check [community]` - compares a community's places with what
 * OpenStreetMap says today and lists places the map does not have yet. It
 * changes nothing: it prints a Markdown report for a person to go through.
 * The routine around it is in docs/data.md.
 *
 * Uses the public Overpass API, which is often busy - it retries and falls
 * back to a second server.
 */
import { writeFileSync } from 'node:fs';
import { COMMUNITIES, type CommunitySlug } from './index.js';
import {
  compareWithOsm,
  newCandidates,
  osmKey,
  type Finding,
  type OsmElement,
} from './osmCompare.js';

const SERVERS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];
const USER_AGENT = 'EcoMap data check (https://github.com/bures-martin/ecomap)';

async function overpass(query: string): Promise<OsmElement[]> {
  let lastError: unknown = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    for (const server of SERVERS) {
      try {
        const response = await fetch(server, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': USER_AGENT,
          },
          body: new URLSearchParams({ data: query }),
          signal: AbortSignal.timeout(120_000),
        });
        if (!response.ok) throw new Error(`${server}: HTTP ${String(response.status)}`);
        const json = (await response.json()) as { elements?: OsmElement[] };
        return json.elements ?? [];
      } catch (error) {
        lastError = error;
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 5_000 * (attempt + 1)));
  }
  throw new Error(`Overpass did not answer: ${String(lastError)}`);
}

function idsQuery(osmIds: readonly string[]): string {
  const byType: Record<string, string[]> = { node: [], way: [], relation: [] };
  for (const id of osmIds) {
    const [type, number] = id.split('/');
    if (type && number) byType[type]?.push(number);
  }
  const parts = Object.entries(byType)
    .filter(([, ids]) => ids.length > 0)
    .map(([type, ids]) => `${type}(id:${ids.join(',')});`);
  return `[out:json][timeout:120];(${parts.join('')});out center tags;`;
}

const osmLink = (key: string): string => `https://www.openstreetmap.org/${key}`;

function describe(finding: Finding): string {
  const place = `**${finding.place.name}** (${finding.place.layerSlug}, [${finding.place.osmId}](${osmLink(finding.place.osmId)}))`;
  switch (finding.kind) {
    case 'gone':
      return `${place} - no longer in OpenStreetMap (closed, or merged into another object?)`;
    case 'closed':
      return `${place} - marked as closed in OSM: \`${finding.why}\``;
    case 'moved':
      return `${place} - OSM puts it ${String(finding.metres)} m away from our pin`;
    case 'renamed':
      return `${place} - OSM name is now "${finding.osmName}"`;
    case 'hours':
      return `${place} - opening hours: ours \`${finding.ours}\`, OSM \`${finding.osm}\``;
    case 'website':
      return `${place} - website: ours ${finding.ours}, OSM ${finding.osm}`;
  }
}

async function main(): Promise<void> {
  const slug = (process.argv[2] ?? process.env['COMMUNITY'] ?? 'bornholm') as CommunitySlug;
  const community = COMMUNITIES[slug] as (typeof COMMUNITIES)[CommunitySlug] | undefined;
  if (!community) throw new Error(`Unknown community "${slug}"`);
  const osm = community.osm;
  if (!osm) throw new Error(`Community "${slug}" has no OpenStreetMap source`);

  const lines: string[] = [
    `# OpenStreetMap check - ${slug}, ${new Date().toISOString().slice(0, 10)}`,
    '',
  ];

  /* 1. Our places as OSM has them today. */
  const current = new Map(
    (await overpass(idsQuery(community.places.map((place) => place.osmId)))).map((element) => [
      osmKey(element),
      element,
    ]),
  );
  const findings = compareWithOsm(community.places, current);
  lines.push(
    `## Our ${String(community.places.length)} places: ${String(findings.length)} to look at`,
    '',
  );
  lines.push(
    ...(findings.length
      ? findings.map((finding) => `- [ ] ${describe(finding)}`)
      : ['Nothing changed.']),
  );
  lines.push('');

  /* 2. Places in OSM the map does not have yet, layer by layer. */
  const known = new Set(community.places.map((place) => place.osmId));
  const [south, west, north, east] = osm.bbox;
  const box = `(${String(south)},${String(west)},${String(north)},${String(east)})`;
  lines.push('## Possibly new places', '');
  for (const [layer, filters] of Object.entries(osm.searches)) {
    const query = `[out:json][timeout:120];(${filters.map((filter) => `${filter}${box};`).join('')});out center tags;`;
    const candidates = newCandidates(await overpass(query), known);
    lines.push(`### ${layer} - ${String(candidates.length)}`, '');
    for (const element of candidates) {
      const key = osmKey(element);
      const what = Object.entries(element.tags ?? {})
        .filter(([tag]) => /^(shop|craft|amenity|leisure|landuse|power|plant:source)$/.test(tag))
        .map(([tag, value]) => `${tag}=${value}`)
        .join(', ');
      lines.push(
        `- [ ] **${element.tags?.['name'] ?? key}** - ${what} - [${key}](${osmLink(key)})`,
      );
    }
    lines.push('');
  }

  const report = lines.join('\n');
  const out = process.argv.find((arg) => arg.startsWith('--out='))?.slice('--out='.length);
  if (out) {
    writeFileSync(out, report);
    process.stdout.write(`Report written to ${out}
`);
  } else {
    process.stdout.write(`${report}
`);
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
