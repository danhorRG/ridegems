import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import CommentForm from "@/components/CommentForm";
import PhotoGallery from "@/components/PhotoGallery";
import RecommendButton from "@/components/RecommendButton";
import RouteDetailInteractive from "@/components/RouteDetailInteractive";
import { getRouteBySlug } from "@/lib/routes";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { POI_LABELS, POI_COLORS } from "@/lib/poi";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const route = await getRouteBySlug(slug);
  if (!route) return {};

  const description =
    route.whyRecommended || route.description?.slice(0, 200) || undefined;
  const images = route.photos[0] ? [route.photos[0].url] : ["/opengraph-image"];

  return {
    title: route.name,
    description,
    openGraph: {
      type: "article",
      title: route.name,
      description,
      images,
    },
    twitter: {
      card: "summary_large_image",
      title: route.name,
      description,
      images,
    },
  };
}

function formatCommentDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export const revalidate = 60;

const DIFFICULTY_BADGE: Record<string, string> = {
  easy: "bg-moss text-forest",
  moderate: "bg-amber text-forest",
  hard: "bg-rust text-parchment",
};

export default async function RouteDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [route, supabase] = await Promise.all([getRouteBySlug(slug), createSupabaseServerClient()]);
  if (!route) notFound();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let alreadyRecommended = false;
  if (user) {
    const { data: routeRow } = await supabase.from("routes").select("id").eq("slug", slug).maybeSingle();
    if (routeRow) {
      const { data: rec } = await supabase
        .from("route_recommendations")
        .select("id")
        .eq("route_id", routeRow.id)
        .eq("user_id", user.id)
        .maybeSingle();
      alreadyRecommended = !!rec;
    }
  }

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

        {user && route.createdBy === user.id && (
          <Link
            href={`/route/${route.id}/edit`}
            className="mt-1 inline-block font-stats text-xs uppercase tracking-wide text-amber hover:underline"
          >
            Edit this route
          </Link>
        )}

        <div className="mt-3 flex items-center gap-3">
          <RecommendButton
            slug={route.id}
            initialCount={route.recommendationCount}
            initialRecommended={alreadyRecommended}
            isSignedIn={!!user}
          />
          <a
            href={`/route/${route.id}/gpx`}
            download
            className="flex min-h-11 items-center gap-1.5 rounded-full border border-parchment/30 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-parchment/80 transition-colors hover:border-amber hover:text-amber"
          >
            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.6}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10 3v9m0 0l-3.5-3.5M10 12l3.5-3.5M4 14v1.5A1.5 1.5 0 005.5 17h9a1.5 1.5 0 001.5-1.5V14"
              />
            </svg>
            Download GPX
          </a>
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

        <RouteDetailInteractive
          track={route.track}
          pois={route.pois.map((poi) => ({
            key: poi.id,
            lat: poi.lat,
            lon: poi.lon,
            category: poi.category,
            name: poi.name,
            description: poi.description,
            url: poi.url,
          }))}
        />

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
          <h2 className="mb-3 font-heading text-sm font-semibold uppercase tracking-wider text-parchment/70">
            Trip reports
          </h2>
          <CommentForm slug={route.id} isSignedIn={!!user} />
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
                  key={poi.id}
                  className="flex items-start gap-3 rounded-lg border border-parchment/15 px-3 py-2.5"
                >
                  <span
                    className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: POI_COLORS[poi.category] }}
                  />
                  <div>
                    <div className="font-heading text-xs font-semibold uppercase tracking-wide text-parchment">
                      {poi.name} <span className="text-parchment/40">&middot; {POI_LABELS[poi.category]}</span>
                    </div>
                    {poi.description && (
                      <p className="mt-0.5 text-sm text-parchment/70">{poi.description}</p>
                    )}
                    {poi.url && (
                      <a
                        href={poi.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-0.5 inline-block text-xs font-semibold uppercase tracking-wide text-amber hover:underline"
                      >
                        Visit website ↗
                      </a>
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
