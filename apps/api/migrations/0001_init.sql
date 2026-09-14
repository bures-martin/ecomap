-- EcoMap Community - initial schema.
--
-- Everything the map shows is a `feature` belonging to a `layer`. Layers are
-- data, not code: an admin creates them, decides which geometries they accept
-- and which extra fields contributors fill in.

create extension if not exists postgis;
create extension if not exists citext;
create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

-- Keeps `updated_at` honest without every query having to remember it.
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ---------------------------------------------------------------- users ----

create table users (
  id            uuid primary key default gen_random_uuid(),
  email         citext not null unique,
  display_name  text not null,
  password_hash text not null,
  role          text not null default 'contributor'
                check (role in ('viewer', 'contributor', 'moderator', 'admin', 'superadmin')),
  totp_secret   text,
  totp_enabled  boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger users_set_updated_at
  before update on users
  for each row execute function set_updated_at();

-- Refresh tokens are stored hashed: a database leak must not hand out sessions.
create table refresh_tokens (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index refresh_tokens_user_idx on refresh_tokens (user_id);
create index refresh_tokens_expiry_idx on refresh_tokens (expires_at);

-- --------------------------------------------------------------- layers ----

create table layers (
  id                  uuid primary key default gen_random_uuid(),
  slug                text not null unique,
  name                text not null,
  description         text not null default '',
  color               text not null default '#2f855a',
  icon                text not null default 'leaf',
  -- Subset of Point / LineString / Polygon this layer accepts.
  allowed_geometries  text[] not null default array['Point', 'LineString', 'Polygon'],
  -- Custom field definitions; validated against the shared Zod schema on write.
  fields              jsonb not null default '[]'::jsonb,
  sort_order          integer not null default 0,
  is_published        boolean not null default true,
  requires_moderation boolean not null default false,
  created_by          uuid references users(id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  constraint layers_allowed_geometries_not_empty
    check (array_length(allowed_geometries, 1) >= 1),
  constraint layers_allowed_geometries_known
    check (allowed_geometries <@ array['Point', 'LineString', 'Polygon'])
);

create index layers_sort_idx on layers (sort_order, name);

create trigger layers_set_updated_at
  before update on layers
  for each row execute function set_updated_at();

-- ------------------------------------------------------------- features ----

create table features (
  id          uuid primary key default gen_random_uuid(),
  layer_id    uuid not null references layers(id) on delete cascade,
  name        text not null,
  description text not null default '',
  geom        geometry(Geometry, 4326) not null,
  properties  jsonb not null default '{}'::jsonb,
  status      text not null default 'published'
              check (status in ('draft', 'pending', 'published', 'rejected')),
  created_by  uuid references users(id) on delete set null,
  updated_by  uuid references users(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint features_geometry_supported
    check (geometrytype(geom) in ('POINT', 'LINESTRING', 'POLYGON'))
);

-- Spatial index: the map queries by viewport bbox on every pan.
create index features_geom_idx on features using gist (geom);
create index features_layer_idx on features (layer_id);
create index features_status_idx on features (status);
create index features_created_by_idx on features (created_by);
-- Trigram indexes make the free-text filter usable without a full search stack.
create index features_name_trgm_idx on features using gin (name gin_trgm_ops);
create index features_description_trgm_idx on features using gin (description gin_trgm_ops);

create trigger features_set_updated_at
  before update on features
  for each row execute function set_updated_at();

-- ------------------------------------------------------------- settings ----

-- Single-row table: the `id` check allows exactly one row to exist.
create table community_settings (
  id                        boolean primary key default true check (id),
  name                      text not null default 'EcoMap Community',
  tagline                   text not null default '',
  about_markdown            text not null default '',
  primary_color             text not null default '#2f855a',
  accent_color              text not null default '#b7791f',
  default_locale            text not null default 'en',
  basemap                   text not null default 'osm',
  initial_lat               double precision not null default 55.1,
  initial_lng               double precision not null default 14.9,
  initial_zoom              double precision not null default 10,
  -- [west, south, east, north] or null for "anywhere".
  contribution_bounds       jsonb,
  allow_public_registration boolean not null default true,
  updated_at                timestamptz not null default now()
);

create trigger community_settings_set_updated_at
  before update on community_settings
  for each row execute function set_updated_at();

insert into community_settings (id) values (true) on conflict do nothing;
