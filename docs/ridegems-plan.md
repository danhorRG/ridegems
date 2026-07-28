# RideGems — Project Plan

## 1. Concept

A curated library of the *best* cycling routes, recommended by locals who've actually ridden them — not a dump of everyone's Strava commutes. Core value: when you visit a new area, you get the route a local would take you on, plus the local knowledge (traffic patterns, views, coffee stops) that makes it great — and confidence that the info is *current*, not three years stale.

**Differentiator vs Komoot/Bikemap/RideWithGPS:** curation and quality bar, not volume of routes — plus routes that stay trustworthy over time because the community keeps them updated.

## 2. Core Features (MVP scope)

- Interactive map showing all routes, fully usable on mobile phones (not just a desktop feature squeezed onto a small screen — designed to work well one-handed, outdoors, in sunlight)
- Filters: difficulty (easy/medium/hard), distance (short/medium/long), elevation profile (flat/rolling/hilly), surface (road/gravel/MTB)
- **Recommend button + ranking:** users can "recommend" a route they've ridden (one tap, similar to an upvote). Routes are ranked/sorted by recommendation count, so the most-loved local routes naturally rise to the top. This doubles as light gamification — it gives users a reason to come back and engage, not just consume.
- Route detail page: elevation profile chart, map, description, key stats (distance, elevation gain), photos, POIs, comments
- **Rider trip reports (live condition updates):** comments aren't just general chat — users are actively encouraged to leave a brief, honest trip report after riding a route: did you do it, what was good, what wasn't. This naturally surfaces two things at once — (1) genuine social proof ("real people actually ride this, and recently") and (2) current, practical, on-the-ground info that falls out of people describing their ride: "this section is under reconstruction," "not passable, detour via X," "gate now locked, use the gap 200m north," etc. The prompt should invite both — general impressions *and* anything practical worth flagging — rather than framing it narrowly as a hazard-report box, which most riders won't have anything to put in. This is arguably the single biggest edge over route dumps like Komoot/RideWithGPS, where info silently goes stale.
- Route submission: GPX upload + photos + description via a simple form, plus a **mandatory "why does this route deserve to be here?" field** (short, concise — a sentence or two, character-limited) that acts as a quality gate against ordinary/uninteresting trips being dumped into the library
- GPX export: download any route to your device

## 3. Recommended Tech Stack

Since you're not coding by hand, the priority is: tools with generous free tiers, simple web dashboards (not command-line-only), and strong compatibility with Claude Code.

| Layer | Recommendation | Why |
|---|---|---|
| Frontend framework | **Next.js** (React) | The most common stack for AI coding tools; huge amount of training data means Claude Code writes it reliably; deploys trivially to Vercel |
| Styling / responsiveness | **Tailwind CSS**, mobile-first | Tailwind's responsive utilities make "works well on phones" a default habit rather than a bolt-on later — every screen gets built for small viewports first, then scaled up |
| Map rendering | **MapLibre GL JS** + **MapTiler** or **Mapbox** tiles | Open-source map library, handles GPX/GeoJSON overlays and elevation-aware rendering well; touch gestures (pinch-zoom, pan) work out of the box, which matters for mobile use; free tier covers early-stage traffic |
| Database + backend | **Supabase** | Postgres with the **PostGIS** extension (built for geospatial queries — "find routes near this map bounds" is trivial); has a friendly web dashboard so you can see/edit data without writing SQL; includes file storage (for photos/GPX files) and user login, all in one place; also a natural home for recommendation counts and comment timestamps (so "most recommended" and "most recently updated" sorts are simple queries) |
| Hosting | **Vercel** (frontend) | Free tier, connects directly to GitHub, auto-deploys every time Claude Code pushes a change |
| Version control | **GitHub** | Required by Vercel's deploy pipeline; also gives you a safety net (can always roll back) |
| GPX parsing | A JS library (e.g. `gpxparser` or `togeojson`) running in the browser or a small server function | Converts uploaded GPX into map coordinates + elevation profile automatically |

This whole stack has **no cost to start** — Supabase, Vercel, and MapTiler free tiers comfortably cover an early-stage site with a few hundred routes and modest traffic. You'd only start paying once you have real usage, which is a good problem to have.

