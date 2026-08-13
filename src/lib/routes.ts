import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import type { Difficulty, PoiCategory, RideType, Route, RouteDetail, Surface } from "@/types/route";

interface RouteRow {
  slug: string;
  name: string;
  difficulty: string;
  surface: string;
  ride_type: string;
  distance_km: number;
  elevation_gain_m: number;
  elevation_loss_m: number;
  min_elevation_m: number;
  max_elevation_m: number;
  coordinates: [number, number][];
  profile: Route["profile"];
  bounds: Route["bounds"];
  recommendation_count: number;
  created_at: string;
}

function rowToRoute(row: RouteRow): Route {
  return {
    id: row.slug,
    name: row.name,
    difficulty: row.difficulty as Difficulty,
    surface: row.surface as Surface,
    rideType: row.ride_type as RideType,
    distanceKm: row.distance_km,
    elevationGainM: row.elevation_gain_m,
    elevationLossM: row.elevation_loss_m,
    minElevationM: row.min_elevation_m,
    maxElevationM: row.max_elevation_m,
    profile: row.profile,
    coordinates: row.coordinates,
    bounds: row.bounds,
    recommendationCount: row.recommendation_count,
    createdAt: row.created_at,
  };
}

const ROUTE_COLUMNS =
  "slug,name,difficulty,surface,ride_type,distance_km,elevation_gain_m,elevation_loss_m,min_elevation_m,max_elevation_m,coordinates,profile,bounds,recommendation_count,created_at";

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
  created_by: string | null;
  route_photos: { url: string; caption: string | null }[];
  route_pois: {
    id: string;
    name: string;
    description: string | null;
    category: string;
    lat: number;
    lon: number;
    url: string | null;
  }[];
  route_comments: { author_name: string; body: string; created_at: string }[];
}

const ROUTE_DETAIL_COLUMNS =
  `${ROUTE_COLUMNS}, description, why_recommended, highlights, track_points, created_by, ` +
  "route_photos(url,caption), route_pois(id,name,description,category,lat,lon,url), " +
  "route_comments(author_name,body,created_at)";

export interface OwnedRoute {
  slug: string;
  name: string;
  status: "pending" | "published";
  difficulty: Difficulty;
  distanceKm: number;
  createdAt: string;
}

/**
 * Routes created by `userId`, any status (pending or published). Must be
 * called with a session-aware client (supabaseServer/supabaseBrowser) --
 * the "Owners can read their own routes" RLS policy is what actually
 * grants visibility into non-published rows here.
 */
export async function getRoutesByUser(
  db: SupabaseClient,
  userId: string
): Promise<OwnedRoute[]> {
  const { data, error } = await db
    .from("routes")
    .select("slug,name,status,difficulty,distance_km,created_at")
    .eq("created_by", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to load your routes: ${error.message}`);
  }

  return (data as unknown as {
    slug: string;
    name: string;
    status: string;
    difficulty: string;
    distance_km: number;
    created_at: string;
  }[]).map((row) => ({
    slug: row.slug,
    name: row.name,
    status: row.status as "pending" | "published",
    difficulty: row.difficulty as Difficulty,
    distanceKm: row.distance_km,
    createdAt: row.created_at,
  }));
}

export const getRouteBySlug = cache(async function getRouteBySlug(
  slug: string
): Promise<RouteDetail | null> {
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
});
