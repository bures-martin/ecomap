-- Where else a place is found online: Facebook, Instagram, Tripadvisor,
-- bornholm.info and HappyCow, each a URL field the details panel shows as a
-- button. The seed only creates layers that are missing, so this adds the
-- same fields to the layers a database already has - once, and only a field
-- whose key the layer does not have yet.
--
-- Facebook and Instagram go on every layer that has a website field, in any
-- community. The Bornholm-only sites go only on the Bornholm layers, told
-- apart from the neutral community's same-named layers by their Danish
-- "Hjemmeside" label.

with wanted (slug, danish_only, position, field) as (
  values
    -- Local food and green shops: everything.
    ('from-the-farm', true, 1, '{"key":"tripadvisor","label":"Tripadvisor","type":"url","required":false,"helpText":"Linket til stedets side på Tripadvisor, hvis det har en","options":[]}'::jsonb),
    ('from-the-farm', true, 2, '{"key":"bornholmInfo","label":"bornholm.info","type":"url","required":false,"helpText":"Linket til stedets side på bornholm.info, hvis det har en","options":[]}'::jsonb),
    ('from-the-farm', true, 3, '{"key":"happyCow","label":"HappyCow","type":"url","required":false,"helpText":"Til veganske og vegetariske steder: linket til siden på happycow.net","options":[]}'::jsonb),
    ('fish-and-smokehouses', true, 1, '{"key":"tripadvisor","label":"Tripadvisor","type":"url","required":false,"helpText":"Linket til stedets side på Tripadvisor, hvis det har en","options":[]}'::jsonb),
    ('fish-and-smokehouses', true, 2, '{"key":"bornholmInfo","label":"bornholm.info","type":"url","required":false,"helpText":"Linket til stedets side på bornholm.info, hvis det har en","options":[]}'::jsonb),
    ('fish-and-smokehouses', true, 3, '{"key":"happyCow","label":"HappyCow","type":"url","required":false,"helpText":"Til veganske og vegetariske steder: linket til siden på happycow.net","options":[]}'::jsonb),
    ('local-drinks', true, 1, '{"key":"tripadvisor","label":"Tripadvisor","type":"url","required":false,"helpText":"Linket til stedets side på Tripadvisor, hvis det har en","options":[]}'::jsonb),
    ('local-drinks', true, 2, '{"key":"bornholmInfo","label":"bornholm.info","type":"url","required":false,"helpText":"Linket til stedets side på bornholm.info, hvis det har en","options":[]}'::jsonb),
    ('local-drinks', true, 3, '{"key":"happyCow","label":"HappyCow","type":"url","required":false,"helpText":"Til veganske og vegetariske steder: linket til siden på happycow.net","options":[]}'::jsonb),
    ('sweets-and-ice-cream', true, 1, '{"key":"tripadvisor","label":"Tripadvisor","type":"url","required":false,"helpText":"Linket til stedets side på Tripadvisor, hvis det har en","options":[]}'::jsonb),
    ('sweets-and-ice-cream', true, 2, '{"key":"bornholmInfo","label":"bornholm.info","type":"url","required":false,"helpText":"Linket til stedets side på bornholm.info, hvis det har en","options":[]}'::jsonb),
    ('sweets-and-ice-cream', true, 3, '{"key":"happyCow","label":"HappyCow","type":"url","required":false,"helpText":"Til veganske og vegetariske steder: linket til siden på happycow.net","options":[]}'::jsonb),
    ('green-shops', true, 2, '{"key":"bornholmInfo","label":"bornholm.info","type":"url","required":false,"helpText":"Linket til stedets side på bornholm.info, hvis det har en","options":[]}'::jsonb),
    ('green-shops', true, 3, '{"key":"happyCow","label":"HappyCow","type":"url","required":false,"helpText":"Til veganske og vegetariske steder: linket til siden på happycow.net","options":[]}'::jsonb),
    -- Bike rental and nature areas: the tourist sites.
    ('cycling', true, 1, '{"key":"tripadvisor","label":"Tripadvisor","type":"url","required":false,"helpText":"Linket til stedets side på Tripadvisor, hvis det har en","options":[]}'::jsonb),
    ('cycling', true, 2, '{"key":"bornholmInfo","label":"bornholm.info","type":"url","required":false,"helpText":"Linket til stedets side på bornholm.info, hvis det har en","options":[]}'::jsonb),
    ('nature-areas', true, 1, '{"key":"tripadvisor","label":"Tripadvisor","type":"url","required":false,"helpText":"Linket til stedets side på Tripadvisor, hvis det har en","options":[]}'::jsonb),
    ('nature-areas', true, 2, '{"key":"bornholmInfo","label":"bornholm.info","type":"url","required":false,"helpText":"Linket til stedets side på bornholm.info, hvis det har en","options":[]}'::jsonb)
),
social (position, field) as (
  values
    (-2, '{"key":"facebook","label":"Facebook","type":"url","required":false,"helpText":"","options":[]}'::jsonb),
    (-1, '{"key":"instagram","label":"Instagram","type":"url","required":false,"helpText":"","options":[]}'::jsonb)
),
additions as (
  -- Facebook and Instagram on every layer with a website - except nature areas.
  select l.id, s.position, s.field
  from layers l
  cross join social s
  where l.slug <> 'nature-areas'
    and exists (select 1 from jsonb_array_elements(l.fields) f where f->>'key' = 'website')
  union all
  select l.id, w.position, w.field
  from layers l
  join wanted w on w.slug = l.slug
  where not w.danish_only
     or exists (
       select 1 from jsonb_array_elements(l.fields) f
       where f->>'key' = 'website' and f->>'label' = 'Hjemmeside'
     )
),
missing as (
  select a.id, a.position, a.field
  from additions a
  join layers l on l.id = a.id
  where not exists (
    select 1 from jsonb_array_elements(l.fields) f where f->>'key' = a.field->>'key'
  )
)
update layers l
set fields = l.fields || (
  select jsonb_agg(m.field order by m.position) from missing m where m.id = l.id
)
where l.id in (select id from missing);
