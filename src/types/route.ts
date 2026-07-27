import type { ElevationProfilePoint, LngLatBounds } from "@/lib/geo";

export type Difficulty = "easy" | "moderate" | "hard";
export type Surface = "paved" | "gravel" | "mixed";

export interface Route {
  id: string;
  name: string;
  difficulty: Difficulty;
  surface: Surface;
  distanceKm: number;
  elevationGainM: number;
  elevationLossM: number;
  minElevationM: number;
  maxElevationM: number;
  profile: ElevationProfilePoint[];
  /** Simplified [lon, lat] line used for map rendering. */
  coordinates: [number, number][];
  bounds: LngLatBounds;
}
