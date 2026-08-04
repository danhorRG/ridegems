"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { isAdminUser } from "@/lib/admin";
import type { Difficulty, PoiCategory, Surface } from "@/types/route";
import type { ElevationProfilePoint, LngLatBounds, TrackPoint } from "@/lib/geo";
import { POI_CATEGORIES } from "@/lib/poi";

const DIFFICULTIES: Difficulty[] = ["easy", "moderate", "hard"];
const SURFACES: Surface[] = ["paved", "gravel", "mtb"];

interface NewPoiInput {
  name: string;
  description: string | null;
  category: string;
  lat: number;
  lon: number;
  url: string | null;
}

interface NewPhotoInput {
  url: string;
  caption: string | null;
}

function parseNewPhotos(raw: string): { photos: NewPhotoInput[] } | { error: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { error: "Invalid photo data." };
  }
  if (!Array.isArray(parsed)) return { error: "Invalid photo data." };

  const photos: NewPhotoInput[] = [];
  for (const item of parsed) {
    if (typeof item !== "object" || item === null) return { error: "Invalid photo data." };
    const { url, caption } = item as Record<string, unknown>;
    if (typeof url !== "string" || !url.trim()) return { error: "Invalid photo data." };
    if (caption !== null && typeof caption === "string" && caption.length > 90) {
      return { error: "Photo captions must be 90 characters or fewer." };
    }
    photos.push({
      url,
      caption: typeof caption === "string" && caption.trim() ? caption.trim() : null,
    });
  }
  return { photos };
}

function parsePhotoOrder(raw: string): { order: string[] } | { error: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { error: "Invalid photo order data." };
  }
  if (!Array.isArray(parsed) || !parsed.every((id) => typeof id === "string" && id.trim())) {
    return { error: "Invalid photo order data." };
  }
  return { order: parsed as string[] };
}

interface PhotoCaptionInput {
  id: string;
  caption: string | null;
}

function parsePhotoCaptions(raw: string): { captions: PhotoCaptionInput[] } | { error: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { error: "Invalid photo caption data." };
  }
  if (!Array.isArray(parsed)) return { error: "Invalid photo caption data." };

  const captions: PhotoCaptionInput[] = [];
  for (const item of parsed) {
    if (typeof item !== "object" || item === null) return { error: "Invalid photo caption data." };
    const { id, caption } = item as Record<string, unknown>;
    if (typeof id !== "string" || !id.trim()) return { error: "Invalid photo caption data." };
    if (caption !== null && typeof caption === "string" && caption.length > 90) {
      return { error: "Photo captions must be 90 characters or fewer." };
    }
    captions.push({
      id,
      caption: typeof caption === "string" && caption.trim() ? caption.trim() : null,
    });
  }
  return { captions };
}

function parseNewPois(raw: string): { pois: NewPoiInput[] } | { error: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { error: "Invalid point of interest data." };
  }
  if (!Array.isArray(parsed)) return { error: "Invalid point of interest data." };

  const pois: NewPoiInput[] = [];
  for (const item of parsed) {
    if (typeof item !== "object" || item === null) return { error: "Invalid point of interest data." };
    const { name, description, category, lat, lon, url } = item as Record<string, unknown>;
    if (typeof name !== "string" || !name.trim() || name.length > 120) {
      return { error: "Each point of interest needs a name (120 characters or fewer)." };
    }
    if (typeof category !== "string" || !POI_CATEGORIES.includes(category as PoiCategory)) {
      return { error: "Choose a valid category for each point of interest." };
    }
    if (typeof lat !== "number" || !Number.isFinite(lat) || typeof lon !== "number" || !Number.isFinite(lon)) {
      return { error: "Invalid point of interest location." };
    }
    if (description !== null && typeof description === "string" && description.length > 500) {
      return { error: "Point of interest descriptions must be 500 characters or fewer." };
    }
    if (url !== null && typeof url === "string" && url.trim()) {
      try {
        new URL(url);
      } catch {
        return { error: "Point of interest links must be valid URLs." };
      }
    }
    pois.push({
      name: name.trim(),
      description: typeof description === "string" && description.trim() ? description.trim() : null,
      category,
      lat,
      lon,
      url: typeof url === "string" && url.trim() ? url.trim() : null,
    });
  }
  return { pois };
}

