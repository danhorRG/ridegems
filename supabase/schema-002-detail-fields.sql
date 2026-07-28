-- RideGems: adds the fields needed for the route detail page's "why
-- recommended" callout, highlight bullets, and synced map+elevation hover.
-- Run this once in the Supabase SQL Editor, same way as schema.sql.

alter table routes add column if not exists why_recommended text
  check (char_length(why_recommended) <= 200);

alter table routes add column if not exists highlights jsonb not null default '[]'::jsonb;

alter table routes add column if not exists track_points jsonb;
