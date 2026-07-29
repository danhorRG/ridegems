import { XMLParser } from "fast-xml-parser";

export interface RawTrackPoint {
  lat: number;
  lon: number;
  ele: number;
}

export interface ParsedGpx {
  name: string;
  points: RawTrackPoint[];
}

function asArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

export function parseGpx(xml: string): ParsedGpx {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
  });
  const doc = parser.parse(xml);

  const trk = asArray(doc?.gpx?.trk)[0];
  if (!trk) {
    throw new Error("GPX file has no <trk> element");
  }

  const name: string = typeof trk.name === "string" ? trk.name : "Untitled Route";

  const points: RawTrackPoint[] = [];
  for (const seg of asArray(trk.trkseg)) {
    for (const pt of asArray(seg?.trkpt)) {
      const lat = parseFloat(pt?.["@_lat"]);
      const lon = parseFloat(pt?.["@_lon"]);
      if (Number.isNaN(lat) || Number.isNaN(lon)) continue;
      const eleRaw = pt?.ele;
      const ele = eleRaw !== undefined ? parseFloat(eleRaw) : 0;
      points.push({ lat, lon, ele: Number.isNaN(ele) ? 0 : ele });
    }
  }

  return { name, points };
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Regenerates a GPX file from a route's stored track points (already at
 * terrain-corrected elevation, see src/lib/elevation.ts) rather than
 * re-serving the originally uploaded file, so every route -- including
 * ones seeded before an export feature existed -- can be exported the
 * same way, with the same trustworthy elevation data shown on the site.
 */
export function buildGpxXml(
  name: string,
  track: { lat: number; lon: number; elevationM: number }[]
): string {
  const points = track
    .map(
      (p) =>
        `      <trkpt lat="${p.lat}" lon="${p.lon}"><ele>${p.elevationM}</ele></trkpt>`
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="RideGems" xmlns="http://www.topografix.com/GPX/1/1">
  <trk>
    <name>${escapeXml(name)}</name>
    <trkseg>
${points}
    </trkseg>
  </trk>
</gpx>
`;
}
