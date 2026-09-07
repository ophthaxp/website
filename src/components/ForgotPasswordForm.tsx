"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MailCheck } from "lucide-react";

type Status = "idle" | "sending" | "sent" | "error";

/**
 * How long the second send waits.
 *
 * The mail takes a few seconds to land, and the first instinct on an empty
 * inbox is to press the button again — which mints a fresh token and quietly
 * kills the link that was already on its way. A minute is long enough for the
 * first one to arrive. The platform allows three sends per address per fifteen
 * minutes; this only paces the clicks.
 */
const RESEND_COOLDOWN_SECONDS = 60;

/**
 * Asking for a reset link.
 *
 * The reply says nothing about the address, so this page cannot be used to
 * find out who has an account — which is also why the confirmation is phrased
 * as a conditional. Whatever happened upstream, the reader is told the same
 * thing: if that address has an account, look in your inbox.
 */
export function ForgotPasswordForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [email, setEmail] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((left) => left - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const send = async () => {
    setStatus("sending");
    setErrorMsg(null);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      if (res.status === 429) {
        const retryAfter = Number(res.headers.get("retry-after"));
        setCooldown(Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : 900);
        setStatus("sent");
        return;
      }

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? "Could not send the link.");
      }

      setStatus("sent");
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong");
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    void send();
  };

  if (status === "sent") {
    return (
      <>
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-accent-soft">
          Account
        </p>
        <h1 className="mt-2 font-display text-[clamp(1.875rem,4vw,2.5rem)] uppercase leading-[1.02] tracking-[-0.01em] text-white">
          Check your inbox
        </h1>

        <div className="mt-5 flex items-start gap-3 rounded-xl bg-ink-800 px-4 py-3.5 text-sm text-white/75">
          <MailCheck className="mt-0.5 h-4 w-4 shrink-0 text-accent-soft" aria-hidden />
          <span>
            If <span className="text-white">{email.trim()}</span> has an account, a reset
            link is on its way. It expires in about ten minutes.
          </span>
        </div>

        <button
          type="button"
          onClick={() => void send()}
          disabled={cooldown > 0}
          className="mt-5 w-full text-center text-[13px] font-semibold text-accent-soft underline-offset-4 transition hover:text-white hover:underline disabled:cursor-not-allowed disabled:text-white/35 disabled:no-underline"
        >
          {cooldown > 0 ? `Send again in ${cooldown}s` : "Send it again"}
        </button>

        <p className="mt-6 text-center text-xs text-white/50">
          <Link href="/login" className="text-accent-soft underline-offset-4 hover:underline">
            Back to log in
          </Link>
        </p>
      </>
    );
  }

  return (
    <>
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-accent-soft">
        Account
      </p>
      <h1 className="mt-2 font-display text-[clamp(1.875rem,4vw,2.5rem)] uppercase leading-[1.02] tracking-[-0.01em] text-white">
        Forgot password
      </h1>
      <p className="mt-3 text-sm text-white/70">
        Give us the address you signed up with and we&rsquo;ll email you a link to set a new
        password.
      </p>

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

        {status === "error" && errorMsg ? (
          <p className="rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-300 ring-1 ring-red-500/30">
            {errorMsg}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={status === "sending"}
          className="mt-2 inline-flex items-center justify-center gap-2 rounded-full bg-accent px-6 py-3.5 text-[15px] font-semibold text-white transition hover:bg-accent-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:cursor-not-allowed disabled:opacity-60"
        >
          {status === "sending" ? (
            <>
              <span
                aria-hidden
                className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
              />
              Sending…
            </>
          ) : (
            "Email me a link"
          )}
        </button>
      </form>

      <p className="mt-6 text-center text-xs text-white/50">
        Remembered it?{" "}
        <Link href="/login" className="text-accent-soft underline-offset-4 hover:underline">
          Log in
        </Link>
      </p>
    </>
  );
}

const inputCls =
  "w-full rounded-xl border border-transparent bg-ink-800 px-4 py-3 text-[15px] text-white outline-none transition placeholder:text-white/35 hover:bg-ink-700 focus:border-accent focus:bg-ink-800";
