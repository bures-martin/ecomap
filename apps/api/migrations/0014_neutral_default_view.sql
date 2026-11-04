-- ------------------------------------------ neutral start view ----
--
-- The first migration created the settings row looking at Bornholm. That is
-- community data now (src/communities/bornholm), so a fresh database starts
-- with all of Europe in view and the seed sets the community's own view.
--
-- Only a database that is still empty is moved: one with places on it was
-- set up on purpose, wherever it looks.

alter table community_settings alter column initial_lat set default 51;
alter table community_settings alter column initial_lng set default 10;
alter table community_settings alter column initial_zoom set default 4;

update community_settings
set initial_lat = 51, initial_lng = 10, initial_zoom = 4
where initial_lat = 55.1 and initial_lng = 14.9 and initial_zoom = 10
  and not exists (select 1 from features);
