import { describe, expect, it } from 'vitest';
import {
  createLayerInputSchema,
  layerFieldSchema,
  layerPropertiesSchema,
  slugSchema,
} from './layers.js';

describe('slugSchema', () => {
  it.each(['community-gardens', 'repair-cafe', 'wildlife'])('accepts %s', (slug) => {
    expect(slugSchema.safeParse(slug).success).toBe(true);
  });

  it.each(['Community Gardens', 'double--hyphen', '-leading', 'trailing-', 'a'])(
    'rejects %s',
    (slug) => {
      expect(slugSchema.safeParse(slug).success).toBe(false);
    },
  );

  it('lowercases input', () => {
    expect(slugSchema.parse('  Wildlife-Sightings ')).toBe('wildlife-sightings');
  });
});

describe('createLayerInputSchema', () => {
  it('fills in sensible defaults', () => {
    const layer = createLayerInputSchema.parse({ slug: 'wildlife', name: 'Wildlife sightings' });
    expect(layer.color).toBe('#2f855a');
    expect(layer.allowedGeometries).toEqual(['Point', 'LineString', 'Polygon']);
    expect(layer.isPublished).toBe(true);
    expect(layer.fields).toEqual([]);
  });

  it('rejects a layer that allows no geometry at all', () => {
    const result = createLayerInputSchema.safeParse({
      slug: 'wildlife',
      name: 'Wildlife',
      allowedGeometries: [],
    });
    expect(result.success).toBe(false);
  });
});

describe('layerFieldSchema', () => {
  it('requires options on a select field', () => {
    const result = layerFieldSchema.safeParse({ key: 'season', label: 'Season', type: 'select' });
    expect(result.success).toBe(false);
  });

  it('accepts a select field with options', () => {
    const result = layerFieldSchema.safeParse({
      key: 'season',
      label: 'Season',
      type: 'select',
      options: ['Spring', 'Summer'],
    });
    expect(result.success).toBe(true);
  });

  it('rejects a key that is not camelCase', () => {
    expect(
      layerFieldSchema.safeParse({ key: 'opening_hours', label: 'Opening hours', type: 'text' })
        .success,
    ).toBe(false);
  });
});

describe('layerPropertiesSchema', () => {
  const fields = [
    layerFieldSchema.parse({ key: 'species', label: 'Species', type: 'text', required: true }),
    layerFieldSchema.parse({ key: 'count', label: 'How many', type: 'number' }),
    layerFieldSchema.parse({ key: 'website', label: 'Website', type: 'url' }),
    layerFieldSchema.parse({
      key: 'season',
      label: 'Season',
      type: 'select',
      options: ['Spring', 'Summer'],
    }),
  ];
  const schema = layerPropertiesSchema(fields);

  it('accepts a valid property bag', () => {
    const result = schema.safeParse({
      species: 'Common toad',
      count: 4,
      website: 'https://example.org',
      season: 'Spring',
    });
    expect(result.success).toBe(true);
  });

  it('requires fields marked required', () => {
    expect(schema.safeParse({ count: 2 }).success).toBe(false);
  });

  it('allows optional fields to be omitted or blank', () => {
    expect(schema.safeParse({ species: 'Common toad' }).success).toBe(true);
    expect(schema.safeParse({ species: 'Common toad', website: '' }).success).toBe(true);
  });

  it('rejects a select value outside the option list', () => {
    expect(schema.safeParse({ species: 'Common toad', season: 'Winter' }).success).toBe(false);
  });

  it('rejects a malformed url', () => {
    expect(schema.safeParse({ species: 'Common toad', website: 'not a url' }).success).toBe(false);
  });
});
