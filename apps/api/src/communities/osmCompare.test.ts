import { describe, expect, it } from 'vitest';
import { compareWithOsm, newCandidates, type OsmElement } from './osmCompare.js';
import type { CommunityPlace } from './types.js';

const place = (overrides: Partial<CommunityPlace> = {}): CommunityPlace => ({
  osmId: 'node/1',
  layerSlug: 'local-food',
  name: 'Gårdbutik Øst',
  description: '',
  coordinates: [15.0, 55.1],
  properties: {},
  ...overrides,
});

const node = (tags: Record<string, string>, lat = 55.1, lon = 15.0): OsmElement => ({
  type: 'node',
  id: 1,
  lat,
  lon,
  tags,
});

describe('compareWithOsm', () => {
  it('says nothing when nothing changed', () => {
    const current = new Map([['node/1', node({ name: 'Gårdbutik Øst' })]]);
    expect(compareWithOsm([place()], current)).toEqual([]);
  });

  it('notices a place that is gone from OSM', () => {
    expect(compareWithOsm([place()], new Map())).toEqual([{ kind: 'gone', place: place() }]);
  });

  it('notices closed, moved, renamed and new opening hours', () => {
    const current = new Map([
      [
        'node/1',
        node(
          { name: 'Ny Gårdbutik', 'disused:shop': 'farm', opening_hours: 'Sa 10:00-14:00' },
          55.102,
          15.0,
        ),
      ],
    ]);
    const kinds = compareWithOsm(
      [place({ properties: { openingHours: 'Mo-Fr 09:00-17:00' } })],
      current,
    ).map((finding) => finding.kind);
    expect(kinds).toEqual(['closed', 'moved', 'renamed', 'hours']);
  });

  it('accepts names built from the OSM name, and websites that differ only in form', () => {
    const current = new Map([
      ['node/1', node({ name: 'Gudhjem', website: 'https://www.example.dk/' })],
    ]);
    const findings = compareWithOsm(
      [place({ name: 'Drikkevand ved Gudhjem', properties: { website: 'http://example.dk' } })],
      current,
    );
    expect(findings).toEqual([]);
  });
});

describe('newCandidates', () => {
  it('keeps named objects the community does not have yet, once each', () => {
    const found: OsmElement[] = [
      { type: 'node', id: 1, tags: { name: 'Known' } },
      { type: 'node', id: 2, tags: { name: 'New' } },
      { type: 'node', id: 2, tags: { name: 'New' } },
      { type: 'node', id: 3, tags: {} },
    ];
    expect(newCandidates(found, new Set(['node/1'])).map((element) => element.id)).toEqual([2]);
  });
});
