import type { ElevationProfilePoint, LngLatBounds, TrackPoint } from "@/lib/geo";

export type Difficulty = "easy" | "moderate" | "hard";
export type Surface = "paved" | "gravel" | "mixed";
export type PoiCategory =
  | "viewpoint"
  | "water"
  | "cafe"
  | "food"
  | "cultural"
  | "bike_shop"
  | "hazard"
  | "other";

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
  recommendationCount: number;
  createdAt: string;
}

export interface RoutePhoto {
  url: string;
  caption: string | null;
}

export interface RoutePoi {
  id: string;
  name: string;
  description: string | null;
  category: PoiCategory;
  lat: number;
  lon: number;
  url: string | null;
}

export interface RouteComment {
  authorName: string;
  body: string;
  createdAt: string;
}

export interface RouteDetail extends Route {
  description: string | null;
  whyRecommended: string;
  highlights: string[];
  track: TrackPoint[];
  photos: RoutePhoto[];
  pois: RoutePoi[];
  comments: RouteComment[];
  createdBy: string | null;
}
