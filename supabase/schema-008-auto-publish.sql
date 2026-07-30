-- RideGems: stop requiring manual "pending" -> "published" flips in the
-- Supabase table editor. Signed-in users' submissions and edits now go
-- live immediately.
-- Run this once in the Supabase SQL Editor, same way as the previous scripts.

drop policy if exists "Signed-in users can submit pending routes" on routes;
create policy "Signed-in users can submit routes" on routes
  for insert with check (status = 'published' and auth.uid() is not null);
