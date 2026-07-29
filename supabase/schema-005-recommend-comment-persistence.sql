-- RideGems Phase 4: real (persisting) recommendations and comments.
-- Requires a signed-in account for both actions -- reading routes/comments
-- stays fully public, only writing these two things now requires login.
-- Run this once in the Supabase SQL Editor, same way as the previous scripts.

create table if not exists route_recommendations (
  id uuid primary key default gen_random_uuid(),
  route_id uuid not null references routes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (route_id, user_id)
);

alter table route_recommendations enable row level security;

create policy "Users can read their own recommendations" on route_recommendations
  for select using (auth.uid() = user_id);

create policy "Users can add their own recommendation" on route_recommendations
  for insert with check (auth.uid() = user_id);

create policy "Users can remove their own recommendation" on route_recommendations
  for delete using (auth.uid() = user_id);

-- Keeps routes.recommendation_count in sync automatically so the app
-- never has to trust a client-supplied count. security definer so it can
-- update `routes` regardless of the calling user's own permissions there.
create or replace function ridegems_sync_recommendation_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if TG_OP = 'INSERT' then
    update routes set recommendation_count = recommendation_count + 1 where id = new.route_id;
    return new;
  elsif TG_OP = 'DELETE' then
    update routes set recommendation_count = greatest(recommendation_count - 1, 0) where id = old.route_id;
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists route_recommendations_sync_count on route_recommendations;
create trigger route_recommendations_sync_count
after insert or delete on route_recommendations
for each row execute function ridegems_sync_recommendation_count();

-- Real trip-report comments now carry the author's account (seeded
-- fictional comments from Phase 2 keep user_id null -- that's fine, they
-- stay display-only and were never editable anyway).
alter table route_comments add column if not exists user_id uuid references auth.users(id);

create policy "Users can add their own comments" on route_comments
  for insert with check (auth.uid() = user_id);