export interface EditFormState {
  status: "idle" | "error" | "success";
  message?: string;
}

interface GpxReplacement {
  distanceKm: number;
  elevationGainM: number;
  elevationLossM: number;
  minElevationM: number;
  maxElevationM: number;
  coordinates: [number, number][];
  profile: ElevationProfilePoint[];
  bounds: LngLatBounds;
  track: TrackPoint[];
}

/**
 * The replacement GPX is parsed client-side (same as submit/SubmitForm.tsx)
 * -- this only ever receives the small computed result, not the raw file.
 * Returns undefined (not an error) when no replacement was uploaded, so the
 * rest of the update proceeds without touching the track columns.
 */
function parseGpxReplacement(raw: string): { gpx: GpxReplacement | undefined } | { error: string } {
  if (!raw) return { gpx: undefined };

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { error: "Invalid GPX replacement data." };
  }
  if (typeof parsed !== "object" || parsed === null) return { error: "Invalid GPX replacement data." };
  const { distanceKm, elevationGainM, elevationLossM, minElevationM, maxElevationM, coordinates, profile, bounds, track } =
    parsed as Record<string, unknown>;

  if (
    typeof distanceKm !== "number" ||
    typeof elevationGainM !== "number" ||
    typeof elevationLossM !== "number" ||
    typeof minElevationM !== "number" ||
    typeof maxElevationM !== "number"
  ) {
    return { error: "Invalid GPX replacement stats." };
  }
  if (!Array.isArray(coordinates) || coordinates.length < 2 || distanceKm <= 0) {
    return { error: "That GPX file doesn't have enough track points to plot a route." };
  }
  if (!Array.isArray(profile) || !Array.isArray(bounds) || !Array.isArray(track)) {
    return { error: "Invalid GPX replacement data." };
  }

  return {
    gpx: {
      distanceKm,
      elevationGainM,
      elevationLossM,
      minElevationM,
      maxElevationM,
      coordinates: coordinates as [number, number][],
      profile: profile as ElevationProfilePoint[],
      bounds: bounds as LngLatBounds,
      track: track as TrackPoint[],
    },
  };
}

