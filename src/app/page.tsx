import MapView from "@/components/MapView";
import { getRoutes } from "@/lib/routes";

export const dynamic = "force-static";

export default function Home() {
  const routes = getRoutes();
  return (
    <div className="relative min-h-0 flex-1">
      <MapView routes={routes} />
    </div>
  );
}
