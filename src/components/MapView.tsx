"use client";

import { Fragment, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import {
  MapContainer,
  TileLayer,
  Polyline,
  Popup,
  ZoomControl,
  useMap,
  useMapEvents,
} from "react-leaflet";
import type { LatLngTuple } from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Route } from "@/types/route";
import { boundsIntersect, haversineMeters, type LngLatBounds } from "@/lib/geo";

interface PaletteColor {
  hex: string;
  /** Approximate hue in degrees, used to score how different two colors look. */
  hue: number;
}

/**
 * Ten hand-tuned colors matching the site's muted trail-map palette
 * (rust/amber/moss are the existing brand accents), spaced ~35-40° apart
 * around the hue wheel so any two are easy to tell apart at a glance.
 */
const ROUTE_PALETTE: PaletteColor[] = [
  { hex: "#C1542C", hue: 14 }, // rust
  { hex: "#E8A33D", hue: 36 }, // amber
  { hex: "#768F3D", hue: 78 }, // olive
  { hex: "#6B8F71", hue: 127 }, // moss
  { hex: "#3C8670", hue: 162 }, // pine
  { hex: "#3E7F98", hue: 197 }, // lagoon
  { hex: "#50599B", hue: 233 }, // slate
  { hex: "#78569F", hue: 268 }, // violet
  { hex: "#8D498A", hue: 303 }, // plum
  { hex: "#9D4363", hue: 339 }, // berry
];

/** Deterministic djb2-style string hash, used to break ties reproducibly. */
function hashString(value: string): number {
  let hash = 5381;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 33) ^ value.charCodeAt(i);
  }
  return Math.abs(hash);
}

function hueDistance(a: number, b: number): number {
  const diff = Math.abs(a - b) % 360;
  return diff > 180 ? 360 - diff : diff;
}

/** Above this many points per route, proximity checks sample down for speed. */
const MAX_OVERLAP_SAMPLE_POINTS = 60;
/** Routes with any two points closer than this are treated as overlapping/adjacent. */
const OVERLAP_PROXIMITY_M = 250;

function sampleCoords(coords: [number, number][]): [number, number][] {
  if (coords.length <= MAX_OVERLAP_SAMPLE_POINTS) return coords;
  const stride = Math.ceil(coords.length / MAX_OVERLAP_SAMPLE_POINTS);
  return coords.filter((_, i) => i % stride === 0);
}

/**
 * Cheap bounding-box check first, then a point-proximity pass, to decide
 * whether two routes share or run alongside the same road — the case where
 * their line colors need to read as clearly different on the map.
 */
function routesOverlap(a: Route, b: Route): boolean {
  if (!boundsIntersect(a.bounds, b.bounds)) return false;
  const aPts = sampleCoords(a.coordinates);
  const bPts = sampleCoords(b.coordinates);
  for (const [aLon, aLat] of aPts) {
    for (const [bLon, bLat] of bPts) {
      if (haversineMeters({ lat: aLat, lon: aLon }, { lat: bLat, lon: bLon }) < OVERLAP_PROXIMITY_M) {
        return true;
      }
    }
  }
  return false;
}

/** Picks the palette color that is farthest (in hue) from every given neighbor hue. */
function pickColor(routeId: string, neighborHues: number[]): PaletteColor {
  if (neighborHues.length === 0) {
    return ROUTE_PALETTE[hashString(routeId) % ROUTE_PALETTE.length];
  }
  let best: PaletteColor[] = [];
  let bestScore = -1;
  for (const candidate of ROUTE_PALETTE) {
    const score = Math.min(...neighborHues.map((hue) => hueDistance(candidate.hue, hue)));
    if (score > bestScore) {
      bestScore = score;
      best = [candidate];
    } else if (score === bestScore) {
      best.push(candidate);
    }
  }
  return best[hashString(routeId) % best.length];
}

/**
 * Assigns each route a palette color, in ascending `createdAt` order, so a
 * newly added route automatically picks a color as different as possible
 * from any existing route it geographically overlaps — while never
 * reshuffling colors already assigned to older routes.
 */
function assignRouteColors(routes: Route[]): Map<string, string> {
  const sorted = [...routes].sort((a, b) => {
    const byDate = Date.parse(a.createdAt) - Date.parse(b.createdAt);
    return byDate !== 0 ? byDate : a.id.localeCompare(b.id);
  });

  const assignedHue = new Map<string, number>();
  const colorMap = new Map<string, string>();

  for (const route of sorted) {
    const neighborHues: number[] = [];
    for (const other of sorted) {
      if (other === route) break;
      const hue = assignedHue.get(other.id);
      if (hue !== undefined && routesOverlap(route, other)) {
        neighborHues.push(hue);
      }
    }
    const color = pickColor(route.id, neighborHues);
    assignedHue.set(route.id, color.hue);
    colorMap.set(route.id, color.hex);
  }

  return colorMap;
}

function toLatLngs(coords: [number, number][]): LatLngTuple[] {
  return coords.map(([lon, lat]) => [lat, lon]);
}

function boundsToLatLngTuples(route: Route): [LatLngTuple, LatLngTuple] {
  return [
    [route.bounds[0][1], route.bounds[0][0]],
    [route.bounds[1][1], route.bounds[1][0]],
  ];
}

