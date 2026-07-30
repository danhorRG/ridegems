import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { isAdminUser } from "@/lib/admin";
import EditForm from "./EditForm";

export const metadata: Metadata = {
  title: "Edit route",
  robots: { index: false, follow: false },
};

export default async function EditRoutePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/route/${slug}/edit`);
  }

  const admin = isAdminUser(user);

  // No status filter here (unlike the public route page) -- for a regular
  // user the "Owners can read their own routes" RLS policy is what scopes
  // this to routes they actually own, working whether the route is
  // currently pending or published. Admins bypass RLS entirely (via the
  // service-role client) so they can open and moderate any route.
  const { data: route } = await (admin ? createSupabaseAdminClient() : supabase)
    .from("routes")
    .select("id,slug,name,description,difficulty,surface,why_recommended,created_by,track_points")
    .eq("slug", slug)
    .maybeSingle();

  if (!route || (route.created_by !== user.id && !admin)) {
    notFound();
  }

  const [{ data: photos }, { data: pois }] = await Promise.all([
    supabase.from("route_photos").select("id,url,caption").eq("route_id", route.id).order("sort_order"),
    supabase.from("route_pois").select("id,name,description,category,lat,lon,url").eq("route_id", route.id),
  ]);

  return (
    <EditForm
      slug={route.slug}
      name={route.name}
      description={route.description ?? ""}
      difficulty={route.difficulty}
      surface={route.surface}
      whyRecommended={route.why_recommended ?? ""}
      photos={(photos ?? []).map((p) => ({ id: p.id, url: p.url, caption: p.caption }))}
      track={route.track_points ?? []}
      pois={(pois ?? []).map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        category: p.category,
        lat: p.lat,
        lon: p.lon,
        url: p.url,
      }))}
      canDelete={admin}
    />
  );
}
