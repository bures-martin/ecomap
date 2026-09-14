# EcoMap Community

A community map of the green things happening around you — gardens, repair cafés, trails,
wildlife sightings, renewable energy projects and whatever else your community wants to map.

Nothing about those categories is hard-coded. An admin creates **layers**, decides which
geometries each accepts (a place, a route, an area) and which extra questions contributors are
asked, and the legend, the filters and the contribution form all follow from that.

---

## Quick start

You need **Node 22+** and **Docker** (for PostgreSQL + PostGIS).

```bash
npm install            # installs every workspace and builds @ecomap/shared
cp .env.example .env   # then change JWT_SECRET
npm run setup          # starts the database, migrates it and seeds demo data
npm run dev            # API on :4000, web app on :5173
```

Open <http://localhost:5173>. The seed creates a superadmin account — the credentials are the
`SEED_ADMIN_*` values in `.env` (`admin@ecomap.local` / `ChangeMe123!` by default).
**Change them before this ever leaves your machine.**

## Layout

```
apps/
  api/        Express 5 REST API, PostgreSQL + PostGIS
  web/        React 19 + MUI + Leaflet
packages/
  shared/     Zod schemas, domain types and the permission rules, used by both
```

`packages/shared` is the reason the two halves cannot drift apart: the same schema validates the
contribution form in the browser and the request body on the server, and the same
`canEditFeature()` decides whether the edit button renders and whether the API allows the edit.

## Commands

All run from the repository root.

| Command                     | What it does                                                     |
| --------------------------- | ---------------------------------------------------------------- |
| `npm run dev`               | Shared package watcher, API and web app together                 |
| `npm run build`             | Production build of all three                                    |
| `npm run verify`            | Format check, lint, typecheck and every test — run before commit |
| `npm test`                  | Tests only                                                       |
| `npm run db:up` / `db:down` | Start / stop the PostGIS container                               |
| `npm run db:migrate`        | Apply pending SQL migrations                                     |
| `npm run db:seed`           | Idempotent demo data (admin, seven layers, features on Bornholm) |
| `npm run db:reset`          | Throw the database away and rebuild it from scratch              |

## The data model

- **Layer** — a category. Slug, name, description, colour, which of Point / LineString / Polygon
  it accepts, whether contributions need review, and a list of custom field definitions.
- **Feature** — one thing on the map. Belongs to a layer, has a geometry stored as PostGIS
  `geometry(Geometry, 4326)`, free-text name and description, plus a `properties` object validated
  against its layer's fields.
- **Community settings** — one row: name, tagline, colours, default language, background map,
  where the map opens, and optionally a bounding box contributions must fall inside. This is what
  lets the same codebase run for a different community without a fork.
- **User** — email, password (scrypt), role, optional TOTP secret.

## Roles and permissions

Route handlers never check a role; they check a **permission**, and roles are bundles of
permissions defined in `packages/shared/src/permissions.ts`.

| Role          | Can                                                               |
| ------------- | ----------------------------------------------------------------- |
| `viewer`      | Read the public map                                               |
| `contributor` | Add features; edit and delete their own                           |
| `moderator`   | Edit and delete anything, approve or reject pending contributions |
| `admin`       | Manage layers, community settings and accounts                    |
| `superadmin`  | Assign roles                                                      |

Adding a capability means adding a permission to that file and granting it to the right roles —
in one place, for both the API and the UI.

## Authentication

- Passwords are hashed with **scrypt** from Node's standard library (no native module to build).
  The cost parameters live inside the stored hash, so they can be raised later without
  invalidating existing passwords.
- Sign-in returns a short-lived **access token** (JWT, HS256) that the browser keeps _in memory_
  and sends as `Authorization: Bearer`. Because it never travels in a cookie, every authenticated
  endpoint is structurally immune to CSRF.
- A long-lived **refresh token** lives in an httpOnly, `SameSite=Strict` cookie scoped to
  `/api/auth`, and the database stores only its SHA-256 hash. Refreshing rotates it, so a stolen
  token is usable at most once.
- **Two-factor authentication** is TOTP (RFC 6238), implemented on `node:crypto` and tested
  against the reference vectors published in the RFC.

## Filters live in the URL

`/?layers=community-gardens,nature-trails&q=bee&status=pending` is the whole filter state. A
filtered map is a link you can send to a neighbour, and the back button undoes a filter change.

## Accessibility

A skip link, semantic landmarks and headings, visible focus rings on every interactive element
(including Leaflet's own zoom buttons), `aria-live` on the result count and the drawing toolbar,
labelled form fields with errors wired to their inputs, a `prefers-reduced-motion` rule, and
`contrastThreshold: 4.5` so MUI picks button text colours by the WCAG AA ratio no matter which
colours a community chooses.

## Tests

| Package           | Count | Covers                                                         |
| ----------------- | ----- | -------------------------------------------------------------- |
| `packages/shared` | 54    | Schemas, permission rules, geometry helpers                    |
| `apps/api`        | 77    | 29 unit + 48 end-to-end over HTTP against a real PostGIS       |
| `apps/web`        | 46    | API client, URL filters, drawing state machine, form rendering |

The API integration tests run against the database named by `TEST_DATABASE_URL`, creating it on
demand and truncating between cases. Without that variable they skip themselves, so `npm test`
still passes on a machine with no Docker.

## Deployment notes

- `npm run build` produces `apps/api/dist` (run with `npm start`) and `apps/web/dist` (static
  files for any web server or CDN).
- Serve both from one origin, or set `CORS_ORIGINS` to the web app's origin. The refresh cookie is
  `Secure` whenever `NODE_ENV=production`, so the site must be on HTTPS.
- The API runs its own migrations at start-up.
- PostgreSQL, PostGIS, OpenStreetMap tiles and everything else here are open source and can be
  self-hosted inside the EU.

## Migration from the first version

`backend/` and `frontend/` are the project's first iteration. They are still in the repository and
in git history, but they are no longer part of the workspace build and are excluded from lint.
Everything they did is covered by `apps/api` and `apps/web`; delete them once you are happy the
new version has replaced them.

## Deliberately left for later

- The `bbox` query parameter exists on `GET /api/features` and is backed by a GiST index, but the
  web app loads all matching features in one request. Wire the viewport to it when a community
  outgrows that.
- The About text is rendered as plain text rather than parsed as Markdown — rendering
  admin-authored HTML would be a stored XSS waiting for the first compromised account.
- Danish is partially translated and falls back to English key by key.
- No email yet, so no password reset and no invitations.
