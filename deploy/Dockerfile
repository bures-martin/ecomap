# syntax=docker/dockerfile:1
#
# Builds the two production images from the repository root:
#
#   docker build -f deploy/Dockerfile --target api .   -> the API (Node)
#   docker build -f deploy/Dockerfile --target web .   -> the web app behind Caddy
#
# deploy/docker-compose.yml builds both; see docs/deploy.md.

ARG NODE_IMAGE=node:24-bookworm-slim

# ---------------------------------------------------------------- build ----
# Everything compiled once: the shared package, the API and the web app.
FROM ${NODE_IMAGE} AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
# Scripts off: "prepare" builds the shared package, which needs the sources below.
RUN npm ci --ignore-scripts

COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/api apps/api
COPY apps/web apps/web
# The web app talks to the API on its own origin (Caddy forwards /api).
ENV VITE_API_URL=""
RUN npm run build

# ------------------------------------------------------------- api deps ----
# Only what the API needs at run time - no compilers, test tools or web libraries.
FROM ${NODE_IMAGE} AS api-deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN npm ci --omit=dev --ignore-scripts --workspace=@ecomap/api

# ------------------------------------------------------------------ api ----
FROM ${NODE_IMAGE} AS api
ENV NODE_ENV=production
WORKDIR /app
COPY --from=api-deps /app/node_modules ./node_modules
COPY --from=build /app/packages/shared/package.json packages/shared/
COPY --from=build /app/packages/shared/dist packages/shared/dist
COPY --from=build /app/apps/api/package.json apps/api/
COPY --from=build /app/apps/api/dist apps/api/dist
COPY --from=build /app/apps/api/migrations apps/api/migrations

WORKDIR /app/apps/api
USER node
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://localhost:'+(process.env.PORT||4000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
# Applies pending migrations, then serves the API.
CMD ["node", "dist/server.js"]

# ------------------------------------------------------------------ web ----
# Caddy serves the built app, forwards /api to the API, and gets the HTTPS
# certificate for DOMAIN by itself.
FROM caddy:2.10-alpine AS web
COPY deploy/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/apps/web/dist /srv
