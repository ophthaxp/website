import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, Section, P, Bullets, DefList, DefRow } from "@/components/LegalPage";
import { LEGAL } from "@/lib/legal";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Refund and Cancellation Policy",
  description:
    "When a Legends of Medicine programme fee can be cancelled or refunded, how long a refund takes, and how service access is delivered.",
  alternates: { canonical: "/refunds" },
});

export default function RefundsPage() {
  return (
    <LegalPage
      title="Refund and Cancellation Policy"
      intro={
        <>
          Programme fees are refundable within a defined window. This page sets out that
          window, what happens after it closes, and how quickly the money reaches you.
        </>
      }
    >
      <Section id="delivery" heading="1. How the service is delivered">
        <P>
          Everything we sell is a service delivered online or in person — there is
          nothing physical to ship, so no shipping charges apply.
        </P>
        <DefList>
          <DefRow term="Exploratory call">
            Booked once payment is confirmed. Our admissions team emails you within one
            working day to fix a time with the mentor.
          </DefRow>
          <DefRow term="Programme seat">
            Confirmed by email as soon as payment is confirmed. Access to sessions and
            material begins on the cohort start date shown on the programme page.
          </DefRow>
          <DefRow term="Certificate">
            Issued electronically after you complete the programme requirements.
          </DefRow>
        </DefList>
        <P>
          Payment is confirmed by our payment gateway server-to-server. If your browser
          closed before returning to this site, that does not affect a payment that has
          gone through.
        </P>
      </Section>

      {/*
        The window runs from the COHORT START DATE and is per-course, because
        that is exactly what the selection email promises: "a full refund is
        available within {{refundWindowDays}} days of the cohort start date",
        interpolated from the course's own moneyBackDays. Wording that counted
        from the payment date, or that cut the refund off at the cohort start,
        would be narrower than a promise already made in writing — and a
        customer holding that email would be entitled to the wider one.
      */}
      <Section id="window" heading="2. Cancelling and getting a refund">
        <P>
          Every programme carries a money-back window. You may cancel within it for any
          reason and receive a full refund of what you paid — no deduction, no
          administration fee, and no need to give us a reason.
        </P>
        <Bullets>
          <li>
            <span className="text-white/90">The window runs from the cohort start date</span>{" "}
            — not from the date you paid. Paying early never shortens it, and the window
            continues to run for a period after the programme has begun.
          </li>
          <li>
            <span className="text-white/90">
              The number of days is set per programme
            </span>{" "}
            and is stated on the programme page and in the selection email that carried
            your payment link. Where a programme does not state one, it is{" "}
            {LEGAL.defaultRefundWindowDays} days.
          </li>
          <li>
            <span className="text-white/90">Cancelling before the cohort starts</span> —
            always inside the window, so always a full refund.
          </li>
          <li>
            <span className="text-white/90">After the window closes</span> — fees are no
            longer refundable, because the seat is held and faculty time is committed.
            Speak to us anyway if something serious has happened; see the exceptions
            below.
          </li>
        </Bullets>
        <P>
          Until payment is received your place is held, not confirmed. It is released if
          the cohort fills.
        </P>
        <P>
          The exploratory call fee is an advance on tuition, not a separate charge: when
          you enrol, it is credited against the programme fee, and your payment link is
          issued for the balance. If you cancel the call itself at least 24 hours before
          the scheduled time, the fee is refunded in full.
        </P>
      </Section>

      <Section id="we-cancel" heading="3. If we cancel or change a programme">
        <P>
          If we cancel a cohort, postpone it, or make a material change to its format,
          dates or faculty, you may take a full refund or move to a later cohort. This
          applies whatever stage the programme has reached, and no administration fee is
          deducted.
        </P>
      </Section>

      <Section id="exceptions" heading="4. Exceptional circumstances">
        <P>
          Serious illness, bereavement, or a medical emergency affecting you or your
          immediate family will be considered on its merits even after the refund window
          has closed. Write to us with the details. We would usually offer a deferral to
          a later cohort in preference to a refund.
        </P>
      </Section>

      <Section id="no-refund" heading="5. When a refund is not available">
        <Bullets>
          <li>
            Where your access has been withdrawn for a serious breach of our{" "}
            <Link className="text-accent-soft underline" href="/terms">
              Terms and Conditions
            </Link>
            .
          </li>
          <li>
            Where the enrolment details you gave us turn out to be false and the seat is
            cancelled as a result.
          </li>
          <li>
            Where the money-back window has closed and you did not attend, having had
            access to the sessions and material throughout. Non-attendance inside the
            window is not a bar to a refund.
          </li>
        </Bullets>
      </Section>

      <Section id="how-to" heading="6. How to request a refund">
        <P>
          Email{" "}
          <a className="text-accent-soft underline" href={`mailto:${LEGAL.supportEmail}`}>
            {LEGAL.supportEmail}
          </a>{" "}
          from the address you used to enrol, quoting your payment reference and the
          programme name. Requests by phone or WhatsApp need to be followed up in writing
          before we can act on them.
        </P>
        <P>
          We acknowledge every request within 48 hours and tell you our decision within
          five working days.
        </P>
      </Section>

      <Section id="timing" heading="7. How the money comes back">
        <Bullets>
          <li>
            Approved refunds are initiated within five to seven working days of approval.
          </li>
          <li>
            The money goes back to the original payment method. We cannot redirect it to
            a different card or account.
          </li>
          <li>
            Once initiated, it typically reaches you within five to ten working days,
            depending on your bank. That leg is outside our control.
          </li>
          <li>
            Refunds are made in Indian Rupees. On an international payment, currency
            movement and your bank&rsquo;s charges may mean the amount credited differs
            slightly from the amount debited.
          </li>
          <li>
            Where taxes were charged, they are refunded along with the fee to the extent
            the law allows us to recover them.
          </li>
        </Bullets>
      </Section>

      <Section id="disputes" heading="8. If you are unhappy with the outcome">
        <P>
          Raise it with our grievance officer, whose details are on the{" "}
          <Link className="text-accent-soft underline" href="/privacy#grievance">
            Privacy Policy
          </Link>{" "}
          page and our{" "}
          <Link className="text-accent-soft underline" href="/contact">
            contact page
          </Link>
          . Please come to us before raising a chargeback with your bank — a chargeback
          freezes the amount and takes considerably longer to resolve than a direct
          refund.
        </P>
      </Section>
    </LegalPage>
  );
}
