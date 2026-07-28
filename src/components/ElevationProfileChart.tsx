"use client";

import { useRef } from "react";
import type { TrackPoint } from "@/lib/geo";

const WIDTH = 600;
const HEIGHT = 160;
const PAD_TOP = 12;
const PAD_BOTTOM = 22;

export default function ElevationProfileChart({
  track,
  hoverIndex,
  onHoverIndexChange,
}: {
  track: TrackPoint[];
  hoverIndex: number | null;
  onHoverIndexChange: (index: number | null) => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);

  if (track.length < 2) return null;

  const distanceKm = track[track.length - 1].distanceKm;
  const elevations = track.map((p) => p.elevationM);
  const minElevationM = Math.min(...elevations);
  const maxElevationM = Math.max(...elevations);
  const elevationRange = Math.max(1, maxElevationM - minElevationM);
  const plotHeight = HEIGHT - PAD_TOP - PAD_BOTTOM;

  const toXY = (p: TrackPoint): [number, number] => {
    const x = (p.distanceKm / distanceKm) * WIDTH;
    const y = PAD_TOP + plotHeight - ((p.elevationM - minElevationM) / elevationRange) * plotHeight;
    return [x, y];
  };

  const points = track.map(toXY);
  const linePath = points
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(" ");
  const areaPath = `${linePath} L${WIDTH},${PAD_TOP + plotHeight} L0,${PAD_TOP + plotHeight} Z`;

  function handleMove(e: React.PointerEvent<SVGSVGElement>) {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const xFraction = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    const targetDistance = xFraction * distanceKm;

    let nearest = 0;
    let bestDiff = Infinity;
    for (let i = 0; i < track.length; i++) {
      const diff = Math.abs(track[i].distanceKm - targetDistance);
      if (diff < bestDiff) {
        bestDiff = diff;
        nearest = i;
      }
    }
    onHoverIndexChange(nearest);
  }

  const hoverXY = hoverIndex !== null ? points[hoverIndex] : null;

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="w-full cursor-crosshair touch-none"
      preserveAspectRatio="none"
      role="img"
      aria-label={`Elevation profile from ${minElevationM}m to ${maxElevationM}m over ${distanceKm.toFixed(1)}km`}
      onPointerMove={handleMove}
      onPointerLeave={() => onHoverIndexChange(null)}
    >
      <path d={areaPath} fill="var(--amber)" fillOpacity={0.18} />
      <path d={linePath} fill="none" stroke="var(--amber)" strokeWidth={2} />

      {hoverXY && (
        <>
          <line
            x1={hoverXY[0]}
            y1={PAD_TOP}
            x2={hoverXY[0]}
            y2={PAD_TOP + plotHeight}
            stroke="var(--forest)"
            strokeOpacity={0.35}
            strokeWidth={1}
            strokeDasharray="3,3"
          />
          <circle cx={hoverXY[0]} cy={hoverXY[1]} r={5} fill="var(--forest)" stroke="var(--amber)" strokeWidth={2} />
        </>
      )}

      <text x={4} y={PAD_TOP + 10} className="font-stats" fontSize={11} fill="var(--forest-soft)">
        {maxElevationM}m
      </text>
      <text
        x={4}
        y={PAD_TOP + plotHeight - 2}
        className="font-stats"
        fontSize={11}
        fill="var(--forest-soft)"
      >
        {minElevationM}m
      </text>

      <text x={0} y={HEIGHT - 4} className="font-stats" fontSize={11} fill="var(--forest-soft)">
        0 km
      </text>
      <text
        x={WIDTH}
        y={HEIGHT - 4}
        textAnchor="end"
        className="font-stats"
        fontSize={11}
        fill="var(--forest-soft)"
      >
        {distanceKm.toFixed(1)} km
      </text>
    </svg>
  );
}
