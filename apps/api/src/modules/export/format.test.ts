import type { Feature, Layer } from '@ecomap/shared';
import { describe, expect, it } from 'vitest';
import { BYTE_ORDER_MARK, toCsv, toGeoJson, type ExportContext } from './format.js';

function feature(overrides: Partial<Feature>): Feature {
  return {
    id: '00000000-0000-4000-8000-000000000001',
    layerId: '00000000-0000-4000-8000-0000000000aa',
    layerSlug: 'local-food',
    name: 'Gårdbutik',
    description: 'Æg og honning',
    geometry: { type: 'Point', coordinates: [14.9, 55.1] },
    properties: {},
    status: 'published',
    createdById: null,
    createdByName: 'Admin',
    createdByAvatarUrl: null,
    images: [],
    createdAt: '2026-11-04T10:00:00.000Z',
    updatedAt: '2026-11-04T10:00:00.000Z',
    ...overrides,
  };
}

const context: ExportContext = {
  layers: [{ slug: 'local-food', name: 'Lokal mad og drikke' } as Layer],
  origin: 'https://map.example.org',
  exportedAt: '2026-11-04T12:00:00.000Z',
};

describe('toGeoJson', () => {
  it('keeps the shape, the layer name, the status and absolute photo links', () => {
    const result = toGeoJson(
      [
        feature({
          status: 'pending',
          properties: { organic: true },
          images: [{ id: '00000000-0000-4000-8000-0000000000bb', url: '/api/images/x', alt: '' }],
        }),
      ],
      context,
    ) as { features: { geometry: unknown; properties: Record<string, unknown> }[] };

    const [only] = result.features;
    expect(only?.geometry).toEqual({ type: 'Point', coordinates: [14.9, 55.1] });
    expect(only?.properties).toMatchObject({
      layer: 'local-food',
      layerName: 'Lokal mad og drikke',
      status: 'pending',
      photos: ['https://map.example.org/api/images/x'],
      fields: { organic: true },
    });
  });
});

describe('toCsv', () => {
  const lines = (csv: string): string[] => csv.replace(BYTE_ORDER_MARK, '').trimEnd().split('\r\n');

  it('starts with a byte-order mark, so spreadsheets read æ, ø and å', () => {
    expect(toCsv([feature({})], context).charCodeAt(0)).toBe(0xfeff);
  });

  it('puts latitude before longitude and gives every extra field a column', () => {
    const [header, row] = lines(toCsv([feature({ properties: { organic: true } })], context));
    expect(header).toContain('latitude,longitude');
    expect(header?.endsWith('field_organic')).toBe(true);
    expect(row).toContain('55.1,14.9');
    expect(row?.endsWith('true')).toBe(true);
  });

  it('quotes commas, quotes and line breaks', () => {
    const [, row] = lines(toCsv([feature({ name: 'Øl, "is" og\nkaffe' })], context));
    expect(row).toContain('"Øl, ""is"" og\nkaffe"');
  });

  it('stops a name from running as a spreadsheet formula', () => {
    const [, row] = lines(toCsv([feature({ name: '=HYPERLINK("x")' })], context));
    expect(row).toContain(`"'=HYPERLINK(""x"")"`);
  });

  it('keeps the full shape of routes and areas', () => {
    const route = feature({
      geometry: {
        type: 'LineString',
        coordinates: [
          [14.9, 55.1],
          [15, 55.2],
        ],
      },
    });
    const [, row] = lines(toCsv([route], context));
    expect(row).toContain('LineString');
    expect(row).toContain('""coordinates""');
  });
});
