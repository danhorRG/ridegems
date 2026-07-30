-- RideGems: add a "climb" POI category for marking notable ascents/gradients,
-- and rename the "mixed" surface value to "mtb" so route pages and cards
-- render the real "MTB" text (not just a display-side label) -- this matters
-- for SEO since routes.surface is rendered directly as page copy.
-- Run this once in the Supabase SQL Editor, same way as the previous scripts.

alter table route_pois drop constraint if exists route_pois_category_check;
alter table route_pois add constraint route_pois_category_check
  check (category in ('viewpoint', 'water', 'cafe', 'food', 'cultural', 'bike_shop', 'climb', 'hazard', 'other'));

alter table routes drop constraint if exists routes_surface_check;

update routes set surface = 'mtb' where surface = 'mixed';

alter table routes add constraint routes_surface_check
  check (surface in ('paved', 'gravel', 'mtb'));
