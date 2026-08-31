"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { ThemedSelect } from "@/components/ThemedSelect";

/**
 * The whole application, step by step.
 *
 * Steps 1 and 2 are the form. Everything after step 4 happens once the
 * application has been sent — picking a slot from the Legend's availability,
 * confirming it, paying for it here in the flow. Booking and checkout are
 * **stubs**: they move the journey along so the ten steps can be walked end to
 * end, but no availability is read and no money moves. They are laid out as the
 * real ones will be so that replacing them is a matter of filling the panel,
 * not rewiring the flow.
 *
 * Every transition saves before it moves. Closing the tab anywhere costs
 * nothing.
 */

const QUALIFICATIONS = ["MBBS", "MS", "MD", "DNB", "FELLOW", "OTHER"] as const;

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa",
  "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala",
  "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland",
  "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
  "Uttar Pradesh", "Uttarakhand", "West Bengal", "Andaman and Nicobar Islands",
  "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu", "Delhi",
  "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry",
];

/** The platform's password rules, checked before the round trip. */
function passwordProblem(password: string): string | null {
  if (password.length < 8) return "use at least 8 characters.";
  if (!/[a-z]/.test(password)) return "include a lowercase letter.";
  if (!/[A-Z]/.test(password)) return "include an uppercase letter.";
  if (!/[0-9]/.test(password)) return "include a number.";
  if (!/[^A-Za-z0-9]/.test(password)) return "include a symbol, such as ! or @.";
  return null;
}

const STEP_LABELS = [
  "Your details",
  "Your cases",
  "Pick a slot",
  "Confirm & pay",
] as const;

/** Past the last form step: the journey is finished. */
const DONE_STEP = STEP_LABELS.length + 1;

interface WizardUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

/** One bookable time, as the platform works it out. */
interface Slot {
  start: string;
  end: string;
  label: string;
  timeZone: string;
  durationMinutes: number;
}

export interface BookedAppointment {
  id: number;
  /** 'pending_payment' while the slot is only held; 'confirmed' once paid. */
  status?: string;
  startsAt: string;
  label: string;
  timeZone: string;
  meetingUrl?: string;
  legendName?: string;
}

