"use client";

import { useMemo, useState } from "react";
import MapView from "./MapView";
import Sidebar from "./Sidebar";
import { useViewportHeight } from "@/hooks/useViewportHeight";
import { defaultFilterState, routeMatchesFilters } from "@/lib/filters";
import type { FilterState } from "@/lib/filters";
import type { Route } from "@/types/route";

export default function AppShell({ routes }: { routes: Route[] }) {
  const viewportHeight = useViewportHeight();
  const [filters, setFilters] = useState<FilterState>(() => defaultFilterState(routes));
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);

  const bounds = useMemo(() => {
    const distances = routes.map((r) => r.distanceKm);
    const gains = routes.map((r) => r.elevationGainM);
    return {
      maxDistanceKm: distances.length ? Math.max(...distances) : 0,
      maxElevationGainM: gains.length ? Math.max(...gains) : 0,
    };
  }, [routes]);

  const matchedRoutes = useMemo(
    () => routes.filter((r) => routeMatchesFilters(r, filters)),
    [routes, filters]
  );

  return (
    <div
      className="relative w-full overflow-hidden bg-forest"
      style={{ height: viewportHeight ? `${viewportHeight}px` : "100dvh" }}
    >
      <Sidebar
        totalCount={routes.length}
        matchedRoutes={matchedRoutes}
        filters={filters}
        onFiltersChange={setFilters}
        onReset={() => setFilters(defaultFilterState(routes))}
        bounds={bounds}
        selectedRouteId={selectedRouteId}
        onSelectRoute={setSelectedRouteId}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />

      {/* Positioned with absolute inset instead of flexbox so the map's
          height comes directly from this definite-height root, not from
          a chain of flex/percentage resolution across several elements. */}
      <div className="absolute inset-0 md:left-80 md:p-3">
        <div className="h-full w-full overflow-hidden md:rounded-xl md:ring-1 md:ring-forest-soft">
          <MapView
            routes={routes}
            matchedRoutes={matchedRoutes}
            selectedRouteId={selectedRouteId}
            onSelectRoute={setSelectedRouteId}
          />
        </div>
      </div>
    </div>
  );
}
