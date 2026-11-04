-- ------------------------------------ no more "visible on opening" ----
--
-- The map now opens on every layer and the layer list works as a filter
-- (nothing ticked shows everything), so the per-layer "show when the map
-- opens" switch from 0007 no longer does anything. Dropped rather than left
-- as a setting that silently has no effect.

alter table layers drop column visible_by_default;
