-- RideGems Phase 4 (deferred items): gate submission behind login, and
-- support self-serve editing of a user's own routes.
-- Run this once in the Supabase SQL Editor, same way as the previous scripts.

-- Submitting now requires a signed-in account (previously any anon
-- request could insert a pending route).
drop policy if exists "Public submit pending routes" on routes;
create policy "Signed-in users can submit pending routes" on routes
  for insert with check (status = 'pending' and auth.uid() is not null);

-- Owners can see and edit their own routes regardless of status (pending,
-- published, whatever) -- this is additive to the existing "published only"
-- public read policy, not a replacement (RLS policies are OR'd together).
create policy "Owners can read their own routes" on routes
  for select using (auth.uid() = created_by);

create policy "Owners can update their own routes" on routes
  for update using (auth.uid() = created_by) with check (auth.uid() = created_by);

-- Photos can now only be attached to a route you own (covers both initial
-- submission and later edits) -- replaces the old "anyone can insert" rule.
drop policy if exists "Public insert route photos" on route_photos;
create policy "Users can add photos to their own routes" on route_photos
  for insert with check (
    exists (
      select 1 from routes
      where routes.id = route_photos.route_id
        and routes.created_by = auth.uid()
    )
  );

create policy "Users can remove photos from their own routes" on route_photos
  for delete using (
    exists (
      select 1 from routes
      where routes.id = route_photos.route_id
        and routes.created_by = auth.uid()
    )
  );

-- Storage uploads (the actual photo binary) now require being signed in,
-- rather than being fully open.
drop policy if exists "Public upload route photos" on storage.objects;
create policy "Signed-in users can upload route photos" on storage.objects
  for insert with check (bucket_id = 'route-photos' and auth.uid() is not null);
