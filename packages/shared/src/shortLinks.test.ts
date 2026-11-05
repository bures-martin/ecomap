import { describe, expect, it } from 'vitest';
import { shareableQuery, shortCodeSchema, type QueryReader } from './shortLinks.js';

const PLACE = '34811992-1c48-4b91-988f-92711c809d2a';

/* This package has no URLSearchParams; a plain lookup stands in for one. */
function query(values: Record<string, string>): QueryReader {
  return { get: (name) => values[name] ?? null };
}

describe('shareableQuery', () => {
  it('keeps the place, the layers and the search, in one fixed order', () => {
    const params = query({ q: 'honning', layers: 'from-the-farm,local-drinks', feature: PLACE });
    expect(shareableQuery(params)).toBe(
      `feature=${PLACE}&layers=from-the-farm%2Clocal-drinks&q=honning`,
    );
  });

  it('drops personal views and anything it does not know', () => {
    const params = query({ mine: 'true', status: 'pending', next: 'https://evil.example' });
    expect(shareableQuery(params)).toBe('');
  });

  it('drops a malformed place id and malformed layer slugs', () => {
    const params = query({ feature: 'not-a-uuid', layers: 'from-the-farm,Bad Slug!,-' });
    expect(shareableQuery(params)).toBe('layers=from-the-farm');
  });

  it('gives the same string for the same view, however it was written', () => {
    const a = shareableQuery(query({ feature: PLACE.toUpperCase(), q: ' bi ' }));
    const b = shareableQuery(query({ q: 'bi', feature: PLACE }));
    expect(a).toBe(b);
  });

  it('encodes a search with spaces and Danish letters', () => {
    expect(shareableQuery(query({ q: 'røget sild & øl' }))).toBe(
      'q=r%C3%B8get%20sild%20%26%20%C3%B8l',
    );
  });

  it('cuts an overlong search', () => {
    expect(shareableQuery(query({ q: 'x'.repeat(500) }))).toBe(`q=${'x'.repeat(120)}`);
  });
});

describe('shortCodeSchema', () => {
  it('accepts a code typed in capitals', () => {
    expect(shortCodeSchema.parse('K7M2QX')).toBe('k7m2qx');
  });

  it('rejects look-alike characters and wrong lengths', () => {
    expect(shortCodeSchema.safeParse('k7m2q0').success).toBe(false);
    expect(shortCodeSchema.safeParse('k7m2q').success).toBe(false);
    expect(shortCodeSchema.safeParse('../../x').success).toBe(false);
  });
});
