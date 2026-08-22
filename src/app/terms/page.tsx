import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, Section, P, Bullets, EntityBlock } from "@/components/LegalPage";
import { LEGAL } from "@/lib/legal";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Terms and Conditions",
  description:
    "The terms on which Legends of Medicine provides access to this website and to its cohort-based ophthalmology mentorship programmes.",
  alternates: { canonical: "/terms" },
});

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms and Conditions"
      intro={
        <>
          These terms govern your use of this website and your enrolment in any{" "}
          {LEGAL.brandName} programme. By browsing the site, submitting an enquiry or
          paying a fee, you agree to them.
        </>
      }
    >
      <Section id="parties" heading="1. Who these terms are with">
        <P>
          This website is operated by {LEGAL.entityName}, trading as {LEGAL.brandName}.
          In these terms, &ldquo;we&rdquo; and &ldquo;us&rdquo; mean that company, and
          &ldquo;you&rdquo; means the person using the site or enrolling in a programme.
        </P>
        <EntityBlock />
      </Section>

      <Section id="eligibility" heading="2. Who may enrol">
        <P>
          Our programmes are intended for qualified medical practitioners, postgraduate
          trainees and final-year medical students. You must be at least 18 years old.
        </P>
        <P>
          When you apply, you confirm that the qualification and registration details you
          give us are true. We may ask for proof, and we may decline or cancel an
          enrolment where the details cannot be verified.
        </P>
      </Section>

      <Section id="nature" heading="3. What we provide — and what we do not">
        <P>
          We provide education. Our programmes are mentorship and continuing professional
          development: case discussions, surgical technique teaching, and guided practice
          under experienced faculty.
        </P>
        <Bullets>
          <li>
            Nothing on this site or in a programme is medical advice, and nothing creates
            a doctor-patient relationship between you, us or any mentor.
          </li>
          <li>
            Clinical decisions about your own patients remain entirely yours, and remain
            subject to your own registration, indemnity and the law where you practise.
          </li>
          <li>
            A programme is not a recognised degree, diploma or fellowship, and is not a
            substitute for one. Any certificate we issue records participation in the
            programme, nothing more.
          </li>
          <li>
            We do not promise employment, referrals, hospital privileges, or admission to
            any qualification.
          </li>
        </Bullets>
      </Section>

      <Section id="estimates" heading="4. Practice growth estimates">
        <P>
          The practice growth calculator on this site produces an illustration, not a
          forecast. It is built from published population and demographic datasets and a
          set of assumptions that will not match your practice exactly.
        </P>
        <P>
          It is not a promise of income, patient volume or return on the programme fee.
          Do not treat its output as a financial projection, and do not rely on it alone
          when deciding whether to enrol.
        </P>
      </Section>

      <Section id="fees" heading="5. Fees and payment">
        <Bullets>
          <li>
            Programme fees are shown on the programme page and are in Indian Rupees. Taxes
            are charged as applicable.
          </li>
          <li>
            Payments are collected through our payment gateway. Your seat is confirmed
            when we receive confirmation of payment from the gateway, not when your
            browser returns to this site.
          </li>
          <li>
            Where a fee is payable in instalments, missing an instalment may suspend your
            access until it is paid.
          </li>
          <li>
            Bank charges, currency conversion costs and any fees your own bank levies are
            yours to bear.
          </li>
          <li>
            We may change our published fees at any time. A change never affects a
            programme you have already paid for.
          </li>
        </Bullets>
        <P>
          Cancellations and refunds are governed by our{" "}
          <Link className="text-accent-soft underline" href="/refunds">
            Refund and Cancellation Policy
          </Link>
          , which forms part of these terms.
        </P>
      </Section>

      <Section id="delivery" heading="6. How a programme runs">
        <P>
          Programmes run as cohorts on published dates. Sessions may be live, recorded or
          in person, as described on the programme page.
        </P>
        <P>
          We may change the schedule, format, platform or an individual faculty member
          where we reasonably need to — including where a mentor is unavailable due to
          clinical commitments. Where a change is material, we will tell you and, if you
          do not wish to continue, treat it as a cancellation by us under the refund
          policy.
        </P>
        <P>
          We may cancel or postpone a cohort that does not reach a viable size. In that
          case you may move to the next cohort or take a full refund.
        </P>
      </Section>

      <Section id="conduct" heading="7. Your account and conduct">
        <P>
          Your enrolment is personal to you. Keep your login credentials to yourself and
          tell us promptly if you think someone else has used them.
        </P>
        <P>You agree not to:</P>
        <Bullets>
          <li>
            share, resell, record, re-upload or redistribute programme material, session
            recordings or case discussions;
          </li>
          <li>
            share any patient-identifying information in a session, submission or in the
            on-site assistant. De-identify every case before you present it;
          </li>
          <li>
            behave abusively toward faculty, staff or fellow participants, or disrupt a
            session;
          </li>
          <li>
            attempt to breach the security of this website, scrape it, or use it in a way
            that interferes with anyone else&rsquo;s use of it.
          </li>
        </Bullets>
        <P>
          We may suspend or end your access for a serious or repeated breach. Where we
          do, no refund is due.
        </P>
      </Section>

      <Section id="ip" heading="8. Intellectual property">
        <P>
          All programme content — recordings, slides, surgical videos, case material, the
          text and design of this site — belongs to us or to our faculty and is licensed
          to you for your own learning only, for the duration of your access.
        </P>
        <P>
          You keep ownership of anything you submit, and grant us permission to use it
          for teaching within the programme. If we want to use your work publicly, we
          will ask you first.
        </P>
      </Section>

      <Section id="liability" heading="9. Limitation of liability">
        <P>
          We provide the site and the programmes with reasonable care and skill, but not
          on a guarantee that they will be uninterrupted or error-free.
        </P>
        <P>
          To the extent permitted by law, we are not liable for loss of profits, loss of
          practice income, loss of opportunity, or any indirect loss. Our total liability
          to you in connection with a programme will not exceed the fee you paid for it.
        </P>
        <P>
          Nothing here limits liability that cannot be limited by law, including for
          death or personal injury caused by our negligence, or for fraud.
        </P>
      </Section>

      <Section id="privacy" heading="10. Privacy">
        <P>
          Our{" "}
          <Link className="text-accent-soft underline" href="/privacy">
            Privacy Policy
          </Link>{" "}
          explains what we collect and how we use it. It forms part of these terms.
        </P>
      </Section>

      <Section id="changes" heading="11. Changes to these terms">
        <P>
          We may update these terms. The date at the top of this page shows the current
          version. Changes are not retrospective: the terms that apply to your enrolment
          are the ones in force when you paid.
        </P>
      </Section>

      <Section id="law" heading="12. Governing law and disputes">
        <P>
          These terms are governed by the laws of India. Before starting proceedings,
          please raise the issue with us in writing so we can try to resolve it — most
          matters are settled that way.
        </P>
        <P>
          Any dispute that cannot be resolved is subject to the exclusive jurisdiction of
          the courts at the location of our registered office.
        </P>
      </Section>

      <Section id="contact" heading="13. Contact">
        <P>
          Questions about these terms go to{" "}
          <a className="text-accent-soft underline" href={`mailto:${LEGAL.supportEmail}`}>
            {LEGAL.supportEmail}
          </a>
          , or use the details on our{" "}
          <Link className="text-accent-soft underline" href="/contact">
            contact page
          </Link>
          .
        </P>
      </Section>
    </LegalPage>
  );
}
