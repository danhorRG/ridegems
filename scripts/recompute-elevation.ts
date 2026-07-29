// One-off / reusable: re-fetches real terrain elevation for an existing
// route's stored track (via MapTiler) and updates its stats in Supabase.
// For routes submitted before the elevation-correction fix landed, or if
// terrain data quality improves later. Run with:
//   npm run recompute-elevation -- <slug>
import { createClient } from "@supabase/supabase-js";
import { fetchElevations } from "../src/lib/elevation";
import { statsFromTrack, type TrackPoint } from "../src/lib/geo";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const maptilerKey = process.env.NEXT_PUBLIC_MAPTILER_KEY;

if (!supabaseUrl || !serviceRoleKey || !maptilerKey) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / NEXT_PUBLIC_MAPTILER_KEY. " +
      "Run via `npm run recompute-elevation -- <slug>` so .env.local is loaded."
  );
}

const slug = process.argv[2];
if (!slug) {
  throw new Error("Usage: npm run recompute-elevation -- <slug>");
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function main(apiKey: string) {
  const { data, error } = await supabase
    .from("routes")
    .select("id,name,track_points")
    .eq("slug", slug)
    .single();

  if (error || !data) {
    throw new Error(`Could not find route "${slug}": ${error?.message}`);
  }

  const track = data.track_points as TrackPoint[];
  console.log(`${data.name}: fetched ${track.length} stored track points`);

  const elevations = await fetchElevations(
    track.map((p) => ({ lon: p.lon, lat: p.lat })),
    apiKey
  );
  const correctedTrack: TrackPoint[] = track.map((p, i) => ({
    ...p,
    elevationM: Math.round(elevations[i]),
  }));
  const stats = statsFromTrack(correctedTrack);

  const { error: updateError } = await supabase
    .from("routes")
    .update({
      track_points: correctedTrack,
      profile: stats.profile,
      elevation_gain_m: stats.elevationGainM,
      elevation_loss_m: stats.elevationLossM,
      min_elevation_m: stats.minElevationM,
      max_elevation_m: stats.maxElevationM,
    })
    .eq("id", data.id);

  if (updateError) {
    throw new Error(`Update failed: ${updateError.message}`);
  }

  console.log("Updated:", {
    elevationGainM: stats.elevationGainM,
    elevationLossM: stats.elevationLossM,
    minElevationM: stats.minElevationM,
    maxElevationM: stats.maxElevationM,
  });
}

main(maptilerKey);
