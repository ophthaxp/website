import { NextResponse } from "next/server";

/**
 * GET /auth/continue — retired.
 *
 * This was where the magic-link sign-in landed. Authentication now goes through
 * the platform's own signup and signin, so there is no token to redeem here.
 * Kept as a redirect rather than deleted: links from that period are sitting in
 * people's inboxes, and a 404 is a worse answer than the login page.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const next = url.searchParams.get("next");

  const login = new URL("/login", url.origin);
  if (next && next.startsWith("/") && !next.startsWith("//")) {
    login.searchParams.set("next", next);
  }
  login.searchParams.set("error", "link");

  return NextResponse.redirect(login);
}
