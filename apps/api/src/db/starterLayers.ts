import { createLayerInputSchema, type CreateLayerInput } from '@ecomap/shared';

/**
 * The layers a new community starts with: the "green" topics from the project's
 * notes. They are configuration, not content - an admin renames, recolours,
 * removes or adds to them in the layer editor - and they hold no places. The
 * demo seed (`seed-demo.ts`) is what fills them with example data.
 */
export const STARTER_LAYERS: readonly CreateLayerInput[] = [
  createLayerInputSchema.parse({
    slug: 'community-gardens',
    name: 'Community gardens',
    description: 'Shared growing space anyone can join, from allotments to a bed outside a school.',
    color: '#2f855a',
    icon: 'basket',
    allowedGeometries: ['Point', 'Polygon'],
    sortOrder: 10,
    fields: [
      { key: 'openingHours', label: 'When is it open?', type: 'text' },
      { key: 'contact', label: 'Who to contact', type: 'text' },
      { key: 'website', label: 'Website', type: 'url' },
      { key: 'acceptsNewMembers', label: 'Taking new members', type: 'boolean' },
    ],
  }),
  createLayerInputSchema.parse({
    slug: 'recycling-and-repair',
    name: 'Recycling & repair',
    description:
      'Recycling centres, second-hand shops, repair cafés and places that take things others throw away.',
    color: '#2b6cb0',
    icon: 'recycle',
    allowedGeometries: ['Point'],
    sortOrder: 20,
    fields: [
      {
        key: 'accepts',
        label: 'What they take',
        type: 'select',
        options: ['Electronics', 'Textiles', 'Furniture', 'Bicycles', 'Everything'],
      },
      { key: 'openingHours', label: 'Opening hours', type: 'text' },
    ],
  }),
  createLayerInputSchema.parse({
    slug: 'cycling',
    name: 'Cycling',
    description: 'Bike repair stands, rentals, parking and routes worth riding.',
    color: '#319795',
    icon: 'bike',
    allowedGeometries: ['Point', 'LineString'],
    sortOrder: 25,
    fields: [
      {
        key: 'kind',
        label: 'What is it?',
        type: 'select',
        options: ['Repair station', 'Rental', 'Parking', 'Route'],
      },
      { key: 'openingHours', label: 'Opening hours', type: 'text' },
      { key: 'website', label: 'Website', type: 'url' },
      { key: 'free', label: 'Free to use', type: 'boolean' },
    ],
  }),
  createLayerInputSchema.parse({
    slug: 'ev-charging',
    name: 'EV charging',
    description: 'Charging points for electric cars.',
    color: '#00a3c4',
    icon: 'pin',
    allowedGeometries: ['Point'],
    sortOrder: 27,
    fields: [
      { key: 'operator', label: 'Operator', type: 'text' },
      { key: 'chargePoints', label: 'Charging points', type: 'number' },
      { key: 'openingHours', label: 'Opening hours', type: 'text' },
      { key: 'payment', label: 'Payment', type: 'select', options: ['Free', 'Paid'] },
    ],
  }),
  createLayerInputSchema.parse({
    slug: 'nature-areas',
    name: 'Nature areas',
    description: 'Nature reserves, bird sanctuaries and protected landscapes.',
    color: '#38a169',
    icon: 'tree',
    allowedGeometries: ['Point', 'Polygon'],
    sortOrder: 35,
    fields: [
      { key: 'managedBy', label: 'Looked after by', type: 'text' },
      { key: 'website', label: 'Website', type: 'url' },
    ],
  }),
  createLayerInputSchema.parse({
    slug: 'wildlife-sightings',
    name: 'Wildlife sightings',
    description: 'Species people have spotted, and the biodiversity hotspots worth protecting.',
    color: '#975a16',
    icon: 'paw',
    allowedGeometries: ['Point', 'Polygon'],
    sortOrder: 30,
    requiresModeration: true,
    fields: [
      { key: 'species', label: 'Species', type: 'text', required: true },
      { key: 'observedOn', label: 'Seen on', type: 'date' },
      { key: 'count', label: 'How many', type: 'number' },
      { key: 'notes', label: 'Notes', type: 'longtext' },
    ],
  }),
  createLayerInputSchema.parse({
    slug: 'nature-trails',
    name: 'Nature trails',
    description: 'Walking and cycling routes through green space.',
    color: '#276749',
    icon: 'tree',
    allowedGeometries: ['LineString'],
    sortOrder: 40,
    fields: [
      { key: 'lengthKm', label: 'Length (km)', type: 'number' },
      {
        key: 'difficulty',
        label: 'Difficulty',
        type: 'select',
        options: ['Easy', 'Moderate', 'Demanding'],
      },
      { key: 'wheelchairFriendly', label: 'Wheelchair friendly', type: 'boolean' },
    ],
  }),
  createLayerInputSchema.parse({
    slug: 'renewable-energy',
    name: 'Renewable energy',
    description: 'Wind, solar, biogas and district heating projects, community-owned or not.',
    color: '#b7791f',
    icon: 'sun',
    allowedGeometries: ['Point', 'Polygon'],
    sortOrder: 50,
    fields: [
      {
        key: 'source',
        label: 'Energy source',
        type: 'select',
        options: ['Wind', 'Solar', 'Biogas', 'District heating', 'Other'],
      },
      { key: 'communityOwned', label: 'Community owned', type: 'boolean' },
      { key: 'capacityMw', label: 'Capacity (MW)', type: 'number' },
    ],
  }),
  createLayerInputSchema.parse({
    slug: 'eco-businesses',
    name: 'Eco-friendly businesses',
    description:
      'Farm shops, cafés and makers working with local, organic or zero-waste practices.',
    color: '#805ad5',
    icon: 'leaf',
    allowedGeometries: ['Point'],
    sortOrder: 60,
    fields: [
      { key: 'website', label: 'Website', type: 'url' },
      { key: 'whatMakesItGreen', label: 'What makes it green?', type: 'longtext' },
    ],
  }),
  createLayerInputSchema.parse({
    slug: 'events-and-volunteering',
    name: 'Events & volunteering',
    description: 'Beach clean-ups, planting days, talks and anything else you can turn up to.',
    color: '#c05621',
    icon: 'people',
    allowedGeometries: ['Point', 'Polygon'],
    sortOrder: 70,
    fields: [
      { key: 'startsOn', label: 'Date', type: 'date', required: true },
      { key: 'organiser', label: 'Organiser', type: 'text' },
      { key: 'signUpUrl', label: 'Sign-up link', type: 'url' },
    ],
  }),
];
