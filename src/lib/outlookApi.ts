import crypto from "crypto";
import type { OutlookSnapshot } from "@/lib/outlookSnapshot";

/**
 * The server side of "your latest outlook".
 *
 * `outlookSnapshot.ts` is the browser's copy — instant, and all an anonymous
 * visitor gets. This is the copy that belongs to the **account**, so signing in
 * on a phone shows the outlook run on a laptop. The browser copy stays as the
 * fast path and the fallback; this one is the truth when there is a session.
 *
 * Everything here is server-only. `NOCODE_API_BASE_URL` and `SESSION_SECRET`
 * are not public, and neither is the owner key derived from them.
 */

const NOCODE_BASE = process.env.NOCODE_API_BASE_URL || "";
const API_KEY = process.env.NOCODE_API_KEY || "";

/**
 * Who an outlook belongs to, as far as the platform is concerned.
 *
 * Not the email. An HMAC of it under this site's session secret, so the store
 * holds nothing that reads back to a person and its public endpoints cannot be
 * enumerated by anyone who does not hold the secret. Stable for one account on
 * every device, which is the entire point of the feature.
 *
 * Returns null rather than throwing when the secret is missing: the outlook is
 * a convenience, and a misconfigured environment should cost that convenience
 * and nothing else.
 */
export function outlookOwnerKey(email: string): string | null {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) return null;

  const normalised = email.trim().toLowerCase();
  if (!normalised) return null;

  return crypto
    .createHmac("sha256", secret)
    .update(`roi-outlook:${normalised}`)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * One call to the store, with a short leash.
 *
 * Nothing here is worth making anybody wait: the calculation has already
 * happened, and the dashboard has a browser copy to fall back on. So a slow or
 * unreachable backend is treated exactly like an empty one.
 */
async function call<T>(path: string, body: unknown): Promise<T | null> {
  if (!NOCODE_BASE || !API_KEY) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);
  try {
    const res = await fetch(`${NOCODE_BASE.replace(/\/$/, "")}/api/roi-outlook${path}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        // The platform's own API key — the same one payments and booking send.
        // The store is authenticated rather than public, because unlike the
        // guest tally these rows belong to somebody.
        "x-api-key": API_KEY,
      },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: controller.signal,
    });
    const payload = await res.json().catch(() => null);
    if (!res.ok || !payload?.success) return null;
    return payload.data as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Remember this outlook against the account. Never throws. */
export async function saveOutlookForOwner(
  ownerKey: string,
  outlook: OutlookSnapshot,
): Promise<void> {
  await call<{ stored: boolean }>("/save", { ownerKey, outlook });
}

/**
 * The account's latest outlook, or null.
 *
 * The stored blob is validated by the reader on the dashboard rather than here.
 * It was written by a version of this site that may not be the one reading it,
 * and one place that decides what a usable snapshot looks like is better than
 * two that can disagree.
 */
export async function readOutlookForOwner(ownerKey: string): Promise<unknown | null> {
  const data = await call<{ outlook: unknown }>("/latest", { ownerKey });
  return data?.outlook ?? null;
}
