import { haversineMeters } from "./geo";

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

  return despike(points, results);
}

/**
 * Maximum sustained grade a paved road can plausibly have. Real Alpine
 * hairpin apexes can briefly touch ~15-18%; sustained stretches above that
 * are effectively never real for a paved route. The terrain-DEM lookup
 * occasionally misreads the raster cell right at a hairpin bend — where the
 * road folds back over a short horizontal distance but adjacent switchback
 * levels differ by tens of meters — producing a short run of points with an
 * implied grade no bike could actually ride (grades over 100% have been
 * observed on Sellaronda's switchbacks). A threshold much above 20% lets a
 * bad climb into a single spiked point pass as "plausible" on its own,
 * leaving the point itself untouched even though the descent back down
 * afterward gets corrected — visually that still reads as a spike. Any run
 * bounded on both sides by a point whose grade back to the last known-good
 * point IS plausible gets replaced by straight-line interpolation between
 * those two good points instead of the DEM's reading.
 */
const MAX_PLAUSIBLE_GRADE = 0.2;

function despike(points: LonLat[], elevations: number[]): number[] {
  if (elevations.length < 3) return elevations;

  const cumulativeM = [0];
  for (let i = 1; i < points.length; i++) {
    cumulativeM.push(cumulativeM[i - 1] + haversineMeters(points[i - 1], points[i]));
  }

  const gradeBetween = (a: number, b: number) => {
    const distance = cumulativeM[b] - cumulativeM[a];
    return distance > 0 ? Math.abs(elevations[b] - elevations[a]) / distance : 0;
  };

  const result = elevations.slice();
  let anchor = 0;
  let i = 1;
  while (i < elevations.length) {
    if (gradeBetween(anchor, i) <= MAX_PLAUSIBLE_GRADE) {
      anchor = i;
      i++;
      continue;
    }

    let j = i + 1;
    while (j < elevations.length && gradeBetween(anchor, j) > MAX_PLAUSIBLE_GRADE) j++;

    if (j < elevations.length) {
      const span = cumulativeM[j] - cumulativeM[anchor];
      for (let k = i; k < j; k++) {
        const fraction = span > 0 ? (cumulativeM[k] - cumulativeM[anchor]) / span : 0;
        result[k] = elevations[anchor] + fraction * (elevations[j] - elevations[anchor]);
      }
      anchor = j;
      i = j + 1;
    } else {
      // Nothing later returns to a plausible grade — treat it as a genuine
      // (if unusually steep) climb/descent rather than guessing at a fix.
      anchor = i;
      i++;
    }
  }
  return result;
}
