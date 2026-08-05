"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { updateRouteAction, deleteRouteAction, type EditFormState } from "./actions";
import { createSupabaseBrowserClient } from "@/lib/supabaseBrowser";
import PoiEditor, { type DraftPoi, type ExistingPoi } from "@/components/PoiEditor";
import { parseGpx } from "@/lib/gpx";
import { buildTrackPoints, simplifyLine, boundsOf, statsFromTrack, type TrackPoint } from "@/lib/geo";
import { fetchElevations } from "@/lib/elevation";

const initialState: EditFormState = { status: "idle" };

const MAX_PHOTO_BYTES = 1 * 1024 * 1024;
const PHOTO_CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

// Sanity guard only — GPX parsing happens in the browser, so there's no
// server body-size limit to worry about. This just stops someone from
// accidentally hanging their own browser on a mislabeled huge file.
const MAX_GPX_BYTES = 30 * 1024 * 1024;

const inputClass =
  "w-full rounded-lg border border-parchment/20 bg-forest-soft px-3 py-2 text-sm text-parchment placeholder:text-parchment/40 focus:border-amber focus:outline-none";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-heading text-xs font-semibold uppercase tracking-wider text-parchment/70">
        {label}
      </span>
      {children}
    </label>
  );
}

interface ExistingPhoto {
  id: string;
  url: string;
  caption: string | null;
}

