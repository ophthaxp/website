/**
 * The WhatsApp acknowledgement sent when an application is submitted.
 *
 * Deliberately a copy of the sender inside `/api/leads`, not a refactor of it.
 * That route still serves the brochure flow and the old apply path, and a live
 * funnel is a poor place to find out a shared helper drifted. If the two ever
 * need to change together, converging them is a small job — this exists so the
 * new flow can stop calling that route without losing the message.
 */

export interface WhatsAppOutcome {
  /** False when we never got as far as calling Twilio. */
  attempted: boolean;
  ok: boolean;
  status?: number;
  reason?: string;
}

/** Normalise to E.164. Handles Indian 10-digit numbers automatically. */
function toE164(raw: string): string {
  const digits = raw.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) return digits;
  if (digits.length === 10 && /^[6-9]/.test(digits)) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return `+${digits}`;
  return `+${digits}`;
}

function applyMessage(firstName: string, courseName: string): string {
  return (
    `Hi ${firstName}! 👋\n\n` +
    `Thank you for applying${courseName ? ` for *${courseName}*` : " to Legends of Medicine"}.\n\n` +
    `Your application is with our team. The next step is picking a time with your Legend — ` +
    `you can do that from your application page.\n\n` +
    `— Team Legends of Medicine`
  );
}

export async function sendApplyWhatsApp(input: {
  phone: string;
  firstName: string;
  courseName?: string;
}): Promise<WhatsAppOutcome> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM;

  if (!sid || !token || !from || sid.startsWith("YOUR_")) {
    const reason = "Twilio env not configured";
    console.warn(`[apply/whatsapp] ${reason} — skipping`);
    return { attempted: false, ok: false, reason };
  }

  const to = `whatsapp:${toE164(input.phone)}`;
  const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
  const creds = Buffer.from(`${sid}:${token}`).toString("base64");

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${creds}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        From: from,
        To: to,
        Body: applyMessage(input.firstName, input.courseName ?? ""),
      }).toString(),
    });

    const data = (await res.json().catch(() => ({}))) as {
      sid?: string;
      message?: string;
    };

    if (!res.ok) {
      console.error(`[apply/whatsapp] Twilio error ${res.status}:`, data);
      return {
        attempted: true,
        ok: false,
        status: res.status,
        reason: data?.message ?? `status ${res.status}`,
      };
    }

    console.log(`[apply/whatsapp] sent to ${to} sid=${data.sid}`);
    return { attempted: true, ok: true, status: res.status };
  } catch (err) {
    const reason = (err as Error)?.message ?? String(err);
    console.error(`[apply/whatsapp] failed — ${reason}`);
    return { attempted: true, ok: false, reason };
  }
}
