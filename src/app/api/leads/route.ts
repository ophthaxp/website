import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

const NOCODE_BASE = process.env.NOCODE_API_BASE_URL || "";
const NOCODE_APP_ID = process.env.NOCODE_APP_ID || "";
const NOCODE_ORG_ID = process.env.NOCODE_ORG_ID || "";
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
  mentorName?: string;
  payUrl?: string;
  brochureUrl?: string;
  intent?: Intent;
  source?: string;
}

// Contact / payment configuration for the apply-welcome email.
// Override any of these via env to point at the real concierge desk.
const APPLY_CONFIG = {
  feeInr: Number(process.env.APPLY_EXPLORATORY_FEE_INR ?? 10000),
  payUrlDefault: process.env.APPLY_PAY_URL || "",
  contactPhone: process.env.APPLY_CONTACT_PHONE || "1-800-123-4567",
  contactWhatsapp: process.env.APPLY_CONTACT_WHATSAPP || "99887 76655",
  contactEmail: process.env.APPLY_CONTACT_EMAIL || "admissions@ophthaxp.com",
  contactAddress:
    process.env.APPLY_CONTACT_ADDRESS || "123 Anywhere St., Any City, ST 12345",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "https://ophthaxp.com",
};

// ─── email helpers ────────────────────────────────────────────────────────────

function getTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

