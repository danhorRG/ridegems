"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { siteConfig } from "@/lib/siteConfig";
import { checkRateLimit, getClientIp, rateLimitMessage } from "@/lib/rateLimit";

export interface AuthFormState {
  status: "idle" | "error" | "check-email" | "reset-sent";
  message?: string;
}

/** Only ever redirect to a same-site relative path, never an external URL. */
function safeNextPath(formData: FormData): string {
  const next = String(formData.get("next") ?? "");
  return next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

export async function signInAction(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { status: "error", message: "Email and password are required." };
  }

  const ip = await getClientIp();
  const ipCheck = checkRateLimit(`signin:ip:${ip}`, { limit: 20, windowSeconds: 60 });
  // Keyed by email alone (not email+ip) so a distributed brute-force
  // against one account is still throttled account-wide, not just per-IP.
  const accountCheck = checkRateLimit(`signin:email:${email.toLowerCase()}`, {
    limit: 8,
    windowSeconds: 15 * 60,
  });
  if (!ipCheck.ok || !accountCheck.ok) {
    return { status: "error", message: rateLimitMessage(ipCheck.ok ? accountCheck : ipCheck) };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return { status: "error", message: error.message };
  }

  redirect(safeNextPath(formData));
}

export async function signUpAction(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!name || !email || !password) {
    return { status: "error", message: "Name, email, and password are required." };
  }
  if (name.length > 80) {
    return { status: "error", message: "Name must be 80 characters or fewer." };
  }
  if (password.length < 6) {
    return { status: "error", message: "Password must be at least 6 characters." };
  }

  const ip = await getClientIp();
  // IP-only: throttles scripted mass account creation from one source.
  const ipCheck = checkRateLimit(`signup:ip:${ip}`, { limit: 10, windowSeconds: 60 * 60 });
  if (!ipCheck.ok) {
    return { status: "error", message: rateLimitMessage(ipCheck) };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: name } },
  });
  if (error) {
    return { status: "error", message: error.message };
  }

  // If email confirmation is off in the Supabase project, signUp already
  // returns a live session -- log straight in. If it's on, there's no
  // session yet until the user clicks the confirmation link.
  if (data.session) {
    redirect(safeNextPath(formData));
  }
  return { status: "check-email" };
}

export async function requestPasswordResetAction(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) {
    return { status: "error", message: "Email is required." };
  }

  const ip = await getClientIp();
  const ipCheck = checkRateLimit(`reset:ip:${ip}`, { limit: 10, windowSeconds: 60 * 60 });
  // Per-email cap too -- this action sends a real email, so without it
  // someone could email-bomb one address by repeatedly requesting resets.
  const accountCheck = checkRateLimit(`reset:email:${email.toLowerCase()}`, {
    limit: 5,
    windowSeconds: 60 * 60,
  });
  if (!ipCheck.ok || !accountCheck.ok) {
    // Same generic message either way -- an attacker shouldn't learn
    // whether the limit was hit on the IP bucket or the account bucket.
    return { status: "reset-sent" };
  }

  const supabase = await createSupabaseServerClient();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteConfig.url}/auth/callback?next=/account/reset-password`,
  });

  // Always show the same message regardless of whether the email is
  // registered -- avoids leaking which emails have accounts.
  return { status: "reset-sent" };
}

export async function signOutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/");
}
