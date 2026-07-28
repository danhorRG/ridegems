import Link from "next/link";
import { notFound } from "next/navigation";
import PhotoGallery from "@/components/PhotoGallery";
import RecommendButton from "@/components/RecommendButton";
import RouteDetailInteractive from "@/components/RouteDetailInteractive";
import { getRouteBySlug } from "@/lib/routes";
import type { PoiCategory } from "@/types/route";

function formatCommentDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export const revalidate = 60;

const DIFFICULTY_BADGE: Record<string, string> = {
  easy: "bg-moss text-forest",
  moderate: "bg-amber text-forest",
  hard: "bg-rust text-parchment",
};

const POI_LABELS: Record<PoiCategory, string> = {
  viewpoint: "Viewpoint",
  water: "Water",
  food: "Food",
  hazard: "Hazard",
  other: "Point of interest",
};

const POI_DOT: Record<PoiCategory, string> = {
  viewpoint: "bg-amber",
  water: "bg-moss",
  food: "bg-moss",
  hazard: "bg-rust",
  other: "bg-forest-soft",
};

export default async function RouteDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const route = await getRouteBySlug(slug);
  if (!route) notFound();

  return (
    <div className="h-full overflow-y-auto bg-forest">
      <div className="mx-auto max-w-3xl px-5 py-8 sm:py-12">
        <Link
          href="/"
          className="font-stats text-xs uppercase tracking-wide text-parchment/60 transition-colors hover:text-parchment"
        >
          &larr; Back to map
        </Link>

        <div className="mt-4 flex items-start justify-between gap-3">
          <h1 className="font-heading text-2xl font-bold uppercase tracking-wide text-parchment sm:text-3xl">
            {route.name}
          </h1>
          <span
            className={`shrink-0 rounded px-2 py-1 text-xs font-semibold uppercase tracking-wide ${DIFFICULTY_BADGE[route.difficulty]}`}
          >
            {route.difficulty}
          </span>
        </div>

        <div className="mt-3">
          <RecommendButton initialCount={route.recommendationCount} />
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Distance" value={`${route.distanceKm.toFixed(1)} km`} />
          <Stat label="Elevation gain" value={`${route.elevationGainM} m`} />
          <Stat label="Elevation loss" value={`${route.elevationLossM} m`} />
          <Stat label="Surface" value={route.surface} />
        </div>

        {route.whyRecommended && (
          <div className="mt-6 rounded-xl border border-amber/40 bg-amber/10 px-4 py-3.5 sm:px-5">
            <h2 className="font-heading text-xs font-semibold uppercase tracking-wider text-amber-hover">
              Why this route made the cut
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-parchment/90">{route.whyRecommended}</p>
          </div>
        )}

        {route.description && (
          <div className="mt-6">
            <h2 className="font-heading text-sm font-semibold uppercase tracking-wider text-parchment/70">
              Description
            </h2>
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-parchment/80">
              {route.description}
            </p>
          </div>
        )}

        <RouteDetailInteractive track={route.track} />

        {route.highlights.length > 0 && (
          <div className="mt-8">
            <h2 className="font-heading text-sm font-semibold uppercase tracking-wider text-parchment/70">
              About this route
            </h2>
            <ul className="mt-3 flex flex-col gap-1.5">
              {route.highlights.map((highlight) => (
                <li key={highlight} className="flex items-start gap-2.5 text-sm text-parchment/80">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber" />
                  {highlight}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-8">
          <h2 className="font-heading text-sm font-semibold uppercase tracking-wider text-parchment/70">
            Photos
          </h2>
          <PhotoGallery photos={route.photos} routeName={route.name} />
        </div>

        <div className="mt-8">
          <h2 className="font-heading text-sm font-semibold uppercase tracking-wider text-parchment/70">
            Trip reports
          </h2>
          {route.comments.length === 0 ? (
            <p className="mt-2 text-sm text-parchment/50">No trip reports yet.</p>
          ) : (
            <ul className="mt-3 flex flex-col gap-2.5">
              {route.comments.map((comment) => (
                <li
                  key={`${comment.authorName}-${comment.createdAt}`}
                  className="rounded-lg border border-parchment/15 px-3.5 py-3"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-heading text-xs font-semibold uppercase tracking-wide text-parchment">
                      {comment.authorName}
                    </span>
                    <span className="font-stats text-[0.65rem] text-parchment/40">
                      {formatCommentDate(comment.createdAt)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-parchment/80">{comment.body}</p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-8 pb-8">
          <h2 className="font-heading text-sm font-semibold uppercase tracking-wider text-parchment/70">
            Points of interest
          </h2>
          {route.pois.length === 0 ? (
            <p className="mt-2 text-sm text-parchment/50">No points of interest added yet.</p>
          ) : (
            <ul className="mt-3 flex flex-col gap-2">
              {route.pois.map((poi) => (
                <li
                  key={poi.name}
                  className="flex items-start gap-3 rounded-lg border border-parchment/15 px-3 py-2.5"
                >
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${POI_DOT[poi.category]}`} />
                  <div>
                    <div className="font-heading text-xs font-semibold uppercase tracking-wide text-parchment">
                      {poi.name} <span className="text-parchment/40">&middot; {POI_LABELS[poi.category]}</span>
                    </div>
                    {poi.description && (
                      <p className="mt-0.5 text-sm text-parchment/70">{poi.description}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-parchment/15 px-3 py-2.5">
      <div className="font-stats text-lg font-semibold text-parchment">{value}</div>
      <div className="mt-0.5 text-[0.65rem] uppercase tracking-wide text-parchment/50">{label}</div>
    </div>
  );
}
