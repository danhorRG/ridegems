import AppShell from "@/components/AppShell";
import { getRoutes } from "@/lib/routes";

export const dynamic = "force-static";

export default function Home() {
  const routes = getRoutes();
  return <AppShell routes={routes} />;
}
