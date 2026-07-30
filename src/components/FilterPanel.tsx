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
  mtb: "MTB",
};

interface FilterPanelProps {
  filters: FilterState;
  onChange: (next: FilterState) => void;
  onReset: () => void;
  bounds: { maxDistanceKm: number; maxElevationGainM: number };
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
      className={`min-h-9 rounded-full border px-3.5 text-xs font-semibold uppercase tracking-wide transition-colors ${
        active
          ? "border-amber bg-amber text-forest"
          : "border-forest/20 bg-transparent text-forest/70 hover:border-forest/40"
      }`}
    >
      {children}
    </button>
  );
}

export default function FilterPanel({ filters, onChange, onReset, bounds }: FilterPanelProps) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-sm font-semibold uppercase tracking-wider text-forest/70">
          Filters
        </h2>
        <button
          type="button"
          onClick={onReset}
          className="text-xs font-semibold uppercase tracking-wide text-rust hover:text-rust/80"
        >
          Reset
        </button>
      </div>

      <section>
        <h3 className="mb-2 text-[0.7rem] font-semibold uppercase tracking-wider text-forest/50">
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
        <h3 className="mb-2 text-[0.7rem] font-semibold uppercase tracking-wider text-forest/50">
          Surface
        </h3>
        <div className="flex flex-wrap gap-2">
          {ALL_SURFACES.map((s) => (
            <Chip
              key={s}
              active={filters.surfaces.includes(s)}
              onClick={() => onChange({ ...filters, surfaces: toggleValue(filters.surfaces, s) })}
            >
              {SURFACE_LABELS[s]}
            </Chip>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-1 flex items-baseline justify-between">
          <h3 className="text-[0.7rem] font-semibold uppercase tracking-wider text-forest/50">
            Max distance
          </h3>
          <span className="font-stats text-xs text-forest/70">
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
          className="h-9 w-full accent-amber"
        />
      </section>

      <section>
        <div className="mb-1 flex items-baseline justify-between">
          <h3 className="text-[0.7rem] font-semibold uppercase tracking-wider text-forest/50">
            Max elevation gain
          </h3>
          <span className="font-stats text-xs text-forest/70">
            {Math.round(filters.maxElevationGainM)} m
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={Math.max(bounds.maxElevationGainM, 1)}
          step={1}
          value={filters.maxElevationGainM}
          onChange={(e) => onChange({ ...filters, maxElevationGainM: Number(e.target.value) })}
          className="h-9 w-full accent-amber"
        />
      </section>
    </div>
  );
}
