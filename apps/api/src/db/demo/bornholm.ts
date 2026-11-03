/*
 * Demo places on Bornholm, taken from OpenStreetMap.
 *
 * © OpenStreetMap contributors, available under the Open Database Licence
 * (ODbL): https://www.openstreetmap.org/copyright. Every value comes from an
 * OSM tag; places without a name are named by their kind and nearest town.
 * `osmId` points at the source object, e.g. https://www.openstreetmap.org/node/1330908050
 *
 * Generated 2026-11-03 from the Overpass API. Re-check before relying on
 * opening hours - the real world changes faster than a demo data set.
 */
import type { PropertyBag } from '@ecomap/shared';

export interface DemoPlace {
  osmId: string;
  layerSlug: string;
  name: string;
  description: string;
  /** [longitude, latitude] */
  coordinates: [number, number];
  properties: PropertyBag;
}

export const BORNHOLM_DEMO_PLACES: readonly DemoPlace[] = [
  {
    osmId: 'node/3404446585',
    layerSlug: 'recycling-and-repair',
    name: 'Rønne Containerplads',
    description: 'Recycling centre.',
    coordinates: [14.73357, 55.11803],
    properties: {},
  },
  {
    osmId: 'way/710439688',
    layerSlug: 'recycling-and-repair',
    name: 'Østermarie Containerplads',
    description: 'Recycling centre run by BOFA.',
    coordinates: [15.03091, 55.13387],
    properties: {
      openingHours: 'Fr 10:00-17:00; Sa 09:00-17:00',
    },
  },
  {
    osmId: 'way/1206123656',
    layerSlug: 'recycling-and-repair',
    name: 'Miljøstation, near Snogebæk',
    description: 'Recycling centre run by Bornholms Fælleskommunale Affaldsbortskaffelse.',
    coordinates: [15.07718, 54.99345],
    properties: {
      openingHours: '24/7',
    },
  },
  {
    osmId: 'node/4950118750',
    layerSlug: 'recycling-and-repair',
    name: 'Kirkens Korshær Møbelgenbrug',
    description: 'Second-hand shop in Aakirkeby, run by Kirkens Korshær.',
    coordinates: [14.92002, 55.07029],
    properties: {
      accepts: 'Furniture',
    },
  },
  {
    osmId: 'node/4950153370',
    layerSlug: 'recycling-and-repair',
    name: 'Danmission Genbrug',
    description: 'Second-hand shop in Aakirkeby, run by Danmission.',
    coordinates: [14.92133, 55.06997],
    properties: {},
  },
  {
    osmId: 'node/4958846821',
    layerSlug: 'recycling-and-repair',
    name: 'Red Barnet',
    description: 'Second-hand shop in Rønne.',
    coordinates: [14.70071, 55.10036],
    properties: {
      openingHours: 'Mo-Fr 10:00-17:00; Sa 10:00-13:00',
    },
  },
  {
    osmId: 'node/4958846822',
    layerSlug: 'recycling-and-repair',
    name: 'Dansk Røde Kors Genbrug',
    description: 'Second-hand shop in Rønne.',
    coordinates: [14.70188, 55.09992],
    properties: {
      openingHours: 'Mo-Fr 10:00-17:00; Sa 10:00-12:30',
    },
  },
  {
    osmId: 'way/139458971',
    layerSlug: 'recycling-and-repair',
    name: 'LUMI Genbrug Bornholm',
    description: 'Second-hand shop in Nexø.',
    coordinates: [15.13021, 55.05678],
    properties: {},
  },
  {
    osmId: 'node/8176516616',
    layerSlug: 'recycling-and-repair',
    name: 'Klunserkongen',
    description: 'Second-hand shop in Nexø.',
    coordinates: [15.13564, 55.06673],
    properties: {},
  },
  {
    osmId: 'node/9297907803',
    layerSlug: 'recycling-and-repair',
    name: 'Cafe Spar Loppan',
    description: 'Second-hand shop in Aakirkeby.',
    coordinates: [14.9209, 55.07073],
    properties: {
      openingHours: 'PH,We,Fr-Mo 12:00-17:30; Tu,Th 10:00-17:30',
    },
  },
  {
    osmId: 'node/4958837194',
    layerSlug: 'recycling-and-repair',
    name: 'PIF Genbrug',
    description: 'Second-hand shop in Snogebæk.',
    coordinates: [15.11211, 55.02397],
    properties: {},
  },
  {
    osmId: 'node/14318661670',
    layerSlug: 'eco-businesses',
    name: 'Hammersly',
    description: 'Farm shop, near Hasle.',
    coordinates: [14.74621, 55.21044],
    properties: {
      website: 'https://www.hammersly.dk',
      whatMakesItGreen:
        'Community-supported agriculture: a vegetable subscription, grown organically.',
    },
  },
  {
    osmId: 'node/9344935742',
    layerSlug: 'eco-businesses',
    name: 'Mostballaden',
    description: 'Farm shop, near Tejn.',
    coordinates: [14.77288, 55.23385],
    properties: {
      website: 'https://mostballaden.dk',
      whatMakesItGreen: 'Farm shop selling apples and apple products.',
    },
  },
  {
    osmId: 'node/8983549460',
    layerSlug: 'eco-businesses',
    name: 'Klippeøens Gårdbutik',
    description: 'Farm shop, near Østerlars.',
    coordinates: [15.02247, 55.17485],
    properties: {
      website: 'https://www.oen.dk',
      whatMakesItGreen: 'Farm shop selling local produce.',
    },
  },
  {
    osmId: 'node/9343868292',
    layerSlug: 'eco-businesses',
    name: 'Krogsholm Frugt og Grønt',
    description: 'Farm shop, near Rø.',
    coordinates: [14.89132, 55.16855],
    properties: {
      website: 'https://krogsholmfrugt.dk/',
      whatMakesItGreen: 'Fruit and vegetable grower selling from the farm.',
    },
  },
  {
    osmId: 'way/532785235',
    layerSlug: 'eco-businesses',
    name: 'Lykkelund Gedemejeri',
    description: 'Farm shop, Østerlars.',
    coordinates: [14.94403, 55.17378],
    properties: {
      whatMakesItGreen: 'Goat dairy with its own farm shop.',
    },
  },
  {
    osmId: 'node/9343868293',
    layerSlug: 'eco-businesses',
    name: 'Bornholms Bikompagni',
    description: 'Farm shop, near Vestermarie.',
    coordinates: [14.76595, 55.10255],
    properties: {
      website: 'https://bornholmsbikompagni.dk/',
      whatMakesItGreen: 'Farm shop selling honey.',
    },
  },
  {
    osmId: 'node/8647596416',
    layerSlug: 'eco-businesses',
    name: 'Høstet Gårdbutik',
    description: 'Farm shop, Årsdale.',
    coordinates: [15.1338, 55.09388],
    properties: {
      website: 'https://xn--hstet-vua.dk/',
      whatMakesItGreen: 'Farm shop that also gives guided tours of the farm.',
    },
  },
  {
    osmId: 'node/5056762017',
    layerSlug: 'eco-businesses',
    name: 'Grøn Oase',
    description: 'Farm shop, Aakirkeby.',
    coordinates: [14.95331, 55.06075],
    properties: {
      whatMakesItGreen: 'Farm shop selling local produce.',
    },
  },
  {
    osmId: 'node/846358980',
    layerSlug: 'eco-businesses',
    name: 'Vingården Lille Gadegård',
    description: 'Farm shop, Pedersker.',
    coordinates: [14.96817, 55.02911],
    properties: {
      website: 'http://www.a7.dk/',
      whatMakesItGreen: 'Vineyard with its own shop.',
    },
  },
  {
    osmId: 'way/706791343',
    layerSlug: 'renewable-energy',
    name: 'Gadegårdsvejen Solcellepark',
    description: 'Solar park near near Balka.',
    coordinates: [15.07033, 55.04532],
    properties: {
      source: 'Solar',
      capacityMw: 6.8,
    },
  },
  {
    osmId: 'relation/19169719',
    layerSlug: 'renewable-energy',
    name: 'Bodelyngsvejen Solcellepark',
    description: 'Solar park near Aakirkeby.',
    coordinates: [14.88765, 55.06395],
    properties: {
      source: 'Solar',
      capacityMw: 6.8,
    },
  },
  {
    osmId: 'relation/19169582',
    layerSlug: 'renewable-energy',
    name: 'Tornbygård Vindmøller',
    description: 'Wind turbines near near Nyker.',
    coordinates: [14.76059, 55.16226],
    properties: {
      source: 'Wind',
      capacityMw: 6.9,
    },
  },
  {
    osmId: 'relation/19087465',
    layerSlug: 'renewable-energy',
    name: 'Sose Vindmøller',
    description: 'Wind turbines near near Lobbæk.',
    coordinates: [14.86661, 55.05382],
    properties: {
      source: 'Wind',
      capacityMw: 6.5,
    },
  },
  {
    osmId: 'relation/19087469',
    layerSlug: 'renewable-energy',
    name: 'Kalby Vindmøller',
    description: 'Wind turbines near Aakirkeby.',
    coordinates: [14.8892, 55.06783],
    properties: {
      source: 'Wind',
      capacityMw: 6,
    },
  },
  {
    osmId: 'relation/19169585',
    layerSlug: 'renewable-energy',
    name: 'Sandemandsgård Vindmøller',
    description: 'Wind turbines near near Hasle.',
    coordinates: [14.72985, 55.20872],
    properties: {
      source: 'Wind',
      capacityMw: 5.25,
    },
  },
  {
    osmId: 'way/253586774',
    layerSlug: 'renewable-energy',
    name: 'Østerlars Halmvarmeværk',
    description: 'Straw-fired district heating plant near Østerlars.',
    coordinates: [14.97175, 55.16403],
    properties: {
      source: 'District heating',
    },
  },
  {
    osmId: 'way/1387079950',
    layerSlug: 'renewable-energy',
    name: 'Nexø Halmvarmeværk',
    description: 'Straw-fired district heating plant near Nexø.',
    coordinates: [15.1176, 55.06036],
    properties: {
      source: 'District heating',
    },
  },
  {
    osmId: 'way/1387082550',
    layerSlug: 'renewable-energy',
    name: 'Klemensker Halmvarmeværk',
    description: 'Straw-fired district heating plant near Klemensker.',
    coordinates: [14.8121, 55.17741],
    properties: {
      source: 'District heating',
    },
  },
  {
    osmId: 'way/1306175474',
    layerSlug: 'renewable-energy',
    name: 'Battery storage, Rønne',
    description: 'Grid-scale battery run by EWII Energi.',
    coordinates: [14.72442, 55.17078],
    properties: {
      source: 'Other',
      capacityMw: 30,
    },
  },
  {
    osmId: 'way/241208763',
    layerSlug: 'nature-areas',
    name: 'Bisonskoven',
    description: 'Forest enclosure where European bison roam freely.',
    coordinates: [14.9475, 55.11259],
    properties: {
      managedBy: 'Naturstyrelsen',
      website:
        'https://naturstyrelsen.dk/find-et-naturomraade/naturguider/bornholm/almindingen/bisonskoven',
    },
  },
  {
    osmId: 'way/1188222574',
    layerSlug: 'nature-areas',
    name: 'Svartingedal',
    description: 'Bird and wildlife reserve.',
    coordinates: [14.74761, 55.18858],
    properties: {
      managedBy: 'Fugleværnsfonden',
      website: 'https://www.fuglevaernsfonden.dk/fuglereservater/22-svartingedal',
    },
  },
  {
    osmId: 'way/100277948',
    layerSlug: 'nature-areas',
    name: 'Slotslyngen',
    description: 'Protected nature area.',
    coordinates: [14.74748, 55.25759],
    properties: {},
  },
  {
    osmId: 'way/1282845099',
    layerSlug: 'nature-areas',
    name: 'Ølene Fuglereservat',
    description: 'Bird and wildlife reserve.',
    coordinates: [15.00695, 55.10184],
    properties: {
      managedBy: 'SVANA',
    },
  },
  {
    osmId: 'way/1204006787',
    layerSlug: 'nature-areas',
    name: 'Ertholmene Vildtreservat',
    description: 'Bird and wildlife reserve.',
    coordinates: [15.18565, 55.32203],
    properties: {},
  },
  {
    osmId: 'way/1204007305',
    layerSlug: 'nature-areas',
    name: 'Nexø Vildtreservat',
    description: 'Bird and wildlife reserve.',
    coordinates: [15.12603, 55.04837],
    properties: {},
  },
  {
    osmId: 'way/139070759',
    layerSlug: 'community-gardens',
    name: 'Friheden Haveforening',
    description: 'Allotment garden association (haveforening) in Rønne.',
    coordinates: [14.71998, 55.11024],
    properties: {},
  },
  {
    osmId: 'way/139070762',
    layerSlug: 'community-gardens',
    name: 'Haveforeningen Fælleshåb',
    description: 'Allotment garden association (haveforening) in Rønne.',
    coordinates: [14.71722, 55.10377],
    properties: {},
  },
  {
    osmId: 'way/148203601',
    layerSlug: 'community-gardens',
    name: 'Haveforeningen Viadukten',
    description: 'Allotment garden association (haveforening) in Rønne.',
    coordinates: [14.71692, 55.10024],
    properties: {},
  },
  {
    osmId: 'way/191463799',
    layerSlug: 'community-gardens',
    name: 'Haveforeningen Solvang',
    description: 'Allotment garden association (haveforening) in Rønne.',
    coordinates: [14.71541, 55.105],
    properties: {},
  },
  {
    osmId: 'way/155883776',
    layerSlug: 'community-gardens',
    name: 'Møllebakkens',
    description: 'Allotment garden association (haveforening) in Aakirkeby.',
    coordinates: [14.91628, 55.06687],
    properties: {},
  },
  {
    osmId: 'node/1330908050',
    layerSlug: 'cycling',
    name: 'Bornholms Cykeludlejning',
    description: 'Bike rental in Rønne.',
    coordinates: [14.69156, 55.10208],
    properties: {
      kind: 'Rental',
      openingHours:
        'Apr-Jun,Sep-Oct Mo-Fr 09:00-16:00; Apr-Jun,Sep-Oct Sa-Su 10:00-14:00; Jul-Aug Mo-Fr 09:00-17:00; Jul-Aug Sa-Su 10:00-15:00',
      website: 'https://borcy.dk/',
    },
  },
  {
    osmId: 'node/4331215893',
    layerSlug: 'cycling',
    name: 'Sandvig Cykeludlejning',
    description: 'Bike rental in Sandvig.',
    coordinates: [14.78264, 55.28756],
    properties: {
      kind: 'Rental',
    },
  },
  {
    osmId: 'node/8948634817',
    layerSlug: 'cycling',
    name: 'Bike rental, Sømarken',
    description: 'Bike rental by the beach.',
    coordinates: [14.99059, 55.00094],
    properties: {
      kind: 'Rental',
      website: 'https://www.soemarkenscykeludlejning.dk',
    },
  },
  {
    osmId: 'node/9015191054',
    layerSlug: 'cycling',
    name: 'Bike repair station & e-bike charging, Snogebæk',
    description: 'Free self-service repair stand with a free e-bike charger next to it.',
    coordinates: [15.10967, 55.0277],
    properties: {
      kind: 'Repair station',
      free: true,
    },
  },
  {
    osmId: 'node/9215978976',
    layerSlug: 'cycling',
    name: 'Bike repair station & e-bike charging, near Østerlars',
    description: 'Free self-service repair stand with a free e-bike charger next to it.',
    coordinates: [14.91691, 55.1239],
    properties: {
      kind: 'Repair station',
      free: true,
    },
  },
  {
    osmId: 'node/11217977443',
    layerSlug: 'cycling',
    name: 'Bike repair station & e-bike charging, Melsted',
    description: 'Free self-service repair stand with a free e-bike charger next to it.',
    coordinates: [14.98789, 55.1945],
    properties: {
      kind: 'Repair station',
      free: true,
    },
  },
  {
    osmId: 'node/11903291634',
    layerSlug: 'cycling',
    name: 'Bike repair station & e-bike charging, near Østermarie',
    description: 'Free self-service repair stand with a free e-bike charger next to it.',
    coordinates: [15.02442, 55.17369],
    properties: {
      kind: 'Repair station',
      free: true,
    },
  },
  {
    osmId: 'node/11903293830',
    layerSlug: 'cycling',
    name: 'Bike repair station & e-bike charging, Pedersker',
    description: 'Free self-service repair stand with a free e-bike charger next to it.',
    coordinates: [14.99186, 55.00991],
    properties: {
      kind: 'Repair station',
      free: true,
    },
  },
  {
    osmId: 'node/11903308462',
    layerSlug: 'cycling',
    name: 'Bike repair station & e-bike charging, Muleby',
    description: 'Free self-service repair stand with a free e-bike charger next to it.',
    coordinates: [14.71768, 55.15251],
    properties: {
      kind: 'Repair station',
      free: true,
    },
  },
  {
    osmId: 'node/11903329186',
    layerSlug: 'cycling',
    name: 'Bike repair station & e-bike charging, near Allinge-Sandvig',
    description: 'Free self-service repair stand with a free e-bike charger next to it.',
    coordinates: [14.76489, 55.25956],
    properties: {
      kind: 'Repair station',
      free: true,
    },
  },
  {
    osmId: 'node/11903345265',
    layerSlug: 'cycling',
    name: 'Bike repair station & e-bike charging, Rø',
    description: 'Free self-service repair stand with a free e-bike charger next to it.',
    coordinates: [14.89291, 55.2141],
    properties: {
      kind: 'Repair station',
      free: true,
    },
  },
  {
    osmId: 'node/11903407388',
    layerSlug: 'cycling',
    name: 'Bike repair station & e-bike charging, Rønne',
    description: 'Free self-service repair stand with a free e-bike charger next to it.',
    coordinates: [14.69473, 55.10394],
    properties: {
      kind: 'Repair station',
      free: true,
    },
  },
  {
    osmId: 'node/11903764533',
    layerSlug: 'cycling',
    name: 'Bike repair station & e-bike charging, Nexø',
    description: 'Free self-service repair stand with a free e-bike charger next to it.',
    coordinates: [15.13325, 55.06216],
    properties: {
      kind: 'Repair station',
      free: true,
    },
  },
  {
    osmId: 'node/11903766277',
    layerSlug: 'cycling',
    name: 'Bike repair station & e-bike charging, Nylars',
    description: 'Free self-service repair stand with a free e-bike charger next to it.',
    coordinates: [14.81407, 55.07319],
    properties: {
      kind: 'Repair station',
      free: true,
    },
  },
  {
    osmId: 'node/11903788380',
    layerSlug: 'cycling',
    name: 'Bike repair station & e-bike charging, near Rø',
    description: 'Free self-service repair stand with a free e-bike charger next to it.',
    coordinates: [14.85072, 55.21236],
    properties: {
      kind: 'Repair station',
      free: true,
    },
  },
  {
    osmId: 'way/1182637128',
    layerSlug: 'ev-charging',
    name: 'Circle K charging, Rønne',
    description: 'Charging for electric cars in Rønne.',
    coordinates: [14.71213, 55.09795],
    properties: {
      operator: 'Circle K',
      chargePoints: 6,
      payment: 'Paid',
    },
  },
  {
    osmId: 'way/1323355852',
    layerSlug: 'ev-charging',
    name: 'Clever charging, Rønne',
    description: 'Charging for electric cars in Rønne.',
    coordinates: [14.72976, 55.09277],
    properties: {
      operator: 'Clever',
      chargePoints: 2,
      openingHours: '24/7',
    },
  },
  {
    osmId: 'way/1568583443',
    layerSlug: 'ev-charging',
    name: 'Shell Recharge charging, Rønne',
    description: 'Charging for electric cars in Rønne.',
    coordinates: [14.71339, 55.09741],
    properties: {
      operator: 'Shell Recharge',
      chargePoints: 2,
    },
  },
  {
    osmId: 'node/12815352979',
    layerSlug: 'ev-charging',
    name: 'Spirii charging, Allinge-Sandvig',
    description: 'Charging for electric cars in Allinge-Sandvig.',
    coordinates: [14.80498, 55.2762],
    properties: {
      operator: 'Spirii',
      chargePoints: 4,
    },
  },
  {
    osmId: 'node/12154150800',
    layerSlug: 'ev-charging',
    name: 'E.ON charging, near Snogebæk',
    description: 'Charging for electric cars in near Snogebæk.',
    coordinates: [15.07728, 54.99366],
    properties: {
      operator: 'E.ON',
      chargePoints: 8,
      payment: 'Paid',
    },
  },
  {
    osmId: 'way/1512714567',
    layerSlug: 'ev-charging',
    name: 'Norlys charging, Aakirkeby',
    description: 'Charging for electric cars in Aakirkeby.',
    coordinates: [14.92021, 55.07415],
    properties: {
      operator: 'Norlys',
      chargePoints: 4,
    },
  },
  {
    osmId: 'node/13034347365',
    layerSlug: 'ev-charging',
    name: 'Clever charging, Aakirkeby',
    description: 'Charging for electric cars in Aakirkeby.',
    coordinates: [14.92061, 55.06996],
    properties: {
      operator: 'Clever',
      chargePoints: 4,
      openingHours: '24/7',
      payment: 'Free',
    },
  },
  {
    osmId: 'way/1512782823',
    layerSlug: 'ev-charging',
    name: 'E.ON charging, Svaneke',
    description: 'Charging for electric cars in Svaneke.',
    coordinates: [15.14533, 55.13802],
    properties: {
      operator: 'E.ON',
      chargePoints: 6,
      payment: 'Paid',
    },
  },
];
