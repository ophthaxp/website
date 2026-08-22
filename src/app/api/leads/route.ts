import { NextResponse } from "next/server";

const NOCODE_BASE = process.env.NOCODE_API_BASE_URL || "";
const NOCODE_APP_ID = process.env.NOCODE_APP_ID || "";
const NOCODE_ORG_ID = process.env.NOCODE_ORG_ID || "";
const NOCODE_LEADS_USER_ID = process.env.NOCODE_LEADS_USER_ID || "";
const NOCODE_API_KEY = process.env.NOCODE_API_KEY || "";
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
  mentorName?: string;
  brochureUrl?: string;
  intent?: Intent;
  source?: string;
}

// ─── welcome email ────────────────────────────────────────────────────────────

/**
 * Ask the platform to send this lead their welcome email.
 *
 * The email used to be built and sent here, over SMTP on a personal Gmail
 * account, with a Pay button pointing at a static URL. Both halves belong to
 * the platform instead: it knows which email provider the organization
 * connected (org_integrations) and which payment provider, so it can create a
 * payment link for this specific lead and send the mail through the org's own
 * sender. This route just says "this lead exists, welcome them".
 */
async function requestWelcomeEmail(leadId: number | string, payload: IncomingPayload) {
  if (!NOCODE_API_KEY) {
    console.error(
      "[leads/welcome] NOCODE_API_KEY not set — no welcome email will be sent. " +
        "Create an API key in the platform and set NOCODE_API_KEY.",
    );
    return;
  }

  try {
    const res = await fetch(`${NOCODE_BASE}/api/lom/leads/${leadId}/welcome`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": NOCODE_API_KEY,
      },
      body: JSON.stringify({
        moduleTitle: payload.intent === "brochure" ? BROCHURE_MODULE : APPLY_MODULE,
        intent: payload.intent ?? "apply",
        mentorName: payload.mentorName ?? "",
        courseName: payload.courseName ?? "",
      }),
    });

    const body = (await res.json().catch(() => ({}))) as {
      payUrl?: string | null;
      email?: { sent?: boolean; provider?: string; reason?: string };
      error?: string;
    };

    if (!res.ok || !body?.email?.sent) {
      console.error(
        `[leads/welcome] lead ${leadId}: email not sent — ${body?.email?.reason ?? body?.error ?? `status ${res.status}`}`,
      );
      return;
    }

    console.log(
      `[leads/welcome] lead ${leadId}: sent via ${body.email.provider}` +
        (body.payUrl ? " with payment link" : " WITHOUT a payment link"),
    );
  } catch (err) {
    console.error(`[leads/welcome] lead ${leadId}: request failed`, err);
  }
}

// ─── WhatsApp helpers ─────────────────────────────────────────────────────────

/** Normalise phone to E.164. Handles Indian 10-digit numbers automatically. */
function toE164(raw: string): string {
  // strip everything except digits and leading +
  let digits = raw.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) return digits;          // already E.164
  if (digits.length === 10 && /^[6-9]/.test(digits)) return `+91${digits}`; // IN mobile
  if (digits.length === 12 && digits.startsWith("91")) return `+${digits}`; // 91XXXXXXXXXX
  return `+${digits}`;                                // best-effort
}

function buildApplyWhatsApp(firstName: string, courseName: string): string {
  return (
    `Hi ${firstName}! 👋\n\n` +
    `Thank you for applying${courseName ? ` for *${courseName}*` : " to Legends of Medicine"}.\n\n` +
    `Our team will review your application and reach out shortly to schedule your discovery call.\n\n` +
    `— Team Legends of Medicine`
  );
}

function buildBrochureWhatsApp(firstName: string, courseName: string, brochureUrl: string): string {
  return (
    `Hi ${firstName}! 👋\n\n` +
    `Here's the brochure you requested${courseName ? ` for *${courseName}*` : ""}:\n` +
    `${brochureUrl}\n\n` +
    `Feel free to reply if you have any questions. We'd love to tell you more!\n\n` +
    `— Team Legends of Medicine`
  );
}

async function sendWhatsApp(
  intent: Intent,
  rawPhone: string,
  firstName: string,
  courseName: string,
  brochureUrl?: string,
) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM;

  if (!sid || !token || !from || sid.startsWith("YOUR_")) {
    console.warn("[leads/whatsapp] Twilio env not configured — skipping WhatsApp message");
    return;
  }

  const to = `whatsapp:${toE164(rawPhone)}`;
  const body =
    intent === "brochure"
      ? buildBrochureWhatsApp(firstName, courseName, brochureUrl ?? "")
      : buildApplyWhatsApp(firstName, courseName);

  const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
  const creds = Buffer.from(`${sid}:${token}`).toString("base64");

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${creds}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ From: from, To: to, Body: body }).toString(),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error(`[leads/whatsapp] Twilio error ${res.status}:`, data);
    } else {
      console.log(`[leads/whatsapp] WhatsApp sent to ${to} sid=${(data as any).sid}`);
    }
  } catch (err) {
    console.error("[leads/whatsapp] failed to send WhatsApp:", err);
  }
}

// ─── route handler ────────────────────────────────────────────────────────────

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
    mentorName: payload.mentorName ?? "",
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
    // Every apply lead enters the funnel untouched; the admin panel moves it on.
    record.status = "new";
  }

  if (!NOCODE_BASE || !NOCODE_APP_ID || !NOCODE_ORG_ID || !NOCODE_LEADS_USER_ID) {
    console.warn(
      `[leads] nocode env not fully set — NOCODE_API_BASE_URL="${NOCODE_BASE}" NOCODE_APP_ID="${NOCODE_APP_ID}" NOCODE_ORG_ID set=${Boolean(NOCODE_ORG_ID)} NOCODE_LEADS_USER_ID set=${Boolean(
        NOCODE_LEADS_USER_ID,
      )}. Lead NOT written to DB; falling through to webhook/echo.`,
    );
  } else {
    const moduleTitle = isBrochure ? BROCHURE_MODULE : APPLY_MODULE;
    const url = `${NOCODE_BASE}/api/public/data/${NOCODE_APP_ID}/${NOCODE_ORG_ID}/${encodeURIComponent(
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

      const leadId = (data as { data?: { id?: number } })?.data?.id;

      // Off the response path: the doctor sees the form succeed immediately
      // while the payment link is created and the email goes out.
      if (leadId) {
        void requestWelcomeEmail(leadId, { ...payload, intent });
      } else {
        console.error(
          "[leads] insert returned no lead id — no welcome email requested",
        );
      }
      void sendWhatsApp(intent, phone, firstName, payload.courseName ?? "", payload.brochureUrl);

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

  // No lead row means no lead id, and the welcome email is addressed by lead id
  // — so this path can only do WhatsApp.
  console.warn("[leads] echo path — welcome email skipped (lead was not stored)");
  void sendWhatsApp(intent, phone, firstName, payload.courseName ?? "", payload.brochureUrl);

  return NextResponse.json({
    ok: true,
    intent,
    id: `lead_${Date.now()}`,
    received: record,
  });
}
