"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MailWarning } from "lucide-react";

type Status = "idle" | "signing-in" | "error";
type ResendStatus = "idle" | "sending" | "sent" | "failed" | "throttled";

/**
 * How long the resend button stays disabled after a successful send.
 *
 * Long enough that a second click is a considered one rather than impatience
 * with a slow inbox, short enough not to strand somebody whose mail genuinely
 * did not arrive. The server allows three sends per address per fifteen
 * minutes; this only paces the clicks, it is not what enforces the limit.
 */
const RESEND_COOLDOWN_SECONDS = 60;

/**
 * Signing in through the platform's own `/auth/signin`.
 *
 * An account is created during the apply form and stays inactive until its
 * verification email is clicked, so "not verified yet" is a common and
 * recoverable answer here. It gets its own message rather than being flattened
 * into "wrong password", which would send people to reset a password that was
 * never the problem.
 */
export function LoginForm({ next, linkError }: { next?: string; linkError?: boolean }) {
  const [status, setStatus] = useState<Status>("idle");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [resend, setResend] = useState<ResendStatus>("idle");
  const [cooldown, setCooldown] = useState(0);

  // Ticks the countdown down to zero, which re-enables the button.
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((left) => left - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  /**
   * Send a fresh verification link.
   *
   * The reply says nothing about the address — it cannot, or the login page
   * would become a way to find out who has an account — so "sent" here means
   * the request was accepted, not that an email definitely went out.
   *
   * A 429 is not an error to apologise for: it means the server's own limit
   * caught up, and its `retry-after` is a better countdown than ours because it
   * knows how many sends this address has already had.
   */
  const handleResend = async () => {
    if (cooldown > 0 || resend === "sending") return;
    setResend("sending");

    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      if (res.status === 429) {
        const retryAfter = Number(res.headers.get("retry-after"));
        setCooldown(Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : 900);
        setResend("throttled");
        return;
      }

      if (!res.ok) {
        setResend("failed");
        return;
      }

      setResend("sent");
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch {
      setResend("failed");
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus("signing-in");
    setErrorMsg(null);
    setNeedsVerification(false);
    setResend("idle");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        setNeedsVerification(Boolean(body?.needsVerification));
        throw new Error(body?.error ?? "Could not sign you in");
      }

      // A full navigation rather than a router push: every server component on
      // the next page has to render with the new cookie.
      window.location.href = next || "/account";
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong");
    }
  };

  return (
    <>
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-accent-soft">
        Account
      </p>
      <h1 className="mt-2 font-display text-[clamp(1.875rem,4vw,2.5rem)] uppercase leading-[1.02] tracking-[-0.01em] text-white">Log in</h1>
      <p className="mt-3 text-sm text-white/70">
        Use the email and password you set when you applied.
      </p>

      {linkError ? (
        <p className="mt-5 rounded-[10px] bg-amber-500/10 px-3 py-2 text-sm text-amber-200 ring-1 ring-amber-500/30">
          That link has expired or was already used. Log in below instead.
        </p>
      ) : null}

      <form onSubmit={handleSubmit} className="mt-6 grid gap-4">
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-white/70">
            Email Address<span className="ml-1 text-accent">*</span>
          </span>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="doctor@example.com"
            className={inputCls}
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-white/70">
            Password<span className="ml-1 text-accent">*</span>
          </span>
          <input
            name="password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputCls}
          />
        </label>

        {status === "error" && errorMsg ? (
          <div
            className={`rounded-[10px] px-3 py-2 text-sm ring-1 ${
              needsVerification
                ? "bg-amber-500/10 text-amber-200 ring-amber-500/30"
                : "bg-red-500/10 text-red-300 ring-red-500/30"
            }`}
          >
            <p className="flex items-start gap-2">
              {needsVerification ? (
                <MailWarning className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              ) : null}
              <span>{errorMsg}</span>
            </p>

            {/* The link in the original mail expires in twelve minutes, so by
                the time somebody reaches this message theirs has almost always
                died. Offering a new one here is the only way out. */}
            {needsVerification ? (
              <div className="mt-2 space-y-1 pl-6">
                {resend === "sent" ? (
                  <p className="text-[13px] text-amber-100/90">
                    Link sent. Check your inbox.
                  </p>
                ) : null}

                {resend === "throttled" ? (
                  <p className="text-[13px] text-amber-100/90">
                    Too many requests. Use the latest link.
                  </p>
                ) : null}

                {resend === "failed" ? (
                  <p className="text-[13px] text-amber-100/80">
                    Could not send. Try again.
                  </p>
                ) : null}

                {/* Stays on screen after a send. The first mail is the one that
                    usually goes missing, so hiding this would strand exactly the
                    person it exists for — the countdown paces them instead. */}
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resend === "sending" || cooldown > 0}
                  className="text-[13px] font-semibold text-amber-100 underline underline-offset-4 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60 disabled:cursor-not-allowed disabled:no-underline disabled:opacity-60"
                >
                  {resend === "sending"
                    ? "Sending…"
                    : cooldown > 0
                      ? `Resend in ${cooldown}s`
                      : "Resend link"}
                </button>
              </div>
            ) : null}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={status === "signing-in"}
          className="mt-2 inline-flex items-center justify-center gap-2 rounded-[10px] bg-accent px-6 py-3.5 text-[15px] font-semibold text-white transition hover:bg-accent-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:cursor-not-allowed disabled:opacity-60"
        >
          {status === "signing-in" ? (
            <>
              <span
                aria-hidden
                className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
              />
              Signing in…
            </>
          ) : (
            "Log in"
          )}
        </button>
      </form>

      <p className="mt-6 text-center text-xs text-white/50">
        No account yet?{" "}
        <Link href="/signup" className="text-accent-soft underline-offset-4 hover:underline">
          Create one
        </Link>{" "}
        — or just hit Apply Now on a programme and we&rsquo;ll set one up as you go.
      </p>
    </>
  );
}

const inputCls =
  "w-full rounded-[10px] border border-transparent bg-ink-800 px-4 py-3 text-[15px] text-white outline-none transition placeholder:text-white/35 hover:bg-ink-700 focus:border-accent focus:bg-ink-800";
