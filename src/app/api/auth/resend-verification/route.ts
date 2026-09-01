import { NextResponse } from "next/server";
import { isAuthConfigured, resendVerification } from "@/lib/platformAuth";
import { clientKey, emailKey, rateLimit } from "@/lib/rateLimit";

/**
 * POST /api/auth/resend-verification — body: { email }
 *
 * The verification token expires twelve minutes after it is minted, so an
 * applicant who comes back the next day cannot use the link they were sent.
 * Sign-in refuses an unverified account, which left them with nowhere to go.
 *
 * **The answer never varies.** Whatever happened upstream — no such address,
 * already verified, mail provider down — this returns the same `ok: true`. The
 * route is unauthenticated and sits on a public login page, so a reply that
 * distinguished those cases would let anyone check which addresses have
 * accounts here. It is the same reason `signIn` refuses to separate "no user"
 * from "wrong password".
 *
 * Throttled harder than login, because unlike a failed sign-in each accepted
 * call sends an email to somebody who did not ask this time.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { email?: string } | null;
  const email = (body?.email ?? "").trim().toLowerCase();

  if (!email) {
    return NextResponse.json({ error: "Enter your email address." }, { status: 422 });
  }

  // Per-address keeps one mailbox from being flooded; per-IP stops a script
  // working through a list of addresses to see which ones bounce.
  const perEmail = rateLimit(`resend:email:${emailKey(email)}`, 3, 15 * 60_000);
  const perIp = rateLimit(`resend:ip:${clientKey(req)}`, 10, 15 * 60_000);

  if (!perEmail.ok || !perIp.ok) {
    const retryAfter = Math.max(perEmail.retryAfter, perIp.retryAfter);
    console.warn(`[auth/resend] throttled ${clientKey(req)} — retry in ${retryAfter}s`);
    return NextResponse.json(
      { error: "Too many requests. Please wait a few minutes and try again." },
      { status: 429, headers: { "retry-after": String(retryAfter) } },
    );
  }

  if (!isAuthConfigured()) {
    console.error("[auth/resend] NOCODE_API_BASE_URL / NOCODE_APP_ID not set");
    return NextResponse.json(
      { error: "Sending is unavailable right now. Please try again shortly." },
      { status: 503 },
    );
  }

  await resendVerification(email);

  return NextResponse.json({
    ok: true,
    message: "If that address still needs verifying, a new link is on its way.",
  });
}
