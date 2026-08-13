-- RideGems: add a "ride_type" attribute distinguishing performance-oriented
-- sportive routes from low-traffic, easy-terrain routes suitable for
-- families with kids. Defaults every existing route to 'sportive' the
-- moment the column is added, so no separate backfill UPDATE is needed.
-- Run this once in the Supabase SQL Editor, same way as the previous scripts.

alter table routes add column ride_type text not null default 'sportive'
  check (ride_type in ('sportive', 'family'));
