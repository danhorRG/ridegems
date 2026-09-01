import type { Difficulty, RideType, Route, Surface } from "@/types/route";

export interface FilterState {
  difficulties: Difficulty[];
  surfaces: Surface[];
  /** Single-select, unlike difficulties/surfaces — the map always shows exactly one ride type. */
  rideType: RideType;
  maxDistanceKm: number;
  maxElevationGainM: number;
}

export const ALL_DIFFICULTIES: Difficulty[] = ["easy", "moderate", "hard"];
export const ALL_SURFACES: Surface[] = ["paved", "gravel", "mtb"];
export const ALL_RIDE_TYPES: RideType[] = ["sportive", "family"];

export function defaultFilterState(routes: Route[]): FilterState {
  const distances = routes.map((r) => r.distanceKm);
  const gains = routes.map((r) => r.elevationGainM);
  return {
    difficulties: [...ALL_DIFFICULTIES],
    // Paved + Gravel by default -- MTB is mutually exclusive with both, so
    // all three can't start selected together.
    surfaces: ["paved", "gravel"],
    rideType: "sportive",
    maxDistanceKm: distances.length ? Math.max(...distances) : 0,
    maxElevationGainM: gains.length ? Math.max(...gains) : 0,
  };
}

export function routeMatchesFilters(route: Route, filters: FilterState): boolean {
  return (
    filters.difficulties.includes(route.difficulty) &&
    filters.surfaces.includes(route.surface) &&
    route.rideType === filters.rideType &&
    route.distanceKm <= filters.maxDistanceKm &&
    route.elevationGainM <= filters.maxElevationGainM
  );
}

export function toggleValue<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

/**
 * Surface toggle with MTB treated as mutually exclusive with Paved/Gravel:
 * enabling MTB clears Paved/Gravel, and enabling Paved or Gravel clears MTB.
 */
export function toggleSurface(current: Surface[], value: Surface): Surface[] {
  if (current.includes(value)) {
    return current.filter((s) => s !== value);
  }
  if (value === "mtb") {
    return ["mtb"];
  }
  return [...current.filter((s) => s !== "mtb"), value];
}

export type SortMode = "recommended" | "recent";

export function sortRoutes(routes: Route[], mode: SortMode): Route[] {
  const sorted = [...routes];
  if (mode === "recommended") {
    sorted.sort((a, b) => b.recommendationCount - a.recommendationCount);
  } else {
    sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  return sorted;
}
