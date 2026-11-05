-- Short links (/s/k7m2qx) for sharing a place or a filtered map, by message or
-- as a QR code in print. A link holds only the map's query string - never a
-- whole URL, so it cannot redirect anywhere else - and nothing about who made
-- it: sharing needs no account and leaves no personal data behind.
--
-- The same view always gets the same code (query is unique), so printing a
-- QR code twice gives the same one.

create table short_links (
  code       text primary key
             check (code ~ '^[23456789abcdefghjkmnpqrstuvwxyz]{6}$'),
  query      text not null unique,
  created_at timestamptz not null default now()
);
