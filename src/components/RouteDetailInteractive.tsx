"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import ElevationProfileChart from "./ElevationProfileChart";
import type { TrackPoint } from "@/lib/geo";

// Leaflet touches `window` at module load time, so it must never run
// during SSR — load it client-only, same as the overview MapView.
const RouteDetailMap = dynamic(() => import("./RouteDetailMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-forest-soft">
      <span className="font-heading text-sm uppercase tracking-wider text-parchment/60">
        Loading map&hellip;
      </span>
    </div>
  ),
});

export default function RouteDetailInteractive({ track }: { track: TrackPoint[] }) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  return (
    <div className="mt-8 flex flex-col gap-3">
      <div className="h-56 w-full overflow-hidden rounded-xl sm:h-72">
        <RouteDetailMap track={track} hoverIndex={hoverIndex} onHoverIndexChange={setHoverIndex} />
      </div>

      <div className="rounded-xl bg-parchment p-4 sm:p-5">
        <h2 className="font-heading text-sm font-semibold uppercase tracking-wider text-forest/70">
          Elevation profile
        </h2>
        <p className="mt-0.5 text-xs text-forest/50">Hover the map or the chart to see the matching point.</p>
        <div className="mt-3">
          <ElevationProfileChart track={track} hoverIndex={hoverIndex} onHoverIndexChange={setHoverIndex} />
        </div>
      </div>
    </div>
  );
}
