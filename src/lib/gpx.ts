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
