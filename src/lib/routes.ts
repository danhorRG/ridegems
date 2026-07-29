import { supabase } from "./supabase";
import type { Difficulty, PoiCategory, Route, RouteDetail, Surface } from "@/types/route";

interface RouteRow {
  slug: string;
  name: string;
  difficulty: string;
  surface: string;
  distance_km: number;
  elevation_gain_m: number;
  elevation_loss_m: number;
  min_elevation_m: number;
  max_elevation_m: number;
  coordinates: [number, number][];
  profile: Route["profile"];
  bounds: Route["bounds"];
}

function rowToRoute(row: RouteRow): Route {
  return {
    id: row.slug,
    name: row.name,
    difficulty: row.difficulty as Difficulty,
    surface: row.surface as Surface,
    distanceKm: row.distance_km,
    elevationGainM: row.elevation_gain_m,
    elevationLossM: row.elevation_loss_m,
    minElevationM: row.min_elevation_m,
    maxElevationM: row.max_elevation_m,
    profile: row.profile,
    coordinates: row.coordinates,
    bounds: row.bounds,
  };
}

const ROUTE_COLUMNS =
  "slug,name,difficulty,surface,distance_km,elevation_gain_m,elevation_loss_m,min_elevation_m,max_elevation_m,coordinates,profile,bounds";

export async function getRoutes(): Promise<Route[]> {
  const { data, error } = await supabase
    .from("routes")
    .select(ROUTE_COLUMNS)
    .eq("status", "published")
    .order("name");

  if (error) {
    throw new Error(`Failed to load routes from Supabase: ${error.message}`);
  }

  return (data as unknown as RouteRow[]).map(rowToRoute);
}

interface RouteDetailRow extends RouteRow {
  description: string | null;
  why_recommended: string | null;
  highlights: string[];
  track_points: RouteDetail["track"];
  recommendation_count: number;
  created_by: string | null;
  route_photos: { url: string; caption: string | null }[];
  route_pois: {
    name: string;
    description: string | null;
    category: string;
    lat: number;
    lon: number;
  }[];
  route_comments: { author_name: string; body: string; created_at: string }[];
}

const ROUTE_DETAIL_COLUMNS =
  `${ROUTE_COLUMNS}, description, why_recommended, highlights, track_points, recommendation_count, created_by, ` +
  "route_photos(url,caption), route_pois(name,description,category,lat,lon), " +
  "route_comments(author_name,body,created_at)";

export async function getRouteBySlug(slug: string): Promise<RouteDetail | null> {
  const { data, error } = await supabase
    .from("routes")
    .select(ROUTE_DETAIL_COLUMNS)
    .eq("slug", slug)
    .eq("status", "published")
    .order("sort_order", { referencedTable: "route_photos" })
    .order("created_at", { referencedTable: "route_comments", ascending: false })
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load route "${slug}" from Supabase: ${error.message}`);
  }
  if (!data) return null;

  const row = data as unknown as RouteDetailRow;
  return {
    ...rowToRoute(row),
    description: row.description,
    whyRecommended: row.why_recommended ?? "",
    highlights: row.highlights,
    track: row.track_points,
    recommendationCount: row.recommendation_count,
    createdBy: row.created_by,
    photos: row.route_photos,
    pois: row.route_pois.map((poi) => ({
      ...poi,
      category: poi.category as PoiCategory,
    })),
    comments: row.route_comments.map((c) => ({
      authorName: c.author_name,
      body: c.body,
      createdAt: c.created_at,
    })),
  };
}
