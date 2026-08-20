import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, Section, P, EntityBlock } from "@/components/LegalPage";
import { LEGAL } from "@/lib/legal";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Contact Us",
  description:
    "How to reach Legends of Medicine — admissions, support, payment queries and our registered office address.",
  alternates: { canonical: "/contact" },
});

export default function ContactPage() {
  return (
    <LegalPage
      title="Contact Us"
      intro={
        <>
          A real person reads every message. Admissions questions are usually answered
          the same working day; anything involving a payment we acknowledge within 48
          hours.
        </>
      }
    >
      <Section id="reach-us" heading="Talk to us">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-white/40">Email</p>
            <a
              className="mt-2 block text-lg text-accent-soft underline"
              href={`mailto:${LEGAL.supportEmail}`}
            >
              {LEGAL.supportEmail}
            </a>
            <p className="mt-2 text-sm text-white/50">
              Admissions, programme questions, payments and refunds.
            </p>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-white/40">Phone</p>
            <p className="mt-2 text-lg text-white/90">{LEGAL.supportPhone}</p>
            <p className="mt-2 text-sm text-white/50">{LEGAL.supportHours}</p>
          </div>
        </div>
        <P>
          For anything about your personal data — a copy of it, a correction, or deletion
          — write to{" "}
          <a className="text-accent-soft underline" href={`mailto:${LEGAL.privacyEmail}`}>
            {LEGAL.privacyEmail}
          </a>
          , as set out in our{" "}
          <Link className="text-accent-soft underline" href="/privacy#your-rights">
            Privacy Policy
          </Link>
          .
        </P>
      </Section>

      <Section id="office" heading="Registered office">
        <EntityBlock />
        <P>
          Visits are by appointment only. Please email first so we can make sure the
          right person is there.
        </P>
      </Section>

      <Section id="grievance" heading="Grievance officer">
        <P>
          If a complaint has not been resolved to your satisfaction, escalate it to our
          grievance officer:
        </P>
        <address className="not-italic leading-relaxed text-white/65">
          <span className="text-white/90">{LEGAL.grievanceOfficer.name}</span>
          <br />
          {LEGAL.grievanceOfficer.designation}, {LEGAL.entityName}
          <br />
          <a
            className="text-accent-soft underline"
            href={`mailto:${LEGAL.grievanceOfficer.email}`}
          >
            {LEGAL.grievanceOfficer.email}
          </a>
        </address>
        <P>
          Complaints are acknowledged within 48 hours and resolved within{" "}
          {LEGAL.grievanceOfficer.responseWindow} of receipt.
        </P>
      </Section>

      <Section id="policies" heading="Our policies">
        <P>
          <Link className="text-accent-soft underline" href="/privacy">
            Privacy Policy
          </Link>{" "}
          ·{" "}
          <Link className="text-accent-soft underline" href="/terms">
            Terms and Conditions
          </Link>{" "}
          ·{" "}
          <Link className="text-accent-soft underline" href="/refunds">
            Refund and Cancellation Policy
          </Link>
        </P>
      </Section>
    </LegalPage>
  );
}
