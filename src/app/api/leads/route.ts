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
  brochureUrl?: string;
  intent?: Intent;
  source?: string;
}

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

function buildApplyEmail(firstName: string, courseName: string) {
  const subject = `Welcome to OphthaXP${courseName ? ` — ${courseName}` : ""}`;
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
              We've received your application.
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
              Thank you for applying${courseName ? ` for <strong style="color:#a88251;">${courseName}</strong>` : " to OphthaXP"}. Our team will review your application and reach out shortly to schedule your discovery call.
            </p>
            <p style="margin:0 0 32px;font-size:15px;color:rgba(255,255,255,0.7);line-height:1.7;">
              While you wait, feel free to explore our programs and learn more about what makes OphthaXP unique — small cohorts, world-class mentors, and hands-on surgical training.
            </p>

            <!-- CTA -->
            <table cellpadding="0" cellspacing="0"><tr><td>
              <a href="https://ophthaxp.com/programs"
                 style="display:inline-block;background:#a88251;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:14px 28px;border-radius:8px;letter-spacing:0.03em;">
                Explore Programs →
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
              You received this email because you applied on ophthaxp.com.
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
) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn("[leads/email] SMTP_USER or SMTP_PASS not set — skipping welcome email");
    return;
  }
  const { subject, html } =
    intent === "brochure"
      ? buildBrochureEmail(firstName, courseName, brochureUrl ?? "")
      : buildApplyEmail(firstName, courseName);

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

      // send welcome email after successful DB insert (non-blocking)
      void sendWelcomeEmail(
        intent,
        email,
        firstName,
        payload.courseName ?? "",
        payload.brochureUrl,
      );

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

  // send welcome email for webhook/echo path too
  void sendWelcomeEmail(
    intent,
    email,
    firstName,
    payload.courseName ?? "",
    payload.brochureUrl,
  );

  return NextResponse.json({
    ok: true,
    intent,
    id: `lead_${Date.now()}`,
    received: record,
  });
}
