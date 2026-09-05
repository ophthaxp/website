import Link from "next/link";
import { Check } from "lucide-react";
import { getLeadStatus, isConfigured, listApplications } from "@/lib/applyApi";
import {
  combinedStageRank,
  headlineFor,
  isRejected,
  STAGES,
  type Headline,
} from "@/lib/applicationStatus";
import { isPaidStatus, listPaymentsForLead, type PaymentRecord } from "@/lib/paymentsApi";
import { LEGAL } from "@/lib/legal";

/**
 * Everything a doctor has actually applied to, and what it cost.
 *
 * This is the part of the old account page that was doing real work, lifted out
 * whole so the redesign is a change of setting rather than a rewrite of the one
 * screen people depend on. It now lives under Pathways, beside the programmes
 * it is about, instead of being the entire dashboard.
 */

/**
 * Where "carry on" goes.
 *
 * The application is a page now, so this is `/apply/[slug]?step=N`. Rows saved
 * while the form was still a popup carry a `/programs/[slug]` return path;
 * those map straight across, because both routes are keyed by the same slug.
 */
function resumeHref(returnPath: string | undefined, step: number): string {
  const safe =
    returnPath && returnPath.startsWith("/") && !returnPath.startsWith("//")
      ? returnPath.split("?")[0]
      : "";

  let base = "/programs";
  if (safe.startsWith("/apply/")) base = safe;
  else if (safe.startsWith("/programs/")) base = safe.replace("/programs/", "/apply/");

  return base === "/programs" ? base : `${base}?step=${step}`;
}

function formatDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** Money as a doctor reading their bank statement would expect to see it. */
function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: currency || "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    // An unknown currency code should not take the panel down with it.
    return `${currency} ${amount.toLocaleString("en-IN")}`;
  }
}

/** One row, already joined to its status and its money. */
export interface ApplicationRow {
  id: string;
  courseName: string;
  mentorName?: string;
  submittedAt: string | null;
  lastSeenAt: string | null;
  submitted: boolean;
  leadStatus: string | null;
  headline: Headline;
  resumeTo: string;
  currentStep: number;
  payments: PaymentRecord[];
}

/**
 * Fetch the applications, their statuses and their payments in one go.
 *
 * The three reads are joined here rather than in a page so the Pathways tab can
 * both summarise them and list them from a single trip to the platform.
 */
export async function loadApplications(email: string): Promise<ApplicationRow[]> {
  const applications = isConfigured() ? await listApplications(email) : [];

  // Only submitted applications have a lead, and the lead is where the status
  // after submission lives. Fetched together rather than one after another.
  const leadStatuses = await Promise.all(
    applications.map((app) =>
      app.status === "submitted" && app.lead_id
        ? getLeadStatus(app.lead_id).catch(() => null)
        : Promise.resolve(null),
    ),
  );

  // What they have actually been charged, per application. Read from the
  // platform's payments record — the same rows the finance side reconciles —
  // so a doctor and the team are always looking at one set of numbers.
  const payments = await Promise.all(
    applications.map((app) =>
      app.status === "submitted" && app.lead_id
        ? listPaymentsForLead(app.lead_id).catch(() => [])
        : Promise.resolve([] as PaymentRecord[]),
    ),
  );

  return applications.map((app, index) => ({
    id: String(app.id ?? index),
    courseName: app.course_name || "Your application",
    mentorName: app.mentor_name,
    submittedAt: formatDate(app.submitted_at),
    lastSeenAt: formatDate(app.last_seen_at),
    submitted: app.status === "submitted",
    leadStatus: leadStatuses[index],
    headline: headlineFor({
      applicationStatus: app.status,
      currentStep: app.current_step,
      leadStatus: leadStatuses[index],
    }),
    resumeTo: resumeHref(app.return_path, Number(app.current_step) || 1),
    currentStep: Number(app.current_step) || 1,
    payments: payments[index],
  }));
}

