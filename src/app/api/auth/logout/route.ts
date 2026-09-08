import { NextResponse } from "next/server";
import { platformTokenCookie, sessionCookie } from "@/lib/session";

/**
 * POST /api/auth/logout — drop the session cookie.
 *
 * The application itself is untouched: it stays a draft on the server, which
 * is the point. Signing back in puts the applicant on the step they left.
 */
export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(sessionCookie.clear());
  // The platform token goes with it. Leaving it behind would hand the next
  // person on a shared browser a live LoMa credential.
  res.cookies.set(platformTokenCookie.clear());
  return res;
}
