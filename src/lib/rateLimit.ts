/**
 * A small throttle for the endpoints anyone can reach.
 *
 * Two of them do things on a stranger's behalf: `/api/auth/login` sends mail to
 * any address it is given, and `/api/applications` creates a user account from
 * an unauthenticated request. Without a limit, one script can mail-bomb a
 * doctor's inbox, burn the SMTP quota, or fill the users table overnight.
 *
 * Deliberately in-memory rather than a dependency. It resets on deploy and is
 * per-instance, so on several serverless instances the real ceiling is the
 * limit times the instance count — enough to stop casual abuse, not a defence
 * against a distributed attack. If this site ever needs that, the counters
 * belong in Redis or at the edge, not here.
 */

interface Bucket {
  count: number;
  /** When the window began, in ms. */
  start: number;
}

const buckets = new Map<string, Bucket>();

/** Stop the map growing without bound on a long-lived server. */
function sweep(now: number, windowMs: number) {
  if (buckets.size < 5000) return;
  for (const [key, bucket] of buckets) {
    if (now - bucket.start > windowMs) buckets.delete(key);
  }
}

export interface RateLimitResult {
  ok: boolean;
  /** Seconds until the caller may try again. Only meaningful when blocked. */
  retryAfter: number;
}

/**
 * Count one hit against `key`.
 *
 * A fixed window, not a sliding one: it can allow up to 2x the limit across a
 * window boundary, which is a fine trade for something this simple.
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  sweep(now, windowMs);

  const bucket = buckets.get(key);

  if (!bucket || now - bucket.start > windowMs) {
    buckets.set(key, { count: 1, start: now });
    return { ok: true, retryAfter: 0 };
  }

  bucket.count += 1;

  if (bucket.count > limit) {
    return {
      ok: false,
      retryAfter: Math.max(1, Math.ceil((bucket.start + windowMs - now) / 1000)),
    };
  }

  return { ok: true, retryAfter: 0 };
}

/**
 * Best-effort caller identity.
 *
 * `x-forwarded-for` is set by whatever proxy is in front — on Vercel that is
 * trustworthy; behind a misconfigured proxy it is a client-supplied header and
 * can be forged. Treated as a speed bump, which is all this is.
 */
export function clientKey(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim();
  return ip || req.headers.get("x-real-ip") || "unknown";
}

/** Normalised so casing or stray spaces cannot buy extra attempts. */
export function emailKey(email: string): string {
  return email.trim().toLowerCase();
}
