import { NextResponse } from "next/server";
import {
  bookSlot,
  findAppointmentForApplication,
  isBookingConfigured,
  listAppointmentsForStar,
} from "@/lib/bookingApi";
import { getApplicationById, STEP, updateApplication } from "@/lib/applyApi";
import { getSessionUser } from "@/lib/session";

/**
 * Holding the call.
 *
 * Picking a time does not book it — it holds it, so nobody else is offered the
 * same slot while this Star goes to checkout. Nothing reaches the Legend's
 * diary until payment succeeds, which is `/api/booking/confirm`.
 *
 * The application row is the authority on who this is: its id comes from the
 * browser, but every detail sent to the platform is read back off the row on
 * the server. A browser that could name its own Star would be a browser that
 * could hold a Legend's time in somebody else's name.
 */

/** GET — the call already booked, for this application or this Star. */
export async function GET(req: Request) {
  const user = getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  if (!isBookingConfigured()) {
    return NextResponse.json({ appointment: null, appointments: [], configured: false });
  }

  const applicationId = Number(new URL(req.url).searchParams.get("applicationId"));

  if (Number.isInteger(applicationId) && applicationId > 0) {
    const owned = await getApplicationById(applicationId, user.email);
    if (!owned) return NextResponse.json({ error: "Application not found" }, { status: 404 });

    return NextResponse.json({ appointment: await findAppointmentForApplication(applicationId) });
  }

  return NextResponse.json({ appointments: await listAppointmentsForStar(user.email) });
}

/** POST — take this slot. */
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
  const legendEmail = String(body.legendEmail || "").trim();

  if (!Number.isInteger(applicationId) || applicationId <= 0) {
    return NextResponse.json({ error: "applicationId is required" }, { status: 422 });
  }
  if (!start || !end) {
    return NextResponse.json({ error: "Pick a time to continue." }, { status: 422 });
  }
  if (!legendEmail) {
    return NextResponse.json(
      { error: "This programme has no Legend calendar set up yet." },
      { status: 422 },
    );
  }

  // Confirms the row is theirs, and supplies every detail below.
  const application = await getApplicationById(applicationId, user.email);
  if (!application) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }

  // Somebody who refreshed, or has two tabs open. Hand back what they have
  // rather than holding a second slot in the Legend's name.
  const existing = await findAppointmentForApplication(applicationId);
  if (existing) {
    return NextResponse.json({ ok: true, appointment: existing, alreadyBooked: true });
  }

  const firstName = (application.first_name ?? "").trim();
  const lastName = (application.last_name ?? "").trim();

  const result = await bookSlot({
    legendEmail,
    legendName: application.mentor_name || (body.legendName as string) || undefined,
    starName: `${firstName} ${lastName}`.trim() || user.email,
    starEmail: application.email || user.email,
    starPhone: application.phone || undefined,
    courseId: application.course_id || undefined,
    courseName: application.course_name || undefined,
    applicationId,
    leadId: application.lead_id ?? undefined,
    start,
    end,
    timeZone: (body.timeZone as string) || undefined,
  });

  if (!result.ok) {
    // 409 is the one the wizard acts on: the slot went while they were
    // deciding, so it refreshes the list rather than showing a dead error.
    const taken = /taken|no longer|already/i.test(result.error || "");
    return NextResponse.json({ error: result.error }, { status: taken ? 409 : 502 });
  }

  // The slot is held, so the journey moves on to paying for it. Failing to
  // move the marker is not worth failing the hold over — it stands either way,
  // and the step can be corrected on the next save.
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
