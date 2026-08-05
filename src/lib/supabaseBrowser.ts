import { createBrowserClient } from "@supabase/ssr";
import { supabaseCookieOptions } from "./supabaseCookieOptions";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY env vars"
  );
}

/**
 * Auth-aware client for Client Components. Unlike src/lib/supabase.ts (the
 * plain anon client used for public route reads), this one persists the
 * session in cookies so the server can see who's logged in.
 */
export function createSupabaseBrowserClient() {
  return createBrowserClient(supabaseUrl!, supabaseAnonKey!, {
    cookieOptions: supabaseCookieOptions,
  });
}
