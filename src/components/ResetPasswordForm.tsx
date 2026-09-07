"use client";

import { useState } from "react";
import Link from "next/link";

type Status = "idle" | "saving" | "error";

/** The platform's rules, checked here so the message beats the round trip. */
function passwordProblem(password: string): string | null {
  if (password.length < 8) return "use at least 8 characters.";
  if (!/[a-z]/.test(password)) return "include a lowercase letter.";
  if (!/[A-Z]/.test(password)) return "include an uppercase letter.";
  if (!/[0-9]/.test(password)) return "include a number.";
  if (!/[^A-Za-z0-9]/.test(password)) return "include a symbol, such as ! or @.";
  return null;
}

/**
 * Setting the new password.
 *
 * Both halves of the link — the token and the address it was minted for — come
 * in as props from the page, which read them off the query string the reader
 * arrived with. The address is shown but not editable: it is what the token was
 * issued against, so an edited one could only ever fail.
 *
 * It ends at the login page rather than signing them in. Somebody who has just
 * chosen a password should get to type it once while they still remember it,
 * and a session minted here would skip exactly that.
 */
export function ResetPasswordForm({ token, email }: { token: string; email: string }) {
  const [status, setStatus] = useState<Status>("idle");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const problem = passwordProblem(password);
    if (problem) {
      setStatus("error");
      setErrorMsg(`Password: ${problem}`);
      return;
    }
    if (password !== confirmPassword) {
      setStatus("error");
      setErrorMsg("The two passwords do not match.");
      return;
    }

    setStatus("saving");
    setErrorMsg(null);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, email, password }),
      });
      const body = await res.json().catch(() => ({}));

      if (!res.ok) throw new Error(body?.error ?? "Could not reset your password.");

      // A full navigation: the login page is server-rendered and reads the
      // session cookie, which this flow has not touched.
      window.location.href = "/login?reset=1";
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
      <h1 className="mt-2 font-display text-[clamp(1.875rem,4vw,2.5rem)] uppercase leading-[1.02] tracking-[-0.01em] text-white">
        New password
      </h1>
      <p className="mt-3 text-sm text-white/70">
        Setting a new password for <span className="text-white">{email}</span>.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 grid gap-4">
        {/* Here for the browser's password manager, which will not offer to save
            anything unless it can see which account the password belongs to. */}
        <input type="hidden" name="username" autoComplete="username" value={email} readOnly />

        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-white/70">
            New Password<span className="ml-1 text-accent">*</span>
          </span>
          <input
            name="password"
            type="password"
            required
            autoComplete="new-password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputCls}
          />
          <span className="mt-1.5 block text-[11px] text-white/40">
            At least 8 characters, with a capital, a number and a symbol.
          </span>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-white/70">
            Confirm Password<span className="ml-1 text-accent">*</span>
          </span>
          <input
            name="confirmPassword"
            type="password"
            required
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
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
          disabled={status === "saving"}
          className="mt-2 inline-flex items-center justify-center gap-2 rounded-full bg-accent px-6 py-3.5 text-[15px] font-semibold text-white transition hover:bg-accent-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:cursor-not-allowed disabled:opacity-60"
        >
          {status === "saving" ? (
            <>
              <span
                aria-hidden
                className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
              />
              Saving…
            </>
          ) : (
            "Save new password"
          )}
        </button>
      </form>

      <p className="mt-6 text-center text-xs text-white/50">
        Link stopped working?{" "}
        <Link
          href="/forgot-password"
          className="text-accent-soft underline-offset-4 hover:underline"
        >
          Ask for a new one
        </Link>
      </p>
    </>
  );
}

const inputCls =
  "w-full rounded-xl border border-transparent bg-ink-800 px-4 py-3 text-[15px] text-white outline-none transition placeholder:text-white/35 hover:bg-ink-700 focus:border-accent focus:bg-ink-800";
