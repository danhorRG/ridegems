"use client";

import Link from "next/link";
import FilterPanel from "./FilterPanel";
import RouteCard from "./RouteCard";
import { signOutAction } from "@/app/login/actions";
import type { FilterState, SortMode } from "@/lib/filters";
import type { Route } from "@/types/route";

const SORT_LABELS: Record<SortMode, string> = {
  recommended: "Most recommended",
  recent: "Most recently added",
};

/** `userName` is null when signed out, "" when signed in but no name set yet. */
function AuthStatus({ userName, className = "" }: { userName: string | null; className?: string }) {
  if (userName !== null) {
    return (
      <div className={`flex items-center gap-2 font-stats text-xs tracking-wide ${className}`}>
        <Link href="/account" className="truncate text-forest/70 hover:text-forest">
          {userName || "Account"}
        </Link>
        <span className="text-forest/25">&middot;</span>
        <button
          type="button"
          onClick={() => signOutAction()}
          className="shrink-0 uppercase text-forest/45 underline-offset-2 hover:text-forest hover:underline"
        >
          Sign out
        </button>
      </div>
    );
  }
  return (
    <Link
      href="/login"
      className={`font-stats text-xs uppercase tracking-wide text-forest/60 hover:text-forest ${className}`}
    >
      Sign in
    </Link>
  );
}

interface SidebarProps {
  userName: string | null;
  totalCount: number;
  visibleCount: number;
  displayedRoutes: Route[];
  sortMode: SortMode;
  onSortModeChange: (mode: SortMode) => void;
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
  userName,
  totalCount,
  visibleCount,
  displayedRoutes,
  sortMode,
  onSortModeChange,
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
          open ? "max-h-[85vh]" : "max-h-[60px]"
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
              {displayedRoutes.length}/{totalCount} routes
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
          <div className="flex items-start justify-between gap-2">
            <span className="font-heading text-2xl font-bold uppercase tracking-wider text-forest">
              RideGems
            </span>
            <AuthStatus userName={userName} className="mt-1.5" />
          </div>
          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="font-stats text-xs text-forest/60">
              {displayedRoutes.length} of {visibleCount} routes in view
            </span>
            <Link
              href="/submit"
              className="shrink-0 rounded-full border border-forest/20 px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-wide text-forest/70 hover:border-amber hover:text-forest"
            >
              + Submit
            </Link>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] md:pb-5">
          <div className="mb-4 flex items-center justify-between gap-2 md:hidden">
            <AuthStatus userName={userName} />
          </div>

          <Link
            href="/submit"
            className="mb-4 block w-full rounded-lg border border-dashed border-forest/25 px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-forest/70 hover:border-amber hover:text-forest md:hidden"
          >
            + Submit a route
          </Link>

          <FilterPanel
            filters={filters}
            onChange={onFiltersChange}
            onReset={onReset}
            bounds={bounds}
          />

          <h2 className="mb-2 mt-6 font-heading text-sm font-semibold uppercase tracking-wider text-forest/70">
            Routes
          </h2>
          <div className="mb-3 flex gap-2">
            {(Object.keys(SORT_LABELS) as SortMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                aria-pressed={sortMode === mode}
                onClick={() => onSortModeChange(mode)}
                className={`min-h-9 flex-1 rounded-full border px-2 text-[0.7rem] font-semibold uppercase tracking-wide transition-colors ${
                  sortMode === mode
                    ? "border-amber bg-amber text-forest"
                    : "border-forest/20 bg-transparent text-forest/70 hover:border-forest/40"
                }`}
              >
                {SORT_LABELS[mode]}
              </button>
            ))}
          </div>
          <p className="mb-2 text-[0.7rem] text-forest/50">
            Showing routes visible on the map &mdash; pan or zoom to see more.
          </p>
          <div className="flex flex-col gap-2 pb-2">
            {displayedRoutes.length === 0 && (
              <p className="rounded-lg border border-dashed border-forest/20 px-3 py-4 text-center text-sm text-forest/50">
                No routes in view. Try zooming out or adjusting your filters.
              </p>
            )}
            {displayedRoutes.map((route) => (
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

          <Link
            href="/about"
            className="mt-2 block text-center text-[0.7rem] uppercase tracking-wide text-forest/40 hover:text-forest/70"
          >
            About RideGems
          </Link>
        </div>
      </div>
    </>
  );
}
