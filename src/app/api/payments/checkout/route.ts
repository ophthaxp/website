import { NextResponse } from "next/server";
import {
  createExploratoryCheckout,
  exploratoryFeeInr,
  findPaidPaymentForLead,
  isPaymentConfigured,
} from "@/lib/paymentsApi";
import { findAppointmentForApplication, isBookingConfigured } from "@/lib/bookingApi";
import { getApplicationById } from "@/lib/applyApi";
import { getSessionUser } from "@/lib/session";

/**
 * Step 7 — send the Star to pay for the call they have just held.
 *
 * Nothing is confirmed here and no money is handled here: this creates a
 * hosted checkout on the organization's own payment provider and hands back
 * its URL for the browser to follow. What comes back afterwards is dealt with
 * by `/api/booking/confirm`, which asks the platform whether the money
 * actually arrived rather than believing the redirect.
 *
 * The fee is charged against the **lead**, not the application: the lead is
 * what the business already runs on, what the payment webhook moves to
 * `call_fee_paid`, and what the account page's ladder is drawn from.
 */

/** Slugs address our own pages; anything else is somebody redirecting us. */
const SLUG = /^[a-z0-9][a-z0-9-]{0,80}$/i;

/**
 * This website's own origin, for the address the provider sends people back to.
 *
 * `NEXT_PUBLIC_SITE_URL` first and deliberately: it is the one variable that
 * means *this site*, and it is the one that differs between a laptop and
 * production. `LOM_SITE_URL` is the platform's link base — it points at the
 * admin console in some deployments — so it is only a last resort.
 */
function siteBase(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || process.env.LOM_SITE_URL || "").replace(
    /\/+$/,
    "",
  );
}

export async function POST(req: Request) {
  const user = getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const applicationId = Number(body?.applicationId);
  const courseSlug = String(body?.courseSlug ?? "").trim();

  if (!Number.isInteger(applicationId) || applicationId <= 0) {
    return NextResponse.json({ error: "applicationId is required" }, { status: 422 });
  }

  // The return address is built here from our own site URL, and the only part
  // the browser supplies is a slug that has to look like a slug. A caller who
  // could name the success URL could send a paying doctor anywhere.
  const base = siteBase();
  if (!base || !SLUG.test(courseSlug)) {
    console.error(
      `[payments] cannot build a return URL — base="${base}" slug="${courseSlug}"`,
    );
    return NextResponse.json(
      { error: "Payments are not available right now. Please try again shortly." },
      { status: 503 },
    );
  }

  const feeInr = exploratoryFeeInr();
  if (!isPaymentConfigured() || !feeInr) {
    return NextResponse.json(
      {
        error:
          "The booking fee cannot be taken online just now. Our team will be in touch to " +
          "arrange it and hold your time.",
      },
      { status: 503 },
    );
  }

  if (!isBookingConfigured()) {
    return NextResponse.json(
      { error: "Booking is not available right now. Please try again shortly." },
      { status: 503 },
    );
  }

  // Confirms the row is theirs, and supplies every detail sent to the provider.
  const application = await getApplicationById(applicationId, user.email);
  if (!application) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }

  const leadId = Number(application.lead_id);
  if (!Number.isInteger(leadId) || leadId <= 0) {
    // The lead is raised when the application is submitted, so this means
    // somebody reached checkout without finishing the form.
    return NextResponse.json(
      { error: "Please finish and submit your application before paying." },
      { status: 409 },
    );
  }

  // There has to be a held time to pay for. Paying first and picking a slot
  // afterwards would mean taking money for a call we might not be able to
  // seat.
  const held = await findAppointmentForApplication(applicationId);
  if (!held) {
    return NextResponse.json(
      { error: "Your time is no longer being held. Please pick another." },
      { status: 409 },
    );
  }
  if (held.status === "confirmed") {
    return NextResponse.json({ ok: true, alreadyPaid: true, appointment: held });
  }

  // Somebody who paid and came back through a stale tab. Charging them twice
  // for one call is the worst outcome available here.
  const existing = await findPaidPaymentForLead(leadId);
  if (existing) {
    return NextResponse.json({ ok: true, alreadyPaid: true, appointment: held });
  }

  const firstName = (application.first_name ?? "").trim();
  const lastName = (application.last_name ?? "").trim();
  const returnUrl = `${base}/apply/${courseSlug}?step=4&payment=`;

  const session = await createExploratoryCheckout({
    leadId,
    starName: `${firstName} ${lastName}`.trim() || user.email,
    starEmail: application.email || user.email,
    courseId: application.course_id ?? "",
    courseName: application.course_name ?? "",
    successUrl: `${returnUrl}return`,
    cancelUrl: `${returnUrl}cancelled`,
  });

  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: 502 });
  }

  return NextResponse.json({
    ok: true,
    url: session.data.url,
    provider: session.data.provider,
    feeInr,
  });
}
