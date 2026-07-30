import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Bypasses RLS entirely (route_pois/route_photos deletes cascade from
 * routes too) -- only ever call this after independently verifying the
 * caller is the admin (see isAdminUser). Server-only: never import this
 * from a "use client" file.
 */
export function createSupabaseAdminClient() {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars");
  }
  return createClient(supabaseUrl, serviceRoleKey);
}
