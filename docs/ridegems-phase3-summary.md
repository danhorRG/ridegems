# RideGems — Phase 3 Summary (Submission flow)

Completed: July 29, 2026

## Goal of Phase 3
GPX upload form: parse the file, auto-calculate distance/elevation/profile, let the user add description, photos, difficulty/surface tags. Mandatory field: "why does this route deserve a spot?" (200 chars). Maybe a simple "pending review" state before a route goes public.

✅ **Phase 3 is complete.**

---

## What got built

### Submission form (`/submit`)
- GPX file upload — parsed server-side with the same `gpx.ts`/`geo.ts` logic used everywhere else (distance, elevation gain/loss, elevation profile, map track, bounds all computed automatically)
- Route name, description (optional), difficulty and surface (both user-chosen dropdowns — never inferred by the app, per the earlier decision that the system shouldn't guess these)
- Mandatory "why does this route deserve a spot?" field, hard-limited to 200 characters (DB-enforced via check constraint, plus a live counter in the UI)
- Optional photo upload (multiple)
- A "+ Submit" entry point added to the sidebar (desktop header and mobile panel) so the form is actually reachable, not just a hidden URL

### Pending review
- New `routes.status` column (`pending` / `published`, defaults to `pending`)
- The public site (map list + route detail pages) only ever queries `status = 'published'` — enforced both in application code and at the database level via Row Level Security, so there's no code path that could accidentally leak a pending submission
- **Approval is manual for now**: no admin UI. You approve a submission by opening the `routes` table in Supabase's Table Editor and changing that row's `status` to `published`. Decided against building a review page yet since there's no submission volume to justify it — revisit if that changes.

### How writes work (no new secrets in production)
Submissions insert through the same public (anon) key the site already uses in the browser — not the powerful `service_role` key. This is safe because a Row Level Security policy restricts inserts to `status = 'pending'` only; nothing a submitter sends can ever appear live without the manual approval step above. **No new Vercel environment variables were needed for this phase.**

### A real bug hit and fixed along the way
`.insert(...).select().single()` to read back a new row's ID failed with "new row violates row-level security policy" — because reading the row back is governed by the *SELECT* policy (published-only), not the insert policy, so a freshly-inserted pending row couldn't be read back by the same request. Fixed by generating the route's ID client-side (`crypto.randomUUID()`) instead of relying on the database to hand it back. Worth remembering if a similar RLS error shows up elsewhere: check whether the failing statement includes a read-back (`.select()`) rather than assuming the insert policy itself is wrong.

### Schema
- `supabase/schema-004-submissions.sql` — adds `status`, `description` columns; replaces the old "everyone can read everything" policy with a published-only one; adds insert policies for `routes`, `route_photos`, and the `route-photos` storage bucket

---

## Verified
- Full form submission tested end-to-end (synthetic GPX file, all fields) — row landed correctly in Supabase as `pending`, with correct computed stats, and was confirmed invisible via the public API
- Confirmed the main map still shows only the 3 published sample routes, unaffected by the new RLS policies
- Route detail pages now show the new `description` field
- Test data cleaned up after verification

## What's next: Phase 4 — Community features
- GPX export/download button
- Make the recommend button and trip-report comments actually persist (currently a Phase-2-built visual preview only — see `ridegems-phase2-summary.md`)
- Real user accounts (sign up / log in), so submissions/comments/recommends have an attributed author and can't be trivially spammed — this also unlocks tightening the currently-permissive insert policies from Phase 3
