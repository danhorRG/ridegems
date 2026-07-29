# RideGems — Phase 4 Summary (Community features)

Completed: July 29, 2026

## Goal of Phase 4
GPX export, real user accounts, and making the recommend button/comments from Phase 2's preview actually persist — plus, once accounts existed, two originally-deferred decisions: gating submission behind login, and self-serve route editing.

✅ **Phase 4 is complete**, including both deferred items.

---

## What got built

### User accounts
Email + password sign-in via Supabase Auth (`@supabase/ssr`). Sign up, sign in, sign out, session state shown in the sidebar. Email confirmation is on by default in this Supabase project (a signup shows "check your email" until confirmed).

**Notable gotcha hit and documented:** this Next.js version (16.2.12) renamed `middleware.ts` to `proxy.ts` — Supabase's own official setup guide still references the old name, which would have silently failed session refresh if followed literally. See `ridegems_nextjs16_proxy` memory for the general lesson (always check `node_modules/next/dist/docs` against external framework guides on this project).

### GPX export
Every route detail page has a "Download GPX" button. Regenerates the file from the route's already-stored, terrain-corrected track data rather than re-serving an original upload — works retroactively on all 4 existing routes with no backfill needed, and exports the *corrected* elevation rather than any GPS noise from the original file.

### Real recommend/comment persistence
Both now require a signed-in account:
- **Recommend** writes to a `route_recommendations` join table (unique per user+route). A Postgres trigger keeps `routes.recommendation_count` in sync automatically — the app never trusts a client-supplied count. Toggling on/off works, state persists across page loads.
- **Trip reports** (comments) are attributed to the account's email via a new `route_comments.user_id` column. Appear instantly after posting (no manual refresh) via Next's automatic Server Action re-render.

Logged-out visitors still see everything (reading stays fully public) — only writing these two things now requires an account.

### Submission now requires login
`/submit` redirects to `/login?next=/submit` and back if you're not signed in. `routes.created_by` is now actually set (it existed as unused groundwork since Phase 2). RLS tightened to match: route/photo inserts and storage uploads now require `auth.uid() is not null` instead of being open to any anonymous request.

### Self-serve route editing
New `/route/[slug]/edit` page, reachable via an "Edit this route" link that only the route's owner sees. Editable: name, description, difficulty, surface, why-recommended, and photos (add new, remove existing). **Not editable: the GPX/track data itself** — recorded path, distance, and elevation stay fixed from the original upload (Dan's call, to keep scope contained).

**Moderation policy (Dan's call):** saving an edit reverts the route to `status='pending'` — it disappears from the public map until manually re-approved, same as a fresh submission. This is deliberate: prevents someone getting a route approved and then quietly swapping in different content unnoticed.

**Known minor gap:** because of the pending-on-edit policy, immediately after editing a published route, the route's own detail page 404s for *everyone* including the owner (the public page strictly filters `status='published'`) until you re-approve it. The edit page itself still works fine via direct URL even while pending (it uses an ownership-scoped query, not a status filter) — there's just no visible link back to it from a 404 page. Not fixed this pass; low priority since it only affects the moment right after an edit, and the confirmation screen intentionally links back to the map, not the (about-to-404) route page.

### Security model
Ownership enforced in two independent layers: an explicit check in the page/Server Action (returns a clear error/404), and a Postgres RLS policy (`auth.uid() = created_by`) as defense-in-depth if application code ever has a bug. Verified with a second test account that a non-owner gets 404 on someone else's edit page.

---

## Verified
- Full accounts cycle: sign up → email-confirmation gate → sign in → session persists → sign out (desktop + mobile)
- GPX export round-trips cleanly through the app's own parser
- Recommend/comment persistence checked directly against the database, not just the UI: counts, join-table rows, and comment attribution all confirmed correct, including un-recommend and cross-session state
- Submission → `created_by` attribution → manual approval → edit → re-verification, checked directly against the database at each step
- Ownership enforcement tested adversarially with a second real account (not just "assumed correct")
- All test data (routes, users, comments) cleaned up after each verification

## What's next: Phase 5 — Polish & launch
- Full mobile responsiveness QA pass (built in from Phase 1 onward, so this is verification, not a rebuild)
- Basic SEO
- Seed the library with 20–50 genuinely great routes before opening submissions publicly
- Possible follow-ups noted but not required: tighten the still-fairly-open photo/storage insert policies further once there's real usage to justify it; consider a lightweight admin approval UI if submission volume ever outgrows manually flipping `status` in Supabase's Table Editor
