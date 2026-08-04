"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import type { RoutePhoto } from "@/types/route";

export default function PhotoGallery({
  photos,
  routeName,
}: {
  photos: RoutePhoto[];
  routeName: string;
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  useEffect(() => {
    if (openIndex === null) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpenIndex(null);
      if (e.key === "ArrowRight") setOpenIndex((i) => (i === null ? i : (i + 1) % photos.length));
      if (e.key === "ArrowLeft")
        setOpenIndex((i) => (i === null ? i : (i - 1 + photos.length) % photos.length));
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [openIndex, photos.length]);

  if (photos.length === 0) {
    return <p className="mt-2 text-sm text-parchment/50">No photos yet.</p>;
  }

  const openPhoto = openIndex !== null ? photos[openIndex] : null;

  return (
    <>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {photos.map((photo, i) => (
          <button
            key={photo.url}
            type="button"
            onClick={() => setOpenIndex(i)}
            className="relative aspect-square w-full overflow-hidden rounded-lg bg-forest-soft"
          >
            <Image
              src={photo.url}
              alt={photo.caption ?? routeName}
              fill
              sizes="(min-width: 640px) 33vw, 50vw"
              className="object-cover transition-transform hover:scale-105"
              priority={i === 0}
            />
          </button>
        ))}
      </div>

      {openPhoto && (
        <div
          className="fixed inset-0 z-[1100] flex flex-col items-center justify-center bg-black/90 p-4"
          onClick={() => setOpenIndex(null)}
        >
          <button
            type="button"
            onClick={() => setOpenIndex(null)}
            aria-label="Close"
            className="absolute right-4 top-4 rounded-full p-2 text-parchment/70 hover:bg-white/10 hover:text-parchment"
          >
            <svg viewBox="0 0 20 20" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" d="M5 5l10 10M15 5L5 15" />
            </svg>
          </button>

          {photos.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenIndex((i) => (i === null ? i : (i - 1 + photos.length) % photos.length));
                }}
                aria-label="Previous photo"
                className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full p-2 text-parchment/70 hover:bg-white/10 hover:text-parchment sm:left-4"
              >
                <svg viewBox="0 0 20 20" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth={1.6}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12.5 4.5L6 10l6.5 5.5" />
                </svg>
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenIndex((i) => (i === null ? i : (i + 1) % photos.length));
                }}
                aria-label="Next photo"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-2 text-parchment/70 hover:bg-white/10 hover:text-parchment sm:right-4"
              >
                <svg viewBox="0 0 20 20" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth={1.6}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 4.5L14 10l-6.5 5.5" />
                </svg>
              </button>
            </>
          )}

          <div
            className="relative h-[75vh] w-full max-w-4xl"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={openPhoto.url}
              alt={openPhoto.caption ?? routeName}
              fill
              sizes="100vw"
              className="object-contain"
            />
          </div>

          {openPhoto.caption && (
            <p className="mt-3 max-w-xl text-center text-sm text-parchment/70">{openPhoto.caption}</p>
          )}
          {photos.length > 1 && (
            <p className="mt-1 font-stats text-xs text-parchment/40">
              {openIndex! + 1} / {photos.length}
            </p>
          )}
        </div>
      )}
    </>
  );
}
