import { createLayerInputSchema, type CreateLayerInput } from '@ecomap/shared';

/**
 * Where else a place is found online. Each is a URL field, so the details
 * panel shows it as a button with the label below (and a matching icon for
 * these keys). Facebook and Instagram come from OpenStreetMap's
 * `contact:facebook` / `contact:instagram`; the rest are filled in by hand.
 */
const LINK_FIELDS = {
  facebook: { key: 'facebook', label: 'Facebook', type: 'url' as const },
  instagram: { key: 'instagram', label: 'Instagram', type: 'url' as const },
  tripadvisor: {
    key: 'tripadvisor',
    label: 'Tripadvisor',
    type: 'url' as const,
    helpText: 'Linket til stedets side på Tripadvisor, hvis det har en',
  },
  bornholmInfo: {
    key: 'bornholmInfo',
    label: 'bornholm.info',
    type: 'url' as const,
    helpText: 'Linket til stedets side på bornholm.info, hvis det har en',
  },
  happyCow: {
    key: 'happyCow',
    label: 'HappyCow',
    type: 'url' as const,
    helpText: 'Til veganske og vegetariske steder: linket til siden på happycow.net',
  },
  gourmetBornholm: {
    key: 'gourmetBornholm',
    label: 'Gourmet Bornholm',
    type: 'url' as const,
    helpText:
      'Hvis stedet er medlem af Gourmet Bornholm: linket til dets side på gourmetbornholm.dk',
  },
};
type LinkKey = keyof typeof LINK_FIELDS;
const linkFields = (...keys: LinkKey[]) => keys.map((key) => LINK_FIELDS[key]);

/** The fields every local-food layer shares; only the kinds differ. */
const localFoodFields = (kinds: string[]) => [
  { key: 'kind', label: 'Hvad er det?', type: 'select' as const, options: kinds },
  { key: 'sells', label: 'Hvad sælger de?', type: 'text' as const },
  { key: 'organic', label: 'Økologisk', type: 'boolean' as const },
  {
    key: 'season',
    label: 'Sæson',
    type: 'text' as const,
    helpText: 'Fx "maj-september" eller "hele året"',
  },
  {
    key: 'payment',
    label: 'Betaling',
    type: 'select' as const,
    options: ['MobilePay', 'Kontanter', 'Kort', 'Flere muligheder'],
  },
  {
    key: 'selfService',
    label: 'Selvbetjening',
    type: 'boolean' as const,
    helpText: 'Man tager selv og betaler selv - fx en vejbod med kasse eller MobilePay',
  },
  { key: 'openingHours', label: 'Åbningstider', type: 'openingHours' as const },
  { key: 'website', label: 'Hjemmeside', type: 'url' as const },
  ...linkFields(
    'gourmetBornholm',
    'facebook',
    'instagram',
    'tripadvisor',
    'bornholmInfo',
    'happyCow',
  ),
];

/**
 * The Bornholm map's layers, in Danish. Configuration, not code: the seed
 * creates them, and an admin renames, recolours, removes or adds to them in
 * the layer editor from then on. Every layer is reviewed: what regular
 * members add or change waits for a moderator.
 */
export const BORNHOLM_LAYERS: readonly CreateLayerInput[] = [
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
      ...linkFields('facebook', 'instagram'),
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
      ...linkFields('facebook', 'instagram'),
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
      ...linkFields('facebook', 'instagram', 'tripadvisor', 'bornholmInfo'),
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
    fields: [
      { key: 'operator', label: 'Operatør', type: 'text' },
      { key: 'chargePoints', label: 'Antal ladepunkter', type: 'number' },
      { key: 'openingHours', label: 'Åbningstider', type: 'openingHours' },
      { key: 'payment', label: 'Betaling', type: 'select', options: ['Gratis', 'Betaling'] },
    ],
  }),
  createLayerInputSchema.parse({
    slug: 'drinking-water',
    name: 'Drikkevand',
    description:
      'Vandposter og drikkefontæner med gratis drikkevand - fyld din flaske i stedet for at købe en ny.',
    color: '#0b7fab',
    icon: 'droplet',
    allowedGeometries: ['Point'],
    sortOrder: 28,
    requiresModeration: true,
    fields: [
      { key: 'bottle', label: 'Kan fylde en flaske', type: 'boolean' },
      { key: 'wheelchair', label: 'Tilgængelig for kørestol', type: 'boolean' },
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
      ...linkFields('tripadvisor', 'bornholmInfo'),
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
    slug: 'from-the-farm',
    name: 'Fra gården',
    description:
      'Gårdbutikker, vejboder og lokale producenter - grøntsager, æg, kød, mejerivarer, honning og mel.',
    color: '#9c4221',
    icon: 'barn',
    allowedGeometries: ['Point'],
    sortOrder: 15,
    requiresModeration: true,
    fields: localFoodFields([
      'Gårdbutik',
      'Vejbod',
      'Andelslandbrug',
      'Producent',
      'Marked og madhal',
    ]),
  }),
  createLayerInputSchema.parse({
    slug: 'fish-and-smokehouses',
    name: 'Fisk og røgerier',
    description: 'Røgerier og fiskebutikker, der selv ryger, sylter eller dåser fisken.',
    color: '#4a5568',
    icon: 'fish',
    allowedGeometries: ['Point'],
    sortOrder: 16,
    requiresModeration: true,
    fields: localFoodFields(['Røgeri', 'Fiskebutik', 'Producent']),
  }),
  createLayerInputSchema.parse({
    slug: 'local-drinks',
    name: 'Øl, vin og spiritus',
    description: 'Bryggerier, cidererier, vingårde og destillerier på øen.',
    color: '#9b2c2c',
    icon: 'mug',
    allowedGeometries: ['Point'],
    sortOrder: 17,
    requiresModeration: true,
    fields: localFoodFields(['Bryggeri', 'Cideri', 'Vingård', 'Destilleri']),
  }),
  createLayerInputSchema.parse({
    slug: 'sweets-and-ice-cream',
    name: 'Søde sager og is',
    description: 'Chokolade, lakrids, bolcher, karameller og is, lavet på øen.',
    color: '#805ad5',
    icon: 'candy',
    allowedGeometries: ['Point'],
    sortOrder: 18,
    requiresModeration: true,
    fields: localFoodFields(['Chokolade', 'Lakrids', 'Bolcher og karamel', 'Is']),
  }),
  createLayerInputSchema.parse({
    slug: 'green-shops',
    isPublished: true,
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
      ...linkFields('facebook', 'instagram', 'bornholmInfo', 'happyCow'),
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
