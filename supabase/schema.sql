-- RideGems Phase 2 schema. Run this once in the Supabase dashboard's SQL Editor
-- (left sidebar -> SQL Editor -> New query -> paste this whole file -> Run).

create extension if not exists pgcrypto;

create table if not exists routes (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  difficulty text not null check (difficulty in ('easy', 'moderate', 'hard')),
  surface text not null check (surface in ('paved', 'gravel', 'mixed')),
  distance_km numeric not null,
  elevation_gain_m integer not null,
  elevation_loss_m integer not null,
  min_elevation_m integer not null,
  max_elevation_m integer not null,
  coordinates jsonb not null,
  profile jsonb not null,
  bounds jsonb not null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists route_photos (
  id uuid primary key default gen_random_uuid(),
  route_id uuid not null references routes(id) on delete cascade,
  url text not null,
  caption text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists route_pois (
  id uuid primary key default gen_random_uuid(),
  route_id uuid not null references routes(id) on delete cascade,
  name text not null,
  description text,
  category text not null check (category in ('viewpoint', 'water', 'food', 'hazard', 'other')),
  lat double precision not null,
  lon double precision not null,
  created_at timestamptz not null default now()
);

alter table routes enable row level security;
alter table route_photos enable row level security;
alter table route_pois enable row level security;

-- Everyone can read; nothing can be written except via the service_role key
-- (used only by local seed/migration scripts for now). Public submission
-- policies get added in Phase 3.
create policy "Public read access" on routes for select using (true);
create policy "Public read access" on route_photos for select using (true);
create policy "Public read access" on route_pois for select using (true);
