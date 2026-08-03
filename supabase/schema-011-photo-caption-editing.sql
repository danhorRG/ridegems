-- Adds owner-editable photo captions. Route photos already have a
-- `caption` column (schema.sql) but no update policy existed for it --
-- edits previously only ever went through delete + insert. This adds the
-- missing update policy plus a length guard matching the app's 90-char
-- limit.

create policy "Users can update captions on their own routes" on route_photos
  for update using (
    exists (
      select 1 from routes
      where routes.id = route_photos.route_id
        and routes.created_by = auth.uid()
    )
  ) with check (
    exists (
      select 1 from routes
      where routes.id = route_photos.route_id
        and routes.created_by = auth.uid()
    )
  );

alter table route_photos add constraint route_photos_caption_length check (char_length(caption) <= 90);
