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
/**
 * What happened when we asked the platform to welcome this lead.
 *
 * Returned to the browser so the outcome is visible in the console: this all
 * runs server-side, and on Vercel `console.log` only reaches the runtime logs,
 * which is no help to whoever is looking at the form.
 */
export interface WelcomeDiagnostic {
  /** false when we never got as far as calling the platform. */
  attempted: boolean;
  ok: boolean;
  status?: number;
  provider?: string;
  paymentLink?: boolean;
  reason?: string;
}

/** Long enough for a payment link plus a provider send, short enough that the
 *  form still returns inside a serverless function's default budget. */
const WELCOME_TIMEOUT_MS = 8000;

async function requestWelcomeEmail(
  leadId: number | string,
  payload: IncomingPayload,
): Promise<WelcomeDiagnostic> {
  if (!NOCODE_API_KEY) {
    const reason =
      "NOCODE_API_KEY not set on the server — create an API key in the platform and set it in the deployment's environment";
    console.error(`[leads/welcome] ${reason}`);
    return { attempted: false, ok: false, reason };
  }

  const url = `${NOCODE_BASE}/api/lom/leads/${leadId}/welcome`;
  console.log(`[leads/welcome] lead ${leadId}: POST → ${url}`);

  // Without a deadline a slow platform would hold the form open until the
  // function itself is killed, and the caller would learn nothing.
  const controller = new AbortController();
  const deadline = setTimeout(() => controller.abort(), WELCOME_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
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
      signal: controller.signal,
    });

    const body = (await res.json().catch(() => ({}))) as {
      payUrl?: string | null;
      email?: { sent?: boolean; provider?: string; reason?: string };
      error?: string;
      message?: string;
    };

    if (!res.ok || !body?.email?.sent) {
      const reason =
        body?.email?.reason ?? body?.error ?? body?.message ?? `status ${res.status}`;
      console.error(`[leads/welcome] lead ${leadId}: email not sent — ${reason}`);
      return { attempted: true, ok: false, status: res.status, reason };
    }

    console.log(
      `[leads/welcome] lead ${leadId}: sent via ${body.email.provider}` +
        (body.payUrl ? " with payment link" : " WITHOUT a payment link"),
    );
    return {
      attempted: true,
      ok: true,
      status: res.status,
      provider: body.email.provider,
      paymentLink: Boolean(body.payUrl),
    };
  } catch (err) {
    const reason =
      (err as Error)?.name === "AbortError"
        ? `no response from the platform within ${WELCOME_TIMEOUT_MS}ms`
        : ((err as Error)?.message ?? String(err));
    console.error(`[leads/welcome] lead ${leadId}: request failed — ${reason}`);
    return { attempted: true, ok: false, reason };
  } finally {
    clearTimeout(deadline);
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
): Promise<WelcomeDiagnostic> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM;

  if (!sid || !token || !from || sid.startsWith("YOUR_")) {
    const reason = "Twilio env not configured";
    console.warn(`[leads/whatsapp] ${reason} — skipping WhatsApp message`);
    return { attempted: false, ok: false, reason };
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
    const data = (await res.json().catch(() => ({}))) as { sid?: string; message?: string };
    if (!res.ok) {
      console.error(`[leads/whatsapp] Twilio error ${res.status}:`, data);
      return {
        attempted: true,
        ok: false,
        status: res.status,
        reason: data?.message ?? `status ${res.status}`,
      };
    }
    console.log(`[leads/whatsapp] WhatsApp sent to ${to} sid=${data.sid}`);
    return { attempted: true, ok: true, status: res.status };
  } catch (err) {
    const reason = (err as Error)?.message ?? String(err);
    console.error(`[leads/whatsapp] failed to send WhatsApp — ${reason}`);
    return { attempted: true, ok: false, reason };
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

      // Awaited, not fired and forgotten. A serverless function is frozen the
      // moment it responds, so work left running past the response is killed
      // before it reaches the platform — which is why this worked in `next dev`
      // and never ran once deployed.
      let welcome: WelcomeDiagnostic;
      if (leadId) {
        welcome = await requestWelcomeEmail(leadId, { ...payload, intent });
      } else {
        const reason = "the insert returned no lead id, and the welcome is addressed by lead id";
        console.error(`[leads] ${reason} — no welcome email requested`);
        welcome = { attempted: false, ok: false, reason };
      }

      const whatsapp = await sendWhatsApp(
        intent,
        phone,
        firstName,
        payload.courseName ?? "",
        payload.brochureUrl,
      );

      return NextResponse.json({ ok: true, intent, data, leadId: leadId ?? null, welcome, whatsapp });
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
  const echoReason = "echo path — the lead was never stored, so there is no lead id to welcome";
  console.warn(`[leads] ${echoReason}`);
  const whatsapp = await sendWhatsApp(
    intent,
    phone,
    firstName,
    payload.courseName ?? "",
    payload.brochureUrl,
  );

  return NextResponse.json({
    ok: true,
    intent,
    id: `lead_${Date.now()}`,
    received: record,
    welcome: { attempted: false, ok: false, reason: echoReason } satisfies WelcomeDiagnostic,
    whatsapp,
  });
}
