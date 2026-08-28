/**
 * The application rows behind the apply flow.
 *
 * Everything here goes through the platform's public data API. Accounts and
 * sessions are not this file's business — those use the platform's own auth
 * endpoints, in `platformAuth.ts`.
 *
 * Nothing here is reachable from the browser. Every caller is a route handler
 * that has already checked the session cookie.
 */

const BASE = process.env.NOCODE_API_BASE_URL || "";
const APP_ID = process.env.NOCODE_APP_ID || "";
const ORG_ID = process.env.NOCODE_ORG_ID || "";
/**
 * Whose name the row is written under.
 *
 * The same system account the lead route already uses. The applicant's own
 * identity lives in the row's `email` and `user_id` columns — `created_by` is
 * about which account performed the write, and the applicant does not have a
 * platform session to write with.
 */
const SYSTEM_USER = process.env.NOCODE_LEADS_USER_ID || "";
const APPLICATIONS_MODULE =
  process.env.NOCODE_APPLICATIONS_MODULE || "ophthaxp_applications";
const APPLY_LEADS_MODULE =
  process.env.NOCODE_APPLY_LEADS_MODULE || "ophthaxp_apply_leads";

/**
 * The steps of the journey, as `current_step` on an application.
 *
 * 1 and 2 are the two pages of the form; everything from 3 on happens after the
 * application is submitted. Kept in one place because resume, the account page
 * and the modal all have to agree on what "where they left off" means.
 */
export const STEP = {
  details: 1,
  cases: 2,
  booking: 3,
  checkout: 4,
  /** Nothing left for the applicant to do in the browser. */
  done: 5,
} as const;

const JOURNEY_COMPLETE = STEP.done;

/** Long enough for the platform to create an account and send mail. */
const TIMEOUT_MS = 10000;

export interface ApplicationRecord {
  id?: number;
  user_id?: string;
  status?: "draft" | "submitted" | "abandoned";
  current_step?: number;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  qualification?: string;
  state?: string;
  city?: string;
  pincode?: string;
  course_id?: string;
  course_name?: string;
  mentor_name?: string;
  loma_cases?: unknown;
  lead_id?: number | null;
  source?: string;
  return_path?: string;
  last_seen_at?: string;
  submitted_at?: string | null;
}

export function isConfigured(): boolean {
  return Boolean(BASE && APP_ID && ORG_ID);
}

async function withTimeout<T>(run: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const controller = new AbortController();
  const deadline = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await run(controller.signal);
  } finally {
    clearTimeout(deadline);
  }
}

function leadsUrl(): string {
  return `${BASE}/api/public/data/${APP_ID}/${ORG_ID}/${encodeURIComponent(
    APPLY_LEADS_MODULE,
  )}`;
}

function dataUrl(suffix = ""): string {
  return `${BASE}/api/public/data/${APP_ID}/${ORG_ID}/${encodeURIComponent(
    APPLICATIONS_MODULE,
  )}${suffix}`;
}

/**
 * Pull the records out of a public data API read.
 *
 * The real shape is `{data: {tId, headers, rows: [...], pagination}}` — the
 * records live under **`rows`**, alongside the column definitions. Getting this
 * wrong is silent and total: every read returns an empty list, so a saved draft
 * looks like no draft at all and the form asks for details it already has.
 *
 * The other two shapes are kept as fallbacks for the routes that return a bare
 * array or a nested `data`.
 */
function unwrapRows(body: unknown): Record<string, unknown>[] {
  const outer = (body as { data?: unknown })?.data;
  if (Array.isArray(outer)) return outer as Record<string, unknown>[];

  const rows = (outer as { rows?: unknown })?.rows;
  if (Array.isArray(rows)) return rows as Record<string, unknown>[];

  const inner = (outer as { data?: unknown })?.data;
  if (Array.isArray(inner)) return inner as Record<string, unknown>[];

  return [];
}

export interface LeadRecord {
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string;
  qualification?: string;
  state?: string;
  city?: string;
  pincode?: string;
  courseId?: string;
  courseName?: string;
  mentorName?: string;
}

