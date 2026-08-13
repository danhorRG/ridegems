import { randomUUID } from "crypto";
import { createSupabaseServerClient } from "./supabaseServer";
import type { Difficulty, RideType, Surface } from "@/types/route";
import type { ElevationProfilePoint, LngLatBounds, TrackPoint } from "./geo";

const DIFFICULTIES: Difficulty[] = ["easy", "moderate", "hard"];
const SURFACES: Surface[] = ["paved", "gravel", "mtb"];
const RIDE_TYPES: RideType[] = ["sportive", "family"];

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
  rideType: string;
  whyRecommended: string;
  distanceKm: number;
  elevationGainM: number;
  elevationLossM: number;
  minElevationM: number;
  maxElevationM: number;
  coordinates: [number, number][];
  profile: ElevationProfilePoint[];
  bounds: LngLatBounds;
  track: TrackPoint[];
  photos: { url: string; caption: string | null }[];
}

export type SubmitRouteResult = { ok: true; name: string } | { ok: false; message: string };

/**
 * The GPX file itself is parsed client-side (see submit/SubmitForm.tsx) —
 * this function only ever receives the small computed result (stats,
 * simplified line, elevation profile), which stays well under Vercel's
 * request body limit regardless of how large the original GPX file was.
 * Photos are likewise uploaded directly from the browser to Supabase
 * Storage; only their resulting URLs arrive here.
 *
 * Requires a signed-in account (submission used to be anonymous; gated
 * behind login so every route has an attributed owner who can edit it
 * later, and so the RLS insert policy can require auth.uid() is not null).
 *
 * Inserted with status='published' via the session-aware server client —
 * the RLS insert policy on `routes` only ever permits status='published'
 * rows from a signed-in user, so submissions go live immediately rather
 * than sitting in a manual moderation queue.
 *
 * The row's id is generated here rather than read back from the insert
 * response to sidestep a Postgres RLS gotcha with INSERT...RETURNING
 * (see ridegems_elevation_data / earlier commits for the full story).
 */
export async function submitRoute(input: SubmitRouteInput): Promise<SubmitRouteResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, message: "Sign in required to submit a route." };
  }

  const name = input.name.trim();
  const description = input.description.trim();
  const whyRecommended = input.whyRecommended.trim();

  if (!name) return { ok: false, message: "Route name is required." };
  if (!description) return { ok: false, message: "Description is required." };
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
  if (!RIDE_TYPES.includes(input.rideType as RideType)) {
    return { ok: false, message: "Choose a valid ride type." };
  }
  if (!Array.isArray(input.coordinates) || input.coordinates.length < 2 || input.distanceKm <= 0) {
    return { ok: false, message: "That GPX file doesn't have enough track points to plot a route." };
  }
  if (input.photos.some((p) => (p.caption?.length ?? 0) > 90)) {
    return { ok: false, message: "Photo captions must be 90 characters or fewer." };
  }

  const baseSlug = slugify(name) || "route";
  const id = randomUUID();
  let insertedId: string | null = null;

  for (let attempt = 0; attempt < 5; attempt++) {
    const slug = attempt === 0 ? baseSlug : `${baseSlug}-${attempt + 1}`;
    const { error } = await supabase.from("routes").insert({
      id,
      slug,
      name,
      difficulty: input.difficulty,
      surface: input.surface,
      ride_type: input.rideType,
      distance_km: Math.round(input.distanceKm * 10) / 10,
      elevation_gain_m: input.elevationGainM,
      elevation_loss_m: input.elevationLossM,
      min_elevation_m: input.minElevationM,
      max_elevation_m: input.maxElevationM,
      coordinates: input.coordinates,
      profile: input.profile,
      bounds: input.bounds,
      description: description || null,
      why_recommended: whyRecommended,
      highlights: [],
      track_points: input.track,
      recommendation_count: 0,
      status: "published",
      created_by: user.id,
    });

    if (!error) {
      insertedId = id;
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

  if (input.photos.length > 0) {
    await supabase.from("route_photos").insert(
      input.photos.map((photo, i) => ({
        route_id: insertedId,
        url: photo.url,
        caption: photo.caption,
        sort_order: i,
      }))
    );
  }

  return { ok: true, name };
}
