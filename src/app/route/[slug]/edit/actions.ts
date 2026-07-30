"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import type { Difficulty, PoiCategory, Surface } from "@/types/route";
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

  const slug = String(formData.get("slug") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const difficulty = String(formData.get("difficulty") ?? "");
  const surface = String(formData.get("surface") ?? "");
  const whyRecommended = String(formData.get("whyRecommended") ?? "").trim();
  const newPhotoUrls = formData.getAll("newPhotoUrls").map(String).filter(Boolean);
  const removePhotoIds = formData.getAll("removePhotoIds").map(String).filter(Boolean);
  const removePoiIds = formData.getAll("removePoiIds").map(String).filter(Boolean);

  const parsedPois = parseNewPois(String(formData.get("newPois") ?? "[]"));
  if ("error" in parsedPois) {
    return { status: "error", message: parsedPois.error };
  }
  const newPois = parsedPois.pois;

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

  // Ownership check happens twice on purpose: the RLS update policy
  // (auth.uid() = created_by) enforces it at the database level regardless,
  // but checking here too lets us return a clear error instead of a silent
  // no-op update.
  const { data: route, error: fetchError } = await supabase
    .from("routes")
    .select("id,created_by")
    .eq("slug", slug)
    .maybeSingle();
  if (fetchError || !route) {
    return { status: "error", message: "Route not found." };
  }
  if (route.created_by !== user.id) {
    return { status: "error", message: "You can only edit routes you submitted." };
  }

  const { error: updateError } = await supabase
    .from("routes")
    .update({
      name,
      description,
      difficulty,
      surface,
      why_recommended: whyRecommended,
    })
    .eq("id", route.id);
  if (updateError) {
    return { status: "error", message: updateError.message };
  }

  if (removePhotoIds.length > 0) {
    await supabase.from("route_photos").delete().in("id", removePhotoIds);
  }

  if (newPhotoUrls.length > 0) {
    const { count } = await supabase
      .from("route_photos")
      .select("id", { count: "exact", head: true })
      .eq("route_id", route.id);
    await supabase.from("route_photos").insert(
      newPhotoUrls.map((url, i) => ({
        route_id: route.id,
        url,
        sort_order: (count ?? 0) + i,
      }))
    );
  }

  if (removePoiIds.length > 0) {
    await supabase.from("route_pois").delete().in("id", removePoiIds);
  }

  if (newPois.length > 0) {
    await supabase.from("route_pois").insert(newPois.map((poi) => ({ route_id: route.id, ...poi })));
  }

  revalidatePath(`/route/${slug}`);
  return { status: "success" };
}
