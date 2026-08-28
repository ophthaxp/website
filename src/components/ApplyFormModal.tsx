"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Mail, X } from "lucide-react";
import { ThemedSelect } from "@/components/ThemedSelect";

/**
 * The platform's own password rules (`signupValidator` on the backend),
 * checked here first so the message arrives before the round trip rather than
 * after it. The server still enforces them — this is courtesy, not security.
 */
function passwordProblem(password: string): string | null {
  if (password.length < 8) return "use at least 8 characters.";
  if (!/[a-z]/.test(password)) return "include a lowercase letter.";
  if (!/[A-Z]/.test(password)) return "include an uppercase letter.";
  if (!/[0-9]/.test(password)) return "include a number.";
  if (!/[^A-Za-z0-9]/.test(password)) return "include a symbol, such as ! or @.";
  return null;
}

/** What /api/leads reports about each side-effect it attempted. */
interface StepOutcome {
  attempted?: boolean;
  ok?: boolean;
  status?: number;
  provider?: string;
  paymentLink?: boolean;
  reason?: string;
}

interface LeadResponse {
  ok?: boolean;
  error?: string;
  leadId?: number | null;
  welcome?: StepOutcome;
  whatsapp?: StepOutcome;
}

function describe(step: StepOutcome | undefined): string {
  if (!step) return "not reported by the server (old build?)";
  if (step.ok) {
    return `sent${step.provider ? ` via ${step.provider}` : ""}${
      step.paymentLink === false ? " — but WITHOUT a payment link" : ""
    }`;
  }
  if (!step.attempted) return `never attempted — ${step.reason ?? "no reason given"}`;
  return `FAILED${step.status ? ` (status ${step.status})` : ""} — ${step.reason ?? "no reason given"}`;
}

/**
 * Print what the server did with this submission.
 *
 * Everything after the lead row is written happens server-side, so the only
 * trace is in the deployment's runtime logs. Echoing it here means anyone
 * testing the form can see, in the console, how far the welcome email got.
 */
function logLeadOutcome(status: number, body: LeadResponse) {
  const label = "[lead submit]";
  if (!body?.ok) {
    console.error(`${label} rejected (HTTP ${status}) — ${body?.error ?? "no error given"}`, body);
    return;
  }
  console.groupCollapsed(`${label} saved — lead id ${body.leadId ?? "unknown"}`);
  console.log("welcome email:", describe(body.welcome));
  console.log("whatsapp:", describe(body.whatsapp));
  console.log("full response:", body);
  console.groupEnd();
}

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

/** Which panel of the apply flow is showing. */
type Stage = "loading" | "step1" | "step2" | "booking" | "check-email";

interface DraftApplication {
  id?: number;
  current_step?: number;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  qualification?: string;
  state?: string;
  city?: string;
  pincode?: string;
}

interface SessionUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

/**
 * Which panel a returning applicant should land on.
 *
 * Two things had to be got right here, and the first version got both wrong:
 *
 * `current_step` is compared loosely, because it arrives from the module data
 * API and an int column can come back as the string "2". A strict `=== 2` sent
 * everybody back to step 1 to retype details they had already given.
 *
 * And a draft with no `current_step` at all is judged by whether step 1 is
 * actually filled in, rather than being treated as untouched. Asking somebody
 * to fill in a form they have already completed is the worse failure of the
 * two, so the tie is broken that way.
 */
function resumeStage(application: DraftApplication | null | undefined): Stage {
  if (!application) return "step1";

  // Past submission the journey continues outside the form — booking the call,
  // confirming it, paying. Returning somebody to step 2 there would show them a
  // page they have already sent.
  if (Number(application.current_step) >= 3) return "booking";
  if (Number(application.current_step) >= 2) return "step2";

  const stepOneComplete = Boolean(
    application.first_name &&
      application.last_name &&
      application.email &&
      application.phone &&
      application.qualification,
  );
  return application.current_step == null && stepOneComplete ? "step2" : "step1";
}

