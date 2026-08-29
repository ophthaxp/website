import crypto from "crypto";
import { cookies } from "next/headers";
import { getSessionUser } from "@/lib/session";

/**
 * The signup wall on the ROI calculator.
 *
 * A visitor gets a real taste of the tool and is then asked to sign up. The
 * allowance is deliberately two-sided, because there are two ways to get value
 * out of the calculator and capping only one of them leaves the other wide
 * open:
 *
 *   - **locations** — each new pincode is a fresh answer, and
 *   - **control changes** — re-running one location with different volumes,
 *     fees or radius is most of what the tool is for.
 *
 * Both ceilings come from env (`ROI_FREE_PINCODES`, `ROI_FREE_CONTROL_CHANGES`)
 * so they can be tuned without a code change.
 *
 * ## Why the tally is not in the browser
 *
 * The requirement was that refreshing, opening a new tab, or coming back later
 * must not hand out a fresh allowance. Anything the page can read, the page can
 * reset — so nothing is stored client-side. A visitor carries an opaque id in a
 * signed, httpOnly cookie; the counts live in the backend, keyed by that id.
 * Editing the cookie yields either a rejected signature or a brand-new id, and
 * a brand-new id is exactly what the second key below is there to catch.
 *
 * ## The second key, and its cost
 *
 * A cookie survives refresh, new tabs, closing the tab and restarting the
 * browser. It does not survive someone clearing their browsing data or opening
 * a private window. So every calculation is also counted against a coarse
 * signature of the request — network address plus browser and language headers
 * — and a visitor is allowed only while **both** keys still have room.
 *
 * That backstop has a real cost: everyone behind one office, hospital or campus
 * network shares a signature, so without care the second person to try the
 * calculator there would hit a wall they did not earn.
 * `ROI_SHARED_NETWORK_MULTIPLIER` is the dial for that. It widens the shared
 * key's ceilings relative to the per-device ones:
 *
 *   - `3` (the default) — a shared network gets 3x the allowance, so a handful
 *     of colleagues can each try it while a single person clearing cookies
 *     still runs out quickly.
 *   - `1` — strictest. The shared key is capped exactly like a device, and a
 *     busy network is walled after one visitor's worth of use.
 *   - `0` — the backstop is off. Zero false positives; clearing cookies or
 *     opening a private window resets the allowance.
 *
 * Signed-in visitors skip all of it.
 */

const NOCODE_BASE = process.env.NOCODE_API_BASE_URL || "";
const DEVICE_COOKIE = "roi_device";

export type RoiGateReason = "pincodes" | "controlChanges";

export interface RoiGateLimits {
  freePincodes: number;
  freeControlChanges: number;
}

export interface RoiGateConfig extends RoiGateLimits {
  enabled: boolean;
  sharedMultiplier: number;
  cookieDays: number;
}

function intEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === null || raw.trim() === "") return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : fallback;
}

export function roiGateConfig(): RoiGateConfig {
  return {
    // Off only when explicitly switched off, so a missing var never silently
    // opens the calculator up.
    enabled: (process.env.ROI_GATE_ENABLED ?? "true").toLowerCase() !== "false",
    freePincodes: intEnv("ROI_FREE_PINCODES", 2),
    freeControlChanges: intEnv("ROI_FREE_CONTROL_CHANGES", 5),
    sharedMultiplier: intEnv("ROI_SHARED_NETWORK_MULTIPLIER", 3),
    cookieDays: intEnv("ROI_DEVICE_COOKIE_DAYS", 365),
  };
}

// ── the device cookie ───────────────────────────────────────────────────────
// Same shape and signing as the applicant session (`src/lib/session.ts`):
// `value.signature`, both base64url. It holds nothing but a random id.

function secret(): string {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 32) {
    throw new Error("SESSION_SECRET is missing or too short (needs 32+ characters)");
  }
  return value;
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function sign(payload: string): string {
  return b64url(crypto.createHmac("sha256", secret()).update(payload).digest());
}

function readDeviceId(token: string | undefined): string | null {
  if (!token) return null;
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;
  const a = Buffer.from(signature);
  const b = Buffer.from(sign(encoded));
  // Constant-time, for the same reason the session cookie is: a plain === leaks
  // a forged signature one byte at a time.
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  return encoded;
}

export interface DeviceCookie {
  name: string;
  value: string;
  httpOnly: true;
  sameSite: "lax";
  secure: boolean;
  path: string;
  maxAge: number;
}

function mintDeviceCookie(id: string, cookieDays: number): DeviceCookie {
  return {
    name: DEVICE_COOKIE,
    value: `${id}.${sign(id)}`,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Math.max(1, cookieDays) * 24 * 60 * 60,
  };
}

// ── the shared-network key ──────────────────────────────────────────────────

/**
 * A coarse signature of where the request came from.
 *
 * Deliberately coarse: address plus the two headers that stay stable for one
 * browser on one machine. It is a backstop against clearing cookies, not an
 * attempt to identify anybody, and it is hashed so no address is ever stored.
 */
