"use client";

import { Fragment, useEffect, useRef } from "react";
import Link from "next/link";
import { MapContainer, TileLayer, Polyline, Popup, ZoomControl, useMap } from "react-leaflet";
import type { LatLngTuple } from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Route } from "@/types/route";

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: "#6B8F71",
  moderate: "#E8A33D",
  hard: "#C1542C",
};

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
}

export default function MapView({
  routes,
  matchedRoutes,
  selectedRouteId,
  onSelectRoute,
}: MapViewProps) {
  const lastMapOriginatedId = useRef<string | null>(null);
  const apiKey = process.env.NEXT_PUBLIC_MAPTILER_KEY;

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
                color: DIFFICULTY_COLORS[route.difficulty] ?? "#E8A33D",
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
                  {route.difficulty} &middot; {route.surface}
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