function buildApplyEmail(
  firstName: string,
  _courseName: string,
  mentorName: string,
  payUrl: string,
) {
  const mentor = mentorName?.trim() || "your mentor";
  const mentorShort = mentor.replace(/^Dr\.?\s+/i, "Dr. ");
  const feeFmt = new Intl.NumberFormat("en-IN").format(APPLY_CONFIG.feeInr);
  const siteUrl = APPLY_CONFIG.siteUrl.replace(/\/$/, "");
  const unsubscribeUrl = `${siteUrl}/unsubscribe?email=`;
  const preferencesUrl = `${siteUrl}/preferences`;
  const viewInBrowserUrl = `${siteUrl}/email/welcome`;

  const subject = `Welcome to OphthaXP — Next step: exploratory call with ${mentorShort}`;

  // CTA: prefer a real pay URL; if missing, point at the program details page
  const ctaHref = payUrl?.trim() || `${siteUrl}/programs`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#eeeef1;font-family:Georgia,'Times New Roman',serif;color:#1a1a1a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#eeeef1;padding:24px 0;">
    <tr><td align="center">

      <!-- Outer card -->
      <table role="presentation" width="640" cellpadding="0" cellspacing="0" border="0" style="max-width:640px;width:100%;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 1px 0 rgba(0,0,0,0.04);">

        <!-- Hero -->
        <tr>
          <td align="center" style="background:#0a0a0d;background-image:radial-gradient(ellipse at 18% 30%,#5a3f1c 0%,#2a1e0e 30%,#0a0a0d 75%);padding:64px 32px;">
            <!-- Logo -->
            <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:36px;line-height:1;letter-spacing:-0.5px;font-weight:700;">
              <span style="color:#ffffff;">ophtha</span><span style="display:inline-block;background:#b58c52;color:#0a0a0d;padding:2px 10px 4px;border-radius:6px;margin-left:2px;">XP</span>
            </p>

            <p style="margin:28px 0 0;font-size:18px;color:#ebe2cf;font-style:italic;">
              Welcomes you to the
            </p>

            <h1 style="margin:14px 0 0;font-size:44px;line-height:1.15;color:#f5e9cf;font-weight:400;letter-spacing:0.5px;">
              Pursuit of Mastery
            </h1>

            <p style="margin:36px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:22px;color:#b58c52;font-weight:700;letter-spacing:0.5px;">
              with
            </p>
            <p style="margin:4px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:26px;color:#b58c52;font-weight:700;letter-spacing:0.5px;">
              ${mentorShort}
            </p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:36px 48px 12px;">
            <p style="margin:0 0 18px;font-size:18px;font-weight:700;color:#1a1a1a;">
              Dear Dr. ${firstName || "Candidate"},
            </p>
            <p style="margin:0;font-size:15px;line-height:1.65;color:#1a1a1a;">
              Congratulations on taking the first step; we received your application.
            </p>
          </td>
        </tr>

        <tr>
          <td style="padding:32px 48px 0;">
            <p style="margin:0;font-size:16px;line-height:1.65;color:#1a1a1a;font-weight:700;text-align:center;">
              As the next step, we are thrilled to invite you for an exploratory<br>
              conversation with ${mentorShort}.
            </p>
            <p style="margin:18px 0 0;font-size:15px;line-height:1.65;color:#1a1a1a;text-align:center;">
              The interaction is intended to evaluate mutual fit &mdash;
            </p>
            <p style="margin:14px 0 0;font-size:15px;line-height:1.65;color:#1a1a1a;text-align:center;">
              helping you assess the program&rsquo;s relevance to your long-term clinical aspirations, while enabling the mentor to evaluate your candidature for admission into the cohort.
            </p>
          </td>
        </tr>

        <!-- Divider -->
        <tr>
          <td style="padding:32px 48px 0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr><td style="border-top:1px solid #d8d8dc;font-size:0;line-height:0;">&nbsp;</td></tr>
            </table>
          </td>
        </tr>

        <!-- Pay block -->
        <tr>
          <td align="center" style="padding:28px 48px 8px;">
            <p style="margin:0;font-size:17px;line-height:1.5;color:#1a1a1a;text-align:center;">
              Book your exclusive exploratory interaction<br>
              with the Legend
            </p>
            <p style="margin:24px 0 18px;font-family:Arial,Helvetica,sans-serif;font-size:22px;color:#1a1a1a;font-weight:700;">
              Rs. ${feeFmt}
            </p>
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="background:#1ec5b9;border-radius:999px;">
                  <a href="${ctaHref}"
                     style="display:inline-block;padding:14px 56px;font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;color:#ffffff;text-decoration:none;letter-spacing:0.3px;">
                    Pay
                  </a>
                </td>
              </tr>
            </table>
            <p style="margin:24px 0 0;font-size:14px;line-height:1.5;color:#1a1a1a;font-weight:700;text-align:center;">
              The fee paid for the exploratory call will be adjusted against<br>
              the course fee.
            </p>
          </td>
        </tr>

        <!-- spacer -->
        <tr><td style="height:32px;font-size:0;line-height:0;">&nbsp;</td></tr>

        <!-- Footer (dark) -->
        <tr>
          <td style="background:#0a0a0d;padding:32px 48px;color:#ffffff;font-family:Arial,Helvetica,sans-serif;">
            <p style="margin:0 0 14px;font-size:20px;font-weight:700;color:#ffffff;">
              Admissions Concierge
            </p>
            <p style="margin:0;font-size:14px;line-height:1.7;color:#e8e8ea;">
              Call us at <strong style="color:#ffffff;">${APPLY_CONFIG.contactPhone}</strong>,<br>
              Whatsapp: ${APPLY_CONFIG.contactWhatsapp}<br>
              <a href="mailto:${APPLY_CONFIG.contactEmail}" style="color:#e8e8ea;text-decoration:none;">${APPLY_CONFIG.contactEmail}</a>
            </p>

            <p style="margin:24px 0 0;font-size:12px;line-height:1.7;color:#bdbdc2;">
              No longer want these emails?
              <a href="${unsubscribeUrl}" style="color:#bdbdc2;text-decoration:underline;">Unsubscribe</a>,
              <a href="${preferencesUrl}" style="color:#bdbdc2;text-decoration:underline;">update preferences</a>, or
              <a href="${viewInBrowserUrl}" style="color:#bdbdc2;text-decoration:underline;">view in browser.</a><br>
              ${APPLY_CONFIG.contactAddress}
            </p>
          </td>
        </tr>

      </table>

    </td></tr>
  </table>
</body>
</html>`;
  return { subject, html };
}

function buildBrochureEmail(firstName: string, courseName: string, brochureUrl: string) {
  const subject = `Your OphthaXP brochure${courseName ? ` — ${courseName}` : ""} is here`;
  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${subject}</title></head>
<body style="margin:0;padding:0;background:#0a0a0d;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0d;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#0f0f12;border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,0.08);max-width:600px;width:100%;">

        <!-- header -->
        <tr>
          <td style="background:linear-gradient(135deg,#1a1408 0%,#0f0f12 100%);padding:40px 40px 32px;border-bottom:1px solid rgba(168,130,81,0.2);">
            <p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:0.22em;text-transform:uppercase;color:#a88251;">OphthaXP</p>
            <h1 style="margin:0;font-size:28px;font-weight:700;color:#ffffff;line-height:1.2;">
              Your brochure is ready.
            </h1>
          </td>
        </tr>

        <!-- body -->
        <tr>
          <td style="padding:36px 40px;">
            <p style="margin:0 0 20px;font-size:16px;color:rgba(255,255,255,0.85);line-height:1.6;">
              Hi <strong style="color:#ffffff;">${firstName}</strong>,
            </p>
            <p style="margin:0 0 20px;font-size:15px;color:rgba(255,255,255,0.7);line-height:1.7;">
              Here is the brochure you requested${courseName ? ` for <strong style="color:#a88251;">${courseName}</strong>` : ""}. Click the button below to download it.
            </p>
            <p style="margin:0 0 32px;font-size:15px;color:rgba(255,255,255,0.7);line-height:1.7;">
              Have questions? Our team is happy to walk you through the program. Apply today and take the next step in your ophthalmic career.
            </p>

            <!-- CTA -->
            <table cellpadding="0" cellspacing="0" style="margin-bottom:16px;"><tr><td>
              <a href="${brochureUrl}"
                 style="display:inline-block;background:#a88251;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:14px 28px;border-radius:8px;letter-spacing:0.03em;">
                Download Brochure →
              </a>
            </td></tr></table>
          </td>
        </tr>

        <!-- divider -->
        <tr><td style="padding:0 40px;"><hr style="border:none;border-top:1px solid rgba(255,255,255,0.06);margin:0;"></td></tr>

        <!-- footer -->
        <tr>
          <td style="padding:28px 40px;text-align:center;">
            <p style="margin:0;font-size:12px;color:rgba(255,255,255,0.3);line-height:1.6;">
              © ${new Date().getFullYear()} OphthaXP. All rights reserved.<br>
              You received this email because you requested a brochure on ophthaxp.com.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
  return { subject, html };
}

async function sendWelcomeEmail(
  intent: Intent,
  to: string,
  firstName: string,
  courseName: string,
  brochureUrl?: string,
  mentorName?: string,
  payUrl?: string,
) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn("[leads/email] SMTP_USER or SMTP_PASS not set — skipping welcome email");
    return;
  }
  const { subject, html } =
    intent === "brochure"
      ? buildBrochureEmail(firstName, courseName, brochureUrl ?? "")
      : buildApplyEmail(
          firstName,
          courseName,
          mentorName ?? "",
          payUrl || APPLY_CONFIG.payUrlDefault,
        );

  try {
    const transporter = getTransporter();
    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject,
      html,
    });
    console.log(`[leads/email] welcome email sent to ${to} (${intent})`);
  } catch (err) {
    console.error("[leads/email] failed to send welcome email:", err);
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
    `Thank you for applying${courseName ? ` for *${courseName}*` : " to OphthaXP"}.\n\n` +
    `Our team will review your application and reach out shortly to schedule your discovery call.\n\n` +
    `— Team OphthaXP`
  );
}

function buildBrochureWhatsApp(firstName: string, courseName: string, brochureUrl: string): string {
  return (
    `Hi ${firstName}! 👋\n\n` +
    `Here's the brochure you requested${courseName ? ` for *${courseName}*` : ""}:\n` +
    `${brochureUrl}\n\n` +
    `Feel free to reply if you have any questions. We'd love to tell you more!\n\n` +
    `— Team OphthaXP`
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

      // send welcome email + WhatsApp after successful DB insert (non-blocking)
      void sendWelcomeEmail(
        intent,
        email,
        firstName,
        payload.courseName ?? "",
        payload.brochureUrl,
        payload.mentorName ?? "",
        payload.payUrl ?? "",
      );
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

  // send welcome email + WhatsApp for webhook/echo path too
  void sendWelcomeEmail(
    intent,
    email,
    firstName,
    payload.courseName ?? "",
    payload.brochureUrl,
    payload.mentorName ?? "",
    payload.payUrl ?? "",
  );
  void sendWhatsApp(intent, phone, firstName, payload.courseName ?? "", payload.brochureUrl);

  return NextResponse.json({
    ok: true,
    intent,
    id: `lead_${Date.now()}`,
    received: record,
  });
}
