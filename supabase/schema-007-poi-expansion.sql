-- RideGems Phase 5: let route owners add points of interest (cafes,
-- viewpoints, water refills, bike shops, cultural stops, etc.) with an
-- optional link, editable from the route edit page.
-- Run this once in the Supabase SQL Editor, same way as the previous scripts.

alter table route_pois add column if not exists url text;

alter table route_pois drop constraint if exists route_pois_category_check;
alter table route_pois add constraint route_pois_category_check
  check (category in ('viewpoint', 'water', 'cafe', 'food', 'cultural', 'bike_shop', 'hazard', 'other'));

-- POIs can only be attached to or removed from a route you own -- same
-- ownership pattern as route_photos in schema-006. No update policy: edits
-- go through the app as a delete + insert, same as photos.
create policy "Users can add POIs to their own routes" on route_pois
  for insert with check (
    exists (
      select 1 from routes
      where routes.id = route_pois.route_id
        and routes.created_by = auth.uid()
    )
  );

create policy "Users can remove POIs from their own routes" on route_pois
  for delete using (
    exists (
      select 1 from routes
      where routes.id = route_pois.route_id
        and routes.created_by = auth.uid()
    )
  );
