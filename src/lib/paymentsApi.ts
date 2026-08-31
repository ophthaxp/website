/**
 * Taking the booking fee.
 *
 * The money itself is the platform's business, not this site's. The
 * organization connects a payment provider once, in the admin console, and
 * everything here goes through `/api/payments` on the platform — so no
 * provider key, no provider SDK and no card detail ever comes near the
 * website or the browser.
 *
 * Two calls make the whole flow:
 *
 *   checkout  - create a hosted checkout session for this application and
 *               send the Star to it.
 *   read back - ask the platform whether money actually arrived for this
 *               lead, which is the only thing allowed to confirm a booking.
 *
 * The browser coming back from the gateway proves nothing — a Star can close
 * the tab on a successful payment, or land on the return URL without paying at
 * all. So the return is only a nudge to look; `findPaidPaymentForLead` is the
 * answer. It reads the payments the provider's webhook wrote, which is the
 * same record the finance side of the platform reconciles against.
 *
 * Nothing here is reachable from the browser: every caller is a route handler
 * that has already checked the session cookie.
 */

const BASE = process.env.NOCODE_API_BASE_URL || "";
const APP_ID = process.env.NOCODE_APP_ID || "";
const ORG_ID = process.env.NOCODE_ORG_ID || "";
const API_KEY = process.env.NOCODE_API_KEY || "";
const APPLY_LEADS_MODULE =
  process.env.NOCODE_APPLY_LEADS_MODULE || "ophthaxp_apply_leads";

/** A gateway can be slow to answer; a Star waiting on a redirect cannot. */
const TIMEOUT_MS = 15000;

/**
 * Statuses that mean the money is in.
 *
 * Mirrors `PAID_STATUSES` in the platform's payment.records.handler. The
 * payments module is customer-editable, so this cannot be exhaustive — but a
 * status we do not recognise must never confirm a call, which is why the test
 * is an allow-list rather than "anything but failed".
 */
const PAID_STATUSES = ["succeeded", "collected"];

export function isPaymentConfigured(): boolean {
  return Boolean(BASE && APP_ID && ORG_ID && API_KEY);
}

/**
 * The booking fee, in rupees.
 *
 * Null when it is unset or nonsense, which the caller must treat as "we cannot
 * charge for this" rather than as free. A zero fee would send somebody to a
 * gateway for nothing; a missing one would let an unpaid call be confirmed.
 */
export function exploratoryFeeInr(): number | null {
  const raw = Number(process.env.APPLY_EXPLORATORY_FEE_INR);
  return Number.isFinite(raw) && raw > 0 ? Math.round(raw) : null;
}

