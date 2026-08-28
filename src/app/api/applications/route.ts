import { NextResponse } from "next/server";
import {
  createApplication,
  findApplicantProfile,
  findApplicationForCourse,
  findOpenApplication,
  isJourneyComplete,
  getApplicationById,
  isConfigured,
  updateApplication,
  type ApplicationRecord,
} from "@/lib/applyApi";
import { getSessionUser, sessionCookie } from "@/lib/session";
import { isAuthConfigured, passwordProblem, signUp } from "@/lib/platformAuth";
import { clientKey, emailKey, rateLimit } from "@/lib/rateLimit";

/**
 * The application a doctor is part-way through.
 *
 * POST starts one — creating the account behind it if this is a new email.
 * PATCH saves whatever has been typed so far. Both exist so that closing the
 * tab costs nothing: every step lands on the server before the next one opens.
 */

/** Fields the browser is allowed to write. Anything else is ignored. */
const WRITABLE: (keyof ApplicationRecord)[] = [
  "current_step",
  "first_name",
  "last_name",
  "phone",
  "qualification",
  "state",
  "city",
  "pincode",
  "course_id",
  "course_name",
  "mentor_name",
  "return_path",
  "loma_cases",
];

/**
 * Take only the known fields.
 *
 * `status`, `user_id`, `lead_id` and `email` are deliberately absent: those are
 * set by the server, and a browser that could post `status: "submitted"` could
 * skip the flow it is supposed to be walking through.
 */
function pickWritable(input: Record<string, unknown>): ApplicationRecord {
  const out: Record<string, unknown> = {};
  for (const key of WRITABLE) {
    if (input[key] !== undefined) out[key] = input[key];
  }
  return out as ApplicationRecord;
}

/**
 * The application row could not be opened.
 *
 * Nothing the applicant can act on, so they get a plain apology while the real
 * reason goes to the server log — most often the applications module not being
 * marked public in the admin panel.
 */
function couldNotOpen(reason?: string) {
  console.error(`[applications] could not open an application — ${reason ?? "no reason given"}`);
  return NextResponse.json(
    { error: "We could not save your application just now. Please try again shortly." },
    { status: 502 },
  );
}

function nowIso(): string {
  return new Date().toISOString();
}

/** GET — the draft to put this person back into, if any. */
export async function GET(req: Request) {
  const user = getSessionUser();
  if (!user) return NextResponse.json({ user: null, application: null });

  if (!isConfigured()) {
    return NextResponse.json({ user, application: null, configured: false });
  }

  const courseId = new URL(req.url).searchParams.get("courseId") ?? undefined;
  const application = await findOpenApplication(user.email, courseId);

  // Nothing started for this course yet, but we already know who they are.
  // Their details come back separately so the form can arrive filled in rather
  // than asking a second time for what has not changed.
  const prefill = application ? null : await findApplicantProfile(user.email);

  return NextResponse.json({ user, application, prefill });
}