/**
 * The applications, two to a row.
 *
 * Except when there is only one, which is most people: half a card beside half
 * an empty column reads as something that failed to load. A lone application
 * takes the full width instead, and the pairs come back the moment there are
 * two of them.
 */
export function ApplicationList({ rows }: { rows: ApplicationRow[] }) {
  if (rows.length === 0) return <ApplicationsEmpty />;

  return (
    <div className={`grid gap-6 ${rows.length > 1 ? "lg:grid-cols-2" : ""}`}>
      {rows.map((row) => (
        <ApplicationCard key={row.id} {...row} />
      ))}
    </div>
  );
}

export function ApplicationsEmpty() {
  return (
    <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] px-6 py-14 text-center">
      <h3 className="font-serif text-xl text-white">Nothing applied for yet</h3>
      <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-white/55">
        When you apply to a programme it shows up here, with everything you have filled in so far
        and where it has got to.
      </p>
      <Link
        href="/programs"
        className="mt-7 inline-flex rounded-full bg-accent px-6 py-3 text-[15px] font-semibold text-white transition hover:bg-accent-deep"
      >
        Browse programmes
      </Link>
    </div>
  );
}

const TONE_STYLES: Record<Headline["tone"], string> = {
  draft: "bg-amber-500/10 text-amber-200 ring-amber-500/30",
  progress: "bg-accent/15 text-accent-tint ring-accent/30",
  done: "bg-emerald-500/10 text-emerald-300 ring-emerald-400/30",
  closed: "bg-white/[0.06] text-white/60 ring-white/15",
};

const TONE_LABELS: Record<Headline["tone"], string> = {
  draft: "In progress",
  progress: "Submitted",
  done: "Enrolled",
  closed: "Closed",
};

