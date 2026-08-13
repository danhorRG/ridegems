"use client";

import Link from "next/link";
import type { Route } from "@/types/route";

const DIFFICULTY_BADGE: Record<Route["difficulty"], string> = {
  easy: "bg-moss text-forest",
  moderate: "bg-amber text-forest",
  hard: "bg-rust text-parchment",
};

const RIDE_TYPE_LABEL: Record<Route["rideType"], string> = {
  sportive: "Sportive",
  family: "Family",
};

export default function RouteCard({
  route,
  selected,
  onSelect,
}: {
  route: Route;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <div
      className={`w-full rounded-lg border transition-colors ${
        selected
          ? "border-amber bg-forest/5 shadow-[0_0_0_1px_rgba(232,163,61,0.4)]"
          : "border-forest/15 bg-forest/[0.03] hover:border-forest/30"
      }`}
    >
      <button
        type="button"
        onClick={() => onSelect(route.id)}
        className="w-full px-3.5 pt-3 text-left"
      >
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-heading text-[0.95rem] font-semibold uppercase tracking-wide text-forest">
            {route.name}
          </h3>
          <span
            className={`shrink-0 rounded px-1.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide ${DIFFICULTY_BADGE[route.difficulty]}`}
          >
            {route.difficulty}
          </span>
        </div>
        <div className="mt-2 flex items-center gap-3">
          <span className="font-stats text-xs font-medium text-forest/80">
            {route.distanceKm.toFixed(1)} km
          </span>
          <span className="font-stats text-xs font-medium text-forest/80">
            {route.elevationGainM} m gain
          </span>
          <span className="rounded border border-forest/20 px-1.5 py-0.5 text-[0.65rem] uppercase tracking-wide text-forest/50">
            {route.surface}
          </span>
          <span className="rounded border border-forest/20 px-1.5 py-0.5 text-[0.65rem] uppercase tracking-wide text-forest/50">
            {RIDE_TYPE_LABEL[route.rideType]}
          </span>
        </div>
      </button>
      <div className="flex justify-end px-3.5 pb-3 pt-1.5">
        <Link
          href={`/route/${route.id}`}
          className="text-[0.7rem] font-semibold uppercase tracking-wide text-forest/50 underline-offset-2 hover:text-forest hover:underline"
        >
          Details &rarr;
        </Link>
      </div>
    </div>
  );
}
