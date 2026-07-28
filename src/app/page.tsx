import AppShell from "@/components/AppShell";
import { getRoutes } from "@/lib/routes";

export const revalidate = 60;

export default async function Home() {
  const routes = await getRoutes();
  return <AppShell routes={routes} />;
}
