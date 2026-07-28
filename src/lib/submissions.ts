import { randomUUID } from "crypto";
import { supabase } from "./supabase";
import { parseGpx } from "./gpx";
import { buildTrackPoints, computeTrackStats, simplifyLine, boundsOf } from "./geo";
import type { Difficulty, Surface } from "@/types/route";

const DIFFICULTIES: Difficulty[] = ["easy", "moderate", "hard"];
const SURFACES: Surface[] = ["paved", "gravel", "mixed"];
const PHOTO_CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export interface SubmitRouteInput {
  name: string;
  description: string;
  difficulty: string;
  surface: string;
  whyRecommended: string;
  gpxText: string;
  photos: File[];
}

export type SubmitRouteResult = { ok: true; name: string } | { ok: false; message: string };

/**
 * Inserted with status='pending' via the public (anon-key) client, which is
 * safe because the RLS insert policy on `routes` only ever permits
 * status='pending' rows — nothing a submitter sends can go live without
 * being manually flipped to 'published' in the Supabase table editor.
 *
 * The row's id is generated here rather than read back from the insert
 * response: the anon key's SELECT policy only allows `published` rows, so
 * `.insert().select()` on a pending row fails RLS on the read-back half of
 * the round trip (a well-known Postgres RLS gotcha for INSERT...RETURNING).
 */
export async function submitRoute(input: SubmitRouteInput): Promise<SubmitRouteResult> {
  const name = input.name.trim();
  const description = input.description.trim();
  const whyRecommended = input.whyRecommended.trim();

  if (!name) return { ok: false, message: "Route name is required." };
  if (!whyRecommended) {
    return { ok: false, message: 'The "why does this route deserve a spot?" field is required.' };
  }
  if (whyRecommended.length > 200) {
    return { ok: false, message: 'The "why does this route deserve a spot?" field must be 200 characters or fewer.' };
  }
  if (!DIFFICULTIES.includes(input.difficulty as Difficulty)) {
    return { ok: false, message: "Choose a valid difficulty." };
  }
  if (!SURFACES.includes(input.surface as Surface)) {
    return { ok: false, message: "Choose a valid surface." };
  }
  if (!input.gpxText.trim()) {
    return { ok: false, message: "A GPX file is required." };
  }

  let parsed;
  try {
    parsed = parseGpx(input.gpxText);
  } catch {
    return { ok: false, message: "Could not read that GPX file — make sure it's a valid track export." };
  }
  if (parsed.points.length < 2) {
    return { ok: false, message: "That GPX file doesn't have enough track points to plot a route." };
  }

  const stats = computeTrackStats(parsed.points);
  const fullLine: [number, number][] = parsed.points.map((p) => [p.lon, p.lat]);
  const coordinates = simplifyLine(fullLine, 6);
  const track = buildTrackPoints(parsed.points);
  const bounds = boundsOf(coordinates);

  const baseSlug = slugify(name) || "route";
  const id = randomUUID();
  let insertedId: string | null = null;
  let finalSlug = baseSlug;

  for (let attempt = 0; attempt < 5; attempt++) {
    const slug = attempt === 0 ? baseSlug : `${baseSlug}-${attempt + 1}`;
    const { error } = await supabase.from("routes").insert({
      id,
      slug,
      name,
      difficulty: input.difficulty,
      surface: input.surface,
      distance_km: Math.round(stats.distanceKm * 10) / 10,
      elevation_gain_m: stats.elevationGainM,
      elevation_loss_m: stats.elevationLossM,
      min_elevation_m: stats.minElevationM,
      max_elevation_m: stats.maxElevationM,
      coordinates,
      profile: stats.profile,
      bounds,
      description: description || null,
      why_recommended: whyRecommended,
      highlights: [],
      track_points: track,
      recommendation_count: 0,
      status: "pending",
    });

    if (!error) {
      insertedId = id;
      finalSlug = slug;
      break;
    }
    if (error.code !== "23505") {
      return { ok: false, message: `Could not save the route: ${error.message}` };
    }
    // 23505 = unique violation on slug — retry with the next suffix.
  }

  if (!insertedId) {
    return { ok: false, message: "Could not generate a unique route URL. Try a slightly different name." };
  }

  for (let i = 0; i < input.photos.length; i++) {
    const file = input.photos[i];
    if (file.size === 0) continue;
    const ext = "." + (file.name.split(".").pop() ?? "").toLowerCase();
    const contentType = PHOTO_CONTENT_TYPES[ext];
    if (!contentType) continue;

    const storagePath = `${finalSlug}/${Date.now()}-${i}${ext}`;
    const bytes = new Uint8Array(await file.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from("route-photos")
      .upload(storagePath, bytes, { contentType, upsert: false });
    if (uploadError) continue;

    const { data: publicUrl } = supabase.storage.from("route-photos").getPublicUrl(storagePath);
    await supabase.from("route_photos").insert({
      route_id: insertedId,
      url: publicUrl.publicUrl,
      sort_order: i,
    });
  }

  return { ok: true, name };
}