export default function EditForm({
  slug,
  name,
  description,
  difficulty,
  surface,
  whyRecommended,
  photos,
  track,
  pois,
  canDelete = false,
}: {
  slug: string;
  name: string;
  description: string;
  difficulty: string;
  surface: string;
  whyRecommended: string;
  photos: ExistingPhoto[];
  track: TrackPoint[];
  pois: ExistingPoi[];
  canDelete?: boolean;
}) {
  const router = useRouter();
  const [result, setResult] = useState<EditFormState>(initialState);
  const [pending, startTransition] = useTransition();
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [whyLength, setWhyLength] = useState(whyRecommended.length);
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());
  const [draftPois, setDraftPois] = useState<DraftPoi[]>([]);
  const [photoCaptions, setPhotoCaptions] = useState<Record<string, string>>(() =>
    Object.fromEntries(photos.map((p) => [p.id, p.caption ?? ""]))
  );
  const [photoOrder, setPhotoOrder] = useState<string[]>(() => photos.map((p) => p.id));
  const orderedPhotos = useMemo(
    () => photoOrder.map((id) => photos.find((p) => p.id === id)).filter((p): p is ExistingPhoto => !!p),
    [photoOrder, photos]
  );
  const dragIndexRef = useRef<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  function handlePhotoDragStart(index: number) {
    dragIndexRef.current = index;
  }

  function handlePhotoDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    setDragOverIndex(index);
    const from = dragIndexRef.current;
    if (from === null || from === index) return;
    setPhotoOrder((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(index, 0, moved);
      return next;
    });
    dragIndexRef.current = index;
  }

  function handlePhotoDragEnd() {
    dragIndexRef.current = null;
    setDragOverIndex(null);
  }

  const [newPhotoFiles, setNewPhotoFiles] = useState<File[]>([]);
  const [newPhotoCaptions, setNewPhotoCaptions] = useState<string[]>([]);

  const newPhotoPreviewUrls = useMemo(
    () => newPhotoFiles.map((f) => URL.createObjectURL(f)),
    [newPhotoFiles]
  );
  useEffect(() => {
    return () => newPhotoPreviewUrls.forEach((url) => URL.revokeObjectURL(url));
  }, [newPhotoPreviewUrls]);

  function handleNewPhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    setNewPhotoFiles(files);
    setNewPhotoCaptions(files.map(() => ""));
  }

  function handleDelete() {
    setShowDeleteConfirm(true);
  }

  function confirmDelete() {
    setShowDeleteConfirm(false);
    setDeleting(true);
    startTransition(async () => {
      const response = await deleteRouteAction(slug);
      if (response.status === "success") {
        router.push("/");
        return;
      }
      setDeleting(false);
      setResult({ status: "error", message: response.message });
    });
  }

  function toggleRemove(id: string) {
    setRemovedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    const oversized = newPhotoFiles.filter((f) => f.size > MAX_PHOTO_BYTES);
    if (oversized.length > 0) {
      const names = oversized
        .map((f) => `${f.name} (${(f.size / 1024 / 1024).toFixed(1)}MB)`)
        .join(", ");
      setResult({
        status: "error",
        message: `Photos must be ${MAX_PHOTO_BYTES / 1024 / 1024}MB or smaller — resize these and try again: ${names}`,
      });
      return;
    }

    const gpxFile = formData.get("gpx");
    const replacingGpx = gpxFile instanceof File && gpxFile.size > 0;
    if (replacingGpx && (gpxFile as File).size > MAX_GPX_BYTES) {
      setResult({
        status: "error",
        message: "That GPX file looks unusually large — double check it's a track export, not something else.",
      });
      return;
    }

    startTransition(async () => {
      let gpxReplacement: string | null = null;
      if (replacingGpx) {
        const gpxText = await (gpxFile as File).text();
        let parsed;
        try {
          parsed = parseGpx(gpxText);
        } catch {
          setResult({
            status: "error",
            message: "Could not read that GPX file — make sure it's a valid track export.",
          });
          return;
        }
        if (parsed.points.length < 2) {
          setResult({
            status: "error",
            message: "That GPX file doesn't have enough track points to plot a route.",
          });
          return;
        }

        const fullLine: [number, number][] = parsed.points.map((p) => [p.lon, p.lat]);
        const coordinates = simplifyLine(fullLine, 6);
        const bounds = boundsOf(coordinates);

        let newTrack = buildTrackPoints(parsed.points);
        const apiKey = process.env.NEXT_PUBLIC_MAPTILER_KEY;
        if (apiKey) {
          try {
            const elevations = await fetchElevations(
              newTrack.map((p) => ({ lon: p.lon, lat: p.lat })),
              apiKey
            );
            newTrack = newTrack.map((p, i) => ({ ...p, elevationM: Math.round(elevations[i]) }));
          } catch (err) {
            console.warn("Elevation lookup failed, using GPX-reported elevation instead.", err);
          }
        }

        const stats = statsFromTrack(newTrack);
        const distanceKm = newTrack[newTrack.length - 1]?.distanceKm ?? 0;

        gpxReplacement = JSON.stringify({
          distanceKm,
          elevationGainM: stats.elevationGainM,
          elevationLossM: stats.elevationLossM,
          minElevationM: stats.minElevationM,
          maxElevationM: stats.maxElevationM,
          coordinates,
          profile: stats.profile,
          bounds,
          track: newTrack,
        });
      }

      const supabase = createSupabaseBrowserClient();
      const newPhotos: { url: string; caption: string | null }[] = [];
      for (let i = 0; i < newPhotoFiles.length; i++) {
        const file = newPhotoFiles[i];
        const ext = "." + (file.name.split(".").pop() ?? "").toLowerCase();
        const contentType = PHOTO_CONTENT_TYPES[ext];
        if (!contentType) continue;

        const path = `submissions/${crypto.randomUUID()}${ext}`;
        const { error } = await supabase.storage
          .from("route-photos")
          .upload(path, file, { contentType });
        if (error) continue;

        const { data } = supabase.storage.from("route-photos").getPublicUrl(path);
        const caption = newPhotoCaptions[i]?.trim() || null;
        newPhotos.push({ url: data.publicUrl, caption });
      }

      const payload = new FormData();
      payload.set("slug", slug);
      payload.set("name", String(formData.get("name") ?? ""));
      payload.set("description", String(formData.get("description") ?? ""));
      payload.set("difficulty", String(formData.get("difficulty") ?? ""));
      payload.set("surface", String(formData.get("surface") ?? ""));
      payload.set("whyRecommended", String(formData.get("whyRecommended") ?? ""));
      payload.set("newPhotos", JSON.stringify(newPhotos));
      for (const id of removedIds) payload.append("removePhotoIds", id);

      const changedCaptions = photos
        .filter((p) => !removedIds.has(p.id) && (photoCaptions[p.id] ?? "") !== (p.caption ?? ""))
        .map((p) => ({ id: p.id, caption: photoCaptions[p.id]?.trim() || null }));
      payload.set("photoCaptions", JSON.stringify(changedCaptions));

      const remainingOrder = photoOrder.filter((id) => !removedIds.has(id));
      payload.set("photoOrder", JSON.stringify(remainingOrder));

      const removePoiIds = draftPois.filter((p) => p.id && p.removed).map((p) => p.id as string);
      const newPois = draftPois
        .filter((p) => !p.id && !p.removed)
        .map(({ name, description, category, lat, lon, url }) => ({
          name,
          description: description || null,
          category,
          lat,
          lon,
          url: url || null,
        }));
      payload.set("newPois", JSON.stringify(newPois));
      for (const id of removePoiIds) payload.append("removePoiIds", id);
      if (gpxReplacement) payload.set("gpxReplacement", gpxReplacement);

      const response = await updateRouteAction(initialState, payload);
      setResult(response);
    });
  }

  if (result.status === "success") {
    return (
      <div className="h-full overflow-y-auto bg-forest">
        <div className="mx-auto max-w-2xl px-5 py-16 text-center">
          <h1 className="font-heading text-2xl font-bold uppercase tracking-wide text-parchment">
            Saved
          </h1>
          <p className="mt-3 text-sm text-parchment/80">
            Your changes are saved and live.
          </p>
          <Link
            href="/"
            className="mt-6 inline-block font-stats text-xs uppercase tracking-wide text-amber hover:underline"
          >
            &larr; Back to map
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-forest">
      <div className="mx-auto max-w-2xl px-5 py-8 sm:py-12">
        <Link
          href={`/route/${slug}`}
          className="font-stats text-xs uppercase tracking-wide text-parchment/60 transition-colors hover:text-parchment"
        >
          &larr; Back to route
        </Link>

        <h1 className="mt-4 font-heading text-2xl font-bold uppercase tracking-wide text-parchment sm:text-3xl">
          Edit route
        </h1>
        <p className="mt-2 text-sm text-parchment/70">
          Changes go live immediately once you save.
        </p>

        {result.status === "error" && result.message && (
          <div className="mt-6 rounded-lg border border-rust/50 bg-rust/10 px-4 py-3 text-sm text-parchment">
            {result.message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-5 pb-12">
          <Field label="Route name">
            <input name="name" type="text" required maxLength={120} defaultValue={name} className={inputClass} />
          </Field>

          <Field label="Replace GPX file (optional)">
            <input name="gpx" type="file" accept=".gpx" className={inputClass} />
            <span className="text-xs text-parchment/50">
              Uploading a new track recalculates distance, elevation, and the map line. Leave empty to keep the current track.
            </span>
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Difficulty">
              <select name="difficulty" required defaultValue={difficulty} className={inputClass}>
                <option value="easy">Easy</option>
                <option value="moderate">Moderate</option>
                <option value="hard">Hard</option>
              </select>
            </Field>
            <Field label="Surface">
              <select name="surface" required defaultValue={surface} className={inputClass}>
                <option value="paved">Paved</option>
                <option value="gravel">Gravel</option>
                <option value="mtb">MTB</option>
              </select>
            </Field>
          </div>

          <Field label={`Why does this route deserve a spot? (${whyLength}/200)`}>
            <textarea
              name="whyRecommended"
              required
              maxLength={200}
              rows={3}
              defaultValue={whyRecommended}
              onChange={(e) => setWhyLength(e.target.value.length)}
              className={inputClass}
            />
          </Field>

          <Field label="Description">
            <textarea
              name="description"
              required
              rows={5}
              maxLength={2000}
              defaultValue={description}
              className={inputClass}
            />
          </Field>

          {photos.length > 0 && (
            <div>
              <span className="font-heading text-xs font-semibold uppercase tracking-wider text-parchment/70">
                Current photos
              </span>
              <p className="mt-0.5 text-xs text-parchment/50">Drag photos to reorder them.</p>
              <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {orderedPhotos.map((photo, index) => (
                  <div
                    key={photo.id}
                    draggable
                    onDragStart={() => handlePhotoDragStart(index)}
                    onDragOver={(e) => handlePhotoDragOver(e, index)}
                    onDrop={(e) => e.preventDefault()}
                    onDragEnd={handlePhotoDragEnd}
                    className={`flex cursor-grab flex-col gap-1.5 active:cursor-grabbing ${
                      dragOverIndex === index ? "outline outline-2 outline-amber" : ""
                    }`}
                  >
                    <label className="relative block aspect-square overflow-hidden rounded-lg bg-forest-soft">
                      <Image
                        src={photo.url}
                        alt={photoCaptions[photo.id] ?? ""}
                        fill
                        sizes="33vw"
                        className={`pointer-events-none object-cover ${removedIds.has(photo.id) ? "opacity-30" : ""}`}
                      />
                      <span className="absolute left-1 top-1 z-10 rounded bg-forest/80 px-1.5 py-0.5 text-[0.65rem] tracking-wide text-parchment/70">
                        ⠿
                      </span>
                      <span className="absolute inset-x-0 bottom-0 z-10 flex items-center justify-center gap-1 bg-forest/80 py-1 text-[0.65rem] uppercase tracking-wide text-parchment">
                        <input
                          type="checkbox"
                          checked={removedIds.has(photo.id)}
                          onChange={() => toggleRemove(photo.id)}
                        />
                        Remove
                      </span>
                    </label>
                    <input
                      type="text"
                      placeholder="Caption (optional)"
                      maxLength={90}
                      value={photoCaptions[photo.id] ?? ""}
                      onChange={(e) =>
                        setPhotoCaptions((prev) => ({ ...prev, [photo.id]: e.target.value }))
                      }
                      className={inputClass}
                    />
                    <span className="text-right text-[0.65rem] text-parchment/40">
                      {(photoCaptions[photo.id] ?? "").length}/90
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Field label="Add photos (optional, max 1MB each)">
            <input
              name="newPhotos"
              type="file"
              accept="image/*"
              multiple
              onChange={handleNewPhotoChange}
              className={inputClass}
            />
          </Field>

          {newPhotoFiles.length > 0 && (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {newPhotoFiles.map((file, i) => (
                <div key={i} className="flex flex-col gap-1.5">
                  <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-forest-soft">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={newPhotoPreviewUrls[i]}
                      alt=""
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  </div>
                  <input
                    type="text"
                    placeholder="Caption (optional)"
                    maxLength={90}
                    value={newPhotoCaptions[i] ?? ""}
                    onChange={(e) =>
                      setNewPhotoCaptions((prev) => prev.map((c, idx) => (idx === i ? e.target.value : c)))
                    }
                    className={inputClass}
                  />
                  <span className="text-right text-[0.65rem] text-parchment/40">
                    {(newPhotoCaptions[i] ?? "").length}/90
                  </span>
                </div>
              ))}
            </div>
          )}

          <PoiEditor track={track} initialPois={pois} onChange={setDraftPois} />

          <button
            type="submit"
            disabled={pending}
            className="mt-2 rounded-full bg-amber px-5 py-2.5 text-sm font-semibold uppercase tracking-wide text-forest transition-colors hover:bg-amber-hover disabled:opacity-60"
          >
            {pending ? "Saving…" : "Save changes"}
          </button>

          {canDelete && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={pending}
              className="rounded-full border border-rust/50 px-5 py-2.5 text-sm font-semibold uppercase tracking-wide text-rust transition-colors hover:bg-rust/10 disabled:opacity-60"
            >
              {deleting ? "Deleting…" : "Delete route"}
            </button>
          )}
        </form>
      </div>

      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-confirm-title"
        >
          <div className="w-full max-w-sm rounded-xl border border-rust/40 bg-forest p-6 shadow-xl">
            <h2 id="delete-confirm-title" className="font-heading text-lg font-semibold text-parchment">
              Delete this route?
            </h2>
            <p className="mt-2 text-sm text-parchment/70">
              Are you sure you want to permanently delete &ldquo;{name}&rdquo;? This cannot be undone.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="rounded-full border border-parchment/20 px-4 py-2 text-sm font-semibold uppercase tracking-wide text-parchment transition-colors hover:bg-parchment/10"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="rounded-full bg-rust px-4 py-2 text-sm font-semibold uppercase tracking-wide text-forest transition-colors hover:bg-rust/80"
              >
                Yes, delete route
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
