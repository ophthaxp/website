/**
 * Authentication, using the platform's own endpoints.
 *
 * Nothing here is bespoke: signing up, signing in, verifying an address and
 * resetting a password all go to `/api/:appId/auth/*` exactly as the admin
 * console does. The website only translates the answers into its own session
 * cookie, which is how it remembers you between requests.
 *
 * Server-side only — every caller is a route handler.
 */

const BASE = process.env.NOCODE_API_BASE_URL || "";
const APP_ID = process.env.NOCODE_APP_ID || "";

const TIMEOUT_MS = 10000;

/** The envelope every platform route answers with (`helpers/responder.ts`). */
interface PlatformEnvelope {
  success?: boolean;
  message?: string;
  code?: string;
  data?: Record<string, unknown>;
}

export interface PlatformUser {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

export function isAuthConfigured(): boolean {
  return Boolean(BASE && APP_ID);
}

async function authApi(
  path: string,
  payload: Record<string, unknown>,
): Promise<{ ok: boolean; status: number; body: PlatformEnvelope }> {
  const url = `${BASE}/api/${APP_ID}/auth/${path}`;
  const controller = new AbortController();
  const deadline = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", "app-id": APP_ID },
      body: JSON.stringify(payload),
      signal: controller.signal,
      cache: "no-store",
    });
    const body = (await res.json().catch(() => ({}))) as PlatformEnvelope;
    if (!res.ok) console.error(`[auth] ${path} failed status=${res.status}`, body.message);
    return { ok: res.ok && body.success !== false, status: res.status, body };
  } catch (err) {
    const reason = (err as Error)?.name === "AbortError" ? "timed out" : String(err);
    console.error(`[auth] ${path} could not reach the platform — ${reason}`);
    return { ok: false, status: 0, body: {} };
  } finally {
    clearTimeout(deadline);
  }
}

/**
 * The password rules the platform enforces (`signupValidator`).
 *
 * Checked here as well so somebody is told what is wrong before the round trip,
 * rather than being handed the validator's message after it.
 */
export function passwordProblem(password: string): string | null {
  if (password.length < 8) return "Use at least 8 characters.";
  if (!/[a-z]/.test(password)) return "Include a lowercase letter.";
  if (!/[A-Z]/.test(password)) return "Include an uppercase letter.";
  if (!/[0-9]/.test(password)) return "Include a number.";
  if (!/[^A-Za-z0-9]/.test(password)) return "Include a symbol, such as ! or @.";
  return null;
}

export interface SignUpResult {
  ok: boolean;
  /** The address already has an account — they should sign in instead. */
  alreadyRegistered?: boolean;
  message?: string;
  error?: string;
}

/**
 * Which of the app's front ends this request came from.
 *
 * One app can have several — this site, and the admin console the team is
 * invited to — and each has its own verify page and its own reset page. The
 * platform keeps the actual URLs in the app's settings, under
 * `verifyLinks.<key>` and `resetLinks.<key>`; this only names the key, so
 * nothing routable travels in the request. Unset there, the platform falls back
 * to its own default, which is the console.
 */
const VERIFY_CLIENT = "website";

/**
 * Create the account.
 *
 * The platform emails its own verification link and leaves the user inactive
 * until it is clicked — `signIn` below refuses anyone inactive, so that link is
 * the gate on signing back in later.
 */
export async function signUp(input: {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}): Promise<SignUpResult> {
  const { ok, body } = await authApi("signup", {
    first_name: input.firstName,
    last_name: input.lastName,
    email: input.email,
    password: input.password,
    client: VERIFY_CLIENT,
  });

  if (!ok) {
    const message = body?.message ?? "";
    // The platform says this in prose rather than with a code, so match on it.
    if (/already registered/i.test(message)) {
      return { ok: false, alreadyRegistered: true, error: message };
    }
    return { ok: false, error: message || "Could not create your account" };
  }

  return { ok: true, message: body?.message };
}

