// Server-only: reads GPX files from disk. Only import this from Server
// Components / build-time code, never from a "use client" module.
import { readFileSync } from "fs";
import path from "path";
import { parseGpx } from "./gpx";
import { computeTrackStats, simplifyLine, boundsOf } from "./geo";
import type { Difficulty, Route, Surface } from "@/types/route";

interface SampleRouteMeta {
  file: string;
  /** GPX has no surface data — reasonable guess based on the route's real-world location. */
  surface: Surface;
}

const SAMPLE_ROUTES: SampleRouteMeta[] = [
  { file: "Javornik_z_Limbachu.gpx", surface: "gravel" },
  { file: "Karpaty (1).gpx", surface: "mixed" },
  { file: "Nojzidl.gpx", surface: "paved" },
];

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** GPX has no difficulty rating — derive a reasonable one from actual gain per km. */
function estimateDifficulty(distanceKm: number, elevationGainM: number): Difficulty {
  if (distanceKm === 0) return "easy";
  const gainPerKm = elevationGainM / distanceKm;
  if (gainPerKm < 12) return "easy";
  if (gainPerKm < 25) return "moderate";
  return "hard";
}

let cached: Route[] | null = null;

export function getRoutes(): Route[] {
  if (cached) return cached;

  const dataDir = path.join(process.cwd(), "sample-data");

  cached = SAMPLE_ROUTES.map(({ file, surface }) => {
    const xml = readFileSync(path.join(dataDir, file), "utf-8");
    const parsed = parseGpx(xml);
    const stats = computeTrackStats(parsed.points);

    const fullLine: [number, number][] = parsed.points.map((p) => [p.lon, p.lat]);
    const coordinates = simplifyLine(fullLine, 6);

    return {
      id: slugify(parsed.name || file),
      name: parsed.name || file.replace(/\.gpx$/i, ""),
      difficulty: estimateDifficulty(stats.distanceKm, stats.elevationGainM),
      surface,
      distanceKm: Math.round(stats.distanceKm * 10) / 10,
      elevationGainM: stats.elevationGainM,
      elevationLossM: stats.elevationLossM,
      minElevationM: stats.minElevationM,
      maxElevationM: stats.maxElevationM,
      profile: stats.profile,
      coordinates,
      bounds: boundsOf(coordinates),
    };
  });

  return cached;
}