/**
 * POST — step 1 submitted.
 *
 * Three outcomes:
 *  - new email  → account created, signed in, draft opened, step 2 next
 *  - known email → nothing is disclosed; a login link has been emailed
 *  - signed in already → the draft is just updated
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const firstName = String(body.first_name ?? "").trim();
  const lastName = String(body.last_name ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  const phone = String(body.phone ?? "").trim();

  if (!firstName || !lastName || !email || !phone) {
    return NextResponse.json(
      { error: "First name, last name, email and phone are required" },
      { status: 422 },
    );
  }
  if (!body.qualification) {
    return NextResponse.json({ error: "Please select your qualification." }, { status: 422 });
  }

  const password = typeof body.password === "string" ? body.password : "";
  const existing = getSessionUser();

  // Only somebody signing up needs one. A signed-in applicant is editing an
  // application, and already has an account.
  if (!existing) {
    const problem = passwordProblem(password);
    if (problem) {
      return NextResponse.json({ error: `Password: ${problem}` }, { status: 422 });
    }
  }

  if (!isConfigured()) {
    console.error(
      "[applications] platform env not set — NOCODE_API_BASE_URL / NOCODE_APP_ID / NOCODE_ORG_ID / NOCODE_API_KEY",
    );
    return NextResponse.json(
      { error: "Applications are not available right now. Please try again shortly." },
      { status: 503 },
    );
  }

  const fields = pickWritable(body);

  // Only the signed-out path is throttled. It creates a user account and can
  // send mail, both on nothing more than an unauthenticated POST. Someone
  // already signed in is just saving their own form.
  if (!existing) {
    const perIp = rateLimit(`apply:ip:${clientKey(req)}`, 5, 15 * 60_000);
    const perEmail = rateLimit(`apply:email:${emailKey(email)}`, 3, 15 * 60_000);

    if (!perIp.ok || !perEmail.ok) {
      const retryAfter = Math.max(perIp.retryAfter, perEmail.retryAfter);
      console.warn(`[applications] throttled ${clientKey(req)} — retry in ${retryAfter}s`);
      return NextResponse.json(
        { error: "Too many attempts. Please wait a few minutes and try again." },
        { status: 429, headers: { "retry-after": String(retryAfter) } },
      );
    }
  }

  // Already signed in — this is the same person editing their own step 1.
  if (existing) {
    // Only ever update a draft for *this* course. Without the guard, a request
    // that arrived without a course id would match their newest draft and
    // rewrite it to a different course — turning an application they were
    // half-way through into one for something they never chose.
    // Everything they have for this course, finished included. The page hides
    // the form once a journey is complete; this is the same rule enforced where
    // it counts, so a direct POST cannot raise a second lead for one course.
    const forCourse = fields.course_id
      ? await findApplicationForCourse(existing.email, fields.course_id)
      : null;

    if (isJourneyComplete(forCourse)) {
      return NextResponse.json(
        {
          ok: true,
          alreadyApplied: true,
          applicationId: forCourse?.id ?? null,
          message: "You have already applied for this programme.",
        },
        { status: 409 },
      );
    }

    const draft = fields.course_id
      ? await findOpenApplication(existing.email, fields.course_id)
      : null;
    const record: ApplicationRecord = {
      ...fields,
      current_step: 2,
      last_seen_at: nowIso(),
    };

    if (draft?.id) {
      await updateApplication(draft.id, record, existing.id);
      return NextResponse.json({ ok: true, applicationId: draft.id, nextStep: 2, user: existing });
    }

    const created = await createApplication(
      {
        ...record,
        user_id: existing.id,
        email: existing.email,
        status: "draft",
        source: "apply-flow",
      },
      existing.id,
    );

    if (created.id == null) return couldNotOpen(created.reason);

    return NextResponse.json({
      ok: true,
      applicationId: created.id,
      nextStep: 2,
      user: existing,
    });
  }

  if (!isAuthConfigured()) {
    console.error("[applications] NOCODE_API_BASE_URL / NOCODE_APP_ID not set");
    return NextResponse.json(
      { error: "Applications are not available right now. Please try again shortly." },
      { status: 503 },
    );
  }

  // The platform's own signup: it creates the user, hashes the password and
  // sends its verification email. Nothing about account creation is ours.
  const account = await signUp({ firstName, lastName, email, password });

  if (!account.ok) {
    // A known address is asked to sign in rather than told anything about it.
    if (account.alreadyRegistered) {
      return NextResponse.json({
        ok: true,
        requiresLogin: true,
        email,
        message: "You already have an account. Please log in to continue.",
      });
    }
    return NextResponse.json({ error: account.error }, { status: 422 });
  }

  // Signup does not return the new user, and `signin` would refuse them until
  // they verify — so the session is built from what they just typed. They can
  // finish applying now; verifying is what lets them get back in later.
  const applicant = {
    id: `pending:${email}`,
    email,
    first_name: firstName,
    last_name: lastName,
    role: "applicant",
    org_id: "",
  };
  const created = await createApplication(
    {
      ...fields,
      user_id: applicant.id,
      email: applicant.email,
      status: "draft",
      current_step: 2,
      source: "apply-flow",
      last_seen_at: nowIso(),
    },
    applicant.id,
  );

  // Stop here rather than letting them walk into step 2 with no application
  // behind them. The account itself exists, so a sign-in link still reaches it
  // once whatever refused the write is fixed.
  if (created.id == null) return couldNotOpen(created.reason);

  const sessionUser = {
    id: applicant.id,
    email: applicant.email,
    firstName: applicant.first_name,
    lastName: applicant.last_name,
    role: applicant.role,
    orgId: applicant.org_id,
  };

  const res = NextResponse.json({
    ok: true,
    applicationId: created.id,
    nextStep: 2,
    user: sessionUser,
    // The account exists but is not verified yet — the form says so on step 2.
    signedUp: true,
  });
  res.cookies.set(sessionCookie.set(sessionUser));
  return res;
}

/** PATCH — save progress. Called as the applicant moves between steps. */
export async function PATCH(req: Request) {
  const user = getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const id = Number(body.id);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "id is required" }, { status: 422 });
  }

  // Confirm the row belongs to this session before writing to it.
  const owned = await getApplicationById(id, user.email);
  if (!owned) return NextResponse.json({ error: "Application not found" }, { status: 404 });
  // A submitted application is still in progress — picking a slot, confirming
  // it and paying all come afterwards — so progress must keep saving. What it
  // may no longer change is what was submitted: past that point only the step
  // marker moves, so nobody can edit details a lead was already raised from.
  const fields =
    owned.status === "submitted"
      ? { current_step: pickWritable(body).current_step }
      : pickWritable(body);

  const saved = await updateApplication(
    id,
    { ...fields, last_seen_at: nowIso() },
    user.email,
  );

  if (!saved) return NextResponse.json({ error: "Could not save your progress" }, { status: 502 });
  return NextResponse.json({ ok: true, applicationId: id });
}
