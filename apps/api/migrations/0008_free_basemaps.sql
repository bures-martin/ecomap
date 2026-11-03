-- Mapy.com is gone for now (it needs an API key); the background maps are free,
-- keyless ones with a switcher on the map. Communities on a removed map move to
-- the closest one left, and new communities open on Esri streets.

update community_settings set basemap = case
  when basemap = 'mapy-aerial' then 'satellite'
  when basemap = 'humanitarian' then 'osm'
  else 'streets'
end
where basemap in ('mapy-outdoor', 'mapy-basic', 'mapy-aerial', 'humanitarian');

alter table community_settings alter column basemap set default 'streets';
