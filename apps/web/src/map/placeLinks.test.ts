import { layerFieldSchema, type Feature, type Layer, type PropertyBag } from '@ecomap/shared';
import { mdiFacebook, mdiLinkVariant, mdiOwl } from '@mdi/js';
import { describe, expect, it } from 'vitest';
import { placeLinks } from './placeLinks.js';

const layer = {
  fields: [
    { key: 'website', label: 'Hjemmeside', type: 'url' },
    { key: 'openingHours', label: 'Åbningstider', type: 'openingHours' },
    { key: 'facebook', label: 'Facebook', type: 'url' },
    { key: 'tripadvisor', label: 'Tripadvisor', type: 'url' },
    { key: 'bookingPage', label: 'Book a table', type: 'url' },
  ].map((field) => layerFieldSchema.parse(field)),
} as Layer;

function place(properties: PropertyBag): Feature {
  return { properties } as Feature;
}

describe('placeLinks', () => {
  it('turns every filled-in link field into a button, in the layer order', () => {
    const links = placeLinks(
      place({
        tripadvisor: 'https://www.tripadvisor.dk/Restaurant_Review-x',
        openingHours: 'Mo-Fr 10:00-17:00',
        facebook: 'https://www.facebook.com/kaasbo',
        website: '',
      }),
      layer,
    );
    expect(links.map((link) => [link.key, link.label, link.icon])).toEqual([
      ['facebook', 'Facebook', mdiFacebook],
      ['tripadvisor', 'Tripadvisor', mdiOwl],
    ]);
  });

  it('gives a link field it does not know a plain link icon', () => {
    const [link] = placeLinks(place({ bookingPage: 'https://example.dk/book' }), layer);
    expect(link).toMatchObject({ label: 'Book a table', icon: mdiLinkVariant });
  });

  it('leaves out anything that is not a web link', () => {
    expect(
      placeLinks(
        place({
          website: 'javascript:alert(1)',
          facebook: 'not a url',
          tripadvisor: 42,
        }),
        layer,
      ),
    ).toEqual([]);
  });
});
