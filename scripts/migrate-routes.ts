// One-off / re-runnable migration: pushes the local sample GPX routes (and
// any photos dropped in sample-photos/<slug>/) into Supabase. Run with:
//   npm run migrate:routes
import { readdirSync, readFileSync } from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import { getSampleRoutesFromGpx } from "../src/lib/sampleGpxRoutes";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Run via " +
      "`npm run migrate:routes` so .env.local is loaded."
  );
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

const PHOTOS_DIR = path.join(process.cwd(), "sample-photos");
const CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

function photosForSlug(slug: string): string[] {
  const dir = path.join(PHOTOS_DIR, slug);
  try {
    return readdirSync(dir).filter((f) =>
      Object.keys(CONTENT_TYPES).includes(path.extname(f).toLowerCase())
    );
  } catch {
    return [];
  }
}

async function main() {
  const routes = getSampleRoutesFromGpx();

  for (const route of routes) {
    console.log(`\n${route.name} (${route.id})`);

    const { data: upserted, error: routeError } = await supabase
      .from("routes")
      .upsert(
        {
          slug: route.id,
          name: route.name,
          difficulty: route.difficulty,
          surface: route.surface,
          ride_type: route.rideType,
          distance_km: route.distanceKm,
          elevation_gain_m: route.elevationGainM,
          elevation_loss_m: route.elevationLossM,
          min_elevation_m: route.minElevationM,
          max_elevation_m: route.maxElevationM,
          coordinates: route.coordinates,
          profile: route.profile,
          bounds: route.bounds,
          description: route.description,
          why_recommended: route.whyRecommended,
          highlights: route.highlights,
          track_points: route.track,
          recommendation_count: route.recommendationCount,
          status: "published",
        },
        { onConflict: "slug" }
      )
      .select("id")
      .single();

    if (routeError || !upserted) {
      console.error("  route upsert failed:", routeError?.message);
      continue;
    }
    console.log("  route row ok:", upserted.id);

    // Re-inserting comments is idempotent the same way photos are.
    await supabase.from("route_comments").delete().eq("route_id", upserted.id);
    if (route.comments.length > 0) {
      const { error: commentsError } = await supabase.from("route_comments").insert(
        route.comments.map((comment) => ({
          route_id: upserted.id,
          author_name: comment.authorName,
          body: comment.body,
          created_at: comment.createdAt,
        }))
      );
      if (commentsError) {
        console.error("  comments insert failed:", commentsError.message);
      } else {
        console.log(`  comments ok: ${route.comments.length}`);
      }
    }

    const files = photosForSlug(route.id);
    if (files.length === 0) {
      console.log("  no photos found in sample-photos/" + route.id);
      continue;
    }

    // Re-uploading is idempotent (storage upsert + wipe/re-insert DB rows),
    // so reruns after adding more photos are safe.
    await supabase.from("route_photos").delete().eq("route_id", upserted.id);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = path.extname(file).toLowerCase();
      const storagePath = `${route.id}/${file}`;
      const bytes = readFileSync(path.join(PHOTOS_DIR, route.id, file));

      const { error: uploadError } = await supabase.storage
        .from("route-photos")
        .upload(storagePath, bytes, {
          contentType: CONTENT_TYPES[ext],
          upsert: true,
        });
      if (uploadError) {
        console.error(`  photo upload failed (${file}):`, uploadError.message);
        continue;
      }

      const { data: publicUrl } = supabase.storage
        .from("route-photos")
        .getPublicUrl(storagePath);

      const { error: photoRowError } = await supabase.from("route_photos").insert({
        route_id: upserted.id,
        url: publicUrl.publicUrl,
        sort_order: i,
      });
      if (photoRowError) {
        console.error(`  photo row failed (${file}):`, photoRowError.message);
      } else {
        console.log("  photo ok:", file);
      }
    }
  }

  console.log("\nDone.");
}

main();
