import type { ReactNode } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { LEGAL, isPlaceholder } from "@/lib/legal";

/**
 * Shared shell for the four policy pages (/privacy, /terms, /refunds, /contact).
 *
 * These pages are read by two very different audiences: a doctor deciding
 * whether to hand over a phone number, and a payment-gateway reviewer checking
 * a list. Both want plain prose in a narrow column, so the shell keeps the
 * measure short and the type large rather than reusing the marketing layout.
 */

export function LegalPage({
  title,
  intro,
  children,
}: {
  title: string;
  intro?: ReactNode;
  children: ReactNode;
}) {
  warnAboutPlaceholders();

  return (
    <>
      <Navbar />
      <main className="bg-ink-950">
        <div className="mx-auto w-full max-w-[760px] px-6 pb-24 pt-16 sm:px-8 sm:pt-24">
          <p className="text-xs uppercase tracking-[0.28em] text-white/40">
            {LEGAL.brandName}
          </p>
          <h1 className="mt-4 font-serif text-4xl leading-tight text-white sm:text-5xl">
            {title}
          </h1>
          <p className="mt-4 text-sm text-white/40">
            Last updated: {LEGAL.lastUpdated}
          </p>

          {intro ? (
            <div className="mt-8 border-l-2 border-accent/60 pl-5 text-lg leading-relaxed text-white/70">
              {intro}
            </div>
          ) : null}

          <div className="mt-12">{children}</div>
        </div>
      </main>
      <Footer />
    </>
  );
}

/** A titled block. Anchored so support can link a doctor straight to one clause. */
export function Section({
  id,
  heading,
  children,
}: {
  id: string;
  heading: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-24 border-t border-white/10 py-8 first:border-t-0 first:pt-0"
    >
      <h2 className="font-serif text-2xl text-white">{heading}</h2>
      <div className="mt-4 space-y-4 text-[15px] leading-relaxed text-white/70">
        {children}
      </div>
    </section>
  );
}

export function P({ children }: { children: ReactNode }) {
  return <p>{children}</p>;
}

export function Bullets({ children }: { children: ReactNode }) {
  return (
    <ul className="ml-1 list-outside list-disc space-y-2 pl-4 marker:text-accent/70">
      {children}
    </ul>
  );
}

/** Term-and-definition rows, for the "what we collect and why" tables. */
export function DefRow({
  term,
  children,
}: {
  term: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-1 border-b border-white/5 py-3 last:border-b-0 sm:grid-cols-[200px_1fr] sm:gap-6">
      <dt className="text-sm font-medium text-white/90">{term}</dt>
      <dd className="text-[15px] leading-relaxed text-white/65">{children}</dd>
    </div>
  );
}

export function DefList({ children }: { children: ReactNode }) {
  return <dl className="mt-2">{children}</dl>;
}

/** The registered entity block, repeated at the foot of each policy. */
export function EntityBlock() {
  return (
    <address className="not-italic text-[15px] leading-relaxed text-white/65">
      <span className="text-white/90">{LEGAL.entityName}</span>
      <br />
      trading as {LEGAL.brandName}
      <br />
      {LEGAL.registeredAddress.map((line) => (
        <span key={line}>
          {line}
          <br />
        </span>
      ))}
      <br />
      Email:{" "}
      <a
        className="text-accent-soft underline"
        href={`mailto:${LEGAL.supportEmail}`}
      >
        {LEGAL.supportEmail}
      </a>
      <br />
      Phone: {LEGAL.supportPhone} ({LEGAL.supportHours})
    </address>
  );
}

/**
 * Development-only reminder that lib/legal.ts still holds placeholders.
 *
 * This used to render a banner on the page itself, which put scaffolding in
 * front of anyone previewing the site. It logs to the dev server terminal
 * instead: still hard to miss while working, invisible to anyone looking at the
 * page. Returns early in production, so it costs a build nothing.
 */
function warnAboutPlaceholders() {
  if (process.env.NODE_ENV === "production") return;

  const unfilled = [
    ["entityName", LEGAL.entityName],
    ["registeredAddress", LEGAL.registeredAddress.join(", ")],
    ["privacyEmail", LEGAL.privacyEmail],
    ["supportPhone", LEGAL.supportPhone],
    ["grievanceOfficer.name", LEGAL.grievanceOfficer.name],
    ["grievanceOfficer.email", LEGAL.grievanceOfficer.email],
  ].filter(([, value]) => isPlaceholder(value));

  if (unfilled.length === 0) return;

  console.warn(
    `[legal] ${unfilled.length} placeholder${unfilled.length === 1 ? "" : "s"} still unfilled in src/lib/legal.ts — ` +
      `${unfilled.map(([key]) => key).join(", ")}. ` +
      "Razorpay rejects policies containing placeholder text.",
  );
}
