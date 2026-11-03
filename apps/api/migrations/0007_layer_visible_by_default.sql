-- ----------------------------------------- layers visible on opening ----
--
-- Whether a layer is switched on when somebody opens the map. Turning it off
-- does not hide anything: the layer stays one tap away (its chip, the layer
-- list, a search). It lets a community lead with what inspires - nature,
-- farm shops, cycling - and keep the practical layers a tap away.

alter table layers add column visible_by_default boolean not null default true;