function ApplicationCard({
  courseName,
  mentorName,
  submittedAt,
  lastSeenAt,
  submitted,
  leadStatus,
  headline,
  resumeTo,
  currentStep,
  payments,
}: ApplicationRow) {
  return (
    <section className="flex flex-col rounded-[22px] bg-ink-900/70 p-6 ring-1 ring-white/[0.08] sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-serif text-xl text-white sm:text-2xl">{courseName}</h3>
          {mentorName ? <p className="mt-1 text-sm text-white/55">with {mentorName}</p> : null}
        </div>
        <span
          className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ring-1 ${TONE_STYLES[headline.tone]}`}
        >
          {TONE_LABELS[headline.tone]}
        </span>
      </div>

      <div className="mt-5 rounded-xl bg-white/[0.03] px-4 py-4 ring-1 ring-white/[0.06]">
        <p className="text-sm font-semibold text-white">{headline.title}</p>
        <p className="mt-1 text-sm text-white/65">{headline.body}</p>
      </div>

      {submitted ? (
        <>
          <StageTrack leadStatus={leadStatus} currentStep={currentStep} />
          <Payments payments={payments} />
          <Link
            href={resumeTo}
            className="mt-6 inline-flex self-start rounded-full border border-white/15 px-5 py-2.5 text-sm font-semibold text-white/80 transition hover:border-white/25 hover:text-white"
          >
            Open application
          </Link>
        </>
      ) : (
        <DraftProgress currentStep={currentStep} resumeTo={resumeTo} />
      )}

      <p className="mt-6 text-xs text-white/35">
        {submitted && submittedAt
          ? `Submitted ${submittedAt}`
          : lastSeenAt
            ? `Last saved ${lastSeenAt}`
            : null}
      </p>
    </section>
  );
}

/**
 * The path a submitted application walks, laid out left to right.
 *
 * Horizontal because it is a journey with a beginning and an end, and read
 * that way in one glance: five markers on one line, the line behind them
 * filling in with terracotta as far as the application has actually got.
 *
 * No sentence of explanation under it: the headline card directly above the
 * track already says what is happening right now, and saying it twice on one
 * card reads as a mistake.
 */
function StageTrack({
  leadStatus,
  currentStep,
}: {
  leadStatus: string | null;
  currentStep: number;
}) {
  const reached = combinedStageRank(leadStatus, currentStep);
  const rejected = isRejected(leadStatus);

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.16em] text-white/45">
        <span>Progress</span>
        <span className="text-white/30">
          {rejected
            ? "Closed"
            : `Stage ${Math.min(reached + 1, STAGES.length)} of ${STAGES.length}`}
        </span>
      </div>

      <ol className="mt-5 flex items-start">
        {STAGES.map((stage, index) => {
          const done = index < reached;
          const here = index === reached;
          const isDecision = stage.key === "selected";
          // A rejection is an outcome, not a win. It keeps its place on the
          // track but never the accent, which everywhere else means progress.
          const closed = rejected && isDecision;

          return (
            <li
              key={stage.key}
              className="relative flex flex-1 flex-col items-center gap-2 text-center"
            >
              {index > 0 ? (
                <span
                  aria-hidden
                  className={`absolute right-1/2 top-[13px] h-px w-full ${
                    index <= reached ? "bg-accent/40" : "bg-white/10"
                  }`}
                />
              ) : null}

              <span
                aria-hidden
                className={`relative z-10 flex h-[27px] w-[27px] shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ring-1 transition ${
                  closed
                    ? "bg-white/[0.06] text-white/60 ring-white/20"
                    : done
                      ? "bg-accent text-white ring-accent"
                      : here
                        ? "bg-accent/20 text-accent-soft ring-accent/45"
                        : "bg-ink-850 text-white/30 ring-white/10"
                }`}
              >
                {done ? <Check className="h-3.5 w-3.5" strokeWidth={2.5} /> : index + 1}
              </span>

              <p
                className={`px-0.5 text-[11px] leading-tight ${
                  done || here ? "font-medium text-white" : "text-white/35"
                }`}
              >
                {closed ? "Not this cohort" : stage.short}
              </p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/**
 * Every status the payments module defines, said plainly.
 *
 * `collected` is the platform's word for money taken outside a gateway — cash,
 * a bank transfer, a cheque — which reads as nothing at all to the person who
 * handed it over, so it is called what it is.
 */
const PAYMENT_STATUS: Record<string, { label: string; className: string }> = {
  succeeded: { label: "Paid", className: "bg-emerald-500/10 text-emerald-300 ring-emerald-400/30" },
  collected: { label: "Paid", className: "bg-emerald-500/10 text-emerald-300 ring-emerald-400/30" },
  pending: { label: "Processing", className: "bg-amber-500/10 text-amber-200 ring-amber-500/30" },
  failed: { label: "Failed", className: "bg-red-500/10 text-red-300 ring-red-500/30" },
  canceled: { label: "Cancelled", className: "bg-white/[0.06] text-white/60 ring-white/15" },
};

const PAYMENT_METHOD: Record<string, string> = {
  razorpay: "Card / UPI / Netbanking",
  stripe: "Card",
  cashfree: "Card / UPI / Netbanking",
  cash: "Paid directly",
};

/**
 * The money, as a doctor needs to see it.
 *
 * Three questions, and this answers all three without anybody having to write
 * in: did it go through, what was I charged, and what do I quote if it did not.
 * The reference is the thing support and the payment provider both search on,
 * so it is shown in full rather than truncated prettily.
 *
 * Refunds are **shown, not started**. Moving money back is the team's to do —
 * the fee is refundable in full if the call is cancelled more than 24 hours
 * ahead, and that is a decision with a rule behind it, not a button. What a
 * refund already issued looks like here is a line under the payment saying so.
 *
 * Nothing renders at all until there is something to show: an application that
 * has not reached checkout should not sprout an empty "Payments" heading.
 */
function Payments({ payments }: { payments: PaymentRecord[] }) {
  if (payments.length === 0) return null;

  const anyPaid = payments.some((payment) => isPaidStatus(payment.status));

  return (
    <div className="mt-6">
      <h4 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/45">
        Payments
      </h4>

      <ul className="mt-3 grid gap-2">
        {payments.map((payment) => {
          const tone = PAYMENT_STATUS[payment.status.toLowerCase()] ?? {
            label: payment.status || "Unknown",
            className: "bg-white/[0.06] text-white/60 ring-white/15",
          };
          const paidOn = formatDate(payment.paidAt);
          const method = PAYMENT_METHOD[payment.method.toLowerCase()] || payment.method;
          const refunded = payment.refundedAmount > 0;

          return (
            <li key={payment.id} className="rounded-xl bg-ink-800 px-4 py-3.5 ring-1 ring-white/10">
              <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white">
                    {formatMoney(payment.amountPaid, payment.currency)}
                    {payment.description ? (
                      <span className="font-normal text-white/50"> · {payment.description}</span>
                    ) : null}
                  </p>
                  <p className="mt-1 text-xs text-white/45">
                    {[paidOn, method].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ring-1 ${tone.className}`}
                >
                  {tone.label}
                </span>
              </div>

              <p className="mt-2.5 break-all font-mono text-[11px] leading-relaxed text-white/40">
                Ref {payment.reference}
              </p>

              {refunded ? (
                <p className="mt-2 rounded-[8px] bg-white/[0.04] px-2.5 py-1.5 text-xs text-white/70">
                  {formatMoney(payment.refundedAmount, payment.currency)} refunded
                  {payment.refundedAmount < payment.amountPaid ? " (partial)" : ""} — it can take
                  5–7 working days to reach your account.
                </p>
              ) : null}
            </li>
          );
        })}
      </ul>

      <p className="mt-3 text-xs leading-relaxed text-white/40">
        {anyPaid ? (
          <>
            Need a receipt or a refund? Write to{" "}
            <a
              href={`mailto:${LEGAL.supportEmail}`}
              className="text-white/60 underline underline-offset-2 hover:text-white"
            >
              {LEGAL.supportEmail}
            </a>{" "}
            quoting the reference above. See our{" "}
            <Link
              href="/refunds"
              className="text-white/60 underline underline-offset-2 hover:text-white"
            >
              refund policy
            </Link>
            .
          </>
        ) : (
          <>
            A payment shows as processing until your bank confirms it, usually within a few
            minutes. Money is only ever taken once — if you see a charge that is not listed here,
            write to{" "}
            <a
              href={`mailto:${LEGAL.supportEmail}`}
              className="text-white/60 underline underline-offset-2 hover:text-white"
            >
              {LEGAL.supportEmail}
            </a>
            .
          </>
        )}
      </p>
    </div>
  );
}

/** The four steps the applicant walks. Mirrors the wizard's own labels. */
const STEP_LABELS = ["Your details", "Your cases", "Pick a slot", "Confirm & pay"];

/** An unfinished application: which step, and the way back into it. */
function DraftProgress({ currentStep, resumeTo }: { currentStep: number; resumeTo: string }) {
  const step = Math.min(Math.max(currentStep, 1), STEP_LABELS.length);

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.16em] text-white/45">
        <span>
          Step {step} of {STEP_LABELS.length}
        </span>
        <span className="text-white/30">{STEP_LABELS[step - 1]}</span>
      </div>
      <div className="mt-2 flex gap-1.5" aria-hidden>
        {STEP_LABELS.map((label, index) => (
          <span
            key={label}
            className={`h-1 flex-1 rounded-full ${index < step ? "bg-accent" : "bg-white/10"}`}
          />
        ))}
      </div>

      <Link
        href={resumeTo}
        className="mt-5 inline-flex self-start rounded-full bg-accent px-6 py-3 text-[15px] font-semibold text-white transition hover:bg-accent-deep"
      >
        Continue application →
      </Link>
    </div>
  );
}
