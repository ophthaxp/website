import { NextResponse } from "next/server";
import {
  createLead,
  getApplicationById,
  STEP,
  updateApplication,
} from "@/lib/applyApi";
import { sendApplyWhatsApp } from "@/lib/whatsapp";
import { getSessionUser } from "@/lib/session";

/**
 * Finishing the application form.
 *
 * Two things happen. The application is marked submitted and moved on to
 * picking a slot, and a lead row is raised — the lead is what the business
 * already runs on, so the pipeline, the Legend's selected/rejected buttons and
 * enrollment reconcile keep working untouched.
 *
 * What no longer happens is the welcome email. That mail carried a payment
 * link, and payment has moved into the flow at checkout; sending it here would
 * offer a second, competing way to pay. So the lead row is written directly
 * rather than through `/api/leads`, which always sends it. The WhatsApp
 * acknowledgement is kept — being told the application landed is worth having
 * whatever way the fee is collected.
 */
export async function POST(req: Request) {
  const user = getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { id?: unknown } | null;
  const id = Number(body?.id);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "id is required" }, { status: 422 });
  }

  const application = await getApplicationById(id, user.email);
  if (!application) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }

  // Submitting twice would put a duplicate in the pipeline, so the second
  // attempt just reports what already happened.
  if (application.status === "submitted") {
    return NextResponse.json({
      ok: true,
      alreadySubmitted: true,
      applicationId: id,
      leadId: application.lead_id ?? null,
    });
  }

  const firstName = (application.first_name ?? "").trim();
  const lastName = (application.last_name ?? "").trim();

  if (!firstName || !lastName || !application.email || !application.phone) {
    return NextResponse.json(
      { error: "This application is missing details from step 1." },
      { status: 422 },
    );
  }

  const leadId = await createLead({
    firstName,
    lastName,
    fullName: `${firstName} ${lastName}`.trim(),
    email: application.email,
    phone: application.phone,
    qualification: application.qualification ?? "",
    state: application.state ?? "",
    city: application.city ?? "",
    pincode: application.pincode ?? "",
    courseId: application.course_id ?? "",
    courseName: application.course_name ?? "",
    mentorName: application.mentor_name ?? "",
  });

  if (leadId == null) {
    console.error(`[applications] lead could not be raised for application ${id}`);
    return NextResponse.json(
      { error: "We could not submit your application just now. Please try again." },
      { status: 502 },
    );
  }

  // The lead exists, so this application is in the pipeline either way. If the
  // marking fails they could submit again and appear twice, which is worth
  // saying loudly in the log.
  const marked = await updateApplication(
    id,
    {
      status: "submitted",
      lead_id: leadId,
      // Submitting is step 4 of ten; picking a slot with the Legend comes next.
      current_step: STEP.booking,
      submitted_at: new Date().toISOString(),
      last_seen_at: new Date().toISOString(),
    },
    user.email,
  );

  if (!marked) {
    console.error(
      `[applications] application ${id} could not be marked submitted although lead ${leadId} was raised`,
    );
  }

  // Awaited, not fired and forgotten: a serverless function is frozen the
  // moment it responds, and anything still running is killed with it.
  const whatsapp = await sendApplyWhatsApp({
    phone: application.phone,
    firstName,
    courseName: application.course_name ?? "",
  });

  return NextResponse.json({
    ok: true,
    applicationId: id,
    leadId,
    nextStep: STEP.booking,
    whatsapp,
  });
}
