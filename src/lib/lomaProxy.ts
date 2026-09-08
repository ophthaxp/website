/**
 * The bridge between this site and LoMa Cases on the platform.
 *
 * LoMa lives in the nocode backend, mounted at `/api/loma`. Its routes resolve
 * the doctor from a platform JWT — profile, XP, logbook, and whether they are a
 * student, a legend or an admin all hang off `loggedUser.id`.
 *
 * That is why this is a proxy rather than a direct call from the browser, and
 * why it does not use the API key the rest of the site's server code uses:
 *
 *  - The API key authenticates *the website*. In `authenticationMiddleware.ts`
 *    its branch resolves `loggedUser.id` to the key's own owner, one fixed
 *    system account. Calling LoMa with it would give every doctor on the site
 *    the same LoMa profile, the same XP and the same case history.
 *  - The JWT authenticates *the doctor*. It is the only credential that makes
 *    LoMa's answers belong to the person asking.
 *
 * So the token has to travel, and the browser must not be the thing carrying
 * it. It sits in an httpOnly cookie (`session.ts`) and is attached here, on the
 * server, where page scripts cannot reach it.
 *
 * Server-side only — the single caller is the route handler in
 * `app/api/loma/[...path]/route.ts`.
 */

import { getPlatformToken, getSessionUser } from "@/lib/session";

const BASE = process.env.NOCODE_API_BASE_URL || "";
const APP_ID = process.env.NOCODE_APP_ID || "";

/**
 * Long enough for the slow ones.
 *
 * Most LoMa routes are ordinary reads, but starting a case, sending a message
 * and asking the coach all wait on a model, and those take their time. The
 * platform is the thing that decides how long; this only decides when to stop
 * waiting, and cutting a doctor off mid-case is worse than a long spinner.
 */
const TIMEOUT_MS = 60000;

export function isLomaConfigured(): boolean {
  return Boolean(BASE);
}

export interface LomaResult {
  status: number;
  /** LoMa answers with the raw payload, and `{ detail }` on error. */
  body: unknown;
}

/**
 * Why a request could not be made, when it could not be made here.
 *
 * `SESSION_EXPIRED` is the one the UI acts on: it means the doctor is still
 * signed in to the site but has no live platform token, so LoMa cannot know who
 * they are. The answer is the ordinary login — it mints a fresh token — which
 * is why the client sends them to `/login?next=...` rather than showing an
 * error and leaving them stuck.
 */
export type LomaFailure = "NOT_CONFIGURED" | "NOT_SIGNED_IN" | "SESSION_EXPIRED";

const failures: Record<LomaFailure, { status: number; message: string }> = {
  NOT_CONFIGURED: {
    status: 503,
    message: "Caseroom is unavailable right now. Please try again shortly.",
  },
  NOT_SIGNED_IN: {
    status: 401,
    message: "Please sign in to use Caseroom.",
  },
  SESSION_EXPIRED: {
    status: 401,
    message: "Your session has expired. Please sign in again.",
  },
};

export function lomaFailure(code: LomaFailure): { status: number; body: { detail: string; code: LomaFailure } } {
  const { status, message } = failures[code];
  return { status, body: { detail: message, code } };
}

/**
 * Build the upstream path from the catch-all segments.
 *
 * Returns null for anything that is not a plain path. The segments arrive from
 * the URL, and without this a crafted one could walk out of `/api/loma` and
 * reach another part of the platform carrying the doctor's token.
 */
export function lomaPath(segments: string[] | undefined): string | null {
  if (!segments?.length) return null;
  for (const segment of segments) {
    if (!segment || segment === "." || segment === ".." || segment.includes("/") || segment.includes("\\")) {
      return null;
    }
  }
  return "/" + segments.map(encodeURIComponent).join("/");
}

/**
 * Call LoMa as the signed-in doctor.
 *
 * `search` carries the query string through unchanged; LoMa's reads use path
 * parameters today, but passing it costs nothing and means a route that grows
 * one does not need this file edited.
 */
export async function callLoma(input: {
  method: "GET" | "POST";
  path: string;
  search?: string;
  body?: unknown;
}): Promise<LomaResult | { failure: LomaFailure }> {
  if (!isLomaConfigured()) {
    console.error("[loma] NOCODE_API_BASE_URL is not set");
    return { failure: "NOT_CONFIGURED" };
  }

  const user = getSessionUser();
  if (!user) return { failure: "NOT_SIGNED_IN" };

  const token = getPlatformToken();
  // Normal, not exceptional: the session runs for thirty days and the token for
  // seven, and a doctor who arrived through the apply flow never had one at all
  // — that route signs them in under a placeholder id before they have ever
  // given a password. Either way there is nothing to present, and the answer is
  // the same as an expired one.
  if (!token) return { failure: "SESSION_EXPIRED" };

  const controller = new AbortController();
  const deadline = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(`${BASE}/api/loma${input.path}${input.search ?? ""}`, {
      method: input.method,
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
        // LoMa scopes a doctor's role to their organization, and reads it from
        // this header when the token does not carry one.
        ...(user.orgId ? { "org-id": user.orgId } : {}),
        ...(APP_ID ? { "app-id": APP_ID } : {}),
      },
      ...(input.method === "POST" ? { body: JSON.stringify(input.body ?? {}) } : {}),
      signal: controller.signal,
      cache: "no-store",
    });

    const body = await res.json().catch(() => null);

    // The platform's own auth failure, rather than one detected here: the token
    // was present but is no longer good. Same conclusion, so say the same thing
    // and let the UI take them to the login page.
    if (res.status === 401) return { failure: "SESSION_EXPIRED" };

    return { status: res.status, body };
  } catch (err) {
    const timedOut = (err as Error)?.name === "AbortError";
    console.error(`[loma] ${input.method} ${input.path} — ${timedOut ? "timed out" : String(err)}`);
    return {
      status: 504,
      body: { detail: timedOut ? "That took too long. Please try again." : "Could not reach Caseroom." },
    };
  } finally {
    clearTimeout(deadline);
  }
}
