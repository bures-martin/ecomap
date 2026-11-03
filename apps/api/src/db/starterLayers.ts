import { createLayerInputSchema, type CreateLayerInput } from '@ecomap/shared';

/**
 * The layers a new community starts with: the "green" topics from the project's
 * notes. They are configuration, not content - an admin renames, recolours,
 * removes or adds to them in the layer editor - and they hold no places. The
 * demo seed (`seed-demo.ts`) is what fills them with example data.
 *
 * Written in Danish, for the first community on Bornholm; the app's own
 * buttons and menus are translated separately, so a community elsewhere just
 * renames these. Every layer is reviewed: what regular members add or change
 * waits for a moderator.
 */
export const STARTER_LAYERS: readonly CreateLayerInput[] = [
  createLayerInputSchema.parse({
    slug: 'community-gardens',
    name: 'Fællesskabshaver',
    description:
      'Fælles dyrkningsområder, som alle kan være med i - fra kolonihaver til et bed ved skolen.',
    color: '#2f855a',
    icon: 'basket',
    allowedGeometries: ['Point', 'Polygon'],
    sortOrder: 10,
    requiresModeration: true,
    fields: [
      { key: 'openingHours', label: 'Hvornår er der åbent?', type: 'openingHours' },
      { key: 'contact', label: 'Kontakt', type: 'text' },
      { key: 'website', label: 'Hjemmeside', type: 'url' },
      { key: 'acceptsNewMembers', label: 'Optager nye medlemmer', type: 'boolean' },
    ],
  }),
  createLayerInputSchema.parse({
    slug: 'recycling-and-repair',
    name: 'Genbrug og reparation',
    description:
      'Genbrugspladser, genbrugsbutikker, repair caféer og steder, der tager imod det, andre smider ud.',
    color: '#2b6cb0',
    icon: 'recycle',
    allowedGeometries: ['Point'],
    sortOrder: 20,
    requiresModeration: true,
    fields: [
      {
        key: 'type',
        label: 'Hvad er det?',
        type: 'select',
        options: ['Genbrugsbutik', 'Genbrugsplads', 'Reparation', 'Bytte- og givested'],
      },
      {
        key: 'accepts',
        label: 'Hvad tager de imod?',
        type: 'select',
        options: ['Elektronik', 'Tøj og tekstiler', 'Møbler', 'Cykler', 'Alt'],
      },
      { key: 'openingHours', label: 'Åbningstider', type: 'openingHours' },
      { key: 'website', label: 'Hjemmeside', type: 'url' },
    ],
  }),
  createLayerInputSchema.parse({
    slug: 'cycling',
    name: 'Cykling',
    description: 'Cykelreparation, udlejning, parkering og ruter, der er værd at cykle.',
    color: '#319795',
    icon: 'bike',
    allowedGeometries: ['Point', 'LineString'],
    sortOrder: 25,
    requiresModeration: true,
    fields: [
      {
        key: 'kind',
        label: 'Hvad er det?',
        type: 'select',
        options: ['Reparationsstander', 'Udlejning', 'Parkering', 'Rute'],
      },
      { key: 'openingHours', label: 'Åbningstider', type: 'openingHours' },
      { key: 'website', label: 'Hjemmeside', type: 'url' },
      { key: 'free', label: 'Gratis at bruge', type: 'boolean' },
    ],
  }),
  createLayerInputSchema.parse({
    slug: 'ev-charging',
    name: 'Elbilopladning',
    description: 'Ladestandere til elbiler.',
    color: '#00a3c4',
    icon: 'plug',
    allowedGeometries: ['Point'],
    sortOrder: 27,
    requiresModeration: true,
    /* Practical rather than inspiring: one tap away instead of on the first view. */
    visibleByDefault: false,
    fields: [
      { key: 'operator', label: 'Operatør', type: 'text' },
      { key: 'chargePoints', label: 'Antal ladepunkter', type: 'number' },
      { key: 'openingHours', label: 'Åbningstider', type: 'openingHours' },
      { key: 'payment', label: 'Betaling', type: 'select', options: ['Gratis', 'Betaling'] },
    ],
  }),
  createLayerInputSchema.parse({
    slug: 'nature-areas',
    name: 'Naturområder',
    description: 'Naturreservater, fuglereservater og fredede landskaber.',
    color: '#38a169',
    icon: 'tree',
    allowedGeometries: ['Point', 'Polygon'],
    sortOrder: 35,
    requiresModeration: true,
    fields: [
      { key: 'managedBy', label: 'Passes af', type: 'text' },
      { key: 'website', label: 'Hjemmeside', type: 'url' },
    ],
  }),
  createLayerInputSchema.parse({
    slug: 'wildlife-sightings',
    /* Hidden until it has content (and, for events, a filter for past ones). */
    isPublished: false,
    name: 'Dyreliv',
    description: 'Arter, folk har set, og steder med rig biodiversitet, der er værd at beskytte.',
    color: '#975a16',
    icon: 'paw',
    allowedGeometries: ['Point', 'Polygon'],
    sortOrder: 30,
    requiresModeration: true,
    fields: [
      { key: 'species', label: 'Art', type: 'text', required: true },
      { key: 'observedOn', label: 'Set den', type: 'date' },
      { key: 'count', label: 'Antal', type: 'number' },
      { key: 'notes', label: 'Noter', type: 'longtext' },
    ],
  }),
  createLayerInputSchema.parse({
    slug: 'nature-trails',
    /* Hidden until it has content (and, for events, a filter for past ones). */
    isPublished: false,
    name: 'Naturstier',
    description: 'Gå- og cykelruter gennem grønne områder.',
    color: '#276749',
    icon: 'tree',
    allowedGeometries: ['LineString'],
    sortOrder: 40,
    requiresModeration: true,
    fields: [
      { key: 'lengthKm', label: 'Længde (km)', type: 'number' },
      {
        key: 'difficulty',
        label: 'Sværhedsgrad',
        type: 'select',
        options: ['Let', 'Middel', 'Krævende'],
      },
      { key: 'wheelchairFriendly', label: 'Egnet til kørestol', type: 'boolean' },
    ],
  }),
  createLayerInputSchema.parse({
    slug: 'renewable-energy',
    name: 'Vedvarende energi',
    description: 'Vind, sol, biogas og fjernvarme - ejet af lokalsamfundet eller ej.',
    color: '#b7791f',
    icon: 'sun',
    allowedGeometries: ['Point', 'Polygon'],
    sortOrder: 50,
    requiresModeration: true,
    fields: [
      {
        key: 'source',
        label: 'Energikilde',
        type: 'select',
        options: ['Vind', 'Sol', 'Biogas', 'Fjernvarme', 'Andet'],
      },
      { key: 'communityOwned', label: 'Ejet af lokalsamfundet', type: 'boolean' },
      { key: 'capacityMw', label: 'Kapacitet (MW)', type: 'number' },
    ],
  }),
  createLayerInputSchema.parse({
    slug: 'local-food',
    name: 'Lokal mad og drikke',
    description:
      'Gårdbutikker, vejboder og lokale producenter - fra æg og honning til øl, is og chokolade.',
    color: '#805ad5',
    icon: 'carrot',
    allowedGeometries: ['Point'],
    sortOrder: 15,
    requiresModeration: true,
    fields: [
      {
        key: 'kind',
        label: 'Hvad er det?',
        type: 'select',
        options: ['Gårdbutik', 'Vejbod', 'Producent', 'Marked og madhal'],
      },
      { key: 'sells', label: 'Hvad sælger de?', type: 'text' },
      { key: 'organic', label: 'Økologisk', type: 'boolean' },
      {
        key: 'season',
        label: 'Sæson',
        type: 'text',
        helpText: 'Fx "maj-september" eller "hele året"',
      },
      {
        key: 'payment',
        label: 'Betaling',
        type: 'select',
        options: ['MobilePay', 'Kontanter', 'Kort', 'Flere muligheder'],
      },
      { key: 'openingHours', label: 'Åbningstider', type: 'openingHours' },
      { key: 'website', label: 'Hjemmeside', type: 'url' },
    ],
  }),
  createLayerInputSchema.parse({
    slug: 'green-shops',
    /* Hidden until it holds enough shops to be worth a topic of its own. */
    isPublished: false,
    name: 'Grønne butikker',
    description:
      'Økologiske butikker, refill og emballagefrit, fair trade og butikker med genbrug eller reparation.',
    color: '#6b46c1',
    icon: 'store',
    allowedGeometries: ['Point'],
    sortOrder: 60,
    requiresModeration: true,
    fields: [
      {
        key: 'whatMakesItGreen',
        label: 'Hvad gør det grønt?',
        type: 'select',
        options: [
          'Økologisk',
          'Refill og emballagefrit',
          'Lokalt produceret',
          'Fair trade',
          'Genbrug og reparation',
        ],
      },
      { key: 'openingHours', label: 'Åbningstider', type: 'openingHours' },
      { key: 'website', label: 'Hjemmeside', type: 'url' },
    ],
  }),
  createLayerInputSchema.parse({
    slug: 'events-and-volunteering',
    /* Hidden until it has content (and, for events, a filter for past ones). */
    isPublished: false,
    name: 'Arrangementer og frivilligt arbejde',
    description: 'Strandrensning, plantedage, foredrag og alt andet, man kan møde op til.',
    color: '#c05621',
    icon: 'people',
    allowedGeometries: ['Point', 'Polygon'],
    sortOrder: 70,
    requiresModeration: true,
    fields: [
      { key: 'startsOn', label: 'Dato', type: 'date', required: true },
      { key: 'organiser', label: 'Arrangør', type: 'text' },
      { key: 'signUpUrl', label: 'Tilmelding', type: 'url' },
    ],
  }),
];
