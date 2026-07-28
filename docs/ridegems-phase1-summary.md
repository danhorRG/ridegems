# RideGems — Phase 1 Summary (Static map & filters)

Completed: July 28, 2026

## Goal of Phase 1
Interactive map with a handful of real sample routes, filters working, mobile-first.

✅ **Phase 1 is complete.**

---

## What got built
- Map showing **3 real cycling routes**, parsed from real GPX files (not made-up data)
  - Distance and elevation gain calculated automatically from the GPX data
  - Sample stats: ~34.9 km/144 m gain, ~39.5 km/521 m gain, ~107.5 km/1010 m gain
  - Spread across easy/moderate/hard difficulty and paved/gravel/mixed surface
- **Sidebar + map layout**: 320px sidebar with route list + filters, map fills the rest
  - On mobile, sidebar becomes a collapsible bottom sheet ("RideGems · N/3 routes")
- **Filters** working: difficulty, distance, elevation, surface — filters the visible routes
- Clicking a route card flies the map to it and highlights the line; clicking a line does the same in reverse
- **Visual design applied**: "Waymark" reference palette adopted —
  - Forest green/charcoal base (`#16231C`, `#223328`), parchment/cream cards (`#E9E4D4`), amber accent (`#E8A33D`), moss green (`#6B8F71`) and rust (`#C1542C`) for stats/badges
  - Oswald (condensed uppercase) for headings/logo, IBM Plex Mono for distance/elevation stats
  - This palette is now the project's design direction going forward — reuse in later phases

## The big debugging saga: blank map issue
For context, since this ate a large chunk of the session and the lesson is worth remembering:

**Symptom:** map area rendered as a blank box — zoom controls and filters showed, but no actual map tiles appeared, with no clear browser errors at first.

**What we ruled out, in order:**
1. Missing MapTiler API key in Vercel → added it (real fix needed, but not the root cause)
2. Broken JS module loading (`non-JavaScript MIME type` error) → real bug, fixed by Claude Code (worker script resolution issue)
3. Container height collapsing to 0px → real bug, fixed (canvas went from 1661×0 to 1661×1289)
4. Terrain tiles failing to load (`terrain-rgb` requests) → switched map style to avoid needing them
5. Tile requests silently never firing at all, even though style/sprite metadata loaded fine — no console errors

**Root cause:** a known, documented compatibility issue between **MapLibre GL JS** (the mapping library) and **Turbopack** (the bundler Next.js 16 uses by default). Turbopack doesn't correctly handle MapLibre's web worker pipeline, so tiles silently never render — confirmed by an identical bug report on Next.js's own GitHub issues.

**Fix:** switched mapping libraries entirely, from **MapLibre GL** to **Leaflet** (+ react-leaflet), using MapTiler's raster tile endpoint instead of vector tiles. Leaflet doesn't have this Turbopack issue. All existing functionality (routes, filters, sidebar, mobile behavior, styling) was preserved in the switch.

**Lesson for later phases:** if something seems to be silently failing with no clear error despite everything *looking* correct, it's worth asking whether the tool/library itself has a known compatibility gap with our specific stack — rather than continuing to debug our own code indefinitely. Searching for the exact symptom + tool names (e.g. "MapLibre Turbopack blank map") surfaced the real cause quickly once we tried it.

## Useful debugging skills picked up today
- Opening browser DevTools (F12), and navigating Console / Network / Elements tabs
- Checking an element's **computed size** (width/height) to diagnose "invisible" UI elements
- Reading the Network tab to distinguish between requests that fail with a status code vs. requests that never complete at all (often a sign of the request being cancelled/aborted rather than rejected)
- Recognizing when repeated fixes aren't converging, and it's time to step back and reconsider the approach rather than keep pushing on the same path

## What's next: Phase 2 — Real database
- Move routes into Supabase (the account was already created in Phase 0)
- Build the route detail page: elevation profile chart, stats, photos, POIs
- Map reads live data from Supabase instead of hardcoded/GPX-file samples
