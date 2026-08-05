/**
 * Shared cookie options for every Supabase client (browser, server, proxy).
 * `secure` isn't set by @supabase/ssr's own defaults, so without this the
 * session cookie could be sent over a plain-HTTP connection. `httpOnly`
 * stays false -- that's a deliberate constraint of this cookie-session
 * architecture, not an oversight: the browser client reads the session
 * cookie via document.cookie, so an httpOnly cookie would break client-side
 * auth state entirely. XSS protection has to come from not having XSS
 * (sanitized rendering, no dangerouslySetInnerHTML of user input), not from
 * this flag.
 */
export const supabaseCookieOptions = {
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
};
