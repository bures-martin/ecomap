import { createLayerInputSchema, slugSchema } from '@ecomap/shared';
import { describe, expect, it } from 'vitest';
import { emptyLayerDraft, slugify } from './layerDraft.js';

describe('emptyLayerDraft', () => {
  /*
   * Regression: this used to build the blank draft by running `{ name: '' }`
   * through the schema, which requires two characters - so opening the "new
   * layer" dialog threw during render and white-screened the admin page.
   */
  it('does not throw, even though a blank draft is not yet schema-valid', () => {
    expect(() => emptyLayerDraft()).not.toThrow();
  });

  it('starts with an empty name and slug for the admin to fill in', () => {
    const draft = emptyLayerDraft();
    expect(draft.name).toBe('');
    expect(draft.slug).toBe('');
  });

  it('takes every other default from the schema', () => {
    const draft = emptyLayerDraft();
    const defaults = createLayerInputSchema.parse({ slug: 'placeholder', name: 'Placeholder' });

    expect(draft.color).toBe(defaults.color);
    expect(draft.icon).toBe(defaults.icon);
    expect(draft.allowedGeometries).toEqual(defaults.allowedGeometries);
    expect(draft.isPublished).toBe(defaults.isPublished);
    expect(draft.requiresModeration).toBe(defaults.requiresModeration);
  });

  it('gives each draft its own arrays, so one dialog cannot mutate the next', () => {
    const first = emptyLayerDraft();
    const second = emptyLayerDraft();
    expect(first.allowedGeometries).not.toBe(second.allowedGeometries);
    expect(first.fields).not.toBe(second.fields);
  });

  it('becomes valid once a name and slug are typed', () => {
    const draft = { ...emptyLayerDraft(), name: 'Repair cafés', slug: 'repair-cafes' };
    expect(createLayerInputSchema.safeParse(draft).success).toBe(true);
  });
});

describe('slugify', () => {
  it.each([
    ['Community gardens', 'community-gardens'],
    ['Repair cafés', 'repair-cafes'],
    ['  Wildlife   sightings  ', 'wildlife-sightings'],
    ['A & B', 'a-b'],
  ])('turns %j into %j', (input, expected) => {
    expect(slugify(input)).toBe(expected);
  });

  /*
   * Danish is the first community's language, and æ/ø are separate letters
   * rather than accented vowels - Unicode normalisation alone drops them.
   */
  it.each([
    ['Grøn energi', 'gron-energi'],
    ['Sæby fælleshave', 'saeby-faelleshave'],
    ['Årsplan', 'arsplan'],
    ['Affald & genbrug på Bornholm', 'affald-genbrug-pa-bornholm'],
  ])('keeps Danish letters readable: %j becomes %j', (input, expected) => {
    expect(slugify(input)).toBe(expected);
  });

  it('produces slugs the shared schema accepts', () => {
    const names = [
      'Community gardens',
      'Repair cafés',
      'Nature trails & paths',
      'Grøn energi',
      'Sæby fælleshave',
      'x'.repeat(200),
    ];
    for (const name of names) {
      expect(slugSchema.safeParse(slugify(name)).success, name).toBe(true);
    }
  });

  it('never exceeds the 60-character limit the schema enforces', () => {
    expect(slugify('x'.repeat(200)).length).toBeLessThanOrEqual(60);
  });
});
