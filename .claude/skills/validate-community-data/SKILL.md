---
name: validate-community-data
description: Check every place on a community's map (e.g. Bornholm) before a release or a demo - fields valid, websites reachable, still open in OpenStreetMap, no duplicates, pins on the right spot - and fill in missing websites and phone numbers from OpenStreetMap. Use when asked to validate, verify, audit, quality-check or "test all" the map data or places, or to add missing websites or phone numbers.
---

# Validate a community's places before a release

The data comes from `apps/api/src/communities/<community>/places.ts`; background and licence
rules are in `docs/data.md`. This check is wider than `refresh-community-data` (which looks for
OSM changes and new places): it checks that what we show is **correct and useful**. Read
`docs/data.md` first.

Work in the scratchpad for scripts and reports, never in the repository. Never copy photos or
text from businesses' websites - facts like a phone number or opening hours are fine.

## 1. The automatic checks

```bash
npm test -w @ecomap/api                                   # bornholm.test.ts: layer, fields, options, on the island, ids
npm run data:check -- bornholm --out=<scratchpad>/osm-report.md   # gone, closed, moved, renamed in OSM
```

Both must be clean, or every item in the OSM report explained.

## 2. Websites

Write a small script in the scratchpad that reads every `website` in `places.ts` and requests
it (GET, follow redirects, 15 s timeout, a few at a time, a plain `User-Agent` such as
`EcoMap data check` - not the user's e-mail). Report per place:

- **Broken**: DNS error, 4xx/5xx, timeout. Retry once before calling it broken.
- **Moved**: redirected to another domain (a parked domain or a shop that changed owner).
- **http only**: works on https too? Prefer https.
- **Facebook-only** links are fine but say so.

## 3. Missing websites and phone numbers

For every place without a `website` (and, once the layer has a phone field, without a
`phone`), look up its `osmId` in OpenStreetMap via Overpass and read `website`,
`contact:website`, `phone`, `contact:phone`, `url`. Only use values OSM has, or the place's
own website shows; never guess. Format phone numbers as `+45 12 34 56 78`.

If a layer has no `phone` field yet, tell the user: adding one is a change to the layer in
`layers.ts` (a `text` field, label "Telefon") and to the layer on the live map in the layer
editor.

## 4. Content, place by place

Go through the places layer by layer and flag:

- **Duplicates**: two places within ~50 m with similar names, also across layers.
- **Wrong layer or kind**: a pizza deli in "Fra gården", a bar in "Øl, vin og spiritus" that
  does not brew.
- **Descriptions** that claim more than OSM or the place's own website says ("økologisk",
  "selv ryger fisken", "fra bornholmsk opdræt"). Check, or tone down.
- **"Økologisk"** set without a source.
- **Opening hours** that disagree with the place's website, or look seasonal but have no
  season. Note that a 404 or a closed season is not the same as closed for good.
- **Pins in the wrong spot**: only spot-check here (open the OSM link); a full pass on the
  satellite map is a job for the user in the app ("Flyt på kortet").

## 5. Report, then fix what the user agrees to

Write `<scratchpad>/validation-report.md` grouped by severity:

1. **Wrong or broken** (closed place, dead website, wrong layer, unsupported claim)
2. **Missing** (website or phone found in OSM; no hours)
3. **Cosmetic** (http → https, name spelling)

Summarise it for the user with counts and the real problems, and ask before changing data.
Then edit `places.ts` as in `refresh-community-data` step 3, run `npm test -w @ecomap/api`,
and commit (the project commits straight to `main`).

**Before a live map exists**, a fresh database (`npm run db:reset`) picks up every fix. **Once
it is live**, the seed only adds new places: tell the user which fixes they must also make in
the app, or list them as an admin to-do.
