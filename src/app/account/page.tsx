import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
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
import { getSessionUser } from "@/lib/session";
import { buildMetadata } from "@/lib/seo";
import { LogoutButton } from "@/components/LogoutButton";

export const metadata: Metadata = buildMetadata({
  title: "Your Application",
  description: "Track where your Legends of Medicine application has got to.",
  alternates: { canonical: "/account" },
  robots: { index: false, follow: false },
});

/** Reads a cookie and live data, so it can never be prerendered or cached. */
export const dynamic = "force-dynamic";

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

export default async function AccountPage() {
  const user = getSessionUser();
  if (!user) redirect("/login?next=%2Faccount");

  const applications = isConfigured() ? await listApplications(user.email) : [];

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

  const displayName = user.firstName?.trim() || "there";

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-16 sm:py-20">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-accent-soft">
            Your account
          </p>
          <h1 className="mt-2 font-serif text-3xl text-white sm:text-4xl">
            Hello, {displayName}
          </h1>
          <p className="mt-2 text-sm text-white/60">{user.email}</p>
        </div>
        <LogoutButton />
      </div>

      {applications.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="mt-10 grid gap-6">
          {applications.map((app, index) => (
            <ApplicationCard
              key={app.id ?? index}
              courseName={app.course_name || "Your application"}
              mentorName={app.mentor_name}
              submittedAt={formatDate(app.submitted_at)}
              lastSeenAt={formatDate(app.last_seen_at)}
              submitted={app.status === "submitted"}
              leadStatus={leadStatuses[index]}
              headline={headlineFor({
                applicationStatus: app.status,
                currentStep: app.current_step,
                leadStatus: leadStatuses[index],
              })}
              resumeTo={resumeHref(app.return_path, Number(app.current_step) || 1)}
              currentStep={Number(app.current_step) || 1}
              payments={payments[index]}
            />
          ))}
        </div>
      )}

      <p className="mt-12 text-xs leading-relaxed text-white/40">
        Something look wrong? Reply to any email from us and a real person will pick it up.
      </p>
    </main>
  );
}

function EmptyState() {
  return (
    <div className="mt-10 rounded-xl border border-dashed border-white/15 bg-white/[0.02] px-6 py-12 text-center">
      <h2 className="font-serif text-xl text-white">No applications yet</h2>
      <p className="mx-auto mt-3 max-w-sm text-sm text-white/60">
        When you apply to a programme it shows up here, with everything you&rsquo;ve filled
        in so far and where it has got to.
      </p>
      <Link
        href="/programs"
        className="mt-6 inline-flex rounded-[10px] bg-accent px-6 py-3 text-[15px] font-semibold text-white transition hover:bg-accent-deep"
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
}: {
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
}) {
  return (
    <section className="rounded-xl bg-ink-850 p-6 ring-1 ring-white/15 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-serif text-xl text-white sm:text-2xl">{courseName}</h2>
          {mentorName ? (
            <p className="mt-1 text-sm text-white/60">with {mentorName}</p>
          ) : null}
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
            className="mt-6 inline-flex rounded-[10px] border border-white/15 px-5 py-2.5 text-sm font-semibold text-white/80 transition hover:border-white/25 hover:text-white"
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

/** The ladder a submitted application climbs. */
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
    <ol className="mt-6 grid gap-0">
      {STAGES.map((stage, index) => {
        const done = index < reached;
        const current = index === reached;
        const isDecision = stage.key === "selected";

        return (
          <li key={stage.key} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                aria-hidden
                className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                  rejected && isDecision
                    ? "bg-white/15 text-white/70"
                    : done
                      ? "bg-accent text-white"
                      : current
                        ? "bg-accent/25 text-accent-tint ring-1 ring-accent/50"
                        : "bg-white/[0.06] text-white/25 ring-1 ring-white/15"
                }`}
              >
                {done ? "✓" : index + 1}
              </span>
              {index < STAGES.length - 1 ? (
                <span
                  aria-hidden
                  className={`w-px flex-1 ${done ? "bg-accent/50" : "bg-white/10"}`}
                />
              ) : null}
            </div>

            <div className={`pb-5 ${index === STAGES.length - 1 ? "pb-0" : ""}`}>
              <p
                className={`text-sm font-medium ${
                  done || current ? "text-white" : "text-white/40"
                }`}
              >
                {rejected && isDecision ? "Legend's decision — not this cohort" : stage.label}
              </p>
              {current || done ? (
                <p className="mt-0.5 text-xs text-white/50">{stage.detail}</p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
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
 * in: did it go through, what was I charged, and what do I quote if it did
 * not. The reference is the thing support and the payment provider both search
 * on, so it is shown in full rather than truncated prettily.
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
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/45">
        Payments
      </h3>

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
            <li
              key={payment.id}
              className="rounded-xl bg-ink-800 px-4 py-3.5 ring-1 ring-white/10"
            >
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
            <Link href="/refunds" className="text-white/60 underline underline-offset-2 hover:text-white">
              refund policy
            </Link>
            .
          </>
        ) : (
          <>
            A payment shows as processing until your bank confirms it, usually within a few
            minutes. Money is only ever taken once — if you see a charge that is not listed
            here, write to{" "}
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

/** An unfinished application: which step, and the way back into it. */
/** The four steps the applicant walks. Mirrors the wizard's own labels. */
const STEP_LABELS = ["Your details", "Your cases", "Pick a slot", "Confirm & pay"];

function DraftProgress({
  currentStep,
  resumeTo,
}: {
  currentStep: number;
  resumeTo: string;
}) {
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
            className={`h-1 flex-1 rounded-full ${
              index < step ? "bg-accent" : "bg-white/10"
            }`}
          />
        ))}
      </div>

      <Link
        href={resumeTo}
        className="mt-5 inline-flex rounded-[10px] bg-accent px-6 py-3 text-[15px] font-semibold text-white transition hover:bg-accent-deep"
      >
        Continue application →
      </Link>
    </div>
  );
}
