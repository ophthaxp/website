import { NextResponse } from "next/server";
import { isAuthConfigured, passwordProblem, signUp } from "@/lib/platformAuth";
import { clientKey, emailKey, rateLimit } from "@/lib/rateLimit";

/**
 * POST /api/auth/signup — body: { firstName, lastName, email, password }
 *
 * Creating an account without applying to anything. Same platform endpoint the
 * apply form uses; the difference is only that there is no application to open
 * afterwards, so this one stops at "check your email".
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const firstName = String(body.firstName ?? "").trim();
  const lastName = String(body.lastName ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");

  if (!firstName || !lastName || !email) {
    return NextResponse.json(
      { error: "First name, last name and email are required." },
      { status: 422 },
    );
  }

  const problem = passwordProblem(password);
  if (problem) {
    return NextResponse.json({ error: `Password: ${problem}` }, { status: 422 });
  }

  // Creates a user and sends mail on an unauthenticated request, so the same
  // two limits the apply form uses apply here.
  const perIp = rateLimit(`signup:ip:${clientKey(req)}`, 5, 15 * 60_000);
  const perEmail = rateLimit(`signup:email:${emailKey(email)}`, 3, 15 * 60_000);

  if (!perIp.ok || !perEmail.ok) {
    const retryAfter = Math.max(perIp.retryAfter, perEmail.retryAfter);
    console.warn(`[auth/signup] throttled ${clientKey(req)} — retry in ${retryAfter}s`);
    return NextResponse.json(
      { error: "Too many attempts. Please wait a few minutes and try again." },
      { status: 429, headers: { "retry-after": String(retryAfter) } },
    );
  }

  if (!isAuthConfigured()) {
    console.error("[auth/signup] NOCODE_API_BASE_URL / NOCODE_APP_ID not set");
    return NextResponse.json(
      { error: "Sign-up is unavailable right now. Please try again shortly." },
      { status: 503 },
    );
  }

  const result = await signUp({ firstName, lastName, email, password });

  if (!result.ok) {
    if (result.alreadyRegistered) {
      return NextResponse.json(
        { error: "That email already has an account. Please log in instead.", alreadyRegistered: true },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: result.error }, { status: 422 });
  }

  // No session here, unlike the apply form. Nobody is mid-task, so the standard
  // verify-then-log-in order is the right one.
  return NextResponse.json({ ok: true, email });
}
