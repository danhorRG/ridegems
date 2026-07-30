import type { User } from "@supabase/supabase-js";

/**
 * Single-admin check via env var rather than a DB role/column -- this is a
 * one-person-curated site, so a hardcoded allowed email is simpler than a
 * roles table. Set ADMIN_EMAIL in .env.local (and in Vercel's project env
 * vars) to your account's email; never NEXT_PUBLIC_ since it gates
 * privileged server actions.
 */
export function isAdminUser(user: Pick<User, "email"> | null | undefined): boolean {
  const adminEmail = process.env.ADMIN_EMAIL;
  return Boolean(adminEmail && user?.email === adminEmail);
}
