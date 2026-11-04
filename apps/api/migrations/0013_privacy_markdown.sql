-- ------------------------------------------------- privacy notice ----
--
-- The community's own privacy notice, written by an admin like the About
-- text. Empty means the web app shows its built-in template, with the parts
-- only the community can know marked for filling in.

alter table community_settings add column privacy_markdown text not null default '';
