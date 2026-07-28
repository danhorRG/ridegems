-- RideGems Phase 3: route submissions.
-- Run this once in the Supabase SQL Editor, same way as the previous scripts.

alter table routes add column if not exists status text not null default 'pending'
  check (status in ('pending', 'published'));

alter table routes add column if not exists description text;

-- The 3 seeded sample routes should stay publicly visible (running this
-- again is harmless -- it only ever affects these known slugs).
update routes set status = 'published'
  where slug in ('javornik-z-limbachu', 'karpaty', 'nojzidl');

-- Public can read published routes only -- pending submissions stay
-- invisible until manually approved (flip status to 'published' in the
-- Table Editor). Replaces the old "everything is public" policy.
drop policy if exists "Public read access" on routes;
create policy "Public read published routes" on routes for select using (status = 'published');

-- Public can submit new routes, but only ever as 'pending' -- nothing a
-- submitter sends can appear live without manual approval.
create policy "Public submit pending routes" on routes for insert with check (status = 'pending');

-- Photos attached to a submission need to be insertable too. Deliberately
-- permissive at this early, low-traffic stage (same tradeoff as the routes
-- insert policy above) -- revisit alongside real accounts in Phase 4.
create policy "Public insert route photos" on route_photos for insert with check (true);

-- Allow public uploads into the route-photos storage bucket (same
-- reasoning as above -- the bucket is already public-read).
create policy "Public upload route photos" on storage.objects for insert
  with check (bucket_id = 'route-photos');
