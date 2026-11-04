# Deploying EcoMap

One community on one server: the database, the API, the web app with automatic HTTPS, and
nightly backups, all from [`deploy/`](../deploy). It runs on any Linux server with Docker — a
small VPS (2 GB RAM is plenty) from an EU provider keeps the data inside the EU.

```
internet ──▶ web (Caddy: HTTPS, the app, /api ──▶) ──▶ api (Node) ──▶ db (PostGIS)
                                                                        ▲
                                                     backup (nightly) ──┘ → deploy/backups/
```

## 1. Prepare the server

1. Create a server with Ubuntu 24.04 (or similar) and install Docker:
   ```bash
   curl -fsSL https://get.docker.com | sh
   ```
2. Point your domain at it: an **A record** (and AAAA for IPv6) for e.g. `map.example.org` to the
   server's IP address. Caddy needs this to get the HTTPS certificate.
3. Open ports **80** and **443** in the server's firewall.

**No domain yet?** For a demo you can skip step 2: use the server's IP address with dashes plus
`.sslip.io` as `DOMAIN` (server `51.75.12.34` → `51-75-12-34.sslip.io`). That name already points
at the server, and Caddy still gets a real HTTPS certificate for it. Switch `DOMAIN` to the real
name later and restart - nothing else changes.

## 2. Configure

```bash
git clone https://github.com/bures-martin/ecomap.git
cd ecomap
cp deploy/.env.example deploy/.env
nano deploy/.env
```

Fill in `DOMAIN`, two long random secrets (`POSTGRES_PASSWORD`, `JWT_SECRET` — the file shows how
to generate them), the first admin's e-mail and password, and `COMMUNITY` (`bornholm` or
`neutral`, see [`apps/api/src/communities`](../apps/api/src/communities)).

## 3. Start it

```bash
docker compose -f deploy/docker-compose.yml --env-file deploy/.env up -d --build
```

The API applies database migrations itself when it starts. Then write the community into the
database — once:

```bash
docker compose -f deploy/docker-compose.yml --env-file deploy/.env run --rm api node dist/db/seed.js
```

Open `https://<your domain>`, sign in with the admin account from `deploy/.env`, and:

- change the admin password (Din konto),
- fill in the privacy policy (Indstillinger → Privatlivspolitik → "Start fra skabelonen"),
- check name, colours and the map area under Indstillinger.

> Tip: put the long `docker compose -f deploy/docker-compose.yml --env-file deploy/.env` in an
> alias, e.g. `alias dc='docker compose -f deploy/docker-compose.yml --env-file deploy/.env'`.

## 4. Backups

The `backup` service writes a compressed dump to `deploy/backups/` when it starts and every night
at `BACKUP_HOUR` (UTC), and deletes dumps older than `BACKUP_KEEP_DAYS` (14 by default).

- **Check that a backup restores** (into a scratch database — the live data is not touched):
  ```bash
  docker compose -f deploy/docker-compose.yml --env-file deploy/.env exec backup sh /restore-check.sh
  ```
  It prints how many layers, places, people and photos the backup holds. Do this after setting
  up, and now and then.
- **Keep a copy off the server.** A backup on the same disk does not survive the server. Copy
  `deploy/backups/` elsewhere regularly, e.g. from your own machine:
  ```bash
  rsync -av user@server:ecomap/deploy/backups/ ~/ecomap-backups/
  ```
- **Restore for real** (replaces the live data — stop the API first):
  ```bash
  dc stop api
  dc exec backup sh -c 'pg_restore --clean --if-exists --no-owner --dbname=ecomap /backups/<file>.dump'
  dc start api
  ```

## 5. Update to a new version

```bash
git pull
docker compose -f deploy/docker-compose.yml --env-file deploy/.env up -d --build
```

Migrations run on start-up. Visitors get the new version on their next visit: the app's own files
are re-checked every time, and only content-hashed assets are cached long-term.

## Good to know

- **Logs** (`dc logs api`) include IP addresses; Docker keeps at most five files of 20 MB each.
  State a matching period in the privacy policy.
- **Trying it on your own machine:** set `DOMAIN=localhost`, `HTTP_PORT=8080`, `HTTPS_PORT=8443`
  and `CORS_ORIGINS=https://localhost:8443` in `deploy/.env`, then open `https://localhost:8443`
  (the browser warns about the local certificate). The production project is called
  `ecomap-production`, so it never touches the development database.
- **Map tiles** come from free public services. For a busy site, check their usage policies or
  switch to a paid or self-hosted tile service.
