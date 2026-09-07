import { NextResponse } from "next/server";
import { forgotPassword, isAuthConfigured } from "@/lib/platformAuth";
import { clientKey, emailKey, rateLimit } from "@/lib/rateLimit";

/**
 * POST /api/auth/forgot-password — body: { email }
 *
 * Hands the address to the platform's own `/auth/forgot_password`, which mints
 * a token, stores it against the user and emails them the link. Nothing about
 * that token ever reaches this site — the reset page below is handed it by the
 * reader, out of their own inbox.
 *
 * **The answer never varies**, exactly as `resend-verification` does not: no
 * such address, an unverified one, a mail provider having a bad afternoon —
 * all of them return the same `ok: true`. This route is unauthenticated and
 * sits one click off the login page, so a reply that told those apart would be
 * a way to ask which doctors have accounts here.
 *
 * Throttled at the resend route's rate rather than login's: a failed login
 * costs the attacker a round trip, while every accepted call here puts mail in
 * somebody's inbox that they did not ask for.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { email?: string } | null;
  const email = (body?.email ?? "").trim().toLowerCase();

  if (!email) {
    return NextResponse.json({ error: "Enter your email address." }, { status: 422 });
  }

  const perEmail = rateLimit(`forgot:email:${emailKey(email)}`, 3, 15 * 60_000);
  const perIp = rateLimit(`forgot:ip:${clientKey(req)}`, 10, 15 * 60_000);

  if (!perEmail.ok || !perIp.ok) {
    const retryAfter = Math.max(perEmail.retryAfter, perIp.retryAfter);
    console.warn(`[auth/forgot] throttled ${clientKey(req)} — retry in ${retryAfter}s`);
    return NextResponse.json(
      { error: "Too many requests. Please wait a few minutes and try again." },
      { status: 429, headers: { "retry-after": String(retryAfter) } },
    );
  }

  if (!isAuthConfigured()) {
    console.error("[auth/forgot] NOCODE_API_BASE_URL / NOCODE_APP_ID not set");
    return NextResponse.json(
      { error: "Password reset is unavailable right now. Please try again shortly." },
      { status: 503 },
    );
  }

  await forgotPassword(email);

  return NextResponse.json({
    ok: true,
    message: "If that address has an account, a reset link is on its way.",
  });
}
