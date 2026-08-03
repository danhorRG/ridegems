"use client";

import { useActionState, useState } from "react";
import {
  updateNameAction,
  updatePasswordAction,
  deleteAccountAction,
  type AccountFormState,
} from "./actions";

const initialState: AccountFormState = { status: "idle" };

const inputClass =
  "w-full rounded-lg border border-parchment/20 bg-forest-soft px-3 py-2 text-sm text-parchment placeholder:text-parchment/40 focus:border-amber focus:outline-none";

const labelClass = "font-heading text-xs font-semibold uppercase tracking-wider text-parchment/70";

function StatusBanner({ state }: { state: AccountFormState }) {
  if (state.status === "error" && state.message) {
    return (
      <div className="mt-4 rounded-lg border border-rust/50 bg-rust/10 px-4 py-3 text-sm text-parchment">
        {state.message}
      </div>
    );
  }
  if (state.status === "success" && state.message) {
    return (
      <div className="mt-4 rounded-lg border border-moss/50 bg-moss/10 px-4 py-3 text-sm text-parchment">
        {state.message}
      </div>
    );
  }
  return null;
}

function NameSection({ fullName }: { fullName: string }) {
  const [state, formAction, pending] = useActionState(updateNameAction, initialState);
  return (
    <section className="mt-8">
      <h2 className="font-heading text-sm font-semibold uppercase tracking-wider text-parchment/70">
        Name
      </h2>
      <form action={formAction} className="mt-3 flex flex-col gap-3">
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Display name</span>
          <input
            name="name"
            type="text"
            required
            maxLength={80}
            defaultValue={fullName}
            className={inputClass}
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="self-start rounded-full bg-amber px-5 py-2 text-sm font-semibold uppercase tracking-wide text-forest transition-colors hover:bg-amber-hover disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save name"}
        </button>
      </form>
      <StatusBanner state={state} />
    </section>
  );
}

function PasswordSection() {
  const [state, formAction, pending] = useActionState(updatePasswordAction, initialState);
  return (
    <section className="mt-8">
      <h2 className="font-heading text-sm font-semibold uppercase tracking-wider text-parchment/70">
        Password
      </h2>
      <form action={formAction} key={state.status === "success" ? "reset" : "form"} className="mt-3 flex flex-col gap-3">
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Current password</span>
          <input name="currentPassword" type="password" required className={inputClass} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>New password</span>
          <input name="newPassword" type="password" required minLength={6} className={inputClass} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Confirm new password</span>
          <input name="confirmPassword" type="password" required minLength={6} className={inputClass} />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="self-start rounded-full bg-amber px-5 py-2 text-sm font-semibold uppercase tracking-wide text-forest transition-colors hover:bg-amber-hover disabled:opacity-60"
        >
          {pending ? "Updating…" : "Update password"}
        </button>
      </form>
      <StatusBanner state={state} />
    </section>
  );
}

function DeleteAccountSection({ email }: { email: string }) {
  const [state, formAction, pending] = useActionState(deleteAccountAction, initialState);
  const [confirming, setConfirming] = useState(false);

  return (
    <section className="mt-10 rounded-lg border border-rust/40 p-4">
      <h2 className="font-heading text-sm font-semibold uppercase tracking-wider text-rust">
        Delete account
      </h2>
      <p className="mt-2 text-sm text-parchment/60">
        This permanently deletes your account and sign-in. Routes you&apos;ve submitted stay
        published but are no longer linked to your account.
      </p>

      {!confirming ? (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="mt-3 rounded-full border border-rust/50 px-5 py-2 text-sm font-semibold uppercase tracking-wide text-rust transition-colors hover:bg-rust/10"
        >
          Delete my account
        </button>
      ) : (
        <form action={formAction} className="mt-3 flex flex-col gap-3">
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>
              Type <span className="text-parchment">{email}</span> to confirm
            </span>
            <input name="confirmEmail" type="text" required className={inputClass} autoComplete="off" />
          </label>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={pending}
              className="rounded-full bg-rust px-5 py-2 text-sm font-semibold uppercase tracking-wide text-parchment transition-colors hover:bg-rust/80 disabled:opacity-60"
            >
              {pending ? "Deleting…" : "Permanently delete"}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="rounded-full border border-parchment/20 px-5 py-2 text-sm font-semibold uppercase tracking-wide text-parchment/70 hover:text-parchment"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
      <StatusBanner state={state} />
    </section>
  );
}

export default function AccountClient({
  fullName,
  email,
}: {
  fullName: string;
  email: string;
}) {
  return (
    <>
      <NameSection fullName={fullName} />
      <PasswordSection />
      <DeleteAccountSection email={email} />
    </>
  );
}
