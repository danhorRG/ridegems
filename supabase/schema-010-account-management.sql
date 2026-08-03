-- RideGems: user account self-service (profile, password, account deletion).
-- Run this once in the Supabase SQL Editor, same way as the previous scripts.

-- Deleting an auth.users row previously had no explicit FK action here,
-- which defaults to NO ACTION and would block account deletion for anyone
-- who has submitted a route. Routes are shared community content other
-- people rely on, so orphan them (keep the route, drop the ownership link)
-- instead of cascading the delete or blocking it.
alter table routes drop constraint if exists routes_created_by_fkey;
alter table routes add constraint routes_created_by_fkey
  foreign key (created_by) references auth.users(id) on delete set null;
