"use client";

import { useEffect, useMemo, useRef } from "react";
import { MapContainer, TileLayer, Polyline, CircleMarker, Marker, Popup, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import type { LatLngTuple } from "leaflet";
import "leaflet/dist/leaflet.css";
import type { TrackPoint } from "@/lib/geo";
import type { PoiCategory } from "@/types/route";
import { POI_LABELS, poiDivIconHtml } from "@/lib/poi";

export interface PoiMarkerData {
  key: string;
  lat: number;
  lon: number;
  category: PoiCategory;
  name: string;
  description: string | null;
  url: string | null;
}

function poiIcon(category: PoiCategory) {
  return L.divIcon({
    html: poiDivIconHtml(category),
    className: "",
    iconSize: [30, 30],
    iconAnchor: [15, 30],
  });
}

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

function ClickToPlaceLayer({
  placing,
  onMapClick,
}: {
  placing: boolean;
  onMapClick: (lat: number, lon: number) => void;
}) {
  useMapEvents({
    click(e) {
      if (placing) onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function RouteDetailMap({
  track,
  hoverIndex,
  onHoverIndexChange,
  pois = [],
  placing = false,
  onMapClick,
  onRemovePoi,
}: {
  track: TrackPoint[];
  hoverIndex: number | null;
  onHoverIndexChange: (index: number | null) => void;
  pois?: PoiMarkerData[];
  placing?: boolean;
  onMapClick?: (lat: number, lon: number) => void;
  onRemovePoi?: (key: string) => void;
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

      {onMapClick && <ClickToPlaceLayer placing={placing} onMapClick={onMapClick} />}

      {pois.map((poi) => (
        <Marker key={poi.key} position={[poi.lat, poi.lon]} icon={poiIcon(poi.category)}>
          <Popup>
            <div className="min-w-[10rem] text-sm">
              <div className="font-semibold">{poi.name}</div>
              <div className="text-xs uppercase tracking-wide text-neutral-500">
                {POI_LABELS[poi.category]}
              </div>
              {poi.description && <p className="mt-1">{poi.description}</p>}
              {poi.url && (
                <a
                  href={poi.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 block text-amber-hover underline"
                >
                  Visit website ↗
                </a>
              )}
              {onRemovePoi && (
                <button
                  type="button"
                  onClick={() => onRemovePoi(poi.key)}
                  className="mt-2 text-xs font-semibold uppercase tracking-wide text-rust"
                >
                  Remove
                </button>
              )}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
