# The map's data: where it comes from and how to keep it fresh

This covers the **Bornholm** community. A new community follows the same pattern with its own
folder in [`apps/api/src/communities`](../apps/api/src/communities).

## Where everything comes from

| What                              | Source                                                                                                                                 | Where in the code                                                                    |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| **Places** (146)                  | [OpenStreetMap](https://www.openstreetmap.org), via the Overpass API, taken 2026-11-03 (drinking water and more local food 2026-11-04) | [`communities/bornholm/places.ts`](../apps/api/src/communities/bornholm/places.ts)   |
| Which OSM tags feed each layer    | Written down per layer                                                                                                                 | [`communities/bornholm/osm.ts`](../apps/api/src/communities/bornholm/osm.ts)         |
| **Layers** (names, icons, fields) | Written for the project, in Danish                                                                                                     | [`communities/bornholm/layers.ts`](../apps/api/src/communities/bornholm/layers.ts)   |
| **About text** ("Om")             | Written for the project; every link checked 2026-11-03                                                                                 | [`communities/bornholm/about.ts`](../apps/api/src/communities/bornholm/about.ts)     |
| **Privacy text**                  | Written from what the app and `deploy/` actually do                                                                                    | [`communities/bornholm/privacy.ts`](../apps/api/src/communities/bornholm/privacy.ts) |
| **Background maps**               | Esri, OpenStreetMap, OpenTopoMap, CyclOSM tiles, loaded live                                                                           | [`apps/web/src/map/basemaps.ts`](../apps/web/src/map/basemaps.ts)                    |

Places per layer: local food 61 · drinking water 26 · cycling 15 · recycling and repair 14 ·
renewable energy 10 · EV charging 8 · nature areas 6 · community gardens 5 · green shops 1 (hidden layer).

### How the places were made

- Every place is one OpenStreetMap object. Its `osmId` (e.g. `node/1330908050`) points at the
  source: `https://www.openstreetmap.org/node/1330908050`.
- Names, opening hours, websites and field values come from OSM tags. Places without a name are
  named by their kind and the nearest town ("Drikkevand ved Gudhjem").
- Descriptions are short Danish sentences written from the tags.
- **"Økologisk"** is set only where the producer's own website says so, or OSM tags it.
- Duplicates at the same spot and objects tagged as not working were left out.

### Licence and credit

OpenStreetMap data is © OpenStreetMap contributors under the **Open Database Licence (ODbL)**.
That requires:

- **Credit** wherever the data is shown - done: the map's corner and the Om page say
  "© OpenStreetMap contributors".
- **Share-alike** for a database built from it: if the places are offered as a dataset (the admin
  export, for example), it stays under the ODbL. The export file says so in its `attribution`.

### Sources looked at and not used

- **GeoFA** (GeoDanmark's outdoor facilities, behind udinaturen.dk): mostly picnic tables,
  shelters and viewpoints that udinaturen.dk already shows well. Single useful items (e.g. bike
  service posts) can be added by hand.
- **Google Maps / Places**: its terms forbid storing names, hours and photos.
- **Businesses' own photos**: copyright. Owners and members add their own photos instead.

## Keeping it fresh

Places change: shops close, opening hours move, new farm stalls open. Check **every 3-6 months**,
and before showing the map to a partner.

### 1. Run the check

```bash
npm run data:check -- bornholm --out=osm-report.md
```

It compares every place with what OpenStreetMap says today and searches the island for places
the map does not have yet. **It changes nothing** - it writes a checklist:

- **Our places to look at**: gone from OSM, marked closed, moved more than 100 m, renamed, new
  opening hours or website.
- **Possibly new places**, per layer, from the searches in `osm.ts`. These are suggestions:
  some will not fit the map (a pizza deli is not local food).

The public Overpass servers are often busy; the script retries and falls back to a second server.
A run takes a few minutes. Please do not run it in a loop.

### 2. Decide and edit

Go through the checklist. For each item, open the OSM link and, where useful, the place's own
website.

- **Changed or closed place** - fix it on the live map in the app (an admin edits the place or
  uses "Flyt på kortet"), and in `places.ts` so a fresh database gets it right too.
- **New place worth adding** - add it to `places.ts`: its `osmId`, the layer, a Danish name and
  description, and field values that match the layer's options in `layers.ts`.
- **Wrong in OpenStreetMap itself** - fix it there (anyone can), and everyone using OSM gains.

### 3. Check and load

```bash
npm test -w @ecomap/api      # bornholm.test.ts checks every place: layer, fields, on the island
npm run db:seed              # adds places that are not in the database yet
```

The seed **only adds** missing places (matched by layer and name); it never changes or deletes a
place that is already in the database - people may have edited it in the app. Changes to existing
places on a live map are made in the app.

### 4. Write it down

Update the dates in the table at the top of this file, and commit with what changed.

## For Claude Code

The same routine is a project skill: ask Claude Code to "refresh the Bornholm data" and it follows
[`.claude/skills/refresh-community-data`](../.claude/skills/refresh-community-data/SKILL.md).
