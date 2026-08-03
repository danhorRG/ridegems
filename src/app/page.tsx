import AppShell from "@/components/AppShell";
import { getRoutes } from "@/lib/routes";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

export const revalidate = 60;

export default async function Home() {
  const [routes, supabase] = await Promise.all([getRoutes(), createSupabaseServerClient()]);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userName = user
    ? typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : ""
    : null;

  return <AppShell routes={routes} userName={userName} />;
}