function sharedKey(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  const ip =
    forwarded?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
  const parts = [
    ip,
    req.headers.get("user-agent") ?? "",
    req.headers.get("accept-language") ?? "",
  ];
  return crypto.createHash("sha256").update(parts.join("|")).digest("hex").slice(0, 32);
}

// ── talking to the ledger ───────────────────────────────────────────────────

interface BackendVerdict {
  allowed: boolean;
  reason: RoiGateReason | null;
  primary: {
    pincodesUsed: number;
    callsOnPincode: number;
    controlChangesUsed: number;
    allowed: boolean;
    reason: RoiGateReason | null;
  };
}

async function askLedger(
  path: "peek" | "spend",
  pincode: string,
  keys: Array<{ key: string } & RoiGateLimits>,
): Promise<BackendVerdict | null> {
  if (!NOCODE_BASE) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(`${NOCODE_BASE}/api/public/roi-guest/${path}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(process.env.ROI_GUEST_API_KEY
          ? { "x-roi-guest-key": process.env.ROI_GUEST_API_KEY }
          : {}),
      },
      body: JSON.stringify({ pincode, keys }),
      cache: "no-store",
      signal: controller.signal,
    });
    const body = await res.json().catch(() => null);
    if (!res.ok || !body?.success || !body.data) return null;
    return body.data as BackendVerdict;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// ── the decision ────────────────────────────────────────────────────────────

export interface RoiGateDecision {
  /** False when the wall does not apply at all — switched off, or signed in. */
  gated: boolean;
  allowed: boolean;
  reason: RoiGateReason | null;
  pincodesUsed: number;
  controlChangesUsed: number;
  limits: RoiGateLimits;
  /** Set this on the response when present; it mints the id on first sight. */
  deviceCookie: DeviceCookie | null;
}

function open(
  config: RoiGateConfig,
  deviceCookie: DeviceCookie | null = null,
): RoiGateDecision {
  return {
    gated: false,
    allowed: true,
    reason: null,
    pincodesUsed: 0,
    controlChangesUsed: 0,
    limits: {
      freePincodes: config.freePincodes,
      freeControlChanges: config.freeControlChanges,
    },
    deviceCookie,
  };
}

/**
 * Decide whether this visitor may see a result for `pincode`.
 *
 * `spend: true` counts the calculation; `spend: false` only reads, which is what
 * the UI uses to show how much allowance is left without consuming any of it.
 *
 * If the ledger cannot be reached the visitor is let through. A backend blip
 * should cost a few free calculations, not break the calculator for everybody —
 * and the tally is still there when it comes back.
 */
export async function checkRoiGate(
  req: Request,
  pincode: string,
  opts: { spend: boolean },
): Promise<RoiGateDecision> {
  const config = roiGateConfig();
  if (!config.enabled) return open(config);
  if (getSessionUser()) return open(config);
  if (!/^\d{6}$/.test(pincode)) return open(config);

  let deviceId: string | null = null;
  let deviceCookie: DeviceCookie | null = null;
  try {
    deviceId = readDeviceId(cookies().get(DEVICE_COOKIE)?.value);
    if (!deviceId) {
      deviceId = crypto.randomUUID();
      deviceCookie = mintDeviceCookie(deviceId, config.cookieDays);
    }
  } catch {
    // SESSION_SECRET unset. Without it nothing can be signed, so there is no
    // wall to enforce — leave the calculator working rather than break it.
    return open(config);
  }

  const keys: Array<{ key: string } & RoiGateLimits> = [
    {
      key: `d:${deviceId}`,
      freePincodes: config.freePincodes,
      freeControlChanges: config.freeControlChanges,
    },
  ];
  if (config.sharedMultiplier > 0) {
    keys.push({
      key: `n:${sharedKey(req)}`,
      freePincodes: config.freePincodes * config.sharedMultiplier,
      freeControlChanges: config.freeControlChanges * config.sharedMultiplier,
    });
  }

  const verdict = await askLedger(opts.spend ? "spend" : "peek", pincode, keys);
  if (!verdict) return open(config, deviceCookie);

  return {
    gated: true,
    allowed: verdict.allowed,
    reason: verdict.reason,
    pincodesUsed: verdict.primary?.pincodesUsed ?? 0,
    controlChangesUsed: verdict.primary?.controlChangesUsed ?? 0,
    limits: {
      freePincodes: config.freePincodes,
      freeControlChanges: config.freeControlChanges,
    },
    deviceCookie,
  };
}

/** What the client is told when the wall comes down. Never leaks the keys. */
export function lockedPayload(decision: RoiGateDecision) {
  return {
    success: false as const,
    locked: true as const,
    reason: decision.reason,
    error:
      decision.reason === "controlChanges"
        ? "Create a free account to keep refining this outlook."
        : "Create a free account to explore more locations.",
    quota: {
      pincodesUsed: decision.pincodesUsed,
      controlChangesUsed: decision.controlChangesUsed,
      freePincodes: decision.limits.freePincodes,
      freeControlChanges: decision.limits.freeControlChanges,
    },
  };
}
