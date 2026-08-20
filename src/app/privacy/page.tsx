import type { Metadata } from "next";
import Link from "next/link";
import {
  LegalPage,
  Section,
  P,
  Bullets,
  DefList,
  DefRow,
  EntityBlock,
} from "@/components/LegalPage";
import { LEGAL } from "@/lib/legal";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Privacy Policy",
  description:
    "How Legends of Medicine collects, uses, shares and protects the personal information of doctors and students who use this website.",
  alternates: { canonical: "/privacy" },
});

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      intro={
        <>
          This policy explains what we collect when you use this website, why we collect
          it, who else sees it, and how you can have it corrected or deleted. It covers{" "}
          {LEGAL.brandName} only — not the sites of hospitals, mentors or payment
          providers we link to.
        </>
      }
    >
      <Section id="who-we-are" heading="1. Who we are">
        <P>
          {LEGAL.brandName} is operated by {LEGAL.entityName} (&ldquo;we&rdquo;,
          &ldquo;us&rdquo;), a company registered in India. We run cohort-based
          mentorship programmes in ophthalmology for practising doctors and medical
          students.
        </P>
        <P>
          For the purposes of India&rsquo;s Information Technology (Reasonable Security
          Practices and Procedures and Sensitive Personal Data or Information) Rules,
          2011 and the Digital Personal Data Protection Act, 2023, we are the entity
          responsible for the personal data described below.
        </P>
        <EntityBlock />
      </Section>

      <Section id="what-we-collect" heading="2. What we collect">
        <P>
          We only collect what you type into this website. We do not buy contact lists,
          and we do not scrape data about you from elsewhere.
        </P>
        <DefList>
          <DefRow term="Application & brochure forms">
            Your name, email address, phone number, medical qualification, city, state
            and PIN code, together with the programme and mentor you enquired about.
          </DefRow>
          <DefRow term="Waitlist form">
            Your name, city, phone number and email address.
          </DefRow>
          <DefRow term="Newsletter">Your email address, and nothing else.</DefRow>
          <DefRow term="Account registration">
            Your name, email address, qualification and a password. Passwords are never
            stored in a readable form and are never visible to our staff.
          </DefRow>
          <DefRow term="Practice growth calculator">
            The PIN code and specialisation you enter. We use published population and
            demographic datasets to produce an estimate. These inputs are not linked to
            you unless you go on to submit an enquiry form in the same visit.
          </DefRow>
          <DefRow term="AI assistant">
            The messages you type into the on-site assistant, and the replies it gives.
            Please do not enter patient details or any clinical information about an
            identifiable person into it.
          </DefRow>
          <DefRow term="Payment information">
            When you pay, you are handed over to our payment gateway. Your card, UPI,
            net-banking and wallet details are entered on their systems and never reach
            ours. We receive only the payment reference, amount, status and the name and
            contact details you gave at checkout.
          </DefRow>
          <DefRow term="Technical logs">
            Standard server logs — IP address, browser type, pages requested and
            timestamps — kept to keep the site running and to investigate abuse.
          </DefRow>
        </DefList>
      </Section>

      {/*
        Deliberately does not name the storage mechanism. Auth on this site is not
        built yet, and the usual libraries (NextAuth, Clerk) default to httpOnly
        cookies while our platform app uses local storage. Wording that survives
        either choice keeps the policy true without needing an edit later.
      */}
      <Section id="cookies" heading="3. Tracking and what we store on your device">
        <P>
          We run no third-party analytics, no advertising tags and no tracking pixels. We
          do not follow you across other websites, and we do not build a profile of you.
          There is nothing here to opt out of.
        </P>
        <P>
          We store a small amount of information on your device, such as a sign-in token,
          purely to keep you signed in. Nothing stored there is used for advertising or
          tracking, and clearing your browsing data simply signs you out — it does not
          delete your account.
        </P>
        <P>
          If you make a payment, the payment gateway sets its own cookies on its own
          checkout pages. Those are governed by its privacy policy rather than this one.
        </P>
      </Section>

      <Section id="why" heading="4. Why we use it">
        <Bullets>
          <li>To respond to an enquiry, send you a brochure and arrange a call.</li>
          <li>To assess your application and enrol you in a programme.</li>
          <li>
            To take payment, issue receipts and meet our accounting and tax obligations.
          </li>
          <li>
            To send you information about the programme you applied for, and — if you
            asked for it — occasional updates about new cohorts. Every marketing message
            carries an unsubscribe option.
          </li>
          <li>To keep the website secure, and to detect and prevent misuse.</li>
        </Bullets>
        <P>
          We do not sell your personal information, and we do not rent or share it with
          third parties for their own marketing.
        </P>
      </Section>

      <Section id="sharing" heading="5. Who else sees it">
        <P>
          We share data only with service providers who need it to deliver something you
          asked for. Each is bound to use it only on our instructions.
        </P>
        <DefList>
          <DefRow term="Payment gateway">
            Razorpay Software Private Limited, to process payments and refunds.
          </DefRow>
          <DefRow term="Email delivery">
            Our email provider, to send welcome mails, brochures and programme updates.
          </DefRow>
          <DefRow term="WhatsApp messaging">
            Twilio, to send the welcome message to the number you provided, where you
            have given us that number.
          </DefRow>
          <DefRow term="AI assistant">
            Anthropic, which processes the messages you send to the on-site assistant to
            generate a reply. Those messages are not used to train models.
          </DefRow>
          <DefRow term="Mentors and faculty">
            Where you have applied to a specific programme, the mentor leading it may be
            shown your name and clinical background so they can assess your application.
            They are not given your contact details for their own marketing.
          </DefRow>
          <DefRow term="Hosting and infrastructure">
            The providers who host this website and our application database.
          </DefRow>
          <DefRow term="Legal">
            Where we are required to disclose information by law, by a court, or by a
            government agency acting under lawful authority.
          </DefRow>
        </DefList>
        <P>
          Some of these providers operate servers outside India. Where data leaves the
          country, we rely on contractual protections requiring a standard of care no
          lower than this policy.
        </P>
      </Section>

      <Section id="retention" heading="6. How long we keep it">
        <Bullets>
          <li>
            Enquiries and waitlist entries that do not lead to enrolment: up to 24
            months, then deleted.
          </li>
          <li>
            Enrolment and payment records: eight years, as required by Indian tax and
            company law.
          </li>
          <li>
            Newsletter subscriptions: until you unsubscribe, plus a suppression record so
            we do not email you again by mistake.
          </li>
          <li>Server logs: up to 12 months.</li>
        </Bullets>
      </Section>

      <Section id="security" heading="7. How we protect it">
        <P>
          The site is served over HTTPS, access to the application database is restricted
          to staff who need it for their work, and passwords are stored only as salted
          hashes. Payment credentials never touch our servers.
        </P>
        <P>
          No system is perfectly secure. If a breach affects your personal data, we will
          notify you and the relevant authority as required by law.
        </P>
      </Section>

      <Section id="your-rights" heading="8. Your rights">
        <P>You may ask us at any time to:</P>
        <Bullets>
          <li>tell you what personal data of yours we hold, and give you a copy;</li>
          <li>correct anything that is inaccurate or out of date;</li>
          <li>
            delete your data, where we are not required to keep it for legal or
            accounting reasons;
          </li>
          <li>
            withdraw a consent you gave — for example, to stop marketing emails or
            WhatsApp messages.
          </li>
        </Bullets>
        <P>
          Write to{" "}
          <a className="text-accent-soft underline" href={`mailto:${LEGAL.privacyEmail}`}>
            {LEGAL.privacyEmail}
          </a>{" "}
          from the email address you signed up with. We will respond within 30 days.
          Withdrawing consent does not affect anything we did lawfully before you
          withdrew it, and it may mean we can no longer deliver a programme you have
          enrolled in.
        </P>
      </Section>

      <Section id="children" heading="9. Children">
        <P>
          This website is intended for medical students and qualified doctors, and is not
          directed at anyone under 18. We do not knowingly collect data from children. If
          you believe a child has given us personal information, write to us and we will
          delete it.
        </P>
      </Section>

      <Section id="grievance" heading="10. Grievance officer">
        <P>
          In accordance with the Information Technology Act, 2000 and the rules made
          under it, the grievance officer for this website is:
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

      <Section id="changes" heading="11. Changes to this policy">
        <P>
          We may update this policy as the service changes. The date at the top of this
          page always reflects the current version. Where a change materially affects
          your rights, we will email everyone with an active enrolment before it takes
          effect.
        </P>
        <P>
          See also our{" "}
          <Link className="text-accent-soft underline" href="/terms">
            Terms and Conditions
          </Link>
          ,{" "}
          <Link className="text-accent-soft underline" href="/refunds">
            Refund and Cancellation Policy
          </Link>{" "}
          and{" "}
          <Link className="text-accent-soft underline" href="/contact">
            contact details
          </Link>
          .
        </P>
      </Section>
    </LegalPage>
  );
}
