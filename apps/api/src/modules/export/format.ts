import type { Feature, Layer } from '@ecomap/shared';

/**
 * A community's content as plain files it can take anywhere - every place,
 * route and area with its layer, texts, status, extra fields and photo links.
 * The partner agreement promises this export; it is also a human-readable
 * backup next to the database dumps.
 */

export interface ExportContext {
  layers: readonly Layer[];
  /** e.g. "https://map.example.org" - photo links are made absolute with it. */
  origin: string;
  exportedAt: string;
}

/** Put first in the CSV so Excel reads Danish letters (æ, ø, å) correctly. */
export const BYTE_ORDER_MARK = String.fromCharCode(0xfeff);

export const OSM_ATTRIBUTION =
  'Places imported from OpenStreetMap: © OpenStreetMap contributors, Open Database Licence (ODbL).';

function photoUrls(feature: Feature, origin: string): string[] {
  return feature.images.map((image) => new URL(image.url, origin).toString());
}

/** GeoJSON: what map tools (QGIS, geojson.io, uMap) open directly. */
export function toGeoJson(features: readonly Feature[], context: ExportContext): object {
  const layerName = new Map(context.layers.map((layer) => [layer.slug, layer.name]));
  return {
    type: 'FeatureCollection',
    exportedAt: context.exportedAt,
    attribution: OSM_ATTRIBUTION,
    features: features.map((feature) => ({
      type: 'Feature',
      id: feature.id,
      geometry: feature.geometry,
      properties: {
        layer: feature.layerSlug,
        layerName: layerName.get(feature.layerSlug) ?? feature.layerSlug,
        name: feature.name,
        description: feature.description,
        status: feature.status,
        createdBy: feature.createdByName,
        createdAt: feature.createdAt,
        updatedAt: feature.updatedAt,
        photos: photoUrls(feature, context.origin),
        fields: feature.properties,
      },
    })),
  };
}

const FIXED_COLUMNS = [
  'id',
  'layer',
  'layer_name',
  'name',
  'description',
  'status',
  'latitude',
  'longitude',
  'geometry_type',
  'geometry_geojson',
  'created_by',
  'created_at',
  'updated_at',
  'photos',
] as const;

/** One spreadsheet cell: quoted when needed, and safe from formula injection. */
function cell(value: unknown): string {
  if (value === null || value === undefined) return '';
  let text = typeof value === 'string' ? value : JSON.stringify(value);
  /*
   * A cell starting with = + - @ would run as a formula when the file is opened
   * in a spreadsheet; anyone can type a place's name, so neutralise it.
   */
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

/**
 * CSV: one row per place, for spreadsheets. Points get latitude and longitude;
 * routes and areas keep their full shape as GeoJSON in `geometry_geojson`.
 * Each extra field of any layer gets its own `field_<key>` column.
 */
export function toCsv(features: readonly Feature[], context: ExportContext): string {
  const layerName = new Map(context.layers.map((layer) => [layer.slug, layer.name]));
  const fieldKeys = [
    ...new Set(features.flatMap((feature) => Object.keys(feature.properties))),
  ].sort((a, b) => a.localeCompare(b));

  const header = [...FIXED_COLUMNS, ...fieldKeys.map((key) => `field_${key}`)];
  const rows = features.map((feature) => {
    const point = feature.geometry.type === 'Point' ? feature.geometry.coordinates : null;
    const fixed = [
      feature.id,
      feature.layerSlug,
      layerName.get(feature.layerSlug) ?? feature.layerSlug,
      feature.name,
      feature.description,
      feature.status,
      point ? point[1] : null,
      point ? point[0] : null,
      feature.geometry.type,
      point ? null : feature.geometry,
      feature.createdByName,
      feature.createdAt,
      feature.updatedAt,
      photoUrls(feature, context.origin).join(' '),
    ];
    const fields = fieldKeys.map((key) => feature.properties[key]);
    return [...fixed, ...fields].map(cell).join(',');
  });

  return `${BYTE_ORDER_MARK}${[header.join(','), ...rows].join('\r\n')}\r\n`;
}
