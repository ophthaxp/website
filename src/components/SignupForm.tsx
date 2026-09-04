"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail } from "lucide-react";

type Status = "idle" | "submitting" | "sent" | "error";

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
 * Creating an account on its own, without applying to a programme first.
 *
 * Not everybody arrives through a course page — some people want an account
 * before they have decided on anything. This ends at "check your email"
 * because, unlike the apply form, there is no half-finished task to hurry
 * them back to.
 */
export function SignupForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);

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

    setStatus("submitting");
    setErrorMsg(null);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          firstName: String(data.get("firstName") ?? "").trim(),
          lastName: String(data.get("lastName") ?? "").trim(),
          email: email.trim(),
          password,
        }),
      });
      const body = await res.json().catch(() => ({}));

      if (!res.ok) throw new Error(body?.error ?? "Could not create your account");
      setStatus("sent");
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong");
    }
  };

  if (status === "sent") {
    return (
      <div className="success-pop text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15 ring-1 ring-emerald-400/40">
          <Mail className="h-6 w-6 text-emerald-400" aria-hidden />
        </div>
        <h2 className="mt-5 text-[22px] font-extrabold leading-[1.25] tracking-[-0.015em] text-white">Check your inbox</h2>
        <p className="mt-3 text-sm text-white/80">
          We&rsquo;ve emailed <span className="text-white">{email.trim()}</span> a link to
          verify your address. Click it, then log in.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-flex rounded-full bg-accent px-6 py-3 text-[15px] font-semibold text-white transition hover:bg-accent-deep"
        >
          Go to log in
        </Link>
      </div>
    );
  }

  return (
    <>
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-accent-soft">
        Account
      </p>
      <h1 className="mt-2 font-display text-[clamp(1.875rem,4vw,2.5rem)] uppercase leading-[1.02] tracking-[-0.01em] text-white">Create your account</h1>
      <p className="mt-3 text-sm text-white/70">
        You can browse and apply at any time afterwards.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 grid gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="First Name" required>
            <input name="firstName" type="text" required autoComplete="given-name" className={inputCls} />
          </Field>
          <Field label="Last Name" required>
            <input name="lastName" type="text" required autoComplete="family-name" className={inputCls} />
          </Field>
        </div>

        <Field label="Email Address" required>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="doctor@example.com"
            className={inputCls}
          />
        </Field>

        <Field label="Password" required>
          <input
            name="password"
            type="password"
            required
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputCls}
          />
          <span className="mt-1 block text-[11px] text-white/40">
            At least 8 characters, with an uppercase letter, a number and a symbol.
          </span>
        </Field>

        <Field label="Confirm Password" required>
          <input
            name="confirmPassword"
            type="password"
            required
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={inputCls}
          />
        </Field>

        {status === "error" && errorMsg ? (
          <p className="rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-300 ring-1 ring-red-500/30">
            {errorMsg}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={status === "submitting"}
          className="mt-2 inline-flex items-center justify-center gap-2 rounded-full bg-accent px-6 py-3.5 text-[15px] font-semibold text-white transition hover:bg-accent-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:cursor-not-allowed disabled:opacity-60"
        >
          {status === "submitting" ? (
            <>
              <span
                aria-hidden
                className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
              />
              Creating…
            </>
          ) : (
            "Create account"
          )}
        </button>

        <p className="text-center text-xs leading-relaxed text-white/40">
          Creating an account accepts our{" "}
          <a href="/terms" target="_blank" className="underline underline-offset-2 hover:text-white/70">
            Terms
          </a>{" "}
          and{" "}
          <a href="/privacy" target="_blank" className="underline underline-offset-2 hover:text-white/70">
            Privacy Policy
          </a>
          .
        </p>
      </form>

      <p className="mt-6 text-center text-xs text-white/50">
        Already have an account?{" "}
        <Link href="/login" className="text-accent-soft underline-offset-4 hover:underline">
          Log in
        </Link>
      </p>
    </>
  );
}

const inputCls =
  "w-full rounded-xl border border-transparent bg-ink-800 px-4 py-3 text-[15px] text-white outline-none transition placeholder:text-white/35 hover:bg-ink-700 focus:border-accent focus:bg-ink-800";

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-white/70">
        {label}
        {required ? <span className="ml-1 text-accent">*</span> : null}
      </span>
      {children}
    </label>
  );
}
