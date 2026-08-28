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
