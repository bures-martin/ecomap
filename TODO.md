<!--
  Snapshot of the project note kept in Obsidian (Map/Project.md), copied on
  2026-11-03. The Obsidian note is the working copy; refresh this file from it
  when the plan changes.
-->

# EcoMap - TODO and plan

**WHAT THIS IS**
EcoMap Community is a generic, layer-based community map for local ecological initiatives. The first instance is for Bornholm (Denmark). One deployment = one community; name, colours, start view, region and layers are admin settings in the database.
Stack: Vue 3.5 + Vuetify 4 + Leaflet, Express 5 + PostgreSQL/PostGIS, TypeScript 7, shared Zod package.

**NAME**
- Candidates: EcoMap Community (current), Green Grid / The Green Grid, NatureLink, EcoAtlas, EcoPulse, GreenSteps Map, Earth Acts / EarthActs, Nature's footprint
- [ ] Pick the final name and check domain availability
  - Suggested solution: shortlist 3, check .dk/.org/.eu domains and trademark search (EUIPO/DKPTO), then ask 3-5 people which is easiest to say and spell. S
---


### Settle even when it is free
- Ownership: code stays yours (maybe open source); they get a hosted instance and can export their data.
- Who moderates contributions, and who is the GDPR data controller (probably them for content, you for hosting) - put it in writing.
- Use of their name/logo on the map and the right to show the project in your portfolio.

---

## OPEN ITEMS

Effort: S = hours, M = days, L = weeks.

### Launch blockers (needed before a public Bornholm launch)

 
### Content and data

- [ ] Review data, put pictures if possible etc... Check if all valid add more to layers if there are more
  - Done (Nov 2026): 37 more real places from OpenStreetMap - "Lokal mad og drikke" now has 42 (farm shops, Svaneke Bryghus, Bornholms Ismejeri, Wild Distillery, chocolate, liquorice, cider, snaps, honey, Torvehal), "Genbrug og reparation" 14 (3 more second-hand shops). "Økologisk" is set only where the producer's own website says so (Svaneke Bryghus, Bornholms Ismejeri, Wild Distillery) or OSM tags it (Hammersly).
  - Photos: do not copy photos from businesses' websites (copyright). Ask owners to add their own, or take your own; members can add photos when they add a place.
- [ ] Manual check
  - Suggested solution: walk through each layer on the map with satellite view; use "Flyt på kortet" on any pin that is off, and check opening hours against the producer's website. A few hours. S
- [ ] How to make sure data will be updated
	- [ ] Review also all data if the navigation is spot on
		- Navigation aims at the stored coordinates, so fixing a pin fixes navigation too.
	- [x] **"How to make the points pretty accurate?"** - done (Nov 2026): "Flyt på kortet" (move on the map) on every point - click the right spot, satellite view in the background-map switcher helps; members' moves go to review as a suggestion. Still open: Google place ID (see LATER).
- [ ] **Danish municipality / open data**
  - Problem: you want municipality data (Bornholms Regionskommune), ideally live or updated.
  - Findings (Nov 2026): no Bornholm datasets found on opendata.dk. The real source is **GeoFA** (GeoDanmark's shared outdoor-facility database, also behind udinaturen.dk): free SQL/WFS API, no key, GeoDanmark data under CC BY 4.0 (confirm GeoFA's own terms). Bornholm has ~465 facility points, 202 from the municipality: picnic tables 60, viewpoints 31, heritage sites 16, beaches 12, toilets 10, shelters 9, fire pits 8, museums 7, and one each of bike pump/service post and drinking-water tap.
  - Suggested solution: most of it is outdoor recreation (udinaturen.dk shows it already), so do not import it all. Useful pieces later: bike service posts into "Cykling", drinking-water taps, and beaches/viewpoints for a possible "Naturoplevelser" layer. Ask the municipality (or BOFA) for what GeoFA lacks: recycling and reuse points, municipal EV chargers, district-heating and energy projects. M
