import { NextResponse } from "next/server";
import { sessionCookie } from "@/lib/session";

/**
 * POST /api/auth/logout — drop the session cookie.
 *
 * The application itself is untouched: it stays a draft on the server, which
 * is the point. Signing back in puts the applicant on the step they left.
 */
export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(sessionCookie.clear());
  return res;
}