/**
 * Raise the lead a submitted application becomes.
 *
 * Writes the same row `/api/leads` writes, into the same module, so the sales
 * pipeline, the mentor's decision buttons and enrollment reconcile all work
 * exactly as before. What it deliberately does **not** do is ask the platform
 * to send the welcome email: that mail carried a payment link, and payment now
 * happens in the flow at checkout instead.
 */
export async function createLead(record: LeadRecord): Promise<number | null> {
  return withTimeout(async (signal) => {
    const res = await fetch(leadsUrl(), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...record,
        intent: "apply",
        source: "apply-flow",
        // Every lead enters the funnel untouched; the admin panel moves it on.
        status: "new",
        loggedUser: { id: SYSTEM_USER },
      }),
      signal,
      cache: "no-store",
    });

    const text = await res.text().catch(() => "");
    if (!res.ok) {
      console.error(`[apply] lead insert failed status=${res.status} body=${text}`);
      return null;
    }

    try {
      const parsed = JSON.parse(text) as { data?: { id?: number } | Array<{ id?: number }> };
      const data = Array.isArray(parsed.data) ? parsed.data[0] : parsed.data;
      return data?.id ?? null;
    } catch {
      console.error(`[apply] lead insert returned unparseable body=${text}`);
      return null;
    }
  });
}

export interface CreateApplicationResult {
  id: number | null;
  /** Upstream status when the write was refused. */
  status?: number;
  /** Why it failed, for the server log — never shown to the applicant verbatim. */
  reason?: string;
}

/**
 * Open an application row.
 *
 * Returns why it failed rather than a bare null. The first version returned
 * null for every kind of failure, so a refused write looked exactly like a
 * successful one whose id could not be parsed — and the applicant sailed on to
 * step 2 with nothing behind them, only to be told at the very end that their
 * application could not be found.
 *
 * The likeliest refusal by far is HTTP 403 `MODULE_NOT_PUBLIC`: the public data
 * API only accepts writes to modules whose settings have `isPublic` turned on,
 * which is a toggle in the admin panel and not something the module JSON can
 * carry.
 */
export async function createApplication(
  record: ApplicationRecord,
  userId: string,
): Promise<CreateApplicationResult> {
  return withTimeout(async (signal) => {
    const res = await fetch(dataUrl(), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...record, loggedUser: { id: SYSTEM_USER || userId } }),
      signal,
      cache: "no-store",
    });
    const text = await res.text().catch(() => "");

    if (!res.ok) {
      const hint =
        res.status === 403
          ? ` — the "${APPLICATIONS_MODULE}" module is not marked public. Turn on public API access for it in the admin panel.`
          : "";
      console.error(
        `[apply] application insert failed status=${res.status} body=${text}${hint}`,
      );
      return { id: null, status: res.status, reason: text || `status ${res.status}` };
    }

    try {
      const parsed = JSON.parse(text) as { data?: { id?: number } | Array<{ id?: number }> };
      const data = Array.isArray(parsed.data) ? parsed.data[0] : parsed.data;
      const id = data?.id ?? null;
      if (id == null) {
        console.error(`[apply] application insert returned no id — body=${text}`);
        return { id: null, reason: "the insert returned no row id" };
      }
      return { id };
    } catch {
      console.error(`[apply] application insert returned unparseable body=${text}`);
      return { id: null, reason: "the insert response could not be parsed" };
    }
  });
}

export async function updateApplication(
  id: number,
  record: ApplicationRecord,
  userId: string,
): Promise<boolean> {
  return withTimeout(async (signal) => {
    const res = await fetch(dataUrl(`/${id}`), {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...record, loggedUser: { id: SYSTEM_USER || userId } }),
      signal,
      cache: "no-store",
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error(`[apply] application ${id} update failed status=${res.status} body=${text}`);
      return false;
    }
    return true;
  });
}

/**
 * The application this person should be returned to.
 *
 * "Open" means the journey is unfinished — not that it is unsubmitted. Booking
 * the call, confirming it and paying all happen *after* step 4, so an
 * application that has been submitted is still very much in progress. Only an
 * abandoned one is closed.
 *
 * Filtered by email server-side, and every caller has already checked the
 * session, so a session can only ever reach its own rows.
 */
