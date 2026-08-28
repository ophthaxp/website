import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";

/**
 * GET /api/auth/me — who is signed in, from the session cookie.
 *
 * Returns `{ user: null }` when nobody is, so the UI can render the logged-out
 * state without a second call.
 */
export async function GET() {
  const user = getSessionUser();
  return NextResponse.json(
    { user },
    // Per-visitor and cheap to recompute; caching it would show one doctor's
    // name to the next.
    { headers: { "cache-control": "private, no-store" } },
  );
}
