-- New communities open on Mapy.com's outdoor map. Existing ones keep whatever
-- an admin picked. Without a Mapy.com API key in the web app, the map falls
-- back to OpenStreetMap on its own, so this default is always safe.

alter table community_settings alter column basemap set default 'mapy-outdoor';
