import crypto from "crypto";
import { cookies } from "next/headers";

/**
 * The applicant's session, as a signed cookie.
 *
 * Deliberately self-contained rather than a token borrowed from the platform:
 * the platform's JWT is built for the admin console, where it carries app and
 * organization mappings and drives permission checks. The website needs none of
 * that — only "which applicant is this" — and minting our own means the apply
 * flow cannot hand anyone a credential that works against the console.
 *
 * The value is `payload.signature`, both base64url. Nothing secret lives in it;
 * the signature is what makes it trustworthy.
 */

const COOKIE_NAME = "lom_session";
const MAX_AGE_SECONDS = 30 * 24 * 60 * 60; // 30 days

export interface SessionUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  orgId?: string;
}

interface SessionPayload extends SessionUser {
  /** Unix seconds. Checked on every read; the cookie's own expiry is a hint. */
  exp: number;
}

function secret(): string {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 32) {
    throw new Error(
      "SESSION_SECRET is missing or too short (needs 32+ characters). " +
        "Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"",
    );
  }
  return value;
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function fromB64url(input: string): Buffer {
  return Buffer.from(input.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

function sign(payload: string): string {
  return b64url(crypto.createHmac("sha256", secret()).update(payload).digest());
}

export function createSessionToken(user: SessionUser): string {
  const payload: SessionPayload = {
    ...user,
    exp: Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS,
  };
  const encoded = b64url(JSON.stringify(payload));
  return `${encoded}.${sign(encoded)}`;
}

export function readSessionToken(token: string | undefined): SessionUser | null {
  if (!token) return null;

  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;

  const expected = sign(encoded);
  // Constant-time: a plain === leaks, one byte at a time, how much of a forged
  // signature was right.
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(fromB64url(encoded).toString("utf8")) as SessionPayload;
    if (!payload?.id || !payload?.exp) return null;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;

    const { exp: _exp, ...user } = payload;
    return user;
  } catch {
    return null;
  }
}

/** The applicant behind the current request, or null. */
export function getSessionUser(): SessionUser | null {
  try {
    return readSessionToken(cookies().get(COOKIE_NAME)?.value);
  } catch {
    // Thrown when SESSION_SECRET is unset — treat as logged out rather than
    // taking down whatever page asked.
    return null;
  }
}

export const sessionCookie = {
  name: COOKIE_NAME,

  set(user: SessionUser) {
    return {
      name: COOKIE_NAME,
      value: createSessionToken(user),
      httpOnly: true,
      sameSite: "lax" as const,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: MAX_AGE_SECONDS,
    };
  },

  clear() {
    return {
      name: COOKIE_NAME,
      value: "",
      httpOnly: true,
      sameSite: "lax" as const,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0,
    };
  },
};

/* ------------------------------------------------------- the platform token -- */

/**
 * The platform's own JWT, in its own httpOnly cookie.
 *
 * The session cookie above answers "which applicant is this" and is enough for
 * everything the website did before: the apply flow writes through the API key,
 * as the website, and the applicant's identity travels in the row.
 *
 * LoMa is the first thing that cannot work that way. Its endpoints resolve the
 * doctor from the token — profile, XP, logbook, whether they are a student or a
 * legend — and the API key resolves to a single system account
 * (`authenticationMiddleware.ts`, the `x-api-key` branch), which would give
 * every doctor on the site one shared LoMa profile. So LoMa needs *this
 * doctor's* credential, and this is where it is kept.
 *
 * Two properties worth stating, because they are the reason this is a separate
 * cookie rather than a field on the session:
 *
 *  1. It is httpOnly and never read by client code. Only the LoMa proxy on the
 *     server touches it, so the browser still cannot present a platform
 *     credential to anything.
 *  2. It expires on its own schedule. The platform signs these for seven days
 *     (`CryptoUtils.ts`, `expiresIn: '7d'`) while the session runs for thirty,
 *     and pretending otherwise would mean holding a token we know is dead. When
 *     it lapses the LoMa proxy answers 401 and the doctor signs in again — the
 *     ordinary login, which mints a fresh one. There is no refresh endpoint on
 *     the platform to call instead; signing in is the only way to get one.
 */

const TOKEN_COOKIE_NAME = "lom_platform_token";

/** Seven days, matching the platform's own `expiresIn`. */
const TOKEN_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

export const platformTokenCookie = {
  name: TOKEN_COOKIE_NAME,

  set(jwt: string) {
    return {
      name: TOKEN_COOKIE_NAME,
      value: jwt,
      httpOnly: true,
      sameSite: "lax" as const,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: TOKEN_MAX_AGE_SECONDS,
    };
  },

  clear() {
    return {
      name: TOKEN_COOKIE_NAME,
      value: "",
      httpOnly: true,
      sameSite: "lax" as const,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0,
    };
  },
};

/**
 * The current doctor's platform token, or null once it has lapsed.
 *
 * Null is a normal state, not an error: the session outlives the token by three
 * weeks, so a doctor can be legitimately signed in to the site and still have
 * nothing to present to LoMa.
 */
export function getPlatformToken(): string | null {
  try {
    return cookies().get(TOKEN_COOKIE_NAME)?.value || null;
  } catch {
    return null;
  }
}
