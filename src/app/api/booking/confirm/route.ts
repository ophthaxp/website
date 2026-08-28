import { NextResponse } from "next/server";
import { confirmSlot, findAppointmentForApplication, isBookingConfigured } from "@/lib/bookingApi";
import { getApplicationById, STEP, updateApplication } from "@/lib/applyApi";
import { getSessionUser } from "@/lib/session";

/**
 * Payment succeeded — book the held slot for real.
 *
 * The Star picked a time at step 3, which only *held* it: nothing went into
 * the Legend's diary for a call nobody had paid for. This is where it becomes
 * a real appointment.
 *
 * **This is a stand-in for the payment gateway.** Today the wizard calls it
 * straight after its stub checkout, which means anyone signed in could reach
 * it and confirm without paying. When Razorpay lands, the caller must become
 * the payment webhook — verifying the signature and passing the real payment
 * reference — and this route should stop trusting the browser.
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

  const result = await confirmSlot({
    appointmentId: held.id,
    starEmail: application.email || user.email,
    paymentRef: typeof body?.paymentRef === "string" ? body.paymentRef : undefined,
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
    nextStep: STEP.done,
  });
}