export async function findOpenApplication(
  ownerEmail: string,
  courseId?: string,
): Promise<ApplicationRecord | null> {
  const params = new URLSearchParams({
    email: ownerEmail,
    limit: "10",
    sortBy: "id",
    sortOrder: "desc",
  });

  return withTimeout(async (signal) => {
    const res = await fetch(`${dataUrl()}?${params.toString()}`, {
      headers: { "content-type": "application/json" },
      signal,
      cache: "no-store",
    });
    if (!res.ok) {
      console.error(`[apply] draft lookup failed status=${res.status}`);
      return null;
    }

    const rows = unwrapRows(await res.json().catch(() => ({})));
    // Belt and braces on both filters. The owner check matters because this row
    // is about to be shown to somebody. The status check matters because a
    // submitted application coming back here would reopen the form on a
    // finished application and let it be submitted twice.
    const mine = rows.filter(
      (r) =>
        String(r.email ?? "").toLowerCase() === ownerEmail.toLowerCase() &&
        String(r.status ?? "draft") !== "abandoned" &&
        // Finished journeys are not resumed. Until the later steps exist this
        // never matches, which is why it is expressed as a step rather than a
        // status the module does not yet have.
        Number(r.current_step ?? 1) < JOURNEY_COMPLETE,
    );
    if (mine.length === 0) return null;

    // Asked about a particular course, answer about that course or not at all.
    // Falling back to "their newest draft" meant clicking Apply Now on a second
    // course reopened the first course's application: the wrong course name on
    // screen, and a submit that finished the wrong application. A doctor can
    // have a draft for each course, and they must not collide.
    if (courseId) {
      const forCourse = mine.find((r) => String(r.course_id ?? "") === courseId);
      return (forCourse as ApplicationRecord) ?? null;
    }

    // No course in the question — the account page, or a sign-in link with
    // nowhere particular to go. The most recent draft is the right answer.
    return mine[0] as ApplicationRecord;
  });
}

/** The personal details that belong to the applicant, not to any one application. */
export type ApplicantProfile = Pick<
  ApplicationRecord,
  | "first_name"
  | "last_name"
  | "email"
  | "phone"
  | "qualification"
  | "state"
  | "city"
  | "pincode"
>;

/**
 * What we already know about this person, from whatever they filled in last.
 *
 * A doctor's name, number and qualification do not change because they are
 * looking at a second course, so applying again should not mean typing them
 * again. Any status will do — a submitted application is just as good a source
 * as a draft, and is usually the more recent one.
 */
export async function findApplicantProfile(
  ownerEmail: string,
): Promise<ApplicantProfile | null> {
  const params = new URLSearchParams({
    email: ownerEmail,
    limit: "1",
    sortBy: "id",
    sortOrder: "desc",
  });

  return withTimeout(async (signal) => {
    const res = await fetch(`${dataUrl()}?${params.toString()}`, {
      headers: { "content-type": "application/json" },
      signal,
      cache: "no-store",
    });
    if (!res.ok) return null;

    const rows = unwrapRows(await res.json().catch(() => ({})));
    const row = rows.find(
      (r) => String(r.email ?? "").toLowerCase() === ownerEmail.toLowerCase(),
    );
    if (!row) return null;

    const text = (value: unknown): string | undefined => {
      const out = typeof value === "string" ? value.trim() : "";
      return out || undefined;
    };

    return {
      first_name: text(row.first_name),
      last_name: text(row.last_name),
      email: text(row.email),
      phone: text(row.phone),
      qualification: text(row.qualification),
      state: text(row.state),
      city: text(row.city),
      pincode: text(row.pincode),
    };
  });
}

/**
 * This person's application for one course, however far along it is.
 *
 * Unlike `findOpenApplication` this does not stop at finished ones — which is
 * the point. A Star who has already booked a slot for a course must not be
 * handed a blank form and allowed to apply again; the caller needs to see the
 * finished application in order to say so.
 */