function headers(): Record<string, string> {
  return {
    "content-type": "application/json",
    "x-api-key": API_KEY,
    "app-id": APP_ID,
    "org-id": ORG_ID,
  };
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

/**
 * The numeric id of a module we only know by name.
 *
 * A payment is linked to the record it was collected for by module id and row
 * id — the platform's `related_module_id` / `related_record_id`, which is what
 * puts a payment on a lead's timeline and what the enrollment sync reads to
 * move that lead to `call_fee_paid`. The website addresses modules by title
 * everywhere else, so the id has to be looked up.
 *
 * A read through the public data API answers it: the envelope carries `tId`
 * alongside the rows. Cached for the life of the server process — a module's
 * id does not change, and this sits in the path of a checkout.
 */
const moduleIdCache = new Map<string, number>();

export async function resolveModuleId(title: string): Promise<number | null> {
  const cached = moduleIdCache.get(title);
  if (cached) return cached;

  const url = `${BASE}/api/public/data/${APP_ID}/${ORG_ID}/${encodeURIComponent(
    title,
  )}?limit=1`;

  try {
    return await withTimeout(async (signal) => {
      const res = await fetch(url, {
        headers: { "content-type": "application/json" },
        signal,
        cache: "no-store",
      });
      if (!res.ok) {
        console.error(`[payments] module id lookup for "${title}" failed status=${res.status}`);
        return null;
      }

      const body = (await res.json().catch(() => ({}))) as { data?: { tId?: unknown } };
      const id = Number(body?.data?.tId);
      if (!Number.isInteger(id) || id <= 0) {
        console.error(`[payments] module "${title}" returned no usable tId`);
        return null;
      }

      moduleIdCache.set(title, id);
      return id;
    });
  } catch (err) {
    console.error(`[payments] module id lookup for "${title}" threw`, err);
    return null;
  }
}

export interface CheckoutSession {
  url: string;
  sessionId: string;
  provider: string;
}

export interface CheckoutInput {
  /** The lead this fee belongs to. The payment hangs off it, not off the application. */
  leadId: number;
  starName: string;
  starEmail: string;
  courseId: string;
  courseName: string;
  successUrl: string;
  cancelUrl: string;
}

/**
 * A hosted checkout for one application's booking fee.
 *
 * The metadata is the whole reason this works after the redirect. It travels
 * out to the provider, comes back on the webhook, and is what lets the
 * platform write the payment against the right lead and move that lead on:
 *
 *   relatedModuleId / relatedRecordId - puts the payment on the lead.
 *   paymentPurpose: 'exploratory'     - marks it as the call fee, so the
 *                                       enrollment sync advances the lead to
 *                                       `call_fee_paid` instead of enrolling
 *                                       somebody no Legend has selected yet.
 *
 * Both names are the platform's (`LINK_METADATA_KEYS`,
 * `ENROLLMENT_METADATA_KEYS`); renaming either side alone would quietly
 * detach every payment from its doctor.
 */
export async function createExploratoryCheckout(
  input: CheckoutInput,
): Promise<{ ok: true; data: CheckoutSession } | { ok: false; error: string }> {
  const feeInr = exploratoryFeeInr();
  if (!isPaymentConfigured() || !feeInr) {
    console.error(
      "[payments] cannot create a checkout — " +
        `configured=${isPaymentConfigured()} fee=${process.env.APPLY_EXPLORATORY_FEE_INR ?? "unset"}`,
    );
    return { ok: false, error: "Payments are not available right now." };
  }

  const leadModuleId = await resolveModuleId(APPLY_LEADS_MODULE);
  if (!leadModuleId) {
    // Without the link the payment would arrive as an orphan: real money, no
    // doctor attached, and a lead that never moves. Better to refuse.
    return { ok: false, error: "Payments are not available right now." };
  }

  try {
    return await withTimeout(async (signal) => {
      const res = await fetch(`${BASE}/api/payments/checkout`, {
        method: "POST",
        headers: headers(),
        signal,
        cache: "no-store",
        body: JSON.stringify({
          // Providers work in the minor unit; the configured fee is in rupees.
          amount: feeInr * 100,
          currency: "INR",
          appId: APP_ID,
          organizationId: ORG_ID,
          description: input.courseName
            ? `Booking fee — ${input.courseName}`
            : "Legends of Medicine booking fee",
          successUrl: input.successUrl,
          cancelUrl: input.cancelUrl,
          relatedModuleId: leadModuleId,
          relatedRecordId: input.leadId,
          relatedLabel: input.starName,
          metadata: {
            paymentPurpose: "exploratory",
            courseId: input.courseId,
            courseName: input.courseName,
            studentName: input.starName,
            studentEmail: input.starEmail,
          },
        }),
      });

      const body = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        url?: string;
        sessionId?: string;
        provider?: string;
        error?: string;
      };

      if (!res.ok || !body?.url) {
        const reason = body?.error || `status ${res.status}`;
        console.error(`[payments] checkout refused for lead ${input.leadId} — ${reason}`);
        return {
          ok: false as const,
          error: "We could not open the payment page just now. Please try again.",
        };
      }

      return {
        ok: true as const,
        data: {
          url: body.url,
          sessionId: body.sessionId ?? "",
          provider: body.provider ?? "unknown",
        },
      };
    });
  } catch (err) {
    const reason = (err as Error)?.name === "AbortError" ? "timed out" : (err as Error)?.message;
    console.error(`[payments] checkout failed for lead ${input.leadId} — ${reason}`);
    return { ok: false, error: "The payment page is not responding. Please try again." };
  }
}

