# RideGems — Phase 2 Summary (Real database)

Completed: July 28, 2026

## Goal of Phase 2
Move routes into Supabase, build the route detail page: elevation profile, stats, photos, POIs. Map reads live data instead of hardcoded/GPX-file samples.

✅ **Phase 2 is complete** (plus several extras added along the way — see below).

---

## What got built

### Supabase backend
- Supabase project created, schema applied across three SQL scripts in `supabase/`:
  - `schema.sql` — `routes`, `route_photos`, `route_pois` tables, public read via RLS
  - `schema-002-detail-fields.sql` — adds `why_recommended`, `highlights`, `track_points`
  - `schema-003-recommendations-comments.sql` — adds `recommendation_count`, `route_comments` table
- `routes.created_by` column added as groundwork for real accounts (see Auth note below)
- `scripts/migrate-routes.ts` — a re-runnable seed script (`npm run migrate:routes`) that pushes the local sample GPX routes, photos (from `sample-photos/<slug>/`), and placeholder content into Supabase. Safe to run again after adding more photos or tweaking seed content.

### Live data
- The main map/sidebar (`src/lib/routes.ts`) now queries Supabase instead of parsing GPX files on every request, revalidating every 60 seconds
- The original GPX-parsing logic was preserved in `src/lib/sampleGpxRoutes.ts`, used only by the migration script

### Route detail page (`/route/<slug>`)
- Stats grid (distance, elevation gain/loss, surface) and difficulty badge
- **"Why this route made the cut"** — a 200-character-limited quality-gate callout (DB-enforced), matching the mandatory field planned for the Phase 3 submission form
- **Recommend button** with a real seeded count — clicking gives instant visual feedback but doesn't persist (deliberate: an unlimited unauthenticated "like" button is exactly the fake-recommendation problem the plan flags for Phase 4, which needs real accounts to solve properly)
- **Synced map + elevation chart** — hovering either one moves a marker on the other, built from a shared per-route `track` array (lat/lon + distance + elevation) computed once at migration time
- **"About this route"** highlight bullets
- **Photo gallery with lightbox** — click a photo to view it full-size, with close/prev/next via click or keyboard (Escape, arrow keys)
- **Trip reports** — short comments in the style the plan describes (impressions + practical info), sorted newest first
- **Points of interest** — schema and UI are ready, but no real POI data yet (deferred by choice, same as the submission-form question below)

### Bug fixed along the way
Next's built-in image optimizer defaults to `Content-Disposition: attachment` in this Next.js version, which silently blocked photos from rendering inline in `<img>`. Fixed via `contentDispositionType: "inline"` in `next.config.ts`.

### Deployment
- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` added to Vercel's environment variables
- All changes committed and pushed to `main`

---

## What's placeholder/fictional (by design, until later phases)
The following are real rows in Supabase, seeded via `scripts/migrate-routes.ts`, but the *content* is invented — meant to be replaced once the real flows exist:
- "Why recommended" text and highlight bullets (real form: Phase 3 submission)
- Recommendation counts and trip-report comments (real flow: Phase 4 accounts + comments)
- No POI data yet — left empty on purpose until there's a real way to add it

## Auth note
`routes.created_by` exists as groundwork so future submissions/comments/recommends can be attributed to a user without a schema migration later. Supabase's email auth provider has not been explicitly configured yet, and there's no login UI — that's still Phase 4 work.

## What's next: Phase 3 — Submission flow
- GPX upload form: parse the file, auto-calculate distance/elevation/profile
- Description, photos, difficulty/surface tags — all user-chosen, not system-inferred (confirmed during Phase 2: surface especially should never be guessed by the app)
- Mandatory "why does this route deserve a spot?" field, character-limited (schema already supports this via `why_recommended`)
- Possibly a "pending review" state before a route goes public — still need to decide who/how reviews it, given this is a solo-founder project for now
