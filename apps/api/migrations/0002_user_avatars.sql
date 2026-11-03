-- ------------------------------------------------------------ avatars ----
--
-- Profile pictures live in their own table so the image bytes are never read
-- by the many queries that select users. `users.avatar_updated_at` is the only
-- trace on the user row: it says whether there is a picture and versions its
-- URL, so a new upload is never served from a stale cache.

alter table users add column avatar_updated_at timestamptz;

create table user_avatars (
  user_id      uuid primary key references users(id) on delete cascade,
  content_type text not null
               check (content_type in ('image/webp', 'image/jpeg', 'image/png')),
  data         bytea not null check (octet_length(data) <= 262144),
  updated_at   timestamptz not null default now()
);
