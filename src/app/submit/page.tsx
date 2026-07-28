"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { submitRouteAction, type SubmitFormState } from "./actions";

const initialState: SubmitFormState = { status: "idle" };

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

export default function SubmitPage() {
  const [state, formAction, pending] = useActionState(submitRouteAction, initialState);
  const [whyLength, setWhyLength] = useState(0);

  if (state.status === "success") {
    return (
      <div className="h-full overflow-y-auto bg-forest">
        <div className="mx-auto max-w-2xl px-5 py-16 text-center">
          <h1 className="font-heading text-2xl font-bold uppercase tracking-wide text-parchment">
            Thanks!
          </h1>
          <p className="mt-3 text-sm text-parchment/80">
            <span className="font-semibold text-parchment">{state.routeName}</span> has been
            submitted and is awaiting review before it appears on the map.
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
          Share a route you&apos;ve actually ridden. It&apos;ll be reviewed before it appears on the
          map.
        </p>

        {state.status === "error" && state.message && (
          <div className="mt-6 rounded-lg border border-rust/50 bg-rust/10 px-4 py-3 text-sm text-parchment">
            {state.message}
          </div>
        )}

        <form action={formAction} className="mt-6 flex flex-col gap-5 pb-12">
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
                <option value="mixed">Mixed</option>
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

          <Field label="Description (optional)">
            <textarea name="description" rows={5} maxLength={2000} className={inputClass} />
          </Field>

          <Field label="Photos (optional)">
            <input name="photos" type="file" accept="image/*" multiple className={inputClass} />
          </Field>

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
