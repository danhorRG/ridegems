import type { RawTrackPoint } from "./gpx";

const EARTH_RADIUS_M = 6371000;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Great-circle distance between two lat/lon points, in meters. */
export function haversineMeters(
  a: { lat: number; lon: number },
  b: { lat: number; lon: number }
): number {
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

export interface ElevationProfilePoint {
  distanceKm: number;
  elevationM: number;
}

export interface TrackStats {
  distanceKm: number;
  elevationGainM: number;
  elevationLossM: number;
  minElevationM: number;
  maxElevationM: number;
  profile: ElevationProfilePoint[];
}

/**
 * Above this many points, per-point spacing gets tight enough that terrain-DEM
 * lookup noise (a few meters, more in steep alpine terrain) exceeds the
 * default 3m hysteresis threshold repeatedly and compounds into large
 * spurious gain/loss over a long track. Dense tracks use a wider threshold
 * to filter that out; shorter/sparser tracks keep the original 3m, which
 * matches real GPS/barometric noise amplitude and shouldn't change.
 */
const DENSE_TRACK_POINT_COUNT = 1000;
const DENSE_TRACK_THRESHOLD_M = 18;

/**
 * Elevation gain/loss via the "hysteresis" method: only count a change once
 * cumulative movement since the last reference point exceeds `thresholdM`.
 * This filters GPS/barometric noise that would otherwise inflate gain on
 * every tiny up/down wobble in the recorded track.
 */
function computeElevationGainLoss(elevations: number[], thresholdM?: number) {
  let gain = 0;
  let loss = 0;
  if (elevations.length === 0) return { gain, loss };

  const threshold =
    thresholdM ?? (elevations.length > DENSE_TRACK_POINT_COUNT ? DENSE_TRACK_THRESHOLD_M : 3);

  let ref = elevations[0];
  for (let i = 1; i < elevations.length; i++) {
    const diff = elevations[i] - ref;
    if (Math.abs(diff) < threshold) continue;
    if (diff > 0) gain += diff;
    else loss += -diff;
    ref = elevations[i];
  }
  return { gain, loss };
}

export function computeTrackStats(
  points: RawTrackPoint[],
  maxProfilePoints = 150
): TrackStats {
  if (points.length === 0) {
    return {
      distanceKm: 0,
      elevationGainM: 0,
      elevationLossM: 0,
      minElevationM: 0,
      maxElevationM: 0,
      profile: [],
    };
  }

  const cumulativeDistanceM: number[] = [0];
  for (let i = 1; i < points.length; i++) {
    cumulativeDistanceM.push(
      cumulativeDistanceM[i - 1] + haversineMeters(points[i - 1], points[i])
    );
  }

  const elevations = points.map((p) => p.ele);
  const { gain, loss } = computeElevationGainLoss(elevations);

  const step = Math.max(1, Math.floor(points.length / maxProfilePoints));
  const profile: ElevationProfilePoint[] = [];
  for (let i = 0; i < points.length; i += step) {
    profile.push({
      distanceKm: cumulativeDistanceM[i] / 1000,
      elevationM: Math.round(points[i].ele),
    });
  }
  const last = points.length - 1;
  if (profile[profile.length - 1]?.distanceKm !== cumulativeDistanceM[last] / 1000) {
    profile.push({
      distanceKm: cumulativeDistanceM[last] / 1000,
      elevationM: Math.round(points[last].ele),
    });
  }

  return {
    distanceKm: cumulativeDistanceM[cumulativeDistanceM.length - 1] / 1000,
    elevationGainM: Math.round(gain),
    elevationLossM: Math.round(loss),
    minElevationM: Math.round(Math.min(...elevations)),
    maxElevationM: Math.round(Math.max(...elevations)),
    profile,
  };
}

export interface TrackPoint extends ElevationProfilePoint {
  lat: number;
  lon: number;
}

export interface ElevationStats {
  elevationGainM: number;
  elevationLossM: number;
  minElevationM: number;
  maxElevationM: number;
  profile: ElevationProfilePoint[];
}

/**
 * Recomputes gain/loss/min/max/profile from a track's elevations — used
 * after replacing GPX-reported elevation with looked-up terrain elevation
 * (see src/lib/elevation.ts), so every downstream number is derived from
 * the same corrected data instead of the original noisy GPX values.
 */
export function statsFromTrack(track: TrackPoint[]): ElevationStats {
  if (track.length === 0) {
    return { elevationGainM: 0, elevationLossM: 0, minElevationM: 0, maxElevationM: 0, profile: [] };
  }

  const elevations = track.map((p) => p.elevationM);
  const { gain, loss } = computeElevationGainLoss(elevations);

  return {
    elevationGainM: Math.round(gain),
    elevationLossM: Math.round(loss),
    minElevationM: Math.round(Math.min(...elevations)),
    maxElevationM: Math.round(Math.max(...elevations)),
    profile: track.map(({ distanceKm, elevationM }) => ({ distanceKm, elevationM })),
  };
}

type XY = [number, number];

/**
 * Projects lat/lon to a local planar XY (meters) around the point set's
 * median latitude, so perpendicular-distance comparisons in Douglas-Peucker
 * approximate real-world meters despite lon/lat having different physical
 * scale at non-equatorial latitudes.
 */
function projectToXY(coords: { lat: number; lon: number }[]): XY[] {
  const refLatRad = toRad(coords[Math.floor(coords.length / 2)].lat);
  const cosRefLat = Math.cos(refLatRad);
  const metersPerDegLat = (Math.PI / 180) * EARTH_RADIUS_M;
  return coords.map(({ lat, lon }): XY => [lon * cosRefLat * metersPerDegLat, lat * metersPerDegLat]);
}

function perpendicularDistance(point: XY, start: XY, end: XY): number {
  const [x, y] = point;
  const [x1, y1] = start;
  const [x2, y2] = end;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(x - x1, y - y1);
  const t = ((x - x1) * dx + (y - y1) * dy) / lenSq;
  const tClamped = Math.max(0, Math.min(1, t));
  const projX = x1 + tClamped * dx;
  const projY = y1 + tClamped * dy;
  return Math.hypot(x - projX, y - projY);
}

/**
 * Douglas-Peucker simplification: returns which indices to keep from a
 * sequence of points already projected to local XY meters. Keeps more
 * points where the path curves and fewer where it's straight, unlike
 * fixed-interval decimation which can cut corners off sharp turns.
 */
function douglasPeuckerKeep(xy: XY[], toleranceM: number): boolean[] {
  const keep = new Array(xy.length).fill(false);
  if (xy.length === 0) return keep;
  keep[0] = true;
  keep[xy.length - 1] = true;

  function dp(startIdx: number, endIdx: number) {
    let maxDist = 0;
    let maxIdx = -1;
    for (let i = startIdx + 1; i < endIdx; i++) {
      const dist = perpendicularDistance(xy[i], xy[startIdx], xy[endIdx]);
      if (dist > maxDist) {
        maxDist = dist;
        maxIdx = i;
      }
    }
    if (maxDist > toleranceM && maxIdx !== -1) {
      keep[maxIdx] = true;
      dp(startIdx, maxIdx);
      dp(maxIdx, endIdx);
    }
  }

  if (xy.length > 2) dp(0, xy.length - 1);
  return keep;
}

/**
 * Like the `profile` array in computeTrackStats, but keeps lat/lon per point
 * too, so a single index maps a distance/elevation to a map position. Used
 * to sync the route detail page's map hover with its elevation chart hover,
 * to render the on-page map polyline, and as the source for GPX export —
 * so points are kept via geometry-aware simplification (not a fixed point
 * cap) to preserve road-following fidelity on curves and switchbacks.
 */
export function buildTrackPoints(points: RawTrackPoint[], toleranceM = 3): TrackPoint[] {
  if (points.length === 0) return [];

  const cumulativeDistanceM: number[] = [0];
  for (let i = 1; i < points.length; i++) {
    cumulativeDistanceM.push(
      cumulativeDistanceM[i - 1] + haversineMeters(points[i - 1], points[i])
    );
  }

  const keep = douglasPeuckerKeep(projectToXY(points), toleranceM);

  const track: TrackPoint[] = [];
  for (let i = 0; i < points.length; i++) {
    if (!keep[i]) continue;
    track.push({
      lat: points[i].lat,
      lon: points[i].lon,
      distanceKm: cumulativeDistanceM[i] / 1000,
      elevationM: Math.round(points[i].ele),
    });
  }
  return track;
}

type LonLat = [number, number];

/**
 * Douglas-Peucker simplification for [lon, lat] coordinates, used for the
 * lighter-weight line rendered on the routes overview map.
 */
export function simplifyLine(coords: LonLat[], toleranceM = 6): LonLat[] {
  if (coords.length <= 2) return coords;
  const xy = projectToXY(coords.map(([lon, lat]) => ({ lat, lon })));
  const keep = douglasPeuckerKeep(xy, toleranceM);
  return coords.filter((_, i) => keep[i]);
}

export type LngLatBounds = [[number, number], [number, number]];

export function boundsOf(coords: LonLat[]): LngLatBounds {
  let minLon = Infinity;
  let minLat = Infinity;
  let maxLon = -Infinity;
  let maxLat = -Infinity;
  for (const [lon, lat] of coords) {
    if (lon < minLon) minLon = lon;
    if (lon > maxLon) maxLon = lon;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  }
  return [
    [minLon, minLat],
    [maxLon, maxLat],
  ];
}

export function boundsIntersect(a: LngLatBounds, b: LngLatBounds): boolean {
  const [[aMinLon, aMinLat], [aMaxLon, aMaxLat]] = a;
  const [[bMinLon, bMinLat], [bMaxLon, bMaxLat]] = b;
  return aMinLon <= bMaxLon && aMaxLon >= bMinLon && aMinLat <= bMaxLat && aMaxLat >= bMinLat;
}
