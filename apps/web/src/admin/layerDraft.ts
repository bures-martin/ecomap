import { createLayerInputSchema, type CreateLayerInput, type Layer } from '@ecomap/shared';

export type LayerDraft = CreateLayerInput;

/**
 * A blank draft for the "new layer" dialog.
 *
 * It is deliberately *not* schema-valid - name and slug are empty until the
 * admin types them. The defaults are still taken from the schema so there is
 * one source of truth for a new layer's colour, icon and geometries; the arrays
 * are copied so editing one draft cannot mutate the next one.
 */
export function emptyLayerDraft(): LayerDraft {
  const defaults = createLayerInputSchema.parse({ slug: 'placeholder', name: 'Placeholder' });
  return {
    ...defaults,
    slug: '',
    name: '',
    allowedGeometries: [...defaults.allowedGeometries],
    fields: [],
  };
}

export function toLayerDraft(layer: Layer | null): LayerDraft {
  if (!layer) return emptyLayerDraft();

  return {
    slug: layer.slug,
    name: layer.name,
    description: layer.description,
    color: layer.color,
    icon: layer.icon,
    allowedGeometries: [...layer.allowedGeometries],
    fields: layer.fields.map((field) => ({ ...field, options: [...field.options] })),
    sortOrder: layer.sortOrder,
    isPublished: layer.isPublished,
    requiresModeration: layer.requiresModeration,
  };
}

/**
 * Letters that are their own character rather than a base letter plus an accent,
 * so Unicode normalisation cannot decompose them. Without this, Danish names
 * lose their vowels: "Grøn energi" would slug as "gr-n-energi".
 */
const TRANSLITERATIONS: Readonly<Record<string, string>> = {
  æ: 'ae',
  ø: 'o',
  å: 'a',
  ð: 'd',
  þ: 'th',
  đ: 'd',
  ł: 'l',
  ß: 'ss',
};

/** Mirrors `slugSchema`: lowercase words joined by single hyphens. */
export function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[æøåðþđłß]/g, (char) => TRANSLITERATIONS[char] ?? char)
      /* Strips the accents off letters that *do* decompose (é, ü, ñ, ...). */
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60)
      /* A trim could leave a trailing hyphen, which the schema rejects. */
      .replace(/-+$/, '')
  );
}