export async function findApplicationForCourse(
  ownerEmail: string,
  courseId: string,
): Promise<ApplicationRecord | null> {
  const params = new URLSearchParams({
    email: ownerEmail,
    course_id: courseId,
    limit: "10",
    sortBy: "id",
    sortOrder: "desc",
  });

  return withTimeout(async (signal) => {
    const res = await fetch(`${dataUrl()}?${params.toString()}`, {
      headers: { "content-type": "application/json" },
      signal,
      cache: "no-store",
    });
    if (!res.ok) {
      console.error(`[apply] course application lookup failed status=${res.status}`);
      return null;
    }

    const rows = unwrapRows(await res.json().catch(() => ({})));
    const mine = rows.filter(
      (r) =>
        String(r.email ?? "").toLowerCase() === ownerEmail.toLowerCase() &&
        String(r.course_id ?? "") === courseId &&
        String(r.status ?? "draft") !== "abandoned",
    );
    return (mine[0] as ApplicationRecord) ?? null;
  });
}

/** True once there is nothing left for the applicant to do in the browser. */
export function isJourneyComplete(application: ApplicationRecord | null | undefined): boolean {
  return Number(application?.current_step ?? 0) >= STEP.done;
}

/**
 * Every application this user has, newest first — drafts and submitted alike.
 *
 * Backs the account page. `findOpenApplication` above answers a narrower
 * question (what should the form reopen into?) and stays as it is.
 */
export async function listApplications(ownerEmail: string): Promise<ApplicationRecord[]> {
  const params = new URLSearchParams({
    email: ownerEmail,
    limit: "25",
    sortBy: "id",
    sortOrder: "desc",
  });

  return withTimeout(async (signal) => {
    const res = await fetch(`${dataUrl()}?${params.toString()}`, {
      headers: { "content-type": "application/json" },
      signal,
      cache: "no-store",
    });
    if (!res.ok) {
      console.error(`[apply] application list failed status=${res.status}`);
      return [];
    }

    const rows = unwrapRows(await res.json().catch(() => ({})));
    // The platform filters by user_id; these rows are about to be shown to
    // somebody, so check the owner here as well.
    return rows.filter(
      (r) => String(r.email ?? "").toLowerCase() === ownerEmail.toLowerCase(),
    ) as ApplicationRecord[];
  });
}

/**
 * How far a submitted application has got.
 *
 * The answer lives on the lead row, which the rest of the business already
 * moves along — the mentor's decision, the call fee, the course fee. Read
 * through the same public data API, and read-only: nothing here writes to a
 * lead.
 */
export async function getLeadStatus(leadId: number): Promise<string | null> {
  const leadsModule = process.env.NOCODE_APPLY_LEADS_MODULE || "ophthaxp_apply_leads";
  const url = `${BASE}/api/public/data/${APP_ID}/${ORG_ID}/${encodeURIComponent(
    leadsModule,
  )}?id=${leadId}&limit=1`;

  return withTimeout(async (signal) => {
    const res = await fetch(url, {
      headers: { "content-type": "application/json" },
      signal,
      cache: "no-store",
    });
    if (!res.ok) return null;

    const rows = unwrapRows(await res.json().catch(() => ({})));
    const row = rows.find((r) => Number(r.id) === leadId);
    const status = row?.status;
    return typeof status === "string" && status ? status : null;
  });
}

export async function getApplicationById(
  id: number,
  ownerEmail: string,
): Promise<ApplicationRecord | null> {
  const params = new URLSearchParams({
    id: String(id),
    email: ownerEmail,
    limit: "1",
  });

  return withTimeout(async (signal) => {
    const res = await fetch(`${dataUrl()}?${params.toString()}`, {
      headers: { "content-type": "application/json" },
      signal,
      cache: "no-store",
    });
    if (!res.ok) return null;

    const rows = unwrapRows(await res.json().catch(() => ({})));
    const row = rows.find(
      (r) =>
        Number(r.id) === id &&
        String(r.email ?? "").toLowerCase() === ownerEmail.toLowerCase(),
    );
    return (row as ApplicationRecord) ?? null;
  });
}
