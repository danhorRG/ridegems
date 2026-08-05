"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { submitRoutePayload, type SubmitFormState } from "./actions";
import { parseGpx } from "@/lib/gpx";
import { buildTrackPoints, simplifyLine, boundsOf, statsFromTrack } from "@/lib/geo";
import { fetchElevations } from "@/lib/elevation";
import { createSupabaseBrowserClient } from "@/lib/supabaseBrowser";

const initialState: SubmitFormState = { status: "idle" };

// Sanity guard only — GPX parsing happens in the browser, so there's no
// server body-size limit to worry about. This just stops someone from
// accidentally hanging their own browser on a mislabeled huge file.
const MAX_GPX_BYTES = 30 * 1024 * 1024;

// Photos upload straight to Supabase Storage, so there's no request-size
// limit forcing this — it's here to keep storage usage and page load times
// reasonable, since we don't downscale what's uploaded.
const MAX_PHOTO_BYTES = 1 * 1024 * 1024;

const PHOTO_CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

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

export default function SubmitForm() {
  const [result, setResult] = useState<SubmitFormState>(initialState);
  const [pending, startTransition] = useTransition();
  const [whyLength, setWhyLength] = useState(0);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [photoCaptions, setPhotoCaptions] = useState<string[]>([]);
  const dragIndexRef = useRef<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const photoPreviewUrls = useMemo(
    () => photoFiles.map((f) => URL.createObjectURL(f)),
    [photoFiles]
  );
  useEffect(() => {
    return () => photoPreviewUrls.forEach((url) => URL.revokeObjectURL(url));
  }, [photoPreviewUrls]);

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    setPhotoFiles(files);
    setPhotoCaptions(files.map(() => ""));
  }

  function movePhoto(from: number, to: number) {
    if (from === to) return;
    setPhotoFiles((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
    setPhotoCaptions((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }

  function handlePhotoDragStart(index: number) {
    dragIndexRef.current = index;
  }

  function handlePhotoDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    setDragOverIndex(index);
    const from = dragIndexRef.current;
    if (from === null || from === index) return;
    movePhoto(from, index);
    dragIndexRef.current = index;
  }

  function handlePhotoDragEnd() {
    dragIndexRef.current = null;
    setDragOverIndex(null);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    const gpxFile = formData.get("gpx");
    if (!(gpxFile instanceof File) || gpxFile.size === 0) {
      setResult({ status: "error", message: "Please choose a GPX file." });
      return;
    }
    if (gpxFile.size > MAX_GPX_BYTES) {
      setResult({ status: "error", message: "That GPX file looks unusually large — double check it's a track export, not something else." });
      return;
    }

    const oversizedPhotos = photoFiles.filter((f) => f.size > MAX_PHOTO_BYTES);
    if (oversizedPhotos.length > 0) {
      const names = oversizedPhotos.map((f) => `${f.name} (${(f.size / 1024 / 1024).toFixed(1)}MB)`).join(", ");
      setResult({
        status: "error",
        message: `Photos must be ${MAX_PHOTO_BYTES / 1024 / 1024}MB or smaller — resize these and try again: ${names}`,
      });
      return;
    }

    startTransition(async () => {
      const gpxText = await gpxFile.text();

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

      // GPX-reported elevation (GPS/barometric) is noisy and occasionally
      // spikes by hundreds of meters on a single point. Replace it with
      // real terrain elevation looked up by coordinate, falling back to
      // the GPX's own values only if the lookup fails.
      let track = buildTrackPoints(parsed.points);
      const apiKey = process.env.NEXT_PUBLIC_MAPTILER_KEY;
      if (apiKey) {
        try {
          const elevations = await fetchElevations(
            track.map((p) => ({ lon: p.lon, lat: p.lat })),
            apiKey
          );
          track = track.map((p, i) => ({ ...p, elevationM: Math.round(elevations[i]) }));
        } catch (err) {
          console.warn("Elevation lookup failed, using GPX-reported elevation instead.", err);
        }
      }

      const stats = statsFromTrack(track);
      const distanceKm = track[track.length - 1]?.distanceKm ?? 0;

      // Uploaded directly to Supabase Storage from the browser — never
      // passes through our server, so it isn't subject to Vercel's request
      // body limit either. Session-aware client so the storage insert
      // policy (auth.uid() is not null) can see who's uploading.
      const supabase = createSupabaseBrowserClient();
      const photos: { url: string; caption: string | null }[] = [];
      for (let i = 0; i < photoFiles.length; i++) {
        const file = photoFiles[i];
        const ext = "." + (file.name.split(".").pop() ?? "").toLowerCase();
        const contentType = PHOTO_CONTENT_TYPES[ext];
        if (!contentType) continue;

        const path = `submissions/${crypto.randomUUID()}${ext}`;
        const { error } = await supabase.storage
          .from("route-photos")
          .upload(path, file, { contentType });
        if (error) continue;

        const { data } = supabase.storage.from("route-photos").getPublicUrl(path);
        const caption = photoCaptions[i]?.trim() || null;
        photos.push({ url: data.publicUrl, caption });
      }

      const response = await submitRoutePayload({
        name: String(formData.get("name") ?? ""),
        description: String(formData.get("description") ?? ""),
        difficulty: String(formData.get("difficulty") ?? ""),
        surface: String(formData.get("surface") ?? ""),
        whyRecommended: String(formData.get("whyRecommended") ?? ""),
        distanceKm,
        elevationGainM: stats.elevationGainM,
        elevationLossM: stats.elevationLossM,
        minElevationM: stats.minElevationM,
        maxElevationM: stats.maxElevationM,
        coordinates,
        profile: stats.profile,
        bounds,
        track,
        photos,
      });
      setResult(response);
    });
  }

  if (result.status === "success") {
    return (
      <div className="h-full overflow-y-auto bg-forest">
        <div className="mx-auto max-w-2xl px-5 py-16 text-center">
          <h1 className="font-heading text-2xl font-bold uppercase tracking-wide text-parchment">
            Thanks!
          </h1>
          <p className="mt-3 text-sm text-parchment/80">
            <span className="font-semibold text-parchment">{result.routeName}</span> is live on
            the map now.
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
          href="/"
          className="font-stats text-xs uppercase tracking-wide text-parchment/60 transition-colors hover:text-parchment"
        >
          &larr; Back to map
        </Link>

        <h1 className="mt-4 font-heading text-2xl font-bold uppercase tracking-wide text-parchment sm:text-3xl">
          Submit a route
        </h1>
        <p className="mt-2 text-sm text-parchment/70">
          Share a route you&apos;ve actually ridden — help us build an ultimate collection so that
          wherever you travel, there&apos;s a local&apos;s route waiting for you.
        </p>

        {result.status === "error" && result.message && (
          <div className="mt-6 rounded-lg border border-rust/50 bg-rust/10 px-4 py-3 text-sm text-parchment">
            {result.message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-5 pb-12">
          <Field label="Route name">
            <input name="name" type="text" required maxLength={120} className={inputClass} />
          </Field>

          <Field label="GPX file">
            <input name="gpx" type="file" accept=".gpx" required className={inputClass} />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Difficulty">
              <select name="difficulty" required defaultValue="" className={inputClass}>
                <option value="" disabled>
                  Choose one
                </option>
                <option value="easy">Easy</option>
                <option value="moderate">Moderate</option>
                <option value="hard">Hard</option>
              </select>
            </Field>
            <Field label="Surface">
              <select name="surface" required defaultValue="" className={inputClass}>
                <option value="" disabled>
                  Choose one
                </option>
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
              onChange={(e) => setWhyLength(e.target.value.length)}
              className={inputClass}
            />
          </Field>

          <Field label="Description">
            <textarea name="description" required rows={5} maxLength={2000} className={inputClass} />
          </Field>

          <Field label="Photos (optional, max 1MB each)">
            <input
              name="photos"
              type="file"
              accept="image/*"
              multiple
              onChange={handlePhotoChange}
              className={inputClass}
            />
          </Field>

          {photoFiles.length > 0 && (
            <div>
              {photoFiles.length > 1 && (
                <p className="mb-2 text-xs text-parchment/50">Drag photos to reorder them.</p>
              )}
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                {photoFiles.map((file, i) => (
                  <div
                    key={i}
                    draggable
                    onDragStart={() => handlePhotoDragStart(i)}
                    onDragOver={(e) => handlePhotoDragOver(e, i)}
                    onDrop={(e) => e.preventDefault()}
                    onDragEnd={handlePhotoDragEnd}
                    className={`flex cursor-grab flex-col gap-1.5 active:cursor-grabbing ${
                      dragOverIndex === i ? "outline outline-2 outline-amber" : ""
                    }`}
                  >
                    <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-forest-soft">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photoPreviewUrls[i]}
                        alt=""
                        className="pointer-events-none absolute inset-0 h-full w-full object-cover"
                      />
                      <span className="absolute left-1 top-1 z-10 rounded bg-forest/80 px-1.5 py-0.5 text-[0.65rem] tracking-wide text-parchment/70">
                        ⠿
                      </span>
                    </div>
                    <input
                      type="text"
                      placeholder="Caption (optional)"
                      maxLength={90}
                      value={photoCaptions[i] ?? ""}
                      onChange={(e) =>
                        setPhotoCaptions((prev) => prev.map((c, idx) => (idx === i ? e.target.value : c)))
                      }
                      className={inputClass}
                    />
                    <span className="text-right text-[0.65rem] text-parchment/40">
                      {(photoCaptions[i] ?? "").length}/90
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={pending}
            className="mt-2 rounded-full bg-amber px-5 py-2.5 text-sm font-semibold uppercase tracking-wide text-forest transition-colors hover:bg-amber-hover disabled:opacity-60"
          >
            {pending ? "Submitting…" : "Submit route"}
          </button>
        </form>
      </div>
    </div>
  );
}
