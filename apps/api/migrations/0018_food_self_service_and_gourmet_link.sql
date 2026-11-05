-- Two fields for the Bornholm local-food layers, so members can fill them in:
--   * "Selvbetjening" (self-service: take it and pay yourself, e.g. a roadside
--     stall with a cash box or MobilePay), placed right after "Betaling";
--   * "Gourmet Bornholm", a link to the place's member page on
--     gourmetbornholm.dk, placed right after "Hjemmeside" - it shows as one
--     more button under "Find dem online".
--
-- The seed only creates layers that are missing, so this adds the same fields
-- to the layers a database already has: once, only on the four food layers
-- (told apart from other communities by their Danish "Hjemmeside" label), and
-- only where the layer does not have the key yet. A layer without "Betaling"
-- or "Hjemmeside" gets the field at the end.

with food_layers as (
  select l.id, l.fields
  from layers l
  where l.slug in ('from-the-farm', 'fish-and-smokehouses', 'local-drinks', 'sweets-and-ice-cream')
    and exists (
      select 1 from jsonb_array_elements(l.fields) f
      where f->>'key' = 'website' and f->>'label' = 'Hjemmeside'
    )
),
additions (after_key, field) as (
  values
    ('payment', '{"key":"selfService","label":"Selvbetjening","type":"boolean","required":false,"helpText":"Man tager selv og betaler selv - fx en vejbod med kasse eller MobilePay","options":[]}'::jsonb),
    ('website', '{"key":"gourmetBornholm","label":"Gourmet Bornholm","type":"url","required":false,"helpText":"Hvis stedet er medlem af Gourmet Bornholm: linket til dets side på gourmetbornholm.dk","options":[]}'::jsonb)
),
rebuilt as (
  select fl.id, jsonb_agg(item.field order by item.position, item.after) as fields
  from food_layers fl
  cross join lateral (
    -- The fields the layer has, in their order...
    select f.field, f.position, 0 as after
    from jsonb_array_elements(fl.fields) with ordinality as f(field, position)
    union all
    -- ...plus each new field, right after its neighbour (or at the end).
    select a.field,
           coalesce(
             (select f.position
              from jsonb_array_elements(fl.fields) with ordinality as f(field, position)
              where f.field->>'key' = a.after_key),
             jsonb_array_length(fl.fields) + 1
           ),
           1
    from additions a
    where not exists (
      select 1 from jsonb_array_elements(fl.fields) f where f->>'key' = a.field->>'key'
    )
  ) as item
  group by fl.id
)
update layers l
set fields = r.fields
from rebuilt r
where l.id = r.id and l.fields is distinct from r.fields;
