"use client";

import { useEffect, useState } from "react";
import RouteDetailInteractive from "./RouteDetailInteractive";
import { POI_CATEGORIES, POI_LABELS, PoiIcon } from "@/lib/poi";
import type { TrackPoint } from "@/lib/geo";
import type { PoiCategory } from "@/types/route";

export interface DraftPoi {
  key: string;
  id: string | null;
  name: string;
  description: string;
  category: PoiCategory;
  lat: number;
  lon: number;
  url: string;
  removed: boolean;
}

export interface ExistingPoi {
  id: string;
  name: string;
  description: string | null;
  category: PoiCategory;
  lat: number;
  lon: number;
  url: string | null;
}

const inputClass =
  "w-full rounded-lg border border-parchment/20 bg-forest-soft px-3 py-2 text-sm text-parchment placeholder:text-parchment/40 focus:border-amber focus:outline-none";

function draftFromExisting(pois: ExistingPoi[]): DraftPoi[] {
  return pois.map((p) => ({
    key: p.id,
    id: p.id,
    name: p.name,
    description: p.description ?? "",
    category: p.category,
    lat: p.lat,
    lon: p.lon,
    url: p.url ?? "",
    removed: false,
  }));
}

export default function PoiEditor({
  track,
  initialPois,
  onChange,
}: {
  track: TrackPoint[];
  initialPois: ExistingPoi[];
  onChange: (pois: DraftPoi[]) => void;
}) {
  const [draftPois, setDraftPois] = useState<DraftPoi[]>(() => draftFromExisting(initialPois));
  const [placing, setPlacing] = useState(false);
  const [pendingPoint, setPendingPoint] = useState<{ lat: number; lon: number } | null>(null);
  const [formName, setFormName] = useState("");
  const [formCategory, setFormCategory] = useState<PoiCategory>("viewpoint");
  const [formDescription, setFormDescription] = useState("");
  const [formUrl, setFormUrl] = useState("");

  useEffect(() => {
    onChange(draftPois);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftPois]);

  function handleMapClick(lat: number, lon: number) {
    setPlacing(false);
    setPendingPoint({ lat, lon });
    setFormName("");
    setFormCategory("viewpoint");
    setFormDescription("");
    setFormUrl("");
  }

  function confirmPendingPoint() {
    if (!pendingPoint || !formName.trim()) return;
    setDraftPois((prev) => [
      ...prev,
      {
        key: crypto.randomUUID(),
        id: null,
        name: formName.trim(),
        description: formDescription.trim(),
        category: formCategory,
        lat: pendingPoint.lat,
        lon: pendingPoint.lon,
        url: formUrl.trim(),
        removed: false,
      },
    ]);
    setPendingPoint(null);
  }

  function removePoi(key: string) {
    setDraftPois((prev) =>
      prev
        // Existing (saved) points: mark for deletion on save, but keep the
        // record around so the diff in EditForm knows which id to delete.
        .map((p) => (p.key === key && p.id !== null ? { ...p, removed: true } : p))
        // New (unsaved) points: just drop them, nothing to delete server-side.
        .filter((p) => !(p.key === key && p.id === null))
    );
  }

  const visiblePois = draftPois.filter((p) => !p.removed);

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <span className="font-heading text-xs font-semibold uppercase tracking-wider text-parchment/70">
          Points of interest
        </span>
        <button
          type="button"
          onClick={() => {
            setPendingPoint(null);
            setPlacing((prev) => !prev);
          }}
          className={`min-h-11 shrink-0 rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-wide transition-colors ${
            placing
              ? "border-amber bg-amber text-forest"
              : "border-parchment/30 text-parchment/80 hover:border-amber hover:text-amber"
          }`}
        >
          {placing ? "Click the map…" : "+ Add point of interest"}
        </button>
      </div>

      <div className="mt-3">
        <RouteDetailInteractive
          track={track}
          pois={visiblePois.map((p) => ({
            key: p.key,
            lat: p.lat,
            lon: p.lon,
            category: p.category,
            name: p.name,
            description: p.description || null,
            url: p.url || null,
          }))}
          placing={placing}
          onMapClick={handleMapClick}
          onRemovePoi={removePoi}
        />
      </div>

      {pendingPoint && (
        <div className="mt-3 flex flex-col gap-3 rounded-lg border border-amber/40 bg-amber/10 p-3.5">
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
            {POI_CATEGORIES.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setFormCategory(category)}
                title={POI_LABELS[category]}
                className={`flex flex-col items-center gap-1 rounded-lg border p-2 text-parchment transition-colors ${
                  formCategory === category ? "border-amber bg-amber/20" : "border-parchment/20"
                }`}
              >
                <PoiIcon category={category} className="h-5 w-5" />
              </button>
            ))}
          </div>
          <p className="text-xs text-parchment/60">{POI_LABELS[formCategory]}</p>

          <input
            type="text"
            placeholder="Name"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            maxLength={120}
            className={inputClass}
          />
          <textarea
            placeholder="Short description (optional)"
            value={formDescription}
            onChange={(e) => setFormDescription(e.target.value)}
            rows={2}
            maxLength={500}
            className={inputClass}
          />
          <input
            type="url"
            placeholder="Link (optional)"
            value={formUrl}
            onChange={(e) => setFormUrl(e.target.value)}
            className={inputClass}
          />

          <div className="flex gap-2">
            <button
              type="button"
              onClick={confirmPendingPoint}
              disabled={!formName.trim()}
              className="rounded-full bg-amber px-4 py-2 text-xs font-semibold uppercase tracking-wide text-forest disabled:opacity-60"
            >
              Add point
            </button>
            <button
              type="button"
              onClick={() => setPendingPoint(null)}
              className="rounded-full border border-parchment/30 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-parchment/80"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {visiblePois.length > 0 && (
        <ul className="mt-3 flex flex-col gap-2">
          {visiblePois.map((poi) => (
            <li
              key={poi.key}
              className="flex items-center gap-3 rounded-lg border border-parchment/15 px-3 py-2.5"
            >
              <PoiIcon category={poi.category} className="h-4 w-4 shrink-0 text-amber" />
              <div className="flex-1">
                <div className="font-heading text-xs font-semibold uppercase tracking-wide text-parchment">
                  {poi.name} <span className="text-parchment/40">&middot; {POI_LABELS[poi.category]}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => removePoi(poi.key)}
                className="font-stats text-xs font-semibold uppercase tracking-wide text-rust"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
