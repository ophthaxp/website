import { NextResponse } from "next/server";
import { isAuthConfigured, signIn } from "@/lib/platformAuth";
import { clientKey, emailKey, rateLimit } from "@/lib/rateLimit";
import { sessionCookie } from "@/lib/session";

/**
 * POST /api/auth/login — body: { email, password }
 *
 * Straight through to the platform's own `/auth/signin`. On success the website
 * sets its own session cookie, which is all it needs to know who is asking on
 * later requests.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as
    | { email?: string; password?: string }
    | null;

  const email = (body?.email ?? "").trim().toLowerCase();
  const password = body?.password ?? "";

  if (!email || !password) {
    return NextResponse.json({ error: "Enter your email and password." }, { status: 422 });
  }

  // Per-address stops somebody grinding one account's password; per-IP stops a
  // script working through a list of addresses.
  const perEmail = rateLimit(`login:email:${emailKey(email)}`, 8, 15 * 60_000);
  const perIp = rateLimit(`login:ip:${clientKey(req)}`, 20, 15 * 60_000);

  if (!perEmail.ok || !perIp.ok) {
    const retryAfter = Math.max(perEmail.retryAfter, perIp.retryAfter);
    console.warn(`[auth/login] throttled ${clientKey(req)} — retry in ${retryAfter}s`);
    return NextResponse.json(
      { error: "Too many attempts. Please wait a few minutes and try again." },
      { status: 429, headers: { "retry-after": String(retryAfter) } },
    );
  }

  if (!isAuthConfigured()) {
    console.error("[auth/login] NOCODE_API_BASE_URL / NOCODE_APP_ID not set");
    return NextResponse.json(
      { error: "Sign-in is unavailable right now. Please try again shortly." },
      { status: 503 },
    );
  }

  const result = await signIn({ email, password });

  if (!result.ok || !result.user) {
    return NextResponse.json(
      { error: result.error, needsVerification: result.needsVerification ?? false },
      { status: result.needsVerification ? 403 : 401 },
    );
  }

  const sessionUser = {
    id: result.user.id,
    email: result.user.email,
    firstName: result.user.first_name,
    lastName: result.user.last_name,
    role: "applicant",
  };

  const res = NextResponse.json({ ok: true, user: sessionUser });
  res.cookies.set(sessionCookie.set(sessionUser));
  return res;
}
