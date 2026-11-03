-- Suggested changes to places already on the map. The place itself is not
-- touched until a moderator approves; `changes` holds only the parts that
-- change (name, description, geometry as GeoJSON, properties).

create table feature_suggestions (
  id           uuid primary key default gen_random_uuid(),
  feature_id   uuid not null references features (id) on delete cascade,
  proposed_by  uuid references users (id) on delete set null,
  changes      jsonb not null,
  status       text not null default 'pending'
               check (status in ('pending', 'approved', 'rejected')),
  decided_by   uuid references users (id) on delete set null,
  decided_at   timestamptz,
  created_at   timestamptz not null default now()
);

create index feature_suggestions_pending_idx
  on feature_suggestions (created_at) where status = 'pending';
create index feature_suggestions_feature_idx on feature_suggestions (feature_id);
