"use client";

import { useActionState } from "react";
import Link from "next/link";
import { setNewPasswordAction, type AccountFormState } from "../actions";

const initialState: AccountFormState = { status: "idle" };

const inputClass =
  "w-full rounded-lg border border-parchment/20 bg-forest-soft px-3 py-2 text-sm text-parchment placeholder:text-parchment/40 focus:border-amber focus:outline-none";

export default function ResetPasswordPage() {
  const [state, formAction, pending] = useActionState(setNewPasswordAction, initialState);

  return (
    <div className="h-full overflow-y-auto bg-forest">
      <div className="mx-auto max-w-sm px-5 py-8 sm:py-12">
        <Link
          href="/"
          className="font-stats text-xs uppercase tracking-wide text-parchment/60 transition-colors hover:text-parchment"
        >
          &larr; Back to map
        </Link>

        <h1 className="mt-4 font-heading text-2xl font-bold uppercase tracking-wide text-parchment sm:text-3xl">
          Set a new password
        </h1>

        {state.status === "error" && state.message && (
          <div className="mt-6 rounded-lg border border-rust/50 bg-rust/10 px-4 py-3 text-sm text-parchment">
            {state.message}{" "}
            <Link href="/login" className="underline hover:text-amber">
              Back to sign in
            </Link>
          </div>
        )}

        <form action={formAction} className="mt-6 flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="font-heading text-xs font-semibold uppercase tracking-wider text-parchment/70">
              New password
            </span>
            <input name="password" type="password" required minLength={6} className={inputClass} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="font-heading text-xs font-semibold uppercase tracking-wider text-parchment/70">
              Confirm new password
            </span>
            <input name="confirmPassword" type="password" required minLength={6} className={inputClass} />
          </label>
          <button
            type="submit"
            disabled={pending}
            className="mt-2 rounded-full bg-amber px-5 py-2.5 text-sm font-semibold uppercase tracking-wide text-forest transition-colors hover:bg-amber-hover disabled:opacity-60"
          >
            {pending ? "Saving…" : "Save new password"}
          </button>
        </form>
      </div>
    </div>
  );
}
