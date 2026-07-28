-- RideGems: adds recommendation count and trip-report comments preview.
-- Run this once in the Supabase SQL Editor, same way as the previous scripts.

alter table routes add column if not exists recommendation_count integer not null default 0;

create table if not exists route_comments (
  id uuid primary key default gen_random_uuid(),
  route_id uuid not null references routes(id) on delete cascade,
  author_name text not null,
  body text not null check (char_length(body) <= 280),
  created_at timestamptz not null default now()
);

alter table route_comments enable row level security;

create policy "Public read access" on route_comments for select using (true);
