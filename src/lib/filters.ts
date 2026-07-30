import type { Difficulty, Route, Surface } from "@/types/route";

export interface FilterState {
  difficulties: Difficulty[];
  surfaces: Surface[];
  maxDistanceKm: number;
  maxElevationGainM: number;
}

export const ALL_DIFFICULTIES: Difficulty[] = ["easy", "moderate", "hard"];
export const ALL_SURFACES: Surface[] = ["paved", "gravel", "mtb"];

export function defaultFilterState(routes: Route[]): FilterState {
  const distances = routes.map((r) => r.distanceKm);
  const gains = routes.map((r) => r.elevationGainM);
  return {
    difficulties: [...ALL_DIFFICULTIES],
    surfaces: [...ALL_SURFACES],
    maxDistanceKm: distances.length ? Math.max(...distances) : 0,
    maxElevationGainM: gains.length ? Math.max(...gains) : 0,
  };
}

export function routeMatchesFilters(route: Route, filters: FilterState): boolean {
  return (
    filters.difficulties.includes(route.difficulty) &&
    filters.surfaces.includes(route.surface) &&
    route.distanceKm <= filters.maxDistanceKm &&
    route.elevationGainM <= filters.maxElevationGainM
  );
}

export function toggleValue<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
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
