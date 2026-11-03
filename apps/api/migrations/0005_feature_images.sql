-- ------------------------------------------------ contribution photos ----
--
-- Photos belong to one contribution and go when it goes. The browser shrinks
-- and re-encodes them first (max 1600px, EXIF and GPS stripped), so each is a
-- few hundred kilobytes; bytea keeps backups and permissions in one place.
-- Move to object storage if a community ever stores tens of thousands.

create table feature_images (
  id           uuid primary key default gen_random_uuid(),
  feature_id   uuid not null references features(id) on delete cascade,
  content_type text not null check (content_type in ('image/webp', 'image/jpeg', 'image/png')),
  data         bytea not null check (octet_length(data) <= 1048576),
  alt          text not null default '',
  sort_order   integer not null default 0,
  created_by   uuid references users(id) on delete set null,
  created_at   timestamptz not null default now()
);

create index feature_images_feature_idx on feature_images (feature_id, sort_order, created_at);