- [ ] **OpenStreetMap layers pulled live or periodically**
  - Problem: practical data (EV chargers, recycling points, bike infrastructure) goes stale; you want it kept fresh while the community adds local knowledge.
  - Suggested solution: a nightly job querying the Overpass API for Bornholm, upserting into the matching layers with an `osm_id` field and an "imported" badge, never overwriting community edits. Respect ODbL attribution. L
  - Notes from the Nov 2026 import: the public Overpass servers are often "at capacity" - the job needs retries, a light query, and a fallback server (overpass.kumi.systems worked when overpass-api.de did not). Every demo place already carries its `osmId` in the seed data, which is the key a sync would match on.

### Portfolio and sustainability

- [ ] **Live Bornholm map as showcase, plus separate demo instance**
  - Suggested solution: run a second instance with demo data that resets nightly (cron re-seed), so visitors can try everything without harming the real map. S-M

- [ ] **Portfolio / CV updates**
  - Decide: put the newest CV with the project, or link the online CV?
  - Check wording; add new photos, the new project, and photos from SciSure work.
  - State clearly that this is a fully generic map.
  - Suggested solution: write one README/case study (problem, screenshots, architecture, what is generic vs Bornholm-specific) and link it from the CV; keep the CV only on the online page. S


---

## WHO TO CONTACT (offer the map for free)

Research (Nov 2026): no green guide map for Bornholm exists. bornholm.info has a "sustainable holiday" page that only links to separate lists (green restaurants, green stays, local food producers, EV charging), all limited to member/certified businesses. Nobody maps roadside stalls (vejboder), second-hand/repair/reuse places, or green events. Only ~10% of food eaten on Bornholm is local (Gate 21), and the island is actively trying to change that - the map supports a goal they already have.

### Main target
- [ ] **Destination Bornholm** (runs bornholm.info - the tourism organisation)
  - Why them: their sustainable-holiday page has the exact problem the map solves - green content scattered across lists. Offer: a free map instance they can link to or embed.
  - Pages: https://bornholm.info/en/?p=1968089 (sustainable holiday), Mad & Mennesker food magazine (their food guide).

### Also worth contacting
- [ ] **Bornholms Regionskommune** - owner of the "Bright Green Island" strategy; also has a nature/green-planning angle. Contact the climate/sustainability or business department.
- [ ] **BOFA** (waste company) - for the reuse & repair layer; they run reuse projects (REuseLAB Bornholm with FGU and AAU, white-goods reuse). Could supply recycling/reuse places and waste-sorting guidance.
- [ ] **Gate 21** - ran the local-food design sprint with BOFA, the municipality, ØkoBornholm and restaurants. Good door-opener to food producers.
- [ ] **Foreningen ØkoBornholm** - organic association; producers for the "Eat local" layer.
- [ ] **Bornholms Landbrug & Fødevarer** - farmers' organisation; works with Destination Bornholm and Horesta on sustainable food experiences.
- [ ] **Food Bornholm** - group of ~15 local plant-based farmers.
- [ ] **Local Facebook groups** (e.g. stalls / "boder" groups) - could not be searched; check if a group already shares stalls. That group is both competition and best partner.

## LATER

- **Some more complex import**
- **Mobile use**
  - Done (Nov 2026): installable PWA (manifest, icons, service worker) and a "Vis min placering" button - see DONE.
  - Still open: test "Add to Home Screen" on a real Android phone and iPhone once it is on HTTPS (a service worker only runs on HTTPS or localhost).
  - **"Share people to meet other people, meetups?"** - decided (Nov 2026): no people profiles on the map (privacy risk); meetups go in the "Arrangementer og frivilligt arbejde" layer.
- **Eco stories and guides**
  - Problem: you want more than pins: guides on how to live sustainably, info about climate anxiety, and nature heroes.
  - Suggested solution: a "Story" type with text plus photos linked to one or more places, written by members and moderated; optional map tour later. Start with 3-5 hand-written stories by you. M-L
- [ ] **Bring back the hidden layers**
  - Problem: Dyreliv (wildlife sightings), Naturstier (nature trails) and Arrangementer og frivilligt arbejde (events) are unpublished because they are empty.
  - Events: add a date-aware "hide past events" filter (default "upcoming only", toggle for past) and a few real upcoming events first. M
  - Naturstier: bring it back as "Favorite walks" - members' own short loops with photo and tip, not a copy of udinaturen.dk. S
  - Dyreliv: only if there is demand. Consider "Naturoplevelser" (viewpoints, bird-watching spots) instead, because exact locations of rare or nesting species are a protection risk. S
