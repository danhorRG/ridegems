-- RideGems: route_comments.author_name was previously set to the
-- commenter's login email (see the old addCommentAction) and that table is
-- publicly readable with no auth required -- so every commenter's email
-- was scrapeable by anyone. Run this once in the Supabase SQL Editor, same
-- way as the previous scripts.

-- Server-side guarantee: derive author_name from the account's display
-- name (raw_user_meta_data.full_name) whenever a comment carries a
-- user_id, regardless of what the app sends. This means a future app-code
-- regression (accidentally passing user.email again) can't leak an email
-- through this column -- the trigger overwrites it before the row is
-- written. security definer is required to read auth.users here.
create or replace function ridegems_set_comment_author_name()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta_name text;
begin
  if new.user_id is not null then
    select raw_user_meta_data ->> 'full_name' into meta_name
    from auth.users where id = new.user_id;
    new.author_name := coalesce(nullif(trim(meta_name), ''), 'Rider');
  end if;
  return new;
end;
$$;

drop trigger if exists route_comments_set_author_name on route_comments;
create trigger route_comments_set_author_name
before insert on route_comments
for each row execute function ridegems_set_comment_author_name();

-- Backfill: replace any already-leaked email-shaped author_name with the
-- account's current display name (or "Rider" for rows with no user_id --
-- the seeded fictional Phase 2 comments).
update route_comments c
set author_name = coalesce(nullif(trim(u.raw_user_meta_data ->> 'full_name'), ''), 'Rider')
from auth.users u
where c.user_id = u.id
  and c.author_name like '%@%';

update route_comments
set author_name = 'Rider'
where user_id is null
  and author_name like '%@%';
