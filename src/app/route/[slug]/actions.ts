"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

export interface ToggleRecommendResult {
  ok: boolean;
  message?: string;
}

async function getPublishedRouteId(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  slug: string
) {
  const { data } = await supabase
    .from("routes")
    .select("id")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  return data?.id as string | undefined;
}

export async function toggleRecommendAction(
  slug: string,
  recommend: boolean
): Promise<ToggleRecommendResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, message: "Sign in required." };
  }

  const routeId = await getPublishedRouteId(supabase, slug);
  if (!routeId) {
    return { ok: false, message: "Route not found." };
  }

  if (recommend) {
    const { error } = await supabase
      .from("route_recommendations")
      .insert({ route_id: routeId, user_id: user.id });
    // 23505 = already recommended (unique constraint) -- treat as success.
    if (error && error.code !== "23505") {
      return { ok: false, message: error.message };
    }
  } else {
    const { error } = await supabase
      .from("route_recommendations")
      .delete()
      .eq("route_id", routeId)
      .eq("user_id", user.id);
    if (error) {
      return { ok: false, message: error.message };
    }
  }

  revalidatePath(`/route/${slug}`);
  return { ok: true };
}

export interface CommentFormState {
  status: "idle" | "error";
  message?: string;
}

export async function addCommentAction(
  _prevState: CommentFormState,
  formData: FormData
): Promise<CommentFormState> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { status: "error", message: "Sign in required to leave a trip report." };
  }

  const slug = String(formData.get("slug") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  if (!body) {
    return { status: "error", message: "Write something before submitting." };
  }
  if (body.length > 280) {
    return { status: "error", message: "Keep it under 280 characters." };
  }

  const routeId = await getPublishedRouteId(supabase, slug);
  if (!routeId) {
    return { status: "error", message: "Route not found." };
  }

  // Never store the account's login email as the public comment author --
  // route_comments is publicly readable with no auth required (see
  // supabase/schema-003-recommendations-comments.sql), so an email here
  // would be scraped by anyone. Use the display name collected at signup
  // instead; a DB trigger (schema-012) re-derives this server-side too, so
  // a future regression here can't leak it again.
  const displayName =
    typeof user.user_metadata?.full_name === "string" && user.user_metadata.full_name.trim()
      ? user.user_metadata.full_name.trim()
      : "Rider";

  const { error } = await supabase.from("route_comments").insert({
    route_id: routeId,
    user_id: user.id,
    author_name: displayName,
    body,
  });
  if (error) {
    return { status: "error", message: error.message };
  }

  revalidatePath(`/route/${slug}`);
  return { status: "idle" };
}