- [ ] **Navigation to the right point**
  - Problem: Navigate aims at the pin or the centre of an area, which is often not where you can arrive.
  - Suggested solution: optional "where to arrive" point per place (parking, entrance, trailhead) set when adding or editing; for areas without it, aim at the nearest edge point to the user (browser location) instead of the centre; for routes also offer "navigate to end". M
- [ ] **Google place ID for exact places**
  - Problem: the Navigate link may not open the real business in Google Maps.
  - Suggested solution: store only Google's place ID (allowed by Google's terms; names, hours and photos may not be stored) so Navigate opens the real place. Needs a Google Cloud account with billing and a Places API key; ID-only lookups, verify current pricing. M
- [ ] **Photos in suggested changes**
  - Problem: suggestions currently cover name, description and fields, not photos.
  - Suggested solution: allow attaching photos to a suggestion and show them in the moderation review. M
- [ ] **Language switch (Danish/English)**
  - Why later: prepared but hidden. Layer names and place texts are Danish only.
  - Suggested solution: turn it on with `VITE_LANGUAGE_SWITCH=true` and put `<LanguageMenu />` back in `AppShell.vue`. If English content is needed, add second-language fields or a DeepL "translate" button. S-M
- [ ] **Free drinking-water taps (refill your bottle)**
  - Why later: only worth it if there are enough on Bornholm.
  - Counted (Nov 2026, Overpass): 28 OSM nodes tagged `amenity=drinking_water` on Bornholm and Christiansø (a few are pairs at the same spot, three marked `fee=no`), plus about 10 campsites/toilets/springs tagged `drinking_water=yes` (e.g. Koldekilde, Lejrplads Egeløkke). Clusters around Rønne, Hasle, Allinge and the Almindingen area. Enough for a small layer.
  - Suggested solution: a "Drikkevand" layer (droplet icon) imported once from OSM with `osmId` on each point, so the later OSM sync can keep it fresh. S
- [ ] **Topic ideas parked**
  - Water conservation / rainwater
  - Climate initiatives
  - Nature heroes (better as eco stories)
  - Environmental alert spots (heavy to moderate; better as clean-up events)
  - Car sharing (almost none on Bornholm)
  - Cultural / historical sites and lost animals/things (off-topic)

---

## DONE (Nov 2026)
- Background maps: free, keyless maps with a switcher in the bottom-left corner (Esri streets, light, dark, satellite; OpenStreetMap; OpenTopoMap; CyclOSM); each visitor's pick is remembered.
- Topic chips: as many as fit the screen, the rest in a "Flere" menu; same chips on the Om page, linking to the map.
- Opening hours: timetable with "Åbent nu / Lukket", seasons and public holidays; editor with time pickers, split hours, 24/7.
- Clickable links in descriptions and fields; flags and translated language names (switcher hidden for now).
- Clusters: one click opens a group of up to 20 places, fast zoom; grouping stops at street level.
- Danish only: app, layers, fields and demo texts in Danish; "Om" page with motivation, waste sorting (BOFA links) and Danish sustainability links; About text supports headings, lists and links.
- Review on all layers; any member can suggest changes to any place, moderators see a before/after view and approve or reject.
- "Flyt på kortet" to move a point exactly.
- Layers: "Lokal mad og drikke" (42 places), "Genbrug og reparation" with a type field (14); Dyreliv, Naturstier, Arrangementer and Grønne butikker hidden until they have content.
- Filter fix: unticking the last layer leaves the map empty.
- Layer icons in the layer's colour (instead of a coloured dot) in the side-panel layer list, the "add a place" layer picker and the admin layer table.
- Installable app (PWA): manifest, home-screen icons (incl. maskable and Apple touch icon) and a service worker - pages network-first with an offline fallback, hashed assets cached, API and map tiles never cached.
- "Vis min placering" button under the zoom buttons: one-off location, blue dot with an accuracy circle, friendly message when access is refused.