## 4. Accounts You'll Need to Set Up

Claude Code will write the code, but a few things only you can click through (since they involve email verification / payment info you control):

1. **GitHub** account (free) — where the code lives
2. **Vercel** account (free) — connect it to GitHub for hosting
3. **Supabase** account (free) — database, storage, auth
4. **MapTiler** or **Mapbox** account (free tier) — map tiles, gives you an API key

Claude Code can talk you through each signup step by step when you get there — you don't need to do this now.

## 5. Phased Roadmap

**Phase 0 — Plumbing**
Get Claude Code installed, create empty Next.js project, connect to GitHub, deploy a "hello world" to Vercel. Goal: prove the whole pipeline (edit → push → live site) works before building real features.

**Phase 1 — Static map & filters**
Interactive map with a handful of hand-entered sample routes, built mobile-first from the start. Filter UI (difficulty/distance/elevation/surface) working against this small static set, tested on both a phone-sized and desktop-sized screen.

**Phase 2 — Real database**
Move routes into Supabase. Build the route detail page: elevation profile chart, stats, photos, POIs. Map now reads live data instead of hardcoded samples.
- **Migration task:** write a one-off script to import the existing hardcoded/GPX sample routes into Supabase, so the 3 Phase 1 routes carry over instead of starting from an empty table.
- **Auth (minimal, set up now not in Phase 4):** basic Supabase auth (e.g. email login, no UI polish needed yet) so that every route/submission/comment/recommend created from this point on already has a `user_id` attached. Retrofitting ownership onto existing rows later is much messier than setting this up while the database itself is being built.

**Phase 3 — Submission flow**
GPX upload form: parse the file, auto-calculate distance/elevation/profile, let the user add description, photos, difficulty/surface tags. **Mandatory field: "Why does this route deserve a spot in the library?"** — short, concise, character-limited (e.g. 200 chars) — required before the form can be submitted, so every route arrives with a stated reason for inclusion. Maybe a simple "pending review" state before a route goes public, so quality stays high.

**Phase 4 — Community features**
- GPX export/download button
- Comments on routes, framed as brief **trip reports** — a clear prompt/nudge encouraging people to share whether they rode it, what was good, what wasn't, and any *current, practical* info worth flagging (closures, detours, hazards) — not just generic praise
- Recommend button + recommendation-based ranking on route lists
- User-facing accounts UI (sign up / log in / profile) built on top of the auth set up back in Phase 2 — routes/comments/recommends already have an attributed author (reinforces the "local recommends" feel, and prevents easy fake-recommendation gaming)

**Phase 5 — Polish & launch**
Full mobile responsiveness pass (this has been built in from Phase 1 onward, so this is a final QA/polish step, not a rebuild), basic SEO, seed the library with 20–50 genuinely great routes yourself (or via local cycling contacts) before opening submissions publicly — an empty library helps no one.

## 6. Setting Up the Claude Project

Suggested structure for your Claude Project:

- **Project knowledge:** this document, plus (as it grows) a running "decisions log" — anything you've decided or changed, so future sessions don't relitigate settled questions
- **Custom instructions:** something like — *"Act as my technical co-founder for RideGems. I have no coding background. Translate my feature requests into concrete step-by-step instructions I can hand to Claude Code. Always confirm what phase we're in before jumping ahead. Explain new technical concepts in plain language the first time they come up."*
- **Workflow per session:** you describe what you want in plain language → Claude (in this Project) turns it into a clear task → you paste that into Claude Code (terminal, desktop, or web) → Claude Code implements it → you test in the browser and report back what worked or didn't

## 7. What to Expect as a Non-Coder

Realistically: you'll spend time clicking through dashboards, testing things in a browser (and on your phone), and describing bugs in plain language ("the map is blank" / "the filter doesn't update" / "recommend button doesn't save the count"). Claude Code will handle virtually all the actual code. Progress will feel slower than for an experienced developer at first, mostly because of the back-and-forth of testing and describing results — but the plan above is scoped so each phase produces something visibly working, which keeps momentum.
