import { headers } from "next/headers";

interface Bucket {
  count: number;
  resetAt: number;
}

// In-memory fixed-window limiter: no new infra, but only throttles within a
// single server instance and resets on redeploy/restart. Good enough as a
// first layer on top of Supabase's own platform-level limits; if this ever
// runs multi-instance, swap the Map for a shared store (e.g. Upstash Redis)
// behind the same checkRateLimit signature.
const buckets = new Map<string, Bucket>();
const MAX_TRACKED_BUCKETS = 5000;

export interface RateLimitResult {
  ok: boolean;
  retryAfterSeconds?: number;
}

export function checkRateLimit(
  key: string,
  { limit, windowSeconds }: { limit: number; windowSeconds: number }
): RateLimitResult {
  const now = Date.now();

  if (buckets.size > MAX_TRACKED_BUCKETS) {
    for (const [k, b] of buckets) {
      if (b.resetAt <= now) buckets.delete(k);
    }
  }

  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
    return { ok: true };
  }

  if (existing.count >= limit) {
    return { ok: false, retryAfterSeconds: Math.ceil((existing.resetAt - now) / 1000) };
  }

  existing.count += 1;
  return { ok: true };
}

/** Best-effort client IP from the proxy chain; falls back to a shared bucket if absent. */
export async function getClientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return h.get("x-real-ip") ?? "unknown";
}

export function rateLimitMessage(result: RateLimitResult): string {
  const wait = result.retryAfterSeconds ?? 60;
  const unit = wait > 90 ? `${Math.ceil(wait / 60)} minutes` : `${wait} seconds`;
  return `Too many attempts. Try again in ${unit}.`;
}
