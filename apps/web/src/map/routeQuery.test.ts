import { describe, expect, it } from 'vitest';
import { fromSearchParams, toSearchParams } from './routeQuery.js';

describe('toSearchParams', () => {
  it('copies single and repeated values', () => {
    const params = toSearchParams({ q: 'pond', layers: ['a', 'b'] });
    expect(params.get('q')).toBe('pond');
    expect(params.getAll('layers')).toEqual(['a', 'b']);
  });

  it('drops null values, which the router uses for a bare `?key`', () => {
    expect(toSearchParams({ mine: null }).has('mine')).toBe(false);
  });
});

describe('fromSearchParams', () => {
  it('round-trips through the router query shape', () => {
    const original = new URLSearchParams('q=pond&layers=a&layers=b&feature=x');
    const roundTripped = toSearchParams(
      fromSearchParams(original) as Parameters<typeof toSearchParams>[0],
    );
    expect(roundTripped.toString()).toBe(original.toString());
  });
});
