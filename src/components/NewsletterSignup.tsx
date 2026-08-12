"use client";

import { useActionState } from "react";
import { subscribeAction, type NewsletterFormState } from "@/app/newsletter/actions";

const initialState: NewsletterFormState = { status: "idle" };

export default function NewsletterSignup() {
  const [state, formAction, pending] = useActionState(subscribeAction, initialState);

  if (state.status === "success") {
    return (
      <div className="mt-2 rounded-lg border border-forest/15 bg-forest/5 px-4 py-4 text-center">
        <p className="text-sm font-semibold text-forest">You&apos;re on the list. We&apos;ll be in touch.</p>
      </div>
    );
  }

  return (
    <div className="mt-2 rounded-lg border border-forest/15 bg-forest/5 px-4 py-4">
      <h3 className="text-center font-heading text-sm font-semibold uppercase tracking-wider text-forest">
        Get the best new routes, occasionally.
      </h3>
      <p className="mt-1 text-center text-xs leading-snug text-forest/60">
        A short roundup of the best additions to RideGems.
      </p>
      <form action={formAction} className="mt-3 flex flex-col gap-2">
        <input
          type="email"
          name="email"
          required
          placeholder="your@email.com"
          className="w-full rounded-lg border border-forest/20 bg-white px-3 py-2 text-sm text-forest placeholder:text-forest/40 focus:border-amber focus:outline-none"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-amber px-4 py-2 text-xs font-semibold uppercase tracking-wide text-forest transition-colors hover:bg-amber-hover disabled:opacity-60"
        >
          {pending ? "Signing up…" : "Sign me up"}
        </button>
      </form>
      {state.status === "error" && state.message && (
        <p className="mt-2 text-xs text-rust">{state.message}</p>
      )}
      <p className="mt-2 text-center text-[0.65rem] text-forest/40">
        No spam, no schedule pressure — just the good stuff.
      </p>
    </div>
  );
}