export interface SignInResult {
  ok: boolean;
  user?: PlatformUser;
  /**
   * The platform's JWT.
   *
   * Never reaches the browser as script-readable state. The login route parks
   * it in an httpOnly cookie, because LoMa is the first feature that has to
   * call the backend as *this doctor* rather than as the website — see
   * `lomaProxy.ts`.
   */
  jwt?: string;
  /**
   * The organization the platform reported, if any.
   *
   * LoMa resolves a doctor's role — student, legend, admin — from their
   * membership of an org, so this has to survive login. A doctor who signed up
   * on the website belongs to none, which is correct: they are a student, and
   * LoMa treats an absent org as "leave their stored role alone".
   */
  orgId?: string;
  /**
   * The role the platform reported for that org.
   *
   * FOR FIRST PAINT ONLY. It decides which dashboard to draw before the profile
   * arrives, so a legend does not watch the student screen flash past. The
   * backend never trusts it — `loma.service.ts` resolves the role itself.
   */
  orgRole?: string;
  /** They exist but have not clicked the verification link yet. */
  needsVerification?: boolean;
  error?: string;
}

/**
 * Sign in with email and password.
 *
 * "User not active!" is the platform's way of saying the address has never been
 * verified. Passed back as its own flag, because that person needs their
 * verification email resent — not to be told their password is wrong.
 */
export async function signIn(input: {
  email: string;
  password: string;
}): Promise<SignInResult> {
  const { ok, body } = await authApi("signin", {
    email: input.email,
    password: input.password,
  });

  if (!ok) {
    const message = body?.message ?? "";
    if (/not active/i.test(message)) {
      return {
        ok: false,
        needsVerification: true,
        error: "Verify your email to log in.",
      };
    }
    // Never repeat the platform's distinction between "user not found" and
    // "wrong password": that tells a stranger which addresses have accounts.
    return { ok: false, error: "That email and password do not match." };
  }

  const data = body?.data ?? {};
  const user = {
    id: String(data.id ?? ""),
    first_name: String(data.first_name ?? ""),
    last_name: String(data.last_name ?? ""),
    email: String(data.email ?? input.email),
  };

  if (!user.id) return { ok: false, error: "The platform returned no user" };

  // `organizations` covers every app this person belongs to, not just this one,
  // so the first entry is not necessarily ours. Match on app id and only fall
  // back to the first when the platform sent no app_id to match on.
  //
  // The platform spells the id key 'org-id' (hyphen). The underscore form is
  // read as a fallback in case a deployment normalises it.
  const orgs = Array.isArray(data.organizations)
    ? (data.organizations as Array<Record<string, unknown>>)
    : [];
  const org = orgs.find((o) => String(o.app_id ?? "") === APP_ID) ?? orgs[0];
  const orgId = org?.["org-id"] ?? org?.org_id;
  const orgRole = org?.role;

  return {
    ok: true,
    user,
    jwt: typeof data.jwt === "string" ? data.jwt : undefined,
    orgId: orgId ? String(orgId) : undefined,
    orgRole: orgRole ? String(orgRole) : undefined,
  };
}

/**
 * Ask the platform to send a fresh verification link.
 *
 * Returns nothing about the address. The platform answers the same way whether
 * or not it has an account, and this keeps that property: a caller who could
 * tell the two apart could use the login page to find out who has registered.
 * Failures are swallowed for the same reason — the page says "check your inbox"
 * either way, and a real outage shows up in the platform's own logs.
 */
export async function resendVerification(email: string): Promise<void> {
  try {
    await authApi("resend-verification", { email, client: VERIFY_CLIENT });
  } catch (err) {
    console.error("[auth] resend verification failed", err);
  }
}

/** Redeem the token from the platform's verification email. */
export async function verifyUser(token: string): Promise<{ ok: boolean; error?: string }> {
  const { ok, body } = await authApi("verify-user", { token });
  if (!ok) {
    return { ok: false, error: body?.message ?? "This link is invalid or has expired." };
  }
  return { ok: true };
}

/**
 * Start a password reset.
 *
 * Always reports success. The platform returns nothing at all for an unknown
 * address, and saying so would turn this into a way to test which doctors have
 * accounts.
 *
 * The client key does the same job here as it does in `signUp`: the platform
 * keeps the actual reset page URL in the app's settings under
 * `resetLinks.<key>`, so this only names the key and nothing routable travels
 * in the request. Unset there, the platform falls back to its own default —
 * which is the console, not this site.
 */
export async function forgotPassword(email: string): Promise<boolean> {
  await authApi("forgot_password", { email, client: VERIFY_CLIENT });
  return true;
}

export async function resetPassword(input: {
  token: string;
  email: string;
  password: string;
}): Promise<{ ok: boolean; error?: string }> {
  const { ok, body } = await authApi("reset_password", {
    token: input.token,
    email: input.email,
    password: input.password,
  });
  if (!ok) return { ok: false, error: body?.message ?? "Could not reset your password." };
  return { ok: true };
}
