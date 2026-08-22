import { NextResponse } from "next/server";

const NOCODE_BASE = process.env.NOCODE_API_BASE_URL || "";
const NOCODE_APP_ID = process.env.NOCODE_APP_ID || "";
const NOCODE_ORG_ID = process.env.NOCODE_ORG_ID || "";
const NOCODE_LEADS_USER_ID = process.env.NOCODE_LEADS_USER_ID || "";
const WAITLIST_MODULE =
  process.env.NOCODE_WAITLIST_MODULE || "ophthaxp_waitlist";

interface IncomingPayload {
  name?: string;
  city?: string;
  phone?: string;
  email?: string;
  source?: string;
}

// POST /api/waitlist — body: { name?, city?, phone?, email, source? }
// Only email is required; the rest is best-effort context for follow-up.
export async function POST(req: Request) {
  let payload: IncomingPayload;
  try {
    payload = (await req.json()) as IncomingPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const name = (payload.name ?? "").trim();
  const city = (payload.city ?? "").trim();
  const phone = (payload.phone ?? "").trim();
  const email = (payload.email ?? "").trim();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json(
      { error: "A valid email address is required" },
      { status: 422 },
    );
  }

  const record: Record<string, unknown> = {
    name,
    city,
    phone,
    email,
    intent: "waitlist",
    source: payload.source ?? "hero-waitlist",
  };

  if (!NOCODE_BASE || !NOCODE_APP_ID || !NOCODE_ORG_ID || !NOCODE_LEADS_USER_ID) {
    console.warn(
      `[waitlist] nocode env not fully set — NOCODE_API_BASE_URL="${NOCODE_BASE}" NOCODE_APP_ID="${NOCODE_APP_ID}" NOCODE_ORG_ID set=${Boolean(
        NOCODE_ORG_ID,
      )} NOCODE_LEADS_USER_ID set=${Boolean(
        NOCODE_LEADS_USER_ID,
      )}. Signup NOT written to DB; falling through to webhook/echo.`,
    );
  } else {
    const url = `${NOCODE_BASE}/api/public/data/${NOCODE_APP_ID}/${NOCODE_ORG_ID}/${encodeURIComponent(
      WAITLIST_MODULE,
    )}`;
    console.log(`[waitlist] POST → ${url}`);
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
          `[waitlist] nocode insert FAILED status=${res.status} module=${WAITLIST_MODULE} body=${bodyText}`,
        );
        return NextResponse.json(
          {
            error: "Failed to save waitlist signup",
            upstreamStatus: res.status,
            upstream: bodyText,
          },
          { status: 502 },
        );
      }
      console.log(`[waitlist] nocode insert OK module=${WAITLIST_MODULE}`);
      let data: unknown = {};
      try {
        data = JSON.parse(bodyText);
      } catch {
        /* non-JSON */
      }
      return NextResponse.json({ ok: true, data });
    } catch (err) {
      console.error("[waitlist] nocode insert threw", err);
      return NextResponse.json(
        { error: "Failed to reach waitlist store" },
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
        body: JSON.stringify({ ...record, receivedAt: new Date().toISOString() }),
      });
    } catch (err) {
      console.error("[waitlist] webhook forward failed", err);
    }
  }

  return NextResponse.json({
    ok: true,
    id: `waitlist_${Date.now()}`,
    received: record,
  });
}
