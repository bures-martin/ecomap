-- Opening hours get their own field type: a weekly timetable to fill in and a
-- "open now" view, stored as OpenStreetMap opening_hours text. Existing text
-- fields called openingHours become that type; their values stay as they are,
-- and any the timetable cannot read are still shown as written.

update layers
set fields = (
  select jsonb_agg(
    case
      when field->>'key' = 'openingHours' and field->>'type' = 'text'
        then jsonb_set(field, '{type}', '"openingHours"')
      else field
    end
    order by position
  )
  from jsonb_array_elements(fields) with ordinality as item(field, position)
)
where exists (
  select 1 from jsonb_array_elements(fields) as field
  where field->>'key' = 'openingHours' and field->>'type' = 'text'
);
