"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import type { Difficulty, Surface } from "@/types/route";

const DIFFICULTIES: Difficulty[] = ["easy", "moderate", "hard"];
const SURFACES: Surface[] = ["paved", "gravel", "mixed"];

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
      // Back to pending so an edit gets reviewed before going live again.
      status: "pending",
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

  revalidatePath(`/route/${slug}`);
  return { status: "success" };
}
