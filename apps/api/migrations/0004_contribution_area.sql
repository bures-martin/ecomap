-- ----------------------------------------------- contribution area ----
--
-- The region where contributions are allowed becomes a real polygon that an
-- admin draws, instead of a west/south/east/north rectangle. PostGIS decides
-- whether a contribution lies inside it (`ST_CoveredBy`), so a line that leaves
-- a concave region and comes back is caught too.
--
-- An existing rectangle is carried over as the equivalent four-corner polygon.

alter table community_settings
  add column contribution_area geometry(Polygon, 4326)
  check (contribution_area is null or ST_IsValid(contribution_area));

update community_settings
set contribution_area = ST_MakeEnvelope(
  (contribution_bounds ->> 0)::double precision,
  (contribution_bounds ->> 1)::double precision,
  (contribution_bounds ->> 2)::double precision,
  (contribution_bounds ->> 3)::double precision,
  4326
)
where jsonb_typeof(contribution_bounds) = 'array'
  and jsonb_array_length(contribution_bounds) = 4;

alter table community_settings drop column contribution_bounds;
