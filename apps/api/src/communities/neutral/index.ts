import { createLayerInputSchema } from '@ecomap/shared';
import type { Community } from '../types.js';

/**
 * A blank community for anywhere: a few common green topics in English, no
 * places, and the built-in settings. The starting point when COMMUNITY is not
 * set - an admin renames, adds or removes layers and sets the name, colours and
 * map area in the app.
 */
export const NEUTRAL: Community = {
  slug: 'neutral',
  settings: {},
  layers: [
    createLayerInputSchema.parse({
      slug: 'community-gardens',
      name: 'Community gardens',
      description: 'Shared growing spaces anyone can join.',
      color: '#2f855a',
      icon: 'basket',
      allowedGeometries: ['Point', 'Polygon'],
      sortOrder: 10,
      fields: [
        { key: 'openingHours', label: 'Opening hours', type: 'openingHours' },
        { key: 'website', label: 'Website', type: 'url' },
        { key: 'facebook', label: 'Facebook', type: 'url' },
        { key: 'instagram', label: 'Instagram', type: 'url' },
      ],
    }),
    createLayerInputSchema.parse({
      slug: 'local-food',
      name: 'Local food',
      description: 'Farm shops, roadside stalls and local producers.',
      color: '#805ad5',
      icon: 'carrot',
      allowedGeometries: ['Point'],
      sortOrder: 20,
      fields: [
        { key: 'openingHours', label: 'Opening hours', type: 'openingHours' },
        { key: 'organic', label: 'Organic', type: 'boolean' },
        { key: 'website', label: 'Website', type: 'url' },
        { key: 'facebook', label: 'Facebook', type: 'url' },
        { key: 'instagram', label: 'Instagram', type: 'url' },
      ],
    }),
    createLayerInputSchema.parse({
      slug: 'recycling-and-repair',
      name: 'Recycling and repair',
      description: 'Recycling points, second-hand shops and repair cafés.',
      color: '#2b6cb0',
      icon: 'recycle',
      allowedGeometries: ['Point'],
      sortOrder: 30,
      fields: [
        { key: 'openingHours', label: 'Opening hours', type: 'openingHours' },
        { key: 'website', label: 'Website', type: 'url' },
        { key: 'facebook', label: 'Facebook', type: 'url' },
        { key: 'instagram', label: 'Instagram', type: 'url' },
      ],
    }),
    createLayerInputSchema.parse({
      slug: 'cycling',
      name: 'Cycling',
      description: 'Bike repair, rental, parking and routes worth riding.',
      color: '#319795',
      icon: 'bike',
      allowedGeometries: ['Point', 'LineString'],
      sortOrder: 40,
      fields: [
        { key: 'website', label: 'Website', type: 'url' },
        { key: 'facebook', label: 'Facebook', type: 'url' },
        { key: 'instagram', label: 'Instagram', type: 'url' },
      ],
    }),
    createLayerInputSchema.parse({
      slug: 'nature-areas',
      name: 'Nature areas',
      description: 'Nature reserves and protected landscapes.',
      color: '#38a169',
      icon: 'tree',
      allowedGeometries: ['Point', 'Polygon'],
      sortOrder: 50,
      fields: [{ key: 'website', label: 'Website', type: 'url' }],
    }),
  ],
  places: [],
};