export interface PaymentRecord {
  id: number;
  /** What to quote to support, and what is written onto the appointment. */
  reference: string;
  /** Rupees, not paise — the platform stores money in the major unit. */
  amountPaid: number;
  /** How much of it has come back. 0 for the overwhelming majority. */
  refundedAmount: number;
  currency: string;
  status: string;
  /** 'razorpay', 'cash', … — how it was taken. */
  method: string;
  /** ISO, or empty when the module has no date on the row. */
  paidAt: string;
  description: string;
}

/** True of a status that means the money is in. */
export function isPaidStatus(status: string): boolean {
  return PAID_STATUSES.includes(String(status).toLowerCase());
}

/**
 * Every payment recorded against this lead, newest first.
 *
 * Not only the successful ones: a failed attempt is worth showing a doctor who
 * is wondering why their card statement has a pending line on it, and a refund
 * is worth showing whether or not anyone asked. The platform returns the
 * refunded total per payment, so a part refund reads correctly too.
 *
 * An empty list is also what a failure returns. Every caller treats that as
 * "nothing to show" rather than as "nothing was paid" — nothing here is
 * allowed to be the reason a booking is or is not confirmed except
 * `findPaidPaymentForLead` below.
 */
export async function listPaymentsForLead(leadId: number): Promise<PaymentRecord[]> {
  if (!isPaymentConfigured()) return [];

  const leadModuleId = await resolveModuleId(APPLY_LEADS_MODULE);
  if (!leadModuleId) return [];

  const params = new URLSearchParams({
    moduleId: String(leadModuleId),
    recordId: String(leadId),
    appId: APP_ID,
    limit: "20",
  });

  try {
    return await withTimeout(async (signal) => {
      const res = await fetch(`${BASE}/api/payments/by-record?${params.toString()}`, {
        headers: headers(),
        signal,
        cache: "no-store",
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        console.error(`[payments] lead ${leadId} payment lookup failed status=${res.status} ${text}`);
        return [];
      }

      const body = (await res.json().catch(() => ({}))) as {
        payments?: Array<{
          id?: number;
          status?: string;
          amountPaid?: number | string;
          refundedAmount?: number | string;
          currency?: string;
          paymentMethod?: string;
          paymentReference?: string;
          transactionId?: string;
          transactionDate?: string;
          collectedDate?: string;
          createdAt?: string;
          description?: string;
        }>;
      };

      return (body.payments ?? []).map((payment) => ({
        id: Number(payment.id),
        reference: String(
          payment.paymentReference || payment.transactionId || `payment_${payment.id}`,
        ),
        amountPaid: Number(payment.amountPaid ?? 0),
        refundedAmount: Number(payment.refundedAmount ?? 0),
        currency: String(payment.currency ?? "INR"),
        status: String(payment.status ?? ""),
        method: String(payment.paymentMethod ?? ""),
        paidAt: String(payment.transactionDate || payment.collectedDate || payment.createdAt || ""),
        description: String(payment.description ?? ""),
      }));
    });
  } catch (err) {
    const reason = (err as Error)?.name === "AbortError" ? "timed out" : (err as Error)?.message;
    console.error(`[payments] lead ${leadId} payment lookup threw — ${reason}`);
    return [];
  }
}

/**
 * Has this lead actually paid?
 *
 * The one question that may confirm a booking. It reads the payments the
 * provider's webhook wrote against the lead, so it is true whether the Star
 * came back to the site or closed the tab on the receipt page.
 *
 * A refund is not subtracted here. The window between paying and sitting the
 * call is short, and a refunded call is a support conversation rather than
 * something to unbook underneath somebody.
 */
export async function findPaidPaymentForLead(leadId: number): Promise<PaymentRecord | null> {
  const payments = await listPaymentsForLead(leadId);
  return payments.find((payment) => isPaidStatus(payment.status)) ?? null;
}
