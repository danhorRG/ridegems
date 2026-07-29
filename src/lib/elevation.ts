export interface LonLat {
  lon: number;
  lat: number;
}

/**
 * Looks up real terrain elevation for a list of points via MapTiler's
 * Elevation API, rather than trusting a GPX file's own recorded elevation.
 * GPS/barometric altitude readings are noisy and occasionally spike by
 * hundreds of meters on a single point (satellite geometry near ridges,
 * signal reflection, sensor recalibration) — terrain-lookup elevation
 * doesn't have this problem. Batches requests since MapTiler allows at
 * most 50 coordinates per call.
 */
export async function fetchElevations(points: LonLat[], apiKey: string): Promise<number[]> {
  const BATCH_SIZE = 50;
  const results: number[] = [];

  for (let i = 0; i < points.length; i += BATCH_SIZE) {
    const batch = points.slice(i, i + BATCH_SIZE);
    const locations = batch.map((p) => `${p.lon},${p.lat}`).join(";");
    const res = await fetch(`https://api.maptiler.com/elevation/${locations}.json?key=${apiKey}`);
    if (!res.ok) {
      throw new Error(`Elevation lookup failed with status ${res.status}`);
    }
    const data: [number, number, number][] = await res.json();
    for (const [, , elevationM] of data) {
      results.push(elevationM);
    }
  }

  return results;
}