export async function updateRouteAction(
  _prevState: EditFormState,
  formData: FormData
): Promise<EditFormState> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { status: "error", message: "Sign in required." };
  }
  const admin = isAdminUser(user);
  // Admin edits (of routes they don't own) bypass RLS via the service-role
  // client; everyone else keeps using the session-aware client so the
  // "Owners can update their own routes" RLS policy still applies as a
  // second line of defense, same as before.
  const db = admin ? createSupabaseAdminClient() : supabase;

  const slug = String(formData.get("slug") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const difficulty = String(formData.get("difficulty") ?? "");
  const surface = String(formData.get("surface") ?? "");
  const whyRecommended = String(formData.get("whyRecommended") ?? "").trim();
  const removePhotoIds = formData.getAll("removePhotoIds").map(String).filter(Boolean);
  const removePoiIds = formData.getAll("removePoiIds").map(String).filter(Boolean);

  const parsedPhotos = parseNewPhotos(String(formData.get("newPhotos") ?? "[]"));
  if ("error" in parsedPhotos) {
    return { status: "error", message: parsedPhotos.error };
  }
  const newPhotos = parsedPhotos.photos;

  const parsedPhotoCaptions = parsePhotoCaptions(String(formData.get("photoCaptions") ?? "[]"));
  if ("error" in parsedPhotoCaptions) {
    return { status: "error", message: parsedPhotoCaptions.error };
  }
  const photoCaptions = parsedPhotoCaptions.captions;

  const parsedPhotoOrder = parsePhotoOrder(String(formData.get("photoOrder") ?? "[]"));
  if ("error" in parsedPhotoOrder) {
    return { status: "error", message: parsedPhotoOrder.error };
  }
  const photoOrder = parsedPhotoOrder.order;

  const parsedPois = parseNewPois(String(formData.get("newPois") ?? "[]"));
  if ("error" in parsedPois) {
    return { status: "error", message: parsedPois.error };
  }
  const newPois = parsedPois.pois;

  const parsedGpx = parseGpxReplacement(String(formData.get("gpxReplacement") ?? ""));
  if ("error" in parsedGpx) {
    return { status: "error", message: parsedGpx.error };
  }
  const gpx = parsedGpx.gpx;

  if (!name) return { status: "error", message: "Route name is required." };
  if (!description) return { status: "error", message: "Description is required." };
  if (!whyRecommended) {
    return { status: "error", message: 'The "why does this route deserve a spot?" field is required.' };
  }
  if (whyRecommended.length > 200) {
    return { status: "error", message: 'The "why does this route deserve a spot?" field must be 200 characters or fewer.' };
  }
  if (!DIFFICULTIES.includes(difficulty as Difficulty)) {
    return { status: "error", message: "Choose a valid difficulty." };
  }
  if (!SURFACES.includes(surface as Surface)) {
    return { status: "error", message: "Choose a valid surface." };
  }

  // Ownership check happens twice on purpose (for non-admins): the RLS
  // update policy (auth.uid() = created_by) enforces it at the database
  // level regardless, but checking here too lets us return a clear error
  // instead of a silent no-op update. Admins skip the ownership check --
  // that's the whole point of using the service-role client above.
  const { data: route, error: fetchError } = await db
    .from("routes")
    .select("id,created_by")
    .eq("slug", slug)
    .maybeSingle();
  if (fetchError || !route) {
    return { status: "error", message: "Route not found." };
  }
  if (!admin && route.created_by !== user.id) {
    return { status: "error", message: "You can only edit routes you submitted." };
  }

  const { error: updateError } = await db
    .from("routes")
    .update({
      name,
      description,
      difficulty,
      surface,
      why_recommended: whyRecommended,
      ...(gpx && {
        distance_km: Math.round(gpx.distanceKm * 10) / 10,
        elevation_gain_m: gpx.elevationGainM,
        elevation_loss_m: gpx.elevationLossM,
        min_elevation_m: gpx.minElevationM,
        max_elevation_m: gpx.maxElevationM,
        coordinates: gpx.coordinates,
        profile: gpx.profile,
        bounds: gpx.bounds,
        track_points: gpx.track,
      }),
    })
    .eq("id", route.id);
  if (updateError) {
    return { status: "error", message: updateError.message };
  }

  if (removePhotoIds.length > 0) {
    await db.from("route_photos").delete().in("id", removePhotoIds);
  }

  if (newPhotos.length > 0) {
    const { count } = await db
      .from("route_photos")
      .select("id", { count: "exact", head: true })
      .eq("route_id", route.id);
    await db.from("route_photos").insert(
      newPhotos.map((photo, i) => ({
        route_id: route.id,
        url: photo.url,
        caption: photo.caption,
        sort_order: (count ?? 0) + i,
      }))
    );
  }

  for (const { id, caption } of photoCaptions) {
    await db.from("route_photos").update({ caption }).eq("id", id);
  }

  for (let i = 0; i < photoOrder.length; i++) {
    await db.from("route_photos").update({ sort_order: i }).eq("id", photoOrder[i]);
  }

  if (removePoiIds.length > 0) {
    await db.from("route_pois").delete().in("id", removePoiIds);
  }

  if (newPois.length > 0) {
    await db.from("route_pois").insert(newPois.map((poi) => ({ route_id: route.id, ...poi })));
  }

  revalidatePath(`/route/${slug}`);
  return { status: "success" };
}

export interface DeleteRouteResult {
  status: "error" | "success";
  message?: string;
}

/**
 * Admin-only: permanently removes a route (route_photos/route_pois cascade
 * via their FK `on delete cascade`). Not exposed to regular owners --
 * this repo has no "delete your own route" feature, only moderation.
 */
export async function deleteRouteAction(slug: string): Promise<DeleteRouteResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdminUser(user)) {
    return { status: "error", message: "Not authorized." };
  }

  const { error } = await createSupabaseAdminClient().from("routes").delete().eq("slug", slug);
  if (error) {
    return { status: "error", message: error.message };
  }

  revalidatePath("/");
  return { status: "success" };
}
