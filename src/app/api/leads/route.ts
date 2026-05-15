import { NextResponse } from "next/server";

const NOCODE_BASE = process.env.NOCODE_API_BASE_URL || "";
const NOCODE_APP_ID = process.env.NOCODE_APP_ID || "";
const NOCODE_LEADS_USER_ID = process.env.NOCODE_LEADS_USER_ID || "";
const APPLY_MODULE =
  process.env.NOCODE_APPLY_LEADS_MODULE || "ophthaxp_apply_leads";
const BROCHURE_MODULE =
  process.env.NOCODE_BROCHURE_LEADS_MODULE || "ophthaxp_brochure_leads";

type Intent = "apply" | "brochure";

interface IncomingPayload {
  fullName?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  qualification?: string;
  state?: string;
  city?: string;
  pincode?: string;
  courseId?: string;
  courseName?: string;
  brochureUrl?: string;
  intent?: Intent;
  source?: string;
}

export async function POST(req: Request) {
  let payload: IncomingPayload;
  try {
    payload = (await req.json()) as IncomingPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const intent: Intent = payload?.intent === "brochure" ? "brochure" : "apply";
  const isBrochure = intent === "brochure";

  const firstName = (payload.firstName ?? "").trim();
  const lastName = (payload.lastName ?? "").trim();
  const fullName = (payload.fullName ?? `${firstName} ${lastName}`).trim();
  const email = (payload.email ?? "").trim();
  const phone = (payload.phone ?? "").trim();

  if (!firstName || !lastName || !email || !phone) {
    return NextResponse.json(
      { error: "firstName, lastName, email and phone are required" },
      { status: 422 },
    );
  }

  if (!isBrochure && !payload.qualification) {
    return NextResponse.json(
      { error: "qualification is required for apply submissions" },
      { status: 422 },
    );
  }

  const record: Record<string, unknown> = {
    firstName,
    lastName,
    fullName,
    email,
    phone,
    courseId: payload.courseId ?? "",
    courseName: payload.courseName ?? "",
    intent,
    source:
      payload.source ??
      (isBrochure ? "brochure-form-modal" : "apply-form-modal"),
  };

  if (isBrochure) {
    record.brochureUrl = payload.brochureUrl ?? "";
  } else {
    record.qualification = payload.qualification ?? "";
    record.state = payload.state ?? "";
    record.city = payload.city ?? "";
    record.pincode = payload.pincode ?? "";
  }

  if (!NOCODE_BASE || !NOCODE_APP_ID || !NOCODE_LEADS_USER_ID) {
    console.warn(
      `[leads] nocode env not fully set — NOCODE_API_BASE_URL="${NOCODE_BASE}" NOCODE_APP_ID="${NOCODE_APP_ID}" NOCODE_LEADS_USER_ID set=${Boolean(
        NOCODE_LEADS_USER_ID,
      )}. Lead NOT written to DB; falling through to webhook/echo.`,
    );
  } else {
    const moduleTitle = isBrochure ? BROCHURE_MODULE : APPLY_MODULE;
    const url = `${NOCODE_BASE}/api/public/data/${NOCODE_APP_ID}/${encodeURIComponent(
      moduleTitle,
    )}`;
    console.log(`[leads] POST → ${url} intent=${intent}`);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...record,
          loggedUser: { id: NOCODE_LEADS_USER_ID },
        }),
      });
      const bodyText = await res.text().catch(() => "");
      if (!res.ok) {
        console.error(
          `[leads] nocode insert FAILED status=${res.status} module=${moduleTitle} body=${bodyText}`,
        );
        return NextResponse.json(
          { error: "Failed to save lead", upstreamStatus: res.status, upstream: bodyText },
          { status: 502 },
        );
      }
      console.log(`[leads] nocode insert OK module=${moduleTitle}`);
      let data: unknown = {};
      try {
        data = JSON.parse(bodyText);
      } catch {
        /* non-JSON */
      }
      return NextResponse.json({ ok: true, intent, data });
    } catch (err) {
      console.error("[leads] nocode insert threw", err);
      return NextResponse.json(
        { error: "Failed to reach lead store" },
        { status: 502 },
      );
    }
  }

  const webhook = process.env.LEADS_WEBHOOK_URL;
  if (webhook) {
    try {
      await fetch(webhook, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...record,
          receivedAt: new Date().toISOString(),
        }),
      });
    } catch (err) {
      console.error("[leads] webhook forward failed", err);
    }
  }

  return NextResponse.json({
    ok: true,
    intent,
    id: `lead_${Date.now()}`,
    received: record,
  });
}
