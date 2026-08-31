import { NextResponse } from "next/server";
import { confirmSlot, findAppointmentForApplication, isBookingConfigured } from "@/lib/bookingApi";
import { getApplicationById, STEP, updateApplication } from "@/lib/applyApi";
import { findPaidPaymentForLead, isPaymentConfigured } from "@/lib/paymentsApi";
import { getSessionUser } from "@/lib/session";

/**
 * Payment landed — book the held slot for real.
 *
 * The Star picked a time at step 3, which only *held* it: nothing went into
 * the Legend's diary for a call nobody had paid for. This is where it becomes
 * a real appointment.
 *
 * **The browser cannot talk its way through here.** It used to: the wizard
 * called this straight after a stub checkout, so anyone signed in could
 * confirm without paying. Now the only thing that opens this door is a paid
 * payment recorded against the lead — written by the provider's webhook, read
 * back from the platform, and never supplied by the caller. A payment
 * reference sent in the request body is ignored.
 *
 * It is safe to call repeatedly, and the wizard does exactly that while it
 * waits for the webhook: unpaid answers **402** and changes nothing, a paid
 * one confirms, and a call already confirmed reports itself.
 */
export async function POST(req: Request) {
  const user = getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  if (!isBookingConfigured()) {
    return NextResponse.json(
      { error: "Booking is not available right now. Please try again shortly." },
      { status: 503 },
    );
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const applicationId = Number(body?.applicationId);

  if (!Number.isInteger(applicationId) || applicationId <= 0) {
    return NextResponse.json({ error: "applicationId is required" }, { status: 422 });
  }

  // Confirms the row is theirs before anything is booked in their name.
  const application = await getApplicationById(applicationId, user.email);
  if (!application) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }

  // The appointment id comes from the server's own record, not the browser —
  // otherwise a caller could confirm somebody else's held slot.
  const held = await findAppointmentForApplication(applicationId);
  if (!held) {
    return NextResponse.json(
      { error: "No slot is being held for this application. Please pick a time again." },
      { status: 409 },
    );
  }

  // Already done — a second tab, a refreshed receipt page, or the poller
  // arriving after the first call went through.
  if (held.status === "confirmed") {
    return NextResponse.json({
      ok: true,
      alreadyConfirmed: true,
      appointment: held,
      nextStep: STEP.done,
    });
  }

  if (!isPaymentConfigured()) {
    // No provider connected means no way to tell paid from unpaid, and
    // confirming on that basis would put unpaid calls in a Legend's diary.
    console.error("[booking] confirm refused — no payment provider is configured");
    return NextResponse.json(
      { error: "Payments are not available right now. Please try again shortly." },
      { status: 503 },
    );
  }

  const leadId = Number(application.lead_id);
  if (!Number.isInteger(leadId) || leadId <= 0) {
    return NextResponse.json(
      { error: "Please finish and submit your application before paying." },
      { status: 409 },
    );
  }

  const payment = await findPaidPaymentForLead(leadId);
  if (!payment) {
    // 402 is the wizard's cue to keep waiting rather than to show a failure:
    // a payment that has been made but whose webhook has not landed yet looks
    // exactly like this for a few seconds.
    return NextResponse.json(
      {
        error: "We have not seen your payment yet.",
        awaitingPayment: true,
      },
      { status: 402 },
    );
  }

  const result = await confirmSlot({
    appointmentId: held.id,
    starEmail: application.email || user.email,
    paymentRef: payment.reference,
  });

  if (!result.ok) {
    // 409 carries a message the Star can act on — the hold lapsed, or the
    // Legend's diary changed under it. Anything else is ours to apologise for.
    const gone = /no longer|taken|expired|cannot be confirmed/i.test(result.error || "");
    return NextResponse.json({ error: result.error }, { status: gone ? 409 : 502 });
  }

  await updateApplication(
    applicationId,
    { current_step: STEP.done, last_seen_at: new Date().toISOString() },
    user.email,
  ).catch(() => undefined);

  return NextResponse.json({
    ok: true,
    appointment: result.data?.appointment,
    calendarSynced: result.data?.calendarSynced ?? false,
    paymentRef: payment.reference,
    nextStep: STEP.done,
  });
}
