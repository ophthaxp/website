import { NextResponse } from "next/server";
import {
  findAppointmentForApplication,
  isBookingConfigured,
  rescheduleSlot,
} from "@/lib/bookingApi";
import { getApplicationById, STEP, updateApplication } from "@/lib/applyApi";
import { getSessionUser } from "@/lib/session";

/**
 * Changing your mind about the time.
 *
 * Picking a slot holds it, and the hold is what stops anybody else being
 * offered it while the Star goes to pay. That is right up until they come back
 * from checkout wanting a different time — at which point the hold is standing
 * in their way, and the slot they want to give up does not even appear in the
 * list, because it is held by them.
 *
 * So this moves the hold rather than making them abandon it: the platform
 * books the new time first and only then lets the old one go, which is the
 * order that cannot leave somebody with neither.
 *
 * **A confirmed call is not moved here.** Once the fee is paid the invitations
 * are out and the time is in the Legend's diary; moving it is a conversation
 * with the team, not a button in a form the Star has already finished.
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
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const applicationId = Number(body.applicationId);
  const start = String(body.start || "");
  const end = String(body.end || "");

  if (!Number.isInteger(applicationId) || applicationId <= 0) {
    return NextResponse.json({ error: "applicationId is required" }, { status: 422 });
  }
  if (!start || !end) {
    return NextResponse.json({ error: "Pick a time to move to." }, { status: 422 });
  }

  // The row is the authority on whose application this is.
  const application = await getApplicationById(applicationId, user.email);
  if (!application) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }

  const held = await findAppointmentForApplication(applicationId);
  if (!held) {
    // Nothing to move. The picker is the right place for them, not this.
    return NextResponse.json(
      { error: "You have no time held. Please pick one.", noHold: true },
      { status: 409 },
    );
  }

  if (held.status === "confirmed") {
    return NextResponse.json(
      {
        error:
          "Your call is already booked and confirmed. Write to us and we'll move it for you.",
        alreadyConfirmed: true,
      },
      { status: 409 },
    );
  }

  const result = await rescheduleSlot({
    appointmentId: held.id,
    // The platform checks this against the row, so a browser cannot move
    // somebody else's call even if it knew the id.
    starEmail: application.email || user.email,
    start,
    end,
  });

  if (!result.ok) {
    // The wizard reloads the list on a 409 — the time went while they chose.
    const taken = /taken|no longer|already|not available/i.test(result.error || "");
    return NextResponse.json(
      { error: result.error || "That time could not be held. Please pick another." },
      { status: taken ? 409 : 502 },
    );
  }

  // They are still on their way to paying; only the time has changed. The
  // marker is corrected on the next save if this fails, so it is not worth
  // failing a successful move over.
  await updateApplication(
    applicationId,
    { current_step: STEP.checkout, last_seen_at: new Date().toISOString() },
    user.email,
  ).catch(() => undefined);

  return NextResponse.json({
    ok: true,
    appointment: result.data?.appointment,
    calendarSynced: result.data?.calendarSynced ?? false,
    nextStep: STEP.checkout,
  });
}
