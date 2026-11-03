import { describe, expect, it } from 'vitest';
import {
  EMPTY_FILTERS,
  effectiveLayers,
  layersAfterChip,
  layersAfterToggle,
  NO_LAYERS,
  visibleLayerSlugs,
  filtersKey,
  hasActiveFilters,
  readFilters,
  writeFilters,
  type MapFilters,
} from './filters.js';

describe('readFilters', () => {
  it('returns empty filters for an empty query string', () => {
    expect(readFilters(new URLSearchParams())).toEqual(EMPTY_FILTERS);
  });

  it('splits the comma-separated layer list', () => {
    const filters = readFilters(new URLSearchParams('layers=gardens,repair-cafe'));
    expect(filters.layers).toEqual(['gardens', 'repair-cafe']);
  });

  it('drops empty entries left by a trailing comma', () => {
    expect(readFilters(new URLSearchParams('layers=gardens,,')).layers).toEqual(['gardens']);
  });

  it('ignores a status the app does not know', () => {
    expect(readFilters(new URLSearchParams('status=archived')).status).toBeNull();
  });

  it('reads a known status', () => {
    expect(readFilters(new URLSearchParams('status=pending')).status).toBe('pending');
  });

  it('treats "mine" as a flag', () => {
    expect(readFilters(new URLSearchParams('mine=true')).mine).toBe(true);
    expect(readFilters(new URLSearchParams('mine=no')).mine).toBe(false);
  });
});

describe('writeFilters', () => {
  it('omits everything that is empty, keeping the URL short', () => {
    expect(writeFilters(EMPTY_FILTERS, new URLSearchParams()).toString()).toBe('');
  });

  it('round-trips through readFilters', () => {
    const filters: MapFilters = {
      layers: ['gardens', 'trails'],
      q: 'bee',
      status: 'pending',
      mine: true,
    };
    expect(readFilters(writeFilters(filters, new URLSearchParams()))).toEqual(filters);
  });

  it('trims the search term', () => {
    const params = writeFilters({ ...EMPTY_FILTERS, q: '  bee  ' }, new URLSearchParams());
    expect(params.get('q')).toBe('bee');
  });

  it('leaves unrelated parameters alone', () => {
    const base = new URLSearchParams('feature=abc');
    const params = writeFilters({ ...EMPTY_FILTERS, q: 'bee' }, base);
    expect(params.get('feature')).toBe('abc');
  });

  it('removes a parameter when its filter is cleared', () => {
    const base = new URLSearchParams('q=bee&layers=gardens');
    expect(writeFilters(EMPTY_FILTERS, base).toString()).toBe('');
  });
});

describe('hasActiveFilters', () => {
  it('is false for the empty filter set', () => {
    expect(hasActiveFilters(EMPTY_FILTERS)).toBe(false);
  });

  it('ignores a search box holding only whitespace', () => {
    expect(hasActiveFilters({ ...EMPTY_FILTERS, q: '   ' })).toBe(false);
  });

  it.each([
    ['layers', { layers: ['gardens'] }],
    ['search', { q: 'bee' }],
    ['status', { status: 'pending' as const }],
    ['mine', { mine: true }],
  ])('is true when %s is set', (_label, patch) => {
    expect(hasActiveFilters({ ...EMPTY_FILTERS, ...patch })).toBe(true);
  });
});

describe('filtersKey', () => {
  it('is stable regardless of the order layers were selected in', () => {
    const a = { ...EMPTY_FILTERS, layers: ['b', 'a'] };
    const b = { ...EMPTY_FILTERS, layers: ['a', 'b'] };
    expect(filtersKey(a)).toBe(filtersKey(b));
  });

  it('differs when a filter actually differs', () => {
    expect(filtersKey({ ...EMPTY_FILTERS, q: 'bee' })).not.toBe(filtersKey(EMPTY_FILTERS));
  });
});

describe('which layers show', () => {
  const layers = [
    { slug: 'nature', visibleByDefault: true },
    { slug: 'cycling', visibleByDefault: true },
    { slug: 'ev', visibleByDefault: false },
  ];
  const none: MapFilters = { layers: [], q: '', status: null, mine: false };

  it('opens on the layers marked to show at the start', () => {
    expect(effectiveLayers(none, layers)).toEqual(['nature', 'cycling']);
    expect([...visibleLayerSlugs(none, layers)]).toEqual(['nature', 'cycling']);
  });

  it('asks for everything when every layer shows at the start - the shortest request', () => {
    const allOn = layers.map((layer) => ({ ...layer, visibleByDefault: true }));
    expect(effectiveLayers(none, allOn)).toEqual([]);
  });

  it('never opens on an empty map, even if every layer is switched off', () => {
    const allOff = layers.map((layer) => ({ ...layer, visibleByDefault: false }));
    expect(effectiveLayers(none, allOff)).toEqual([]);
  });

  it('searches every layer, including ones that start switched off', () => {
    expect(effectiveLayers({ ...none, q: 'charger' }, layers)).toEqual([]);
  });

  it('lets an explicit pick win', () => {
    expect(effectiveLayers({ ...none, layers: ['ev'] }, layers)).toEqual(['ev']);
  });

  it('ticks a layer on top of what is already visible', () => {
    expect(layersAfterToggle(none, layers, 'ev', true)).toEqual(['nature', 'cycling', 'ev']);
  });

  it('drops back to "no pick" when the ticks match the starting set again', () => {
    const picked = { ...none, layers: ['nature', 'cycling', 'ev'] };
    expect(layersAfterToggle(picked, layers, 'ev', false)).toEqual([]);
  });

  it('leaves nothing ticked when the only layer left is unticked', () => {
    const emptied = layersAfterToggle({ ...none, layers: ['ev'] }, layers, 'ev', false);
    expect(emptied).toEqual([NO_LAYERS]);
    expect(visibleLayerSlugs({ ...none, layers: emptied }, layers).size).toBe(0);
  });

  it('ticks a layer back on from an empty map', () => {
    expect(layersAfterToggle({ ...none, layers: [NO_LAYERS] }, layers, 'ev', true)).toEqual(['ev']);
  });

  it('makes a chip pick just its topic, and a second tap let go', () => {
    expect(layersAfterChip(none, 'ev')).toEqual(['ev']);
    expect(layersAfterChip({ ...none, layers: ['ev'] }, 'ev')).toEqual([]);
    expect(layersAfterChip({ ...none, layers: ['nature', 'ev'] }, 'ev')).toEqual(['ev']);
  });
});
