"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

const QUALIFICATIONS = [
  "MBBS",
  "MS",
  "MD",
  "DNB",
  "FELLOW",
  "OTHER",
] as const;

const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry",
];

type Status = "idle" | "submitting" | "success" | "error";
type Intent = "apply" | "brochure";

const COPY: Record<
  Intent,
  {
    eyebrow: string;
    title: string;
    submitLabel: string;
    submittingLabel: string;
    successTitle: string;
    successBody: string;
  }
> = {
  apply: {
    eyebrow: "Apply",
    title: "Tell us about you",
    submitLabel: "Apply Now",
    submittingLabel: "Submitting…",
    successTitle: "Thanks — we’ve got your application.",
    successBody: "Our team will reach out shortly to schedule your discovery call.",
  },
  brochure: {
    eyebrow: "Brochure",
    title: "Get the brochure in your inbox",
    submitLabel: "Send me the brochure",
    submittingLabel: "Sending…",
    successTitle: "Check your inbox.",
    successBody: "We’ve emailed the brochure to you. It may take a minute to arrive.",
  },
};

export function ApplyFormModal({
  open,
  onClose,
  courseId,
  courseName,
  intent = "apply",
  brochureUrl,
}: {
  open: boolean;
  onClose: () => void;
  courseId: string;
  courseName?: string;
  intent?: Intent;
  brochureUrl?: string;
}) {
  const copy = COPY[intent];
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

    const firstName = String(data.get("firstName") ?? "").trim();
    const lastName = String(data.get("lastName") ?? "").trim();
    const phone = String(data.get("phone") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    const qualification = String(data.get("qualification") ?? "").trim();
    const state = String(data.get("state") ?? "").trim();
    const city = String(data.get("city") ?? "").trim();
    const pincode = String(data.get("pincode") ?? "").trim();
    const hiddenCourseId = String(data.get("courseId") ?? "").trim();

    setStatus("submitting");
    setErrorMsg(null);

    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          fullName: `${firstName} ${lastName}`.trim(),
          firstName,
          lastName,
          phone,
          email,
          qualification,
          state,
          city,
          pincode,
          courseId: hiddenCourseId,
          courseName,
          intent,
          brochureUrl: intent === "brochure" ? brochureUrl : undefined,
          source: intent === "brochure" ? "brochure-form-modal" : "apply-form-modal",
        }),
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
      aria-labelledby="apply-modal-title"
      className="fixed inset-0 z-[60] flex items-center justify-center px-4 py-8"
    >
      <button
        type="button"
        aria-label="Close form"
        onClick={onClose}
        className="absolute inset-0 h-full w-full bg-black/70 backdrop-blur-sm"
      />

      <div className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-[#0f0f12] p-6 ring-1 ring-white/10 sm:p-8">
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-full text-white/70 transition hover:bg-white/10 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>

        {status === "success" ? (
          <div className="py-8 text-center">
            <h3
              id="apply-modal-title"
              className="font-serif text-2xl text-white"
            >
              {copy.successTitle}
            </h3>
            <p className="mt-3 text-sm text-white/70">{copy.successBody}</p>
            <button
              type="button"
              onClick={onClose}
              className="mt-6 rounded-md bg-[#e8265c] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#a88251]"
            >
              Close
            </button>
          </div>
        ) : (
          <>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-accent-soft">
              {copy.eyebrow}
            </p>
            <h3
              id="apply-modal-title"
              className="mt-2 font-serif text-2xl text-white sm:text-3xl"
            >
              {copy.title}
            </h3>
            {courseName ? (
              <p className="mt-1 text-sm text-white/55">For {courseName}</p>
            ) : null}

            <form onSubmit={handleSubmit} className="mt-6 grid gap-4">
              <input type="hidden" name="courseId" value={courseId} />

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="First Name" required>
                  <input
                    ref={firstFieldRef}
                    name="firstName"
                    type="text"
                    required
                    autoComplete="given-name"
                    className={inputCls}
                  />
                </Field>
                <Field label="Last Name" required>
                  <input
                    name="lastName"
                    type="text"
                    required
                    autoComplete="family-name"
                    className={inputCls}
                  />
                </Field>
              </div>

              <Field label="Mobile Number" required>
                <input
                  name="phone"
                  type="tel"
                  required
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

              <Field label="Qualification" required>
                <select name="qualification" required className={selectCls}>
                  <option value="" className={optionCls}>
                    Select qualification
                  </option>
                  {QUALIFICATIONS.map((q) => (
                    <option key={q} value={q} className={optionCls}>
                      {q}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="State (India)">
                <select name="state" className={selectCls}>
                  <option value="" className={optionCls}>
                    Select state
                  </option>
                  {INDIAN_STATES.map((s) => (
                    <option key={s} value={s} className={optionCls}>
                      {s}
                    </option>
                  ))}
                </select>
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="City">
                  <input
                    name="city"
                    type="text"
                    autoComplete="address-level2"
                    className={inputCls}
                  />
                </Field>
                <Field label="Pincode">
                  <input
                    name="pincode"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    autoComplete="postal-code"
                    className={inputCls}
                  />
                </Field>
              </div>

              {status === "error" && errorMsg ? (
                <p className="rounded-md bg-red-500/10 px-3 py-2 text-sm text-red-300 ring-1 ring-red-500/30">
                  {errorMsg}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={status === "submitting"}
                className="mt-2 rounded-md bg-[#e8265c] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#a88251] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {status === "submitting" ? copy.submittingLabel : copy.submitLabel}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

const inputCls =
  "w-full rounded-md border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-accent/40 focus:bg-white/[0.06]";

const selectCls = `${inputCls} appearance-none bg-[#0f0f12] [color-scheme:dark]`;

const optionCls = "bg-[#0f0f12] text-white";

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
        {required ? <span className="ml-1 text-[#e8265c]">*</span> : null}
      </span>
      {children}
    </label>
  );
}
