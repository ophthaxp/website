/**
 * The server side of "Count me in".
 *
 * LoMa and Caseroom are on the dashboard before they exist. The buttons on
 * them promise to tell a doctor when access opens, and this is what makes that
 * promise keepable: the list lives in the platform, in a module the team can
 * open, sort and export.
 *
 * Everything here is server-only. `NOCODE_API_BASE_URL` and `NOCODE_API_KEY`
 * are not public, and the doctor's address never leaves the server — the
 * browser sends which tool it wants and nothing else, and the session says who
 * that is. See `app/api/waitlist/route.ts`.
 */

const NOCODE_BASE = process.env.NOCODE_API_BASE_URL || "";
const API_KEY = process.env.NOCODE_API_KEY || "";

/** The tools that have a waitlist. Mirrors `TOOLS` on the platform's route. */
export const WAITLIST_TOOLS = ["loma", "caseroom"] as const;
export type WaitlistTool = (typeof WAITLIST_TOOLS)[number];

export function isWaitlistTool(value: unknown): value is WaitlistTool {
  return WAITLIST_TOOLS.includes(String(value) as WaitlistTool);
}

/**
 * One call to the store, with a short leash.
 *
 * The read is not worth making anybody wait for: a dashboard that cannot reach
 * the list should draw the button in its resting state, not hang. The write is
 * given the same leash and the caller reports its failure, because a doctor who
 * pressed a button deserves to know whether it took.
 */
async function call<T>(path: string, body: unknown): Promise<T | null> {
  if (!NOCODE_BASE || !API_KEY) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);
  try {
    const res = await fetch(`${NOCODE_BASE.replace(/\/$/, "")}/api/tool-waitlist${path}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        // The platform's own API key — the same one payments, booking and the
        // outlook store send. These rows belong to somebody, so the endpoint is
        // authenticated rather than public.
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

/**
 * Put this doctor on a tool's list.
 *
 * Returns whether it actually landed. Idempotent at the far end, so a second
 * click — or a retry after a flaky network — costs nothing and creates nothing.
 */
export async function joinWaitlist(input: {
  tool: WaitlistTool;
  email: string;
  name: string;
}): Promise<boolean> {
  const data = await call<{ joined: boolean }>("/join", input);
  return data?.joined === true;
}

/**
 * Which tools this doctor is already waiting on.
 *
 * An empty list on any failure, deliberately: the cost of forgetting is one
 * button that says "Count me in" to somebody already on the list, and pressing
 * it again changes nothing. The cost of guessing the other way would be telling
 * a doctor they are on a list they are not on.
 */
export async function waitlistFor(email: string): Promise<string[]> {
  const data = await call<{ tools: string[] }>("/status", { email });
  return Array.isArray(data?.tools) ? data.tools : [];
}