/** Fits the map to every route's combined extent once, on first mount. */
function FitAllBoundsOnMount({ routes }: { routes: Route[] }) {
  const map = useMap();
  const didFit = useRef(false);

  useEffect(() => {
    if (didFit.current || routes.length === 0) return;
    didFit.current = true;
    const allPoints = routes.flatMap(boundsToLatLngTuples);
    map.fitBounds(allPoints, { padding: [48, 48] });
  }, [map, routes]);

  return null;
}

/**
 * Flies to the selected route's bounds — unless the selection just
 * originated from clicking that same route's line on the map, in which
 * case the user is already looking at it.
 */
function FlyToSelected({
  routes,
  selectedRouteId,
  lastMapOriginatedIdRef,
}: {
  routes: Route[];
  selectedRouteId: string | null;
  lastMapOriginatedIdRef: React.RefObject<string | null>;
}) {
  const map = useMap();

  useEffect(() => {
    const originatedFromMap = lastMapOriginatedIdRef.current === selectedRouteId;
    lastMapOriginatedIdRef.current = null;
    if (!selectedRouteId || originatedFromMap) return;

    const route = routes.find((r) => r.id === selectedRouteId);
    if (!route) return;
    map.fitBounds(boundsToLatLngTuples(route), { padding: [64, 64], maxZoom: 15 });
  }, [map, routes, selectedRouteId, lastMapOriginatedIdRef]);

  return null;
}

/** Reports the map's current visible bounds on mount and after every pan/zoom. */
function ReportVisibleBounds({
  onBoundsChange,
}: {
  onBoundsChange: (bounds: LngLatBounds) => void;
}) {
  const map = useMapEvents({
    moveend: () => {
      const b = map.getBounds();
      onBoundsChange([
        [b.getWest(), b.getSouth()],
        [b.getEast(), b.getNorth()],
      ]);
    },
  });

  useEffect(() => {
    const b = map.getBounds();
    onBoundsChange([
      [b.getWest(), b.getSouth()],
      [b.getEast(), b.getNorth()],
    ]);
  }, [map, onBoundsChange]);

  return null;
}

/** Keeps Leaflet's internal size in sync with the container's real size. */
function InvalidateSizeOnResize() {
  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(container);
    return () => observer.disconnect();
  }, [map]);

  return null;
}

interface MapViewProps {
  routes: Route[];
  matchedRoutes: Route[];
  selectedRouteId: string | null;
  onSelectRoute: (id: string) => void;
  onVisibleBoundsChange: (bounds: LngLatBounds) => void;
}

export default function MapView({
  routes,
  matchedRoutes,
  selectedRouteId,
  onSelectRoute,
  onVisibleBoundsChange,
}: MapViewProps) {
  const lastMapOriginatedId = useRef<string | null>(null);
  const apiKey = process.env.NEXT_PUBLIC_MAPTILER_KEY;
  const routeColors = useMemo(() => assignRouteColors(routes), [routes]);

  if (!apiKey) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-forest-soft p-6 text-center">
        <p className="text-sm text-parchment/80">
          Missing NEXT_PUBLIC_MAPTILER_KEY environment variable. Add it to .env.local and restart
          the dev server.
        </p>
      </div>
    );
  }

  const matchedIds = new Set(matchedRoutes.map((r) => r.id));

  return (
    <MapContainer
      center={[48.25, 17.1]}
      zoom={10}
      zoomControl={false}
      style={{ height: "100%", width: "100%" }}
      className="bg-forest-soft"
    >
      <ZoomControl position="topright" />
      <TileLayer
        url={`https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=${apiKey}`}
        attribution='&copy; <a href="https://www.maptiler.com/copyright/" target="_blank">MapTiler</a> &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors'
        tileSize={512}
        zoomOffset={-1}
        maxZoom={20}
      />

      <FitAllBoundsOnMount routes={routes} />
      <FlyToSelected
        routes={routes}
        selectedRouteId={selectedRouteId}
        lastMapOriginatedIdRef={lastMapOriginatedId}
      />
      <InvalidateSizeOnResize />
      <ReportVisibleBounds onBoundsChange={onVisibleBoundsChange} />

      {routes.map((route) => {
        if (!matchedIds.has(route.id)) return null;
        const positions = toLatLngs(route.coordinates);
        const selected = route.id === selectedRouteId;

        return (
          <Fragment key={route.id}>
            <Polyline
              positions={positions}
              pathOptions={{
                color: "#16231C",
                weight: selected ? 8 : 5,
                opacity: 0.85,
                interactive: false,
              }}
            />
            <Polyline
              positions={positions}
              pathOptions={{
                color: routeColors.get(route.id) ?? "#E8A33D",
                weight: selected ? 5 : 3,
                interactive: false,
              }}
            />
            {/* Wide, invisible line purely to make routes easier to tap on touch screens. */}
            <Polyline
              positions={positions}
              pathOptions={{ color: "#000000", weight: 24, opacity: 0 }}
              eventHandlers={{
                click: () => {
                  lastMapOriginatedId.current = route.id;
                  onSelectRoute(route.id);
                },
              }}
            >
              <Popup className="rg-popup">
                <div className="rg-popup-name">{route.name}</div>
                <div className="rg-popup-stats">
                  {route.distanceKm} km &middot; {route.elevationGainM} m gain &middot;{" "}
                  {route.difficulty} &middot; {route.surface} &middot; {route.rideType}
                </div>
                <Link href={`/route/${route.id}`} className="rg-popup-link">
                  View details &rarr;
                </Link>
              </Popup>
            </Polyline>
          </Fragment>
        );
      })}
    </MapContainer>
  );
}
