-- ------------------------------------------------- blocked accounts ----
--
-- A blocked account keeps its row, so its contributions stay on the map and
-- still show who added them; it just cannot sign in or use a session.

alter table users add column disabled_at timestamptz;

-- ------------------------------------------------------ invitations ----
--
-- Single-use links for joining a community, created by an admin for one role.
-- Only the SHA-256 of the token is stored: the raw token exists in the link
-- alone, so a database leak hands out no working invitations.
--
-- Superadmin is deliberately not invitable; an existing account is promoted.

create table invitations (
  id          uuid primary key default gen_random_uuid(),
  token_hash  text not null unique,
  role        text not null check (role in ('viewer', 'contributor', 'moderator', 'admin')),
  label       text not null default '',
  created_by  uuid references users(id) on delete set null,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null,
  accepted_at timestamptz,
  accepted_by uuid references users(id) on delete set null,
  revoked_at  timestamptz,
  check (accepted_at is null or revoked_at is null)
);

create index invitations_created_at_idx on invitations (created_at desc);
