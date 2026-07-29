"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Sidebar from "./Sidebar";
import { useViewportHeight } from "@/hooks/useViewportHeight";
import { defaultFilterState, routeMatchesFilters, sortRoutes } from "@/lib/filters";
import type { FilterState, SortMode } from "@/lib/filters";
import { boundsIntersect } from "@/lib/geo";
import type { LngLatBounds } from "@/lib/geo";
import type { Route } from "@/types/route";

const SIDEBAR_ROUTE_LIMIT = 5;

// Leaflet touches `window` at module load time, so it must never run
// during SSR — load it client-only.
const MapView = dynamic(() => import("./MapView"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-forest-soft">
      <span className="font-heading text-sm uppercase tracking-wider text-parchment/60">
        Loading map&hellip;
      </span>
    </div>
  ),
});

export default function AppShell({
  routes,
  userEmail,
}: {
  routes: Route[];
  userEmail: string | null;
}) {
  const viewportHeight = useViewportHeight();
  const [filters, setFilters] = useState<FilterState>(() => defaultFilterState(routes));
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [viewportBounds, setViewportBounds] = useState<LngLatBounds | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>("recommended");

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

  const visibleRoutes = useMemo(() => {
    if (!viewportBounds) return matchedRoutes;
    return matchedRoutes.filter((r) => boundsIntersect(r.bounds, viewportBounds));
  }, [matchedRoutes, viewportBounds]);

  const sidebarRoutes = useMemo(
    () => sortRoutes(visibleRoutes, sortMode).slice(0, SIDEBAR_ROUTE_LIMIT),
    [visibleRoutes, sortMode]
  );

  return (
    <div
      className="relative w-full overflow-hidden bg-forest"
      style={{ height: viewportHeight ? `${viewportHeight}px` : "100dvh" }}
    >
      <Sidebar
        userEmail={userEmail}
        totalCount={routes.length}
        visibleCount={visibleRoutes.length}
        displayedRoutes={sidebarRoutes}
        sortMode={sortMode}
        onSortModeChange={setSortMode}
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
          a chain of flex/percentage resolution across several elements.
          `isolate` gives this its own stacking context so Leaflet's
          internal z-index values (its controls go up to z-index:1000)
          stay contained here instead of leaking out and painting over
          the sidebar's z-30. */}
      <div className="absolute inset-0 isolate md:left-80 md:p-3">
        <div className="h-full w-full overflow-hidden md:rounded-xl md:ring-1 md:ring-forest-soft">
          <MapView
            routes={routes}
            matchedRoutes={matchedRoutes}
            selectedRouteId={selectedRouteId}
            onSelectRoute={setSelectedRouteId}
            onVisibleBoundsChange={setViewportBounds}
          />
        </div>
      </div>
    </div>
  );
}