/**
 * Enough detail on file to open an application without asking again.
 *
 * These are exactly the fields step 1 refuses to submit without, so if they are
 * all present there is nothing left for that step to collect.
 */
function isProfileComplete(profile: DraftApplication | null | undefined): boolean {
  return Boolean(
    profile?.first_name &&
      profile?.last_name &&
      profile?.email &&
      profile?.phone &&
      profile?.qualification,
  );
}

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
  mentorName,
  payUrl,
  intent = "apply",
  brochureUrl,
}: {
  open: boolean;
  onClose: () => void;
  courseId: string;
  courseName?: string;
  /** Faculty name shown in the welcome email hero, e.g. "Dr. Srinivas K Rao". */
  mentorName?: string;
  /** Optional payment link for the exploratory call. Falls back to APPLY_PAY_URL on the server. */
  payUrl?: string;
  intent?: Intent;
  brochureUrl?: string;
}) {
  const copy = COPY[intent];
  const isBrochure = intent === "brochure";
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [qualification, setQualification] = useState<string>("");
  const [stateValue, setStateValue] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  /** They created their account a moment ago and have not verified it yet. */
  const [justSignedUp, setJustSignedUp] = useState(false);
  const firstFieldRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Apply flow only. A brochure request is still one form and one POST.
  const [stage, setStage] = useState<Stage>(isBrochure ? "step1" : "loading");
  const [draft, setDraft] = useState<DraftApplication | null>(null);
  const [applicationId, setApplicationId] = useState<number | null>(null);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [linkedEmail, setLinkedEmail] = useState<string>("");

  /** Where a sign-in link should bring them back to. */
  const returnPath = () =>
    typeof window === "undefined" ? "" : window.location.pathname + window.location.search;

  /**
   * Start an application for this course from details already on file.
   *
   * The same POST step 1 makes, just without making the applicant retype what
   * we already hold. Returns the new application id, or null if it could not
   * be opened — in which case the caller falls back to showing step 1.
   */
  const openFromProfile = async (profile: DraftApplication): Promise<number | null> => {
    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          first_name: profile.first_name,
          last_name: profile.last_name,
          email: profile.email,
          phone: profile.phone,
          qualification: profile.qualification,
          state: profile.state ?? "",
          city: profile.city ?? "",
          pincode: profile.pincode ?? "",
          course_id: courseId,
          course_name: courseName ?? "",
          mentor_name: mentorName ?? "",
          return_path: returnPath(),
        }),
      });
      const body = await res.json().catch(() => ({}));
      return res.ok && body?.applicationId != null ? Number(body.applicationId) : null;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    if (!open) return;
    setStatus("idle");
    setErrorMsg(null);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }

      // Keep Tab inside the dialog. `aria-modal` tells a screen reader the rest
      // of the page is inert, but it does not make it so — without this, tabbing
      // walks out of the form and onto the page behind, which for a keyboard or
      // screen-reader user means silently losing the form they were filling in.
      if (e.key !== "Tab") return;

      const root = dialogRef.current;
      if (!root) return;

      const focusable = root.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (e.shiftKey && (active === first || !root.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";

    // Send focus back where it came from on close, so the page does not dump
    // the user at the top after they dismiss the form.
    const opener = document.activeElement as HTMLElement | null;

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      opener?.focus?.();
    };
  }, [open, onClose]);

  /**
   * Pick up whatever this person already started.
   *
   * Runs every time the form opens rather than once, because they may have
   * signed in through an emailed link since the page loaded.
   */
  useEffect(() => {
    if (!open || isBrochure) return;

    let cancelled = false;
    setStage("loading");

    (async () => {
      try {
        const res = await fetch(
          `/api/applications?courseId=${encodeURIComponent(courseId)}`,
          { cache: "no-store" },
        );
        const body = await res.json().catch(() => ({}));
        if (cancelled) return;

        const application = body?.application as DraftApplication | null;
        const profile = body?.prefill as DraftApplication | null;
        const sessionUser = (body?.user as SessionUser | null) ?? null;

        // Somebody who signed up directly has no earlier application to borrow
        // from, but their name and email came with the account. Only what the
        // account does not hold — phone, qualification, where they practise —
        // is still worth asking for.
        const fromSession: DraftApplication | null = sessionUser
          ? {
              first_name: sessionUser.firstName,
              last_name: sessionUser.lastName,
              email: sessionUser.email,
            }
          : null;

        const known = application ?? profile ?? fromSession;

        setUser(sessionUser);
        setDraft(known);
        setApplicationId(application?.id ?? null);
        setQualification(known?.qualification ?? "");
        setStateValue(known?.state ?? "");

        if (application) {
          setStage(resumeStage(application));
          return;
        }

        // Nothing started for this course, but we already have their details.
        // Don't ask for them again — open the application from what we know and
        // go straight to the part that is actually new. Their details are shown
        // on step 2 with a way to change them.
        if (sessionUser && isProfileComplete(profile)) {
          const opened = await openFromProfile(profile!);
          if (cancelled) return;
          if (opened) {
            setApplicationId(opened);
            setStage("step2");
            return;
          }
          // Falling through to step 1 is the safe failure: worst case they
          // confirm details we already had.
        }

        setStage("step1");
      } catch {
        if (cancelled) return;
        // A failed lookup only costs the prefill — the form still works.
        setDraft(null);
        setStage("step1");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, isBrochure, courseId]);

  // Depends on `open` as well as `stage`: a brochure form opens straight into
  // step 1 and stays there, so keying off the stage alone would focus the
  // first field once and never again on reopen.
  useEffect(() => {
    if (!open || stage !== "step1") return;
    // Signed in, the name inputs are not rendered and this ref is empty; the
    // focus trap's own query finds the first real field instead.
    firstFieldRef.current?.focus();
  }, [open, stage]);

  /**
   * Remember which step they were on when the form is dismissed.
   *
   * The answers themselves were saved when they moved between steps; this is
   * only so reopening puts them back in the right place.
   */
  const handleClose = useCallback(() => {
    if (!isBrochure && applicationId && (stage === "step1" || stage === "step2")) {
      const step = stage === "step2" ? 2 : 1;
      void fetch("/api/applications", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: applicationId, current_step: step }),
        keepalive: true,
      }).catch(() => undefined);
    }
    onClose();
  }, [isBrochure, applicationId, stage, onClose]);

  // ─── step 1 ────────────────────────────────────────────────────────────────

  /**
   * Save the basics and move on.
   *
   * This is also where the account is created, invisibly, so that everything
   * after it can be saved against somebody. A returning email is the one case
   * that stops here: the platform emails them a link instead of letting the
   * form open an application it cannot prove is theirs.
   */
  const handleStepOne = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);

    // When signed in these come from the account rather than the form, which
    // no longer renders them.
    const firstName = user?.firstName ?? String(data.get("firstName") ?? "").trim();
    const lastName = user?.lastName ?? String(data.get("lastName") ?? "").trim();
    const email = user?.email ?? String(data.get("email") ?? "").trim();
    const phone = String(data.get("phone") ?? "").trim();

    if (!qualification) {
      setStatus("error");
      setErrorMsg("Please select your qualification.");
      return;
    }

    // Only a new applicant sets a password; somebody signed in already has one.
    if (!user) {
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
    }

    setStatus("submitting");
    setErrorMsg(null);

    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
          email,
          phone,
          qualification,
          state: stateValue,
          city: String(data.get("city") ?? "").trim(),
          pincode: String(data.get("pincode") ?? "").trim(),
          password,
          course_id: courseId,
          course_name: courseName ?? "",
          mentor_name: mentorName ?? "",
          return_path: returnPath(),
        }),
      });
      const body = await res.json().catch(() => ({}));

      if (!res.ok) throw new Error(body?.error ?? "Could not save your details");

      if (body?.requiresLogin) {
        setLinkedEmail(body.email ?? email);
        setStatus("idle");
        setStage("check-email");
        return;
      }

      // Belt and braces with the route, which now refuses to report success
      // without a row. Advancing to step 2 with no application behind it is
      // how "your application could not be found" used to surface — at the
      // very end, nowhere near what actually went wrong.
      if (body?.applicationId == null) {
        throw new Error("We could not save your application just now. Please try again.");
      }

      setApplicationId(body.applicationId);
      setUser(body?.user ?? null);
      setJustSignedUp(Boolean(body?.signedUp));
      setDraft((prev) => ({
        ...prev,
        first_name: firstName,
        last_name: lastName,
        email,
        phone,
        qualification,
        state: stateValue,
      }));
      setStatus("idle");
      setStage("step2");
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong");
    }
  };

  // ─── step 2 ────────────────────────────────────────────────────────────────

  const handleBack = async () => {
    setStage("step1");
    if (applicationId) {
      void fetch("/api/applications", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: applicationId, current_step: 1 }),
      }).catch(() => undefined);
    }
  };

  /**
   * Finish. The server writes the lead, which is what sends the welcome email
   * and puts this person in front of the team.
   */
  const handleSubmitApplication = async () => {
    if (!applicationId) {
      setStatus("error");
      setErrorMsg("Your application could not be found. Please start again.");
      return;
    }

    setStatus("submitting");
    setErrorMsg(null);

    try {
      const res = await fetch("/api/applications/submit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: applicationId }),
      });
      const body = await res.json().catch(() => ({}));

      logLeadOutcome(res.status, body);

      if (!res.ok) throw new Error(body?.error ?? "Submission failed");
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong");
    }
  };

  // ─── brochure (unchanged path) ─────────────────────────────────────────────

  const handleBrochureSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);

    const firstName = String(data.get("firstName") ?? "").trim();
    const lastName = String(data.get("lastName") ?? "").trim();
    const phone = String(data.get("phone") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();

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
          courseId: String(data.get("courseId") ?? "").trim(),
          courseName,
          mentorName,
          intent: "brochure",
          source: "brochure-form-modal",
          brochureUrl,
        }),
      });
      const body = await res.json().catch(() => ({}));

      logLeadOutcome(res.status, body);

      if (!res.ok) throw new Error(body?.error ?? "Submission failed");
      setStatus("success");
      form.reset();
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong");
    }
  };

  if (!open) return null;

  const showStepper = !isBrochure && (stage === "step1" || stage === "step2");

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="apply-modal-title"
      className="fixed inset-0 z-[60] flex items-center justify-center px-4 py-8 modal-fade-in"
    >
      <button
        type="button"
        aria-label="Close form"
        onClick={handleClose}
        className="absolute inset-0 h-full w-full bg-black/70 backdrop-blur-sm"
      />

      <div
        ref={dialogRef}
        className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-[#0f0f12] p-6 ring-1 ring-white/10 modal-pop-in sm:p-8"
      >
        <button
          type="button"
          aria-label="Close"
          onClick={handleClose}
          className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-full text-white/70 transition hover:bg-white/10 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>

        {status === "success" ? (
          <SuccessPanel
            title={copy.successTitle}
            body={copy.successBody}
            onClose={handleClose}
          />
        ) : stage === "check-email" ? (
          <CheckEmailPanel email={linkedEmail} onClose={handleClose} />
        ) : stage === "loading" ? (
          <div className="flex items-center justify-center py-16">
            <span
              aria-hidden
              className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-white/70"
            />
            <span className="sr-only">Loading your application</span>
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
              {stage === "booking"
                ? "Your application is in"
                : stage === "step2"
                  ? "A few cases you’ve seen"
                  : copy.title}
            </h3>
            {courseName ? (
              <p className="mt-1 text-sm text-white/75">For {courseName}</p>
            ) : null}

            {showStepper ? (
              <Stepper current={stage === "step2" ? 2 : 1} />
            ) : null}

            {user && stage === "step1" ? (
              <div className="mt-4 rounded-xl bg-white/[0.03] px-4 py-3 ring-1 ring-white/[0.06]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/40">
                  Applying as
                </p>
                <p className="mt-1 truncate text-sm text-white">
                  {[user.firstName, user.lastName].filter(Boolean).join(" ") || user.email}
                </p>
                <p className="truncate text-xs text-white/50">{user.email}</p>
              </div>
            ) : null}

            {stage === "booking" ? (
              <NextStepPanel onClose={handleClose} />
            ) : stage === "step2" ? (
              <StepTwo
                onBack={handleBack}
                onSubmit={handleSubmitApplication}
                submitting={status === "submitting"}
                errorMsg={status === "error" ? errorMsg : null}
                applicant={draft}
                justSignedUp={justSignedUp}
              />
            ) : (
              <form
                onSubmit={isBrochure ? handleBrochureSubmit : handleStepOne}
                className="mt-6 grid gap-4"
              >
                <input type="hidden" name="courseId" value={courseId} />

                {user ? null : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="First Name" required>
                      <input
                        ref={firstFieldRef}
                        name="firstName"
                        type="text"
                        required
                        defaultValue={draft?.first_name ?? ""}
                        autoComplete="given-name"
                        className={inputCls}
                      />
                    </Field>
                    <Field label="Last Name" required>
                      <input
                        name="lastName"
                        type="text"
                        required
                        defaultValue={draft?.last_name ?? ""}
                        autoComplete="family-name"
                        className={inputCls}
                      />
                    </Field>
                  </div>
                )}

                <Field label="Mobile Number" required>
                  <input
                    name="phone"
                    type="tel"
                    required
                    inputMode="tel"
                    pattern="[0-9+\-\s]{7,15}"
                    defaultValue={draft?.phone ?? ""}
                    autoComplete="tel"
                    placeholder="+91 9XXXXXXXXX"
                    className={inputCls}
                  />
                </Field>

                {user ? null : (
                  <Field label="Email Address" required>
                    <input
                      name="email"
                      type="email"
                      required
                      defaultValue={draft?.email ?? ""}
                      autoComplete="email"
                      className={inputCls}
                    />
                  </Field>
                )}

                {!isBrochure ? (
                  <>
                    <Field label="Qualification" required>
                      <ThemedSelect
                        id="apply-qualification"
                        ariaLabel="Qualification"
                        value={qualification}
                        onChange={setQualification}
                        placeholder="Select qualification"
                        options={QUALIFICATIONS.map((q) => ({ value: q, label: q }))}
                      />
                      <input type="hidden" name="qualification" value={qualification} />
                    </Field>

                    <Field label="State (India)">
                      <ThemedSelect
                        id="apply-state"
                        ariaLabel="State"
                        value={stateValue}
                        onChange={setStateValue}
                        placeholder="Select state"
                        options={INDIAN_STATES.map((s) => ({ value: s, label: s }))}
                      />
                      <input type="hidden" name="state" value={stateValue} />
                    </Field>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="City">
                        <input
                          name="city"
                          type="text"
                          defaultValue={draft?.city ?? ""}
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
                          defaultValue={draft?.pincode ?? ""}
                          autoComplete="postal-code"
                          className={inputCls}
                        />
                      </Field>
                    </div>
                  </>
                ) : null}

                {!isBrochure && !user ? (
                  <>
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
                        At least 8 characters, with an uppercase letter, a number and a
                        symbol.
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
                  </>
                ) : null}

                {status === "error" && errorMsg ? (
                  <p className="rounded-md bg-red-500/10 px-3 py-2 text-sm text-red-300 ring-1 ring-red-500/30">
                    {errorMsg}
                  </p>
                ) : null}

                <button
                  type="submit"
                  disabled={status === "submitting"}
                  className="mt-2 inline-flex items-center justify-center gap-2 rounded-md bg-[#ab834d] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#8a6a40] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ab834d]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f0f12] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {status === "submitting" ? (
                    <>
                      <span
                        aria-hidden
                        className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
                      />
                      {isBrochure ? copy.submittingLabel : "Saving…"}
                    </>
                  ) : isBrochure ? (
                    copy.submitLabel
                  ) : (
                    "Continue →"
                  )}
                </button>

                {!isBrochure && !user ? (
                  <p className="text-center text-xs leading-relaxed text-white/40">
                    Continuing creates your account and accepts our{" "}
                    <a href="/terms" target="_blank" className="underline underline-offset-2 hover:text-white/70">
                      Terms
                    </a>{" "}
                    and{" "}
                    <a href="/privacy" target="_blank" className="underline underline-offset-2 hover:text-white/70">
                      Privacy Policy
                    </a>
                    .
                  </p>
                ) : null}

                {!isBrochure && !user ? (
                  <p className="text-center text-xs text-white/45">
                    Already started?{" "}
                    <a
                      href={`/login?next=${encodeURIComponent(returnPath())}`}
                      className="text-accent-soft underline-offset-4 hover:underline"
                    >
                      Sign in to continue
                    </a>
                  </p>
                ) : null}
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Everything after the application is sent.
 *
 * Booking the exploratory call, confirming it and paying are steps 5 to 7 and
 * are not built yet. Until they are, somebody who comes back to a submitted
 * application needs to be told where they stand rather than shown a form again
 * — and this is the slot those steps will occupy.
 */
function NextStepPanel({ onClose }: { onClose: () => void }) {
  return (
    <div className="mt-6">
      <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/40">
          What happens next
        </p>
        <ol className="mt-3 grid gap-2 text-sm text-white/70">
          <li>Our team reviews your application.</li>
          <li>You&rsquo;ll be invited to book an exploratory call.</li>
          <li>Confirm the call and settle the fee to lock your slot.</li>
        </ol>
        <p className="mt-4 text-xs text-white/45">
          We&rsquo;ll email you as soon as booking opens. Nothing is lost in the meantime —
          your application is saved.
        </p>
      </div>

      <button
        type="button"
        onClick={onClose}
        className="mt-6 w-full rounded-md bg-[#ab834d] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#8a6a40]"
      >
        Close
      </button>
    </div>
  );
}

/** Step 2 — the LoMa cases, once they exist. */
function StepTwo({
  onBack,
  onSubmit,
  submitting,
  errorMsg,
  applicant,
  justSignedUp,
}: {
  onBack: () => void;
  onSubmit: () => void;
  submitting: boolean;
  errorMsg: string | null;
  applicant: DraftApplication | null;
  justSignedUp: boolean;
}) {
  const name = [applicant?.first_name, applicant?.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();
  const line = [applicant?.qualification, applicant?.city].filter(Boolean).join(" · ");

  return (
    <div className="mt-6">
      {justSignedUp ? (
        <p className="mb-5 rounded-md bg-amber-500/10 px-3 py-2 text-xs leading-relaxed text-amber-200 ring-1 ring-amber-500/30">
          We&rsquo;ve emailed you a link to verify your address. You can finish applying now
          &mdash; but you&rsquo;ll need to verify before you can log back in later.
        </p>
      ) : null}

      {name ? (
        <div className="mb-5 flex items-start justify-between gap-3 rounded-xl bg-white/[0.03] px-4 py-3 ring-1 ring-white/[0.06]">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/40">
              Applying as
            </p>
            <p className="mt-1 truncate text-sm text-white">{name}</p>
            {line ? <p className="truncate text-xs text-white/50">{line}</p> : null}
          </div>
          <button
            type="button"
            onClick={onBack}
            className="shrink-0 text-xs font-semibold text-accent-soft underline-offset-4 transition hover:underline"
          >
            Edit
          </button>
        </div>
      ) : null}
      <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.02] px-4 py-8 text-center">
        <p className="text-sm text-white/70">
          The case questions for this step are being finalised.
        </p>
        <p className="mt-2 text-xs text-white/45">
          You can send your application now — we&rsquo;ll cover your cases on the discovery
          call.
        </p>
      </div>

      {errorMsg ? (
        <p className="mt-4 rounded-md bg-red-500/10 px-3 py-2 text-sm text-red-300 ring-1 ring-red-500/30">
          {errorMsg}
        </p>
      ) : null}

      <div className="mt-6 flex items-center gap-3">
        {name ? null : (
          <button
            type="button"
            onClick={onBack}
            disabled={submitting}
            className="inline-flex items-center gap-1.5 rounded-md border border-white/15 px-4 py-3 text-sm font-medium text-white/70 transition hover:border-white/25 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Back
          </button>
        )}
        <button
          type="button"
          onClick={onSubmit}
          disabled={submitting}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-md bg-[#ab834d] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#8a6a40] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ab834d]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f0f12] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? (
            <>
              <span
                aria-hidden
                className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
              />
              Submitting…
            </>
          ) : (
            "Submit application"
          )}
        </button>
      </div>
    </div>
  );
}

function Stepper({ current }: { current: 1 | 2 }) {
  return (
    <div className="mt-5" aria-label={`Step ${current} of 2`}>
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/50">
          Step {current} of 2
        </span>
        <span className="text-[11px] text-white/30">
          · {current === 1 ? "Your details" : "Your cases"}
        </span>
      </div>
      <div className="mt-2 flex gap-1.5" aria-hidden>
        <span className="h-1 flex-1 rounded-full bg-[#ab834d]" />
        <span
          className={`h-1 flex-1 rounded-full ${current === 2 ? "bg-[#ab834d]" : "bg-white/10"}`}
        />
      </div>
    </div>
  );
}

/** Shown when the email already belongs to an account. */
function CheckEmailPanel({ email, onClose }: { email: string; onClose: () => void }) {
  return (
    <div className="success-pop py-8 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#ab834d]/15 ring-1 ring-[#ab834d]/40">
        <Mail className="h-6 w-6 text-[#ab834d]" aria-hidden />
      </div>
      <h3 id="apply-modal-title" className="mt-5 font-serif text-2xl text-white">
        You already have an account
      </h3>
      <p className="mt-3 text-sm text-white/80">
        {email ? (
          <>
            <span className="text-white">{email}</span> is already registered.
          </>
        ) : (
          <>That email is already registered.</>
        )}{" "}
        Log in and you&rsquo;ll come straight back here to carry on.
      </p>
      <a
        href={`/login?next=${encodeURIComponent(
          typeof window === "undefined"
            ? "/"
            : window.location.pathname + window.location.search,
        )}`}
        className="mt-6 inline-flex rounded-md bg-[#ab834d] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#8a6a40]"
      >
        Log in
      </a>
      <button
        type="button"
        onClick={onClose}
        className="mt-3 block w-full text-xs font-semibold text-white/50 transition hover:text-white/80"
      >
        Close
      </button>
    </div>
  );
}

function SuccessPanel({
  title,
  body,
  onClose,
}: {
  title: string;
  body: string;
  onClose: () => void;
}) {
  return (
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
      <h3 id="apply-modal-title" className="mt-5 font-serif text-2xl text-white">
        {title}
      </h3>
      <p className="mt-3 text-sm text-white/80">{body}</p>
      <button
        type="button"
        onClick={onClose}
        className="mt-6 rounded-md bg-[#ab834d] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#8a6a40] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ab834d]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f0f12]"
      >
        Close
      </button>
    </div>
  );
}

const inputCls =
  "w-full rounded-md border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-accent/40 focus:bg-white/[0.06]";

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
        {required ? <span className="ml-1 text-[#ab834d]">*</span> : null}
      </span>
      {children}
    </label>
  );
}
