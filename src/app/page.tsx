import AppShell from "@/components/AppShell";
import { getRoutes } from "@/lib/routes";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

export const revalidate = 60;

export default async function Home() {
  const [routes, supabase] = await Promise.all([getRoutes(), createSupabaseServerClient()]);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return <AppShell routes={routes} userEmail={user?.email ?? null} />;
}
