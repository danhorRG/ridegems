"use client";

import { ALL_DIFFICULTIES, ALL_SURFACES, toggleValue } from "@/lib/filters";
import type { FilterState } from "@/lib/filters";
import type { Difficulty, Surface } from "@/types/route";

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: "Easy",
  moderate: "Moderate",
  hard: "Hard",
};

const SURFACE_LABELS: Record<Surface, string> = {
  paved: "Paved",
  gravel: "Gravel",
  mixed: "Mixed",
};

interface FilterSheetProps {
  open: boolean;
  onClose: () => void;
  filters: FilterState;
  onChange: (next: FilterState) => void;
  onReset: () => void;
  bounds: { maxDistanceKm: number; maxElevationGainM: number };
  matchedCount: number;
  totalCount: number;
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`min-h-11 rounded-full border px-4 text-sm font-medium transition-colors ${
        active
          ? "border-emerald-600 bg-emerald-600 text-white"
          : "border-zinc-300 bg-white text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
      }`}
    >
      {children}
    </button>
  );
}

export default function FilterSheet({
  open,
  onClose,
  filters,
  onChange,
  onReset,
  bounds,
  matchedCount,
  totalCount,
}: FilterSheetProps) {
  return (
    <>
      <button
        type="button"
        onClick={() => onClose()}
        aria-hidden={!open}
        tabIndex={open ? 0 : -1}
        className={`fixed inset-0 z-30 bg-black/40 transition-opacity ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Filter routes"
        className={`fixed inset-x-0 bottom-0 z-40 max-h-[80vh] overflow-y-auto rounded-t-2xl bg-white pb-[calc(env(safe-area-inset-bottom)+1rem)] shadow-2xl transition-transform duration-200 ease-out dark:bg-zinc-900 ${
          open ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="mx-auto mt-3 h-1.5 w-10 rounded-full bg-zinc-300 dark:bg-zinc-700" />

        <div className="flex items-center justify-between px-5 pt-4">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Filters</h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onReset}
              className="min-h-11 rounded-full px-3 text-sm font-medium text-emerald-700 dark:text-emerald-400"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close filters"
              className="flex h-11 w-11 items-center justify-center rounded-full text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-6 px-5 pt-4">
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Difficulty
            </h3>
            <div className="flex flex-wrap gap-2">
              {ALL_DIFFICULTIES.map((d) => (
                <Chip
                  key={d}
                  active={filters.difficulties.includes(d)}
                  onClick={() =>
                    onChange({ ...filters, difficulties: toggleValue(filters.difficulties, d) })
                  }
                >
                  {DIFFICULTY_LABELS[d]}
                </Chip>
              ))}
            </div>
          </section>

          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Surface
            </h3>
            <div className="flex flex-wrap gap-2">
              {ALL_SURFACES.map((s) => (
                <Chip
                  key={s}
                  active={filters.surfaces.includes(s)}
                  onClick={() =>
                    onChange({ ...filters, surfaces: toggleValue(filters.surfaces, s) })
                  }
                >
                  {SURFACE_LABELS[s]}
                </Chip>
              ))}
            </div>
          </section>

          <section>
            <div className="mb-2 flex items-baseline justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Max distance
              </h3>
              <span className="text-sm text-zinc-600 dark:text-zinc-300">
                {filters.maxDistanceKm.toFixed(1)} km
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={Math.max(bounds.maxDistanceKm, 0.1)}
              step={0.1}
              value={filters.maxDistanceKm}
              onChange={(e) => onChange({ ...filters, maxDistanceKm: Number(e.target.value) })}
              className="h-11 w-full accent-emerald-600"
            />
          </section>

          <section>
            <div className="mb-2 flex items-baseline justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Max elevation gain
              </h3>
              <span className="text-sm text-zinc-600 dark:text-zinc-300">
                {Math.round(filters.maxElevationGainM)} m
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={Math.max(bounds.maxElevationGainM, 1)}
              step={1}
              value={filters.maxElevationGainM}
              onChange={(e) =>
                onChange({ ...filters, maxElevationGainM: Number(e.target.value) })
              }
              className="h-11 w-full accent-emerald-600"
            />
          </section>
        </div>

        <div className="px-5 pt-6">
          <button
            type="button"
            onClick={onClose}
            className="min-h-12 w-full rounded-xl bg-emerald-600 text-base font-semibold text-white active:bg-emerald-700"
          >
            Show {matchedCount} of {totalCount} routes
          </button>
        </div>
      </div>
    </>
  );
}
