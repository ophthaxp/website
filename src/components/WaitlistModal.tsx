"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

type Status = "idle" | "submitting" | "success" | "error";

/**
 * WaitlistModal — lightweight capture for people who aren't ready to apply yet.
 * Only the email address is required; the rest helps the concierge desk follow up.
 */
export function WaitlistModal({
  open,
  onClose,
  source = "hero-waitlist",
}: {
  open: boolean;
  onClose: () => void;
  source?: string;
}) {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const firstFieldRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setStatus("idle");
    setErrorMsg(null);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    firstFieldRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);

    const name = String(data.get("name") ?? "").trim();
    const city = String(data.get("city") ?? "").trim();
    const phone = String(data.get("phone") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();

    setStatus("submitting");
    setErrorMsg(null);

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, city, phone, email, source }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? "Submission failed");
      }
      setStatus("success");
      form.reset();
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong");
    }
  };

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="waitlist-modal-title"
      className="fixed inset-0 z-[60] flex items-center justify-center px-4 py-8 modal-fade-in"
    >
      <button
        type="button"
        aria-label="Close form"
        onClick={onClose}
        className="absolute inset-0 h-full w-full bg-black/70 backdrop-blur-sm"
      />

      <div className="relative z-10 max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl bg-ink-850 p-6 ring-1 ring-white/15 modal-pop-in sm:p-8">
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-full text-white/70 transition hover:bg-white/10 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>

        {status === "success" ? (
          <div className="success-pop py-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15 ring-1 ring-emerald-400/40">
              <svg
                className="h-7 w-7 text-emerald-400"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </div>
            <h3
              id="waitlist-modal-title"
              className="mt-5 font-serif text-2xl text-white"
            >
              You&rsquo;re on the waitlist.
            </h3>
            <p className="mt-3 text-sm text-white/80">
              We&rsquo;ll write to you the moment seats open for the next cohort.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-6 rounded-[10px] bg-accent px-6 py-3 text-[15px] font-semibold text-white transition hover:bg-accent-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
            >
              Close
            </button>
          </div>
        ) : (
          <>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-accent-soft">
              Waitlist
            </p>
            <h3
              id="waitlist-modal-title"
              className="mt-2 font-serif text-2xl text-white sm:text-3xl"
            >
              Join the waitlist
            </h3>
            <p className="mt-1 text-sm text-white/75">
              Cohorts are selective and fill fast. Leave your details and we&rsquo;ll
              tell you first when the next batch opens.
            </p>

            <form onSubmit={handleSubmit} className="mt-6 grid gap-4">
              <Field label="Name">
                <input
                  ref={firstFieldRef}
                  name="name"
                  type="text"
                  autoComplete="name"
                  className={inputCls}
                />
              </Field>

              <Field label="City">
                <input
                  name="city"
                  type="text"
                  autoComplete="address-level2"
                  className={inputCls}
                />
              </Field>

              <Field label="Phone Number (WhatsApp)">
                <input
                  name="phone"
                  type="tel"
                  inputMode="tel"
                  pattern="[0-9+\-\s]{7,15}"
                  autoComplete="tel"
                  placeholder="+91 9XXXXXXXXX"
                  className={inputCls}
                />
              </Field>

              <Field label="Email Address" required>
                <input
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  className={inputCls}
                />
              </Field>

              {status === "error" && errorMsg ? (
                <p className="rounded-[10px] bg-red-500/10 px-3 py-2 text-sm text-red-300 ring-1 ring-red-500/30">
                  {errorMsg}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={status === "submitting"}
                className="mt-2 inline-flex items-center justify-center gap-2 rounded-[10px] bg-accent px-6 py-3.5 text-[15px] font-semibold text-white transition hover:bg-accent-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:cursor-not-allowed disabled:opacity-60"
              >
                {status === "submitting" ? (
                  <>
                    <span
                      aria-hidden
                      className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
                    />
                    Joining…
                  </>
                ) : (
                  "Join Waitlist"
                )}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

const inputCls =
  "w-full rounded-[10px] border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-accent/40 focus:bg-white/[0.06]";

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