interface ApplicationLike {
  id?: number;
  status?: string;
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

export function ApplyWizard({
  courseId,
  courseSlug,
  courseName,
  mentorName,
  mentorEmail,
  feeInr,
  user: initialUser,
  application,
  profile,
  appointment: initialAppointment,
  requestedStep,
}: {
  courseId: string;
  courseSlug: string;
  courseName: string;
  mentorName?: string;
  /** Which Legend's calendar to book. Blank means the course has none set up. */
  mentorEmail?: string;
  /** The booking fee, in rupees, from the server's configuration. */
  feeInr?: string;
  user: WizardUser | null;
  application: ApplicationLike | null;
  profile: ApplicationLike | null;
  /** The call already booked for this application, if there is one. */
  appointment: BookedAppointment | null;
  requestedStep?: number;
}) {
  const router = useRouter();

  /**
   * What we already know, in order of authority: an application in progress,
   * then their last application, then the account itself. A signed-in doctor
   * should never be asked for a name we are already holding.
   */
  const known: ApplicationLike = application ??
    profile ?? {
      first_name: initialUser?.firstName,
      last_name: initialUser?.lastName,
      email: initialUser?.email,
    };

  const [user, setUser] = useState<WizardUser | null>(initialUser);
  const [applicationId, setApplicationId] = useState<number | null>(
    application?.id ?? null,
  );
  const [step, setStep] = useState<number>(() => {
    if (requestedStep && requestedStep >= 1 && requestedStep <= 5) return requestedStep;
    return Number(application?.current_step) || 1;
  });

  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [justSignedUp, setJustSignedUp] = useState(false);

  const [qualification, setQualification] = useState(known.qualification ?? "");
  const [stateValue, setStateValue] = useState(known.state ?? "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Booking. `booked` is the call that exists; `slot` is the one being chosen.
  const [booked, setBooked] = useState<BookedAppointment | null>(initialAppointment);
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [slot, setSlot] = useState<Slot | null>(null);
  const [slotsNotice, setSlotsNotice] = useState<string | null>(null);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);

  /** Move to a step and leave a trace of it in the URL. */
  const goTo = (next: number) => {
    setStep(next);
    setErrorMsg(null);

    // Finishing is the one move that must not ask the server for the page
    // again. The page reads the saved step, sees a finished journey and puts
    // the "already applied" notice where this wizard is — right for somebody
    // coming back next week, wrong for the person who has this second paid and
    // is owed their confirmation. The address still changes, so a refresh or a
    // shared link lands on the finished panel the server renders.
    if (next >= DONE_STEP) {
      window.history.replaceState(null, "", `/apply/${courseSlug}?step=${next}`);
      return;
    }

    router.replace(`/apply/${courseSlug}?step=${next}`, { scroll: false });
  };

  /** Save the step marker so returning lands in the right place. */
  const saveStep = async (next: number) => {
    if (!applicationId) return;
    await fetch("/api/applications", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: applicationId, current_step: next }),
    }).catch(() => undefined);
  };

  // ─── step 1 ────────────────────────────────────────────────────────────────

  const submitDetails = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);

    if (!qualification) {
      setErrorMsg("Please select your qualification.");
      return;
    }
    if (!user) {
      const problem = passwordProblem(password);
      if (problem) return setErrorMsg(`Password: ${problem}`);
      if (password !== confirmPassword) return setErrorMsg("The two passwords do not match.");
    }

    setBusy(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          first_name: user?.firstName ?? String(data.get("firstName") ?? "").trim(),
          last_name: user?.lastName ?? String(data.get("lastName") ?? "").trim(),
          email: user?.email ?? String(data.get("email") ?? "").trim(),
          phone: String(data.get("phone") ?? "").trim(),
          qualification,
          state: stateValue,
          city: String(data.get("city") ?? "").trim(),
          pincode: String(data.get("pincode") ?? "").trim(),
          password,
          course_id: courseId,
          course_name: courseName,
          mentor_name: mentorName ?? "",
          return_path: `/apply/${courseSlug}`,
        }),
      });
      const body = await res.json().catch(() => ({}));

      if (!res.ok) throw new Error(body?.error ?? "Could not save your details");

      if (body?.requiresLogin) {
        setNeedsLogin(true);
        return;
      }
      if (body?.applicationId == null) {
        throw new Error("We could not save your application just now. Please try again.");
      }

      setApplicationId(body.applicationId);
      if (body.user) setUser(body.user);
      setJustSignedUp(Boolean(body.signedUp));
      goTo(2);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  // ─── step 2 → submit ───────────────────────────────────────────────────────

  const submitApplication = async () => {
    if (!applicationId) return setErrorMsg("Your application could not be found.");

    setBusy(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/applications/submit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: applicationId }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error ?? "Submission failed");
      // The server has already moved the row to step 3.
      goTo(3);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  // ─── step 3 — the Legend's real availability ───────────────────────────────

  /**
   * Load the times this Legend can actually take.
   *
   * Worked out on the server: their published hours minus whatever is already
   * in their Google Calendar. The list is therefore only true for as long as
   * it is on screen, which is why booking re-checks the chosen time rather
   * than trusting what was clicked.
   */
  const loadSlots = useCallback(async () => {
    if (!mentorEmail) {
      setSlotsError(
        "This programme has no Legend calendar set up yet. Our team will be in touch to " +
          "arrange your call.",
      );
      return;
    }

    setLoadingSlots(true);
    setSlotsError(null);

    try {
      const res = await fetch(
        `/api/booking/slots?legendEmail=${encodeURIComponent(mentorEmail)}`,
      );
      const data = await res.json();

      if (!res.ok) {
        setSlotsError(data?.error || "Times could not be loaded just now.");
        setSlots([]);
        return;
      }

      setSlots(data.slots ?? []);
      setSlotsNotice(data.notice ?? null);
    } catch {
      setSlotsError("Times could not be loaded just now. Please try again.");
      setSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  }, [mentorEmail]);

  // Only when the Star is actually looking at step 3, and only while nothing
  // is booked — a Legend's diary is a live thing and there is no sense reading
  // it for somebody sitting on step 1.
  useEffect(() => {
    if (step === 3 && !booked && slots === null && !loadingSlots) {
      void loadSlots();
    }
  }, [step, booked, slots, loadingSlots, loadSlots]);

  const confirmSlot = async () => {
    if (!slot) return setErrorMsg("Pick a time to continue.");
    if (!applicationId) return setErrorMsg("Your application could not be found.");

    setBusy(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/booking/appointments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          applicationId,
          legendEmail: mentorEmail,
          legendName: mentorName,
          start: slot.start,
          end: slot.end,
          timeZone: slot.timeZone,
        }),
      });

      const data = await res.json();

      // 409: somebody took it while this Star was deciding. Reloading the list
      // is the useful response — an error they cannot act on is not.
      if (res.status === 409) {
        setErrorMsg(data?.error || "That time has just been taken. Here are the times still open.");
        setSlot(null);
        setSlots(null);
        return;
      }

      if (!res.ok) {
        setErrorMsg(data?.error || "The booking could not be made. Please try again.");
        return;
      }

      setBooked(data.appointment ?? null);
      goTo(4);
    } catch {
      setErrorMsg("The booking could not be made. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  // ─── step 4 — a stub ───────────────────────────────────────────────────────

  /**
   * Checkout — still a stub, but the booking now hangs off it.
   *
   * Picking a slot only held it; this is where it becomes a real appointment
   * in the Legend's diary. When the gateway lands, the payment happens first
   * and its webhook calls the same confirm endpoint.
   */
  const payFee = async () => {
    if (!applicationId) return setErrorMsg("Your application could not be found.");

    setBusy(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/booking/confirm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ applicationId }),
      });

      const data = await res.json();

      // The hold lapsed, or the Legend's diary moved under it. Sending them
      // back to step 3 is the only useful thing to offer.
      if (res.status === 409) {
        setErrorMsg(data?.error || "That time is no longer available. Please pick another.");
        setBooked(null);
        setSlots(null);
        goTo(3);
        return;
      }

      if (!res.ok) {
        setErrorMsg(data?.error || "The booking could not be completed. Please try again.");
        return;
      }

      setBooked(data.appointment ?? booked);
      goTo(5);
    } catch {
      setErrorMsg("The booking could not be completed. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  // ─── render ────────────────────────────────────────────────────────────────

  if (needsLogin) {
    return (
      <Panel>
        <h1 className="text-[22px] font-extrabold leading-[1.25] tracking-[-0.015em] text-white">You already have an account</h1>
        <p className="mt-3 text-sm text-white/75">
          That email is already registered. Log in and you&rsquo;ll come straight back here.
        </p>
        <Link
          href={`/login?next=${encodeURIComponent(`/apply/${courseSlug}`)}`}
          className="mt-6 inline-flex rounded-[10px] bg-accent px-6 py-3 text-[15px] font-semibold text-white transition hover:bg-accent-deep"
        >
          Log in
        </Link>
      </Panel>
    );
  }

  return (
    <div className="mt-6">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-accent-soft">
        Apply
      </p>
      <h1 className="mt-2 font-display text-[clamp(2rem,4.4vw,3rem)] uppercase leading-[1.02] tracking-[-0.01em] text-white">{courseName}</h1>
      {mentorName ? <p className="mt-1 text-sm text-white/60">with {mentorName}</p> : null}

      {step <= 4 ? <Stepper current={step} /> : null}

      {justSignedUp && step === 2 ? (
        <p className="mt-6 rounded-[10px] bg-amber-500/10 px-3 py-2 text-xs leading-relaxed text-amber-200 ring-1 ring-amber-500/30">
          We&rsquo;ve emailed you a link to verify your address. You can carry on now — but
          you&rsquo;ll need to verify before you can log back in later.
        </p>
      ) : null}

      {errorMsg ? (
        <p className="mt-6 rounded-[10px] bg-red-500/10 px-3 py-2 text-sm text-red-300 ring-1 ring-red-500/30">
          {errorMsg}
        </p>
      ) : null}

      {step === 1 ? (
        <Panel>
          {user ? (
            <div className="mb-5 rounded-xl bg-ink-800 px-4 py-3 ring-1 ring-white/10">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/40">
                Applying as
              </p>
              <p className="mt-1 truncate text-sm text-white">
                {[user.firstName, user.lastName].filter(Boolean).join(" ") || user.email}
              </p>
              <p className="truncate text-xs text-white/50">{user.email}</p>
            </div>
          ) : null}

          <form onSubmit={submitDetails} className="grid gap-4">
            {user ? null : (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="First Name" required>
                    <input name="firstName" required autoComplete="given-name" className={inputCls} defaultValue={known.first_name ?? ""} />
                  </Field>
                  <Field label="Last Name" required>
                    <input name="lastName" required autoComplete="family-name" className={inputCls} defaultValue={known.last_name ?? ""} />
                  </Field>
                </div>
                <Field label="Email Address" required>
                  <input name="email" type="email" required autoComplete="email" className={inputCls} defaultValue={known.email ?? ""} />
                </Field>
              </>
            )}

            <Field label="Mobile Number" required>
              <input
                name="phone"
                type="tel"
                required
                inputMode="tel"
                pattern="[0-9+\-\s]{7,15}"
                placeholder="+91 9XXXXXXXXX"
                autoComplete="tel"
                className={inputCls}
                defaultValue={known.phone ?? ""}
              />
            </Field>

            <Field label="Qualification" required>
              <ThemedSelect
                id="apply-qualification"
                ariaLabel="Qualification"
                value={qualification}
                onChange={setQualification}
                placeholder="Select qualification"
                options={QUALIFICATIONS.map((q) => ({ value: q, label: q }))}
              />
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
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="City">
                <input name="city" autoComplete="address-level2" className={inputCls} defaultValue={known.city ?? ""} />
              </Field>
              <Field label="Pincode">
                <input name="pincode" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} autoComplete="postal-code" className={inputCls} defaultValue={known.pincode ?? ""} />
              </Field>
            </div>

            {user ? null : (
              <>
                <Field label="Password" required>
                  <input type="password" required autoComplete="new-password" className={inputCls} value={password} onChange={(e) => setPassword(e.target.value)} />
                  <span className="mt-1 block text-[11px] text-white/40">
                    At least 8 characters, with an uppercase letter, a number and a symbol.
                  </span>
                </Field>
                <Field label="Confirm Password" required>
                  <input type="password" required autoComplete="new-password" className={inputCls} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                </Field>
              </>
            )}

            <PrimaryButton busy={busy} busyLabel="Saving…">
              Continue →
            </PrimaryButton>

            {user ? null : (
              <p className="text-center text-xs leading-relaxed text-white/40">
                Continuing creates your account and accepts our{" "}
                <a href="/terms" target="_blank" className="underline underline-offset-2">Terms</a>{" "}
                and{" "}
                <a href="/privacy" target="_blank" className="underline underline-offset-2">Privacy Policy</a>.
              </p>
            )}
          </form>
        </Panel>
      ) : null}

      {step === 2 ? (
        <Panel>
          <h2 className="text-[19px] font-extrabold leading-[1.3] tracking-[-0.015em] text-white">A few cases you&rsquo;ve seen</h2>
          <p className="mt-3 text-sm text-white/65">
            We&rsquo;ll go through your cases together on the session. Send your application
            when you&rsquo;re ready.
          </p>
          <div className="mt-6 flex items-center gap-3">
            <SecondaryButton onClick={() => { void saveStep(1); goTo(1); }} disabled={busy}>
              <ArrowLeft className="h-4 w-4" aria-hidden /> Back
            </SecondaryButton>
            <PrimaryButton busy={busy} busyLabel="Submitting…" onClick={submitApplication} type="button">
              Submit application
            </PrimaryButton>
          </div>
        </Panel>
      ) : null}

      {step === 3 ? (
        <Panel>
          {booked ? (
            <div>
              <h2 className="text-[19px] font-extrabold leading-[1.3] tracking-[-0.015em] text-white">
                {booked.status === "confirmed" ? "Your call is booked" : "This time is held for you"}
              </h2>
              <p className="mt-2 text-sm text-white/75">
                <span className="text-white">{booked.label}</span> with{" "}
                {booked.legendName || mentorName || "your Legend"}.
              </p>
              <p className="mt-2 text-xs text-white/45">
                {booked.status === "confirmed"
                  ? `Times shown in ${booked.timeZone}. The invitation is in your inbox.`
                  : `Times shown in ${booked.timeZone}. It is yours to confirm at checkout — ` +
                    "we hold it for a short while, so finish up to keep it."}
              </p>
              <div className="mt-6">
                <PrimaryButton busy={false} busyLabel="" onClick={() => goTo(4)} type="button">
                  Continue
                </PrimaryButton>
              </div>
            </div>
          ) : (
            <div>
              <h2 className="text-[19px] font-extrabold leading-[1.3] tracking-[-0.015em] text-white">
                Pick a time with {mentorName || "your Legend"}
              </h2>
              <p className="mt-2 text-sm text-white/65">
                These are the times {mentorName || "your Legend"} is free. Choosing one puts it in
                both your calendars.
              </p>

              {slotsError ? (
                <div className="mt-5 rounded-[10px] bg-amber-500/10 px-3 py-3 text-sm leading-relaxed text-amber-200 ring-1 ring-amber-500/30">
                  {slotsError}
                </div>
              ) : null}

              {loadingSlots ? (
                <p className="mt-5 text-sm text-white/50">Checking their calendar…</p>
              ) : null}

              {!loadingSlots && slots && slots.length === 0 && !slotsError ? (
                <div className="mt-5 rounded-[10px] bg-ink-800 px-3 py-3 text-sm leading-relaxed text-white/70 ring-1 ring-white/10">
                  No times are open in the next few weeks. Our team will be in touch to arrange
                  one with you directly.
                </div>
              ) : null}

              {slots && slots.length > 0 ? (
                <div className="mt-5 grid gap-2 sm:grid-cols-2">
                  {slots.map((option) => (
                    <button
                      key={option.start}
                      type="button"
                      onClick={() => setSlot(option)}
                      className={`rounded-xl px-4 py-3 text-left text-sm ring-1 transition ${
                        slot?.start === option.start
                          ? "bg-spark/10 text-white ring-spark/60"
                          : "bg-ink-800 text-white/75 ring-white/10 hover:bg-ink-700 hover:ring-white/20"
                      }`}
                    >
                      <span className="block">{option.label}</span>
                      <span className="mt-0.5 block text-xs text-white/40">
                        {option.durationMinutes} minutes
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}

              {slotsNotice ? (
                <p className="mt-4 text-xs leading-relaxed text-white/40">{slotsNotice}</p>
              ) : null}

              {slots && slots.length > 0 ? (
                <p className="mt-4 text-xs text-white/40">
                  Times shown in {slots[0].timeZone}.
                </p>
              ) : null}

              <div className="mt-6 flex items-center gap-3">
                <PrimaryButton
                  busy={busy}
                  busyLabel="Booking…"
                  onClick={confirmSlot}
                  type="button"
                >
                  Confirm this time
                </PrimaryButton>
                {slots && !loadingSlots ? (
                  <SecondaryButton onClick={() => setSlots(null)} disabled={busy}>
                    Refresh times
                  </SecondaryButton>
                ) : null}
              </div>
            </div>
          )}
        </Panel>
      ) : null}

      {step === 4 ? (
        <Panel>
          <h2 className="text-[19px] font-extrabold leading-[1.3] tracking-[-0.015em] text-white">Confirm and pay</h2>
          <dl className="mt-5 grid gap-2 rounded-xl bg-ink-800 px-4 py-4 text-sm ring-1 ring-white/10">
            <Row label="Programme" value={courseName} />
            <Row label="Legend" value={mentorName || "—"} />
            <Row label="Your slot" value={booked?.label || slot?.label || "your selected time"} />
            <Row label="Booking fee" value={feeInr ? `₹${feeInr}` : "—"} />
          </dl>

          <p className="mt-3 text-xs text-white/45">
            This time is held for you. It goes into {mentorName || "your Legend"}&rsquo;s calendar
            once the fee is paid.
          </p>

          <div className="mt-6 flex items-center gap-3">
            <SecondaryButton onClick={() => { void saveStep(3); goTo(3); }} disabled={busy}>
              <ArrowLeft className="h-4 w-4" aria-hidden /> Back
            </SecondaryButton>
            <PrimaryButton busy={busy} busyLabel="Confirming…" onClick={payFee} type="button">
              Pay and confirm
            </PrimaryButton>
          </div>
        </Panel>
      ) : null}

      {step >= 5 ? (
        <Panel>
          <div className="py-4 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15 ring-1 ring-emerald-400/40">
              <CheckCircle2 className="h-7 w-7 text-emerald-400" aria-hidden />
            </div>
            <h2 className="mt-5 text-[22px] font-extrabold leading-[1.25] tracking-[-0.015em] text-white">You&rsquo;re all set</h2>
            <p className="mt-3 text-sm text-white/75">
              Your call with {mentorName || "your Legend"}
              {booked ? (
                <>
                  {" "}
                  on <span className="text-white">{booked.label}</span>
                </>
              ) : null}{" "}
              is booked and your application is with the team.
            </p>
            <p className="mt-3 text-xs text-white/45">
              A confirmation is on its way to you, and your Legend has the invite.
            </p>
            <Link
              href="/account"
              className="mt-6 inline-flex rounded-[10px] bg-accent px-6 py-3 text-[15px] font-semibold text-white transition hover:bg-accent-deep"
            >
              View your application
            </Link>
          </div>
        </Panel>
      ) : null}
    </div>
  );
}

// ─── small pieces ────────────────────────────────────────────────────────────

function Stepper({ current }: { current: number }) {
  return (
    <div className="mt-6">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/45">
        <span>
          Step {current} of {STEP_LABELS.length}
        </span>
        <span className="text-white/25">· {STEP_LABELS[current - 1]}</span>
      </div>
      <div className="mt-2 flex gap-1.5" aria-hidden>
        {STEP_LABELS.map((label, index) => (
          <span
            key={label}
            className={`h-1 flex-1 rounded-full ${
              index < current ? "bg-accent" : "bg-white/10"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <section className="mt-6 rounded-xl bg-ink-850 p-6 ring-1 ring-white/15 sm:p-8">
      {children}
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-white/50">{label}</dt>
      <dd className="truncate text-right text-white">{value}</dd>
    </div>
  );
}

function PrimaryButton({
  busy,
  busyLabel,
  children,
  onClick,
  type = "submit",
}: {
  busy: boolean;
  busyLabel: string;
  children: React.ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={busy}
      className="inline-flex flex-1 items-center justify-center gap-2 rounded-[10px] bg-accent px-6 py-3.5 text-[15px] font-semibold text-white transition hover:bg-accent-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {busy ? (
        <>
          <span aria-hidden className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
          {busyLabel}
        </>
      ) : (
        children
      )}
    </button>
  );
}

function SecondaryButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-1.5 rounded-[10px] bg-ink-800 px-5 py-3 text-sm font-medium text-white/85 transition hover:bg-ink-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
    >
      {children}
    </button>
  );
}

const inputCls =
  "w-full rounded-[10px] border border-transparent bg-ink-800 px-4 py-3 text-[15px] text-white outline-none transition placeholder:text-white/35 hover:bg-ink-700 focus:border-accent focus:bg-ink-800";

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
