"use client";

import { Suspense, useActionState, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { signInAction, signUpAction, requestPasswordResetAction, type AuthFormState } from "./actions";

const initialState: AuthFormState = { status: "idle" };

const inputClass =
  "w-full rounded-lg border border-parchment/20 bg-forest-soft px-3 py-2 text-sm text-parchment placeholder:text-parchment/40 focus:border-amber focus:outline-none";

function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/";

  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [signInState, signInFormAction, signInPending] = useActionState(signInAction, initialState);
  const [signUpState, signUpFormAction, signUpPending] = useActionState(signUpAction, initialState);
  const [forgotState, forgotFormAction, forgotPending] = useActionState(
    requestPasswordResetAction,
    initialState
  );

  const state = mode === "signin" ? signInState : mode === "signup" ? signUpState : forgotState;

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
          {mode === "signin" ? "Sign in" : mode === "signup" ? "Create an account" : "Reset password"}
        </h1>

        {mode !== "forgot" && (
          <div className="mt-6 flex gap-1 rounded-full border border-parchment/20 p-1">
            <button
              type="button"
              onClick={() => setMode("signin")}
              className={`flex min-h-11 flex-1 items-center justify-center rounded-full text-xs font-semibold uppercase tracking-wide transition-colors ${
                mode === "signin" ? "bg-amber text-forest" : "text-parchment/60 hover:text-parchment"
              }`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => setMode("signup")}
              className={`flex min-h-11 flex-1 items-center justify-center rounded-full text-xs font-semibold uppercase tracking-wide transition-colors ${
                mode === "signup" ? "bg-amber text-forest" : "text-parchment/60 hover:text-parchment"
              }`}
            >
              Sign up
            </button>
          </div>
        )}

        {state.status === "error" && state.message && (
          <div className="mt-6 rounded-lg border border-rust/50 bg-rust/10 px-4 py-3 text-sm text-parchment">
            {state.message}
          </div>
        )}

        {state.status === "check-email" && (
          <div className="mt-6 rounded-lg border border-amber/40 bg-amber/10 px-4 py-3 text-sm text-parchment">
            Check your email to confirm your account before signing in.
          </div>
        )}

        {state.status === "reset-sent" && (
          <div className="mt-6 rounded-lg border border-amber/40 bg-amber/10 px-4 py-3 text-sm text-parchment">
            If an account exists for that email, we sent a password reset link. Check your inbox.
          </div>
        )}

        {mode === "forgot" ? (
          <form key="forgot" action={forgotFormAction} className="mt-6 flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="font-heading text-xs font-semibold uppercase tracking-wider text-parchment/70">
                Email
              </span>
              <input name="email" type="email" required className={inputClass} />
            </label>
            <button
              type="submit"
              disabled={forgotPending}
              className="mt-2 rounded-full bg-amber px-5 py-2.5 text-sm font-semibold uppercase tracking-wide text-forest transition-colors hover:bg-amber-hover disabled:opacity-60"
            >
              {forgotPending ? "Sending…" : "Send reset link"}
            </button>
            <button
              type="button"
              onClick={() => setMode("signin")}
              className="text-center text-xs uppercase tracking-wide text-parchment/60 hover:text-parchment"
            >
              &larr; Back to sign in
            </button>
          </form>
        ) : mode === "signin" ? (
          <form key="signin" action={signInFormAction} className="mt-6 flex flex-col gap-4">
            <input type="hidden" name="next" value={next} />
            <label className="flex flex-col gap-1.5">
              <span className="font-heading text-xs font-semibold uppercase tracking-wider text-parchment/70">
                Email
              </span>
              <input name="email" type="email" required className={inputClass} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="font-heading text-xs font-semibold uppercase tracking-wider text-parchment/70">
                Password
              </span>
              <input name="password" type="password" required className={inputClass} />
            </label>
            <button
              type="submit"
              disabled={signInPending}
              className="mt-2 rounded-full bg-amber px-5 py-2.5 text-sm font-semibold uppercase tracking-wide text-forest transition-colors hover:bg-amber-hover disabled:opacity-60"
            >
              {signInPending ? "Signing in…" : "Sign in"}
            </button>
            <button
              type="button"
              onClick={() => setMode("forgot")}
              className="text-center text-xs uppercase tracking-wide text-parchment/60 hover:text-parchment"
            >
              Forgot password?
            </button>
          </form>
        ) : (
          <form key="signup" action={signUpFormAction} className="mt-6 flex flex-col gap-4">
            <input type="hidden" name="next" value={next} />
            <label className="flex flex-col gap-1.5">
              <span className="font-heading text-xs font-semibold uppercase tracking-wider text-parchment/70">
                Name
              </span>
              <input name="name" type="text" required maxLength={80} className={inputClass} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="font-heading text-xs font-semibold uppercase tracking-wider text-parchment/70">
                Email
              </span>
              <input name="email" type="email" required className={inputClass} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="font-heading text-xs font-semibold uppercase tracking-wider text-parchment/70">
                Password
              </span>
              <input name="password" type="password" required minLength={6} className={inputClass} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="font-heading text-xs font-semibold uppercase tracking-wider text-parchment/70">
                Confirm password
              </span>
              <input name="confirmPassword" type="password" required minLength={6} className={inputClass} />
            </label>
            <button
              type="submit"
              disabled={signUpPending}
              className="mt-2 rounded-full bg-amber px-5 py-2.5 text-sm font-semibold uppercase tracking-wide text-forest transition-colors hover:bg-amber-hover disabled:opacity-60"
            >
              {signUpPending ? "Creating account…" : "Create account"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="h-full bg-forest" />}>
      <LoginForm />
    </Suspense>
  );
}
