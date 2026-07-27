"use client";

import FilterPanel from "./FilterPanel";
import RouteCard from "./RouteCard";
import type { FilterState } from "@/lib/filters";
import type { Route } from "@/types/route";

interface SidebarProps {
  totalCount: number;
  matchedRoutes: Route[];
  filters: FilterState;
  onFiltersChange: (next: FilterState) => void;
  onReset: () => void;
  bounds: { maxDistanceKm: number; maxElevationGainM: number };
  selectedRouteId: string | null;
  onSelectRoute: (id: string) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function Sidebar({
  totalCount,
  matchedRoutes,
  filters,
  onFiltersChange,
  onReset,
  bounds,
  selectedRouteId,
  onSelectRoute,
  open,
  onOpenChange,
}: SidebarProps) {
  return (
    <>
      <button
        type="button"
        aria-hidden={!open}
        tabIndex={open ? 0 : -1}
        onClick={() => onOpenChange(false)}
        className={`fixed inset-0 z-20 bg-black/50 transition-opacity md:hidden ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      <div
        className={`fixed inset-x-0 bottom-0 z-30 flex flex-col overflow-hidden rounded-t-2xl bg-parchment shadow-[0_-8px_30px_rgba(0,0,0,0.4)] transition-[max-height] duration-200 ease-out md:absolute md:inset-y-0 md:left-0 md:right-auto md:bottom-auto md:z-auto md:h-auto md:w-80 md:max-h-none md:rounded-none md:shadow-none ${
          open ? "max-h-[85vh]" : "max-h-[76px]"
        }`}
      >
        <button
          type="button"
          onClick={() => onOpenChange(!open)}
          className="flex shrink-0 items-center justify-between gap-3 px-5 py-4 md:hidden"
        >
          <span className="font-heading text-xl font-bold uppercase tracking-wider text-forest">
            RideGems
          </span>
          <span className="flex items-center gap-2">
            <span className="font-stats text-xs text-forest/60">
              {matchedRoutes.length}/{totalCount} routes
            </span>
            <svg
              viewBox="0 0 20 20"
              className={`h-4 w-4 text-forest/60 transition-transform ${open ? "rotate-180" : ""}`}
              fill="currentColor"
            >
              <path d="M5 7l5 6 5-6H5z" />
            </svg>
          </span>
        </button>

        <div className="hidden shrink-0 px-5 pb-3 pt-6 md:block">
          <span className="font-heading text-2xl font-bold uppercase tracking-wider text-forest">
            RideGems
          </span>
          <div className="mt-1 font-stats text-xs text-forest/60">
            {matchedRoutes.length} of {totalCount} routes shown
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] md:pb-5">
          <FilterPanel
            filters={filters}
            onChange={onFiltersChange}
            onReset={onReset}
            bounds={bounds}
          />

          <h2 className="mb-2 mt-6 font-heading text-sm font-semibold uppercase tracking-wider text-forest/70">
            Routes
          </h2>
          <div className="flex flex-col gap-2 pb-2">
            {matchedRoutes.length === 0 && (
              <p className="rounded-lg border border-dashed border-forest/20 px-3 py-4 text-center text-sm text-forest/50">
                No routes match these filters.
              </p>
            )}
            {matchedRoutes.map((route) => (
              <RouteCard
                key={route.id}
                route={route}
                selected={route.id === selectedRouteId}
                onSelect={(id) => {
                  onSelectRoute(id);
                  onOpenChange(false);
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
