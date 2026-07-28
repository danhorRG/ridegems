// Server-only: reads GPX files from disk. Only used by scripts/migrate-routes.ts
// to seed Supabase — the app itself reads routes via ./routes.ts now.
import { readFileSync } from "fs";
import path from "path";
import { parseGpx } from "./gpx";
import { buildTrackPoints, computeTrackStats, simplifyLine, boundsOf, type TrackPoint } from "./geo";
import type { Difficulty, Route, RouteComment, Surface } from "@/types/route";

interface SampleComment {
  authorName: string;
  body: string;
  daysAgo: number;
}

interface SampleRouteMeta {
  file: string;
  /** GPX has no surface data — set by hand based on the route's real-world surface. */
  surface: Surface;
  /** Placeholder quality-gate blurb until the real submission form (Phase 3) collects this. */
  whyRecommended: string;
  highlights: string[];
  /** Placeholder social-proof content until real accounts/recommends/comments (Phase 4). */
  recommendationCount: number;
  comments: SampleComment[];
}

const SAMPLE_ROUTES: SampleRouteMeta[] = [
  {
    file: "Javornik_z_Limbachu.gpx",
    surface: "paved",
    whyRecommended:
      "A friendly loop through vineyard country west of Bratislava — quiet backroads, one short climb with a big payoff view, and a buffet at the halfway point worth the stop alone.",
    highlights: [
      "Quiet vineyard backroads, minimal traffic",
      "One rewarding climb around the 20km mark, panoramic views at the top",
      "Family-run buffet at the halfway point, great for a coffee stop",
      "Smooth paved surface, comfortable for road bikes",
    ],
    recommendationCount: 47,
    comments: [
      {
        authorName: "Petra K.",
        body: "Perfect Sunday ride, the buffet stop is not to be missed. Road surface was in great shape the whole way.",
        daysAgo: 6,
      },
      {
        authorName: "Tomáš R.",
        body: "Did this with my partner who's newer to cycling and she loved it. The climb is short enough not to be scary.",
        daysAgo: 19,
      },
      {
        authorName: "Miro S.",
        body: "Rode it last weekend — one short stretch near the vineyards had loose gravel from harvest traffic, otherwise smooth.",
        daysAgo: 33,
      },
    ],
  },
  {
    file: "Karpaty (1).gpx",
    surface: "paved",
    whyRecommended:
      "The classic Small Carpathians test piece — steady climbing through forest switchbacks rewards you with one of the best ridge-line views near Bratislava. A local favorite for weekend training.",
    highlights: [
      "Sustained climbing through forest switchbacks",
      "Ridge-line viewpoint near the summit, popular photo stop",
      "Fast, technical descent back down, read the corners",
      "Little shade on the lower slopes, bring water",
    ],
    recommendationCount: 89,
    comments: [
      {
        authorName: "Jakub P.",
        body: "My go-to training loop. Legs were toast after the switchbacks but the ridge view is worth every watt.",
        daysAgo: 4,
      },
      {
        authorName: "Zuzana H.",
        body: "Descent is fast — be careful of the tight left-hander around km 25, gravel washed onto the road after rain.",
        daysAgo: 11,
      },
      {
        authorName: "Andrej V.",
        body: "Did it at sunrise, barely any cars. Highly recommend starting early if you're riding this in summer.",
        daysAgo: 28,
      },
    ],
  },
  {
    file: "Nojzidl.gpx",
    surface: "paved",
    whyRecommended:
      "A long, flat cross-border ride out toward Neusiedl am See — ideal for an all-day social pace, smooth roads throughout, and lake views for the final stretch. Great for beginners.",
    highlights: [
      "Flat profile, easy pace end to end",
      "Crosses into Austria, bring ID",
      "Lake views on the final stretch near Neusiedl am See",
      "Well-paved throughout, comfortable for road bikes",
    ],
    recommendationCount: 61,
    comments: [
      {
        authorName: "Katarína B.",
        body: "Took my kids on this one, totally flat and safe. Ice cream in Neusiedl am See is the perfect reward at the end.",
        daysAgo: 9,
      },
      {
        authorName: "Filip D.",
        body: "Long but very relaxed, great for a first century ride. Bring your passport — forgot mine and had a scare at the border.",
        daysAgo: 15,
      },
      {
        authorName: "Lucia M.",
        body: "Wind picked up on the way back, otherwise an easy all-day cruise. Would ride again.",
        daysAgo: 41,
      },
    ],
  },
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

function toComments(samples: SampleComment[]): RouteComment[] {
  return samples.map(({ authorName, body, daysAgo }) => ({
    authorName,
    body,
    createdAt: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString(),
  }));
}

export interface SampleRoute extends Route {
  whyRecommended: string;
  highlights: string[];
  track: TrackPoint[];
  recommendationCount: number;
  comments: RouteComment[];
}

export function getSampleRoutesFromGpx(): SampleRoute[] {
  const dataDir = path.join(process.cwd(), "sample-data");

  return SAMPLE_ROUTES.map(
    ({ file, surface, whyRecommended, highlights, recommendationCount, comments }) => {
      if (whyRecommended.length > 200) {
        throw new Error(`whyRecommended for ${file} exceeds 200 characters`);
      }
      for (const comment of comments) {
        if (comment.body.length > 280) {
          throw new Error(`comment body for ${file} exceeds 280 characters`);
        }
      }

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
        whyRecommended,
        highlights,
        track: buildTrackPoints(parsed.points),
        recommendationCount,
        comments: toComments(comments),
      };
    }
  );
}
