import { NextResponse } from "next/server";
import { isAuthConfigured, passwordProblem, resetPassword } from "@/lib/platformAuth";
import { clientKey, emailKey, rateLimit } from "@/lib/rateLimit";

/**
 * POST /api/auth/reset-password — body: { token, email, password }
 *
 * The end of the flow the route next door starts. Both halves of the link the
 * reader was emailed come back here: the token, and the address it was minted
 * for. The platform decrypts one against the other, so a token is worthless
 * without the mailbox it was sent to.
 *
 * The platform's own refusals are not passed through. It distinguishes "user
 * not active or not found" from "link expired", and repeating that here would
 * hand back the account check the route next door is careful not to give —
 * on a page anyone can open with a made-up token. One message covers all of
 * them, and it says the only useful thing anyway: ask for a new link.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as
    | { token?: string; email?: string; password?: string }
    | null;

  const token = (body?.token ?? "").trim();
  const email = (body?.email ?? "").trim().toLowerCase();
  const password = body?.password ?? "";

  if (!token || !email || !password) {
    return NextResponse.json(
      { error: "This reset link is incomplete. Ask for a new one." },
      { status: 422 },
    );
  }

  // Checked before the round trip so the rules are stated rather than guessed
  // at — the platform's own validator answers with one long sentence.
  const problem = passwordProblem(password);
  if (problem) {
    return NextResponse.json({ error: `Password: ${problem}` }, { status: 422 });
  }

  // A token is a long random string, so this is not really guessable — the
  // limit is here because the endpoint is unauthenticated and writes to an
  // account, which is reason enough not to leave it uncounted.
  const perEmail = rateLimit(`reset:email:${emailKey(email)}`, 8, 15 * 60_000);
  const perIp = rateLimit(`reset:ip:${clientKey(req)}`, 20, 15 * 60_000);

  if (!perEmail.ok || !perIp.ok) {
    const retryAfter = Math.max(perEmail.retryAfter, perIp.retryAfter);
    console.warn(`[auth/reset] throttled ${clientKey(req)} — retry in ${retryAfter}s`);
    return NextResponse.json(
      { error: "Too many attempts. Please wait a few minutes and try again." },
      { status: 429, headers: { "retry-after": String(retryAfter) } },
    );
  }

  if (!isAuthConfigured()) {
    console.error("[auth/reset] NOCODE_API_BASE_URL / NOCODE_APP_ID not set");
    return NextResponse.json(
      { error: "Password reset is unavailable right now. Please try again shortly." },
      { status: 503 },
    );
  }

  const result = await resetPassword({ token, email, password });

  if (!result.ok) {
    return NextResponse.json(
      { error: "This reset link is invalid or has expired. Ask for a new one." },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true });
}
