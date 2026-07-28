import type { ElevationProfilePoint } from "@/lib/geo";

const WIDTH = 600;
const HEIGHT = 160;
const PAD_TOP = 12;
const PAD_BOTTOM = 22;

export default function ElevationProfileChart({
  profile,
  minElevationM,
  maxElevationM,
  distanceKm,
}: {
  profile: ElevationProfilePoint[];
  minElevationM: number;
  maxElevationM: number;
  distanceKm: number;
}) {
  if (profile.length < 2) return null;

  const elevationRange = Math.max(1, maxElevationM - minElevationM);
  const plotHeight = HEIGHT - PAD_TOP - PAD_BOTTOM;

  const toXY = (p: ElevationProfilePoint): [number, number] => {
    const x = (p.distanceKm / distanceKm) * WIDTH;
    const y = PAD_TOP + plotHeight - ((p.elevationM - minElevationM) / elevationRange) * plotHeight;
    return [x, y];
  };

  const points = profile.map(toXY);
  const linePath = points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L${WIDTH},${PAD_TOP + plotHeight} L0,${PAD_TOP + plotHeight} Z`;

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="w-full"
      preserveAspectRatio="none"
      role="img"
      aria-label={`Elevation profile from ${minElevationM}m to ${maxElevationM}m over ${distanceKm}km`}
    >
      <path d={areaPath} fill="var(--amber)" fillOpacity={0.18} />
      <path d={linePath} fill="none" stroke="var(--amber)" strokeWidth={2} />

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
