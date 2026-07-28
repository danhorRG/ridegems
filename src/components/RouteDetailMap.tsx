"use client";

import { useEffect, useMemo, useRef } from "react";
import { MapContainer, TileLayer, Polyline, CircleMarker, useMap, useMapEvents } from "react-leaflet";
import type { LatLngTuple } from "leaflet";
import "leaflet/dist/leaflet.css";
import type { TrackPoint } from "@/lib/geo";

function FitToTrack({ positions }: { positions: LatLngTuple[] }) {
  const map = useMap();
  const didFit = useRef(false);

  useEffect(() => {
    if (didFit.current || positions.length === 0) return;
    didFit.current = true;
    map.fitBounds(positions, { padding: [24, 24] });
  }, [map, positions]);

  return null;
}

function nearestIndex(positions: LatLngTuple[], lat: number, lon: number): number {
  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < positions.length; i++) {
    const [pLat, pLon] = positions[i];
    const dist = (pLat - lat) ** 2 + (pLon - lon) ** 2;
    if (dist < bestDist) {
      bestDist = dist;
      best = i;
    }
  }
  return best;
}

function HoverLayer({
  positions,
  onHoverIndexChange,
}: {
  positions: LatLngTuple[];
  onHoverIndexChange: (index: number | null) => void;
}) {
  useMapEvents({
    mousemove(e) {
      onHoverIndexChange(nearestIndex(positions, e.latlng.lat, e.latlng.lng));
    },
    mouseout() {
      onHoverIndexChange(null);
    },
  });
  return null;
}

export default function RouteDetailMap({
  track,
  hoverIndex,
  onHoverIndexChange,
}: {
  track: TrackPoint[];
  hoverIndex: number | null;
  onHoverIndexChange: (index: number | null) => void;
}) {
  const apiKey = process.env.NEXT_PUBLIC_MAPTILER_KEY;
  const positions = useMemo<LatLngTuple[]>(() => track.map((p) => [p.lat, p.lon]), [track]);

  if (!apiKey || positions.length === 0) return null;

  const hoverPosition = hoverIndex !== null ? positions[hoverIndex] : null;

  return (
    <MapContainer
      center={positions[0]}
      zoom={12}
      zoomControl={false}
      style={{ height: "100%", width: "100%" }}
      className="bg-forest-soft"
    >
      <TileLayer
        url={`https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=${apiKey}`}
        attribution='&copy; <a href="https://www.maptiler.com/copyright/" target="_blank">MapTiler</a> &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors'
        tileSize={512}
        zoomOffset={-1}
        maxZoom={20}
      />

      <FitToTrack positions={positions} />
      <HoverLayer positions={positions} onHoverIndexChange={onHoverIndexChange} />

      <Polyline positions={positions} pathOptions={{ color: "#16231C", weight: 6, opacity: 0.85 }} interactive={false} />
      <Polyline positions={positions} pathOptions={{ color: "#E8A33D", weight: 3.5 }} interactive={false} />

      {hoverPosition && (
        <CircleMarker
          center={hoverPosition}
          radius={7}
          pathOptions={{ color: "#16231C", weight: 2, fillColor: "#E8A33D", fillOpacity: 1 }}
          interactive={false}
        />
      )}
    </MapContainer>
  );
}
