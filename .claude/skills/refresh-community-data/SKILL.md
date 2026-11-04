---
name: refresh-community-data
description: Check a community's map places (e.g. Bornholm) against OpenStreetMap and refresh them - find closed, moved or renamed places and new ones to add. Use when asked to refresh, update, check or review the map data, the places, or the OpenStreetMap import.
---

# Refresh a community's places from OpenStreetMap

The full background - sources, licence, what each step is for - is in `docs/data.md`. Read it
first. This is the routine.

## 1. Run the check

```bash
npm run data:check -- bornholm --out=<scratchpad>/osm-report.md
```

- It only reads OpenStreetMap and writes a Markdown checklist; it changes nothing.
- It takes a few minutes; the public Overpass servers are often busy. Run it in the background
  if possible, and never in a loop.
- Write the report to the scratchpad, not the repository.

## 2. Go through the report with the user

Summarise for the user, not the raw list:

- **Our places to look at** (gone, closed, moved > 100 m, renamed, new hours or website): for
  each, say what changed and suggest what to do. A rename like "Pastariget" → "Pastariget butik"
  is usually cosmetic; "gone" or a `disused:` tag means the place has likely closed.
- **Possibly new places**: group the real candidates per layer and leave out ones that do not fit
  the layer (a pizza deli is not "Lokal mad og drikke"). Ask which to add - do not add them all.

Open the OSM link (and the place's own website for opening hours or "økologisk") before changing
anything. Never copy photos from businesses' websites.

## 3. Edit what the user agreed to

In `apps/api/src/communities/bornholm/places.ts`:

- **Add**: `osmId`, `layerSlug`, a Danish `name` (OSM name; unnamed places get kind + nearest
  town), a short Danish `description`, `coordinates` as `[lng, lat]` with 5 decimals, and
  `properties` using only the layer's fields and options from `layers.ts`.
- **Change**: update the entry. Remember the seed never changes places already in a database -
  tell the user to make the same change on the live map in the app.
- **Remove**: delete the entry, and tell the user to delete the place in the app too.

Keep `places.ts`'s header date current.

## 4. Check, load, record

```bash
npm test -w @ecomap/api      # bornholm.test.ts validates every place
npm run db:seed              # adds new places to the local database
```

Then update the dates and counts in the table at the top of `docs/data.md`, commit (the
project commits straight to `main`), and tell the user what changed on the live map they still
need to do by hand.
