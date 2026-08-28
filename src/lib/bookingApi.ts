/**
 * Booking a call with a Legend.
 *
 * Talks to `/api/lom-booking` on the platform, which is where the slot maths
 * and the Google Calendar work live. Nothing here is reachable from the
 * browser: every caller is a route handler that has already checked the
 * session cookie.
 *
 * Why not the public data API, like applications? Because a bookable slot is
 * not a row. It is the Legend's published hours minus whatever is already in
 * their Google Calendar, worked out at the moment of asking — and the calendar
 * credential that requires must never come near the browser.
 */

const BASE = process.env.NOCODE_API_BASE_URL || "";
const API_KEY = process.env.NOCODE_API_KEY || "";
const APP_ID = process.env.NOCODE_APP_ID || "";
const ORG_ID = process.env.NOCODE_ORG_ID || "";

/** Google is on the other end of some of these; be patient, but not forever. */
const TIMEOUT_MS = 15000;

export interface Slot {
  start: string;
  end: string;
  label: string;
  timeZone: string;
  durationMinutes: number;
}

export interface SlotsResult {
  slots: Slot[];
  timeZone: string;
  /** False when the Legend's real calendar could not be consulted. */
  calendarChecked: boolean;
  notice?: string;
}

export interface Appointment {
  id: number;
  status: string;
  startsAt: string;
  endsAt: string;
  timeZone: string;
  /** Ready to show, e.g. "Mon, 1 Sep · 10:30 AM". */
  label: string;
  legendEmail: string;
  legendName?: string;
  courseName?: string;
  applicationId?: number;
  meetingUrl?: string;
}

export function isBookingConfigured(): boolean {
  return Boolean(BASE && API_KEY && APP_ID && ORG_ID);
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

interface Envelope<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

async function call<T>(
  path: string,
  init: RequestInit & { signal?: AbortSignal } = {},
): Promise<Envelope<T>> {
  if (!isBookingConfigured()) {
    console.error("[booking] platform env not set — NOCODE_API_BASE_URL / NOCODE_API_KEY");
    return { ok: false, error: "Booking is not available right now." };
  }

  try {
    return await withTimeout(async (signal) => {
      const res = await fetch(`${BASE}/api/lom-booking${path}`, {
        ...init,
        signal,
        headers: { ...headers(), ...(init.headers || {}) },
        cache: "no-store",
      });

      const body = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        message?: string;
        data?: T;
      };

      if (!res.ok || body.success === false) {
        // The platform's messages here are written for the person reading
        // them ("That time has just been taken"), so they are passed through
        // rather than flattened into a generic failure.
        return { ok: false, error: body.message || `Booking request failed (${res.status})` };
      }

      return { ok: true, data: body.data };
    });
  } catch (err) {
    const reason = (err as Error)?.name === "AbortError" ? "timed out" : (err as Error)?.message;
    console.error(`[booking] ${path} failed — ${reason}`);
    return { ok: false, error: "Booking is not responding just now. Please try again." };
  }
}

/** Times a Star can actually book with this Legend. */
export async function fetchSlots(input: {
  legendEmail: string;
  from?: string;
  to?: string;
}): Promise<Envelope<SlotsResult>> {
  const params = new URLSearchParams({ legendEmail: input.legendEmail });
  if (input.from) params.set("from", input.from);
  if (input.to) params.set("to", input.to);

  return call<SlotsResult>(`/slots?${params.toString()}`);
}

/**
 * Hold a slot while the Star pays for it.
 *
 * Nothing reaches the Legend's diary here — that happens at confirmSlot, once
 * the money has actually moved. The hold exists so the time stops being
 * offered to anyone else in the meantime.
 */
export async function bookSlot(input: {
  legendEmail: string;
  legendName?: string;
  starName: string;
  starEmail: string;
  starPhone?: string;
  courseId?: string;
  courseName?: string;
  applicationId?: number;
  leadId?: number;
  start: string;
  end: string;
  timeZone?: string;
}): Promise<Envelope<{ appointment: Appointment; calendarSynced: boolean }>> {
  return call(`/appointments`, {
    method: "POST",
    body: JSON.stringify({ ...input, source: "apply-flow" }),
  });
}

/** Payment went through — book it for real. */
export async function confirmSlot(input: {
  appointmentId: number;
  starEmail: string;
  paymentRef?: string;
}): Promise<Envelope<{ appointment: Appointment; calendarSynced: boolean }>> {
  return call(`/appointments/${input.appointmentId}/confirm`, {
    method: "POST",
    body: JSON.stringify({ starEmail: input.starEmail, paymentRef: input.paymentRef }),
  });
}

/** Checkout abandoned — hand the time back rather than waiting for the hold to lapse. */
export async function releaseSlot(input: {
  appointmentId: number;
  starEmail: string;
}): Promise<Envelope<{ appointment: Appointment }>> {
  return call(`/appointments/${input.appointmentId}/release`, {
    method: "POST",
    body: JSON.stringify({ starEmail: input.starEmail }),
  });
}

/**
 * The call attached to an application — held or booked.
 *
 * Both matter for resume: a Star who closed the tab at checkout should come
 * back to the slot they were paying for, not to an empty slot picker.
 */
export async function findAppointmentForApplication(
  applicationId: number,
): Promise<Appointment | null> {
  const result = await call<{ appointments: Appointment[] }>(
    `/appointments?applicationId=${applicationId}`,
  );

  const live = (result.data?.appointments ?? []).filter(
    (appointment) =>
      appointment.status === "confirmed" || appointment.status === "pending_payment",
  );

  // A confirmed call wins over a stale hold if both somehow exist.
  return live.find((a) => a.status === "confirmed") ?? live[0] ?? null;
}

export async function listAppointmentsForStar(starEmail: string): Promise<Appointment[]> {
  const result = await call<{ appointments: Appointment[] }>(
    `/appointments?starEmail=${encodeURIComponent(starEmail)}`,
  );

  return result.data?.appointments ?? [];
}

export async function cancelAppointment(input: {
  appointmentId: number;
  starEmail: string;
  reason?: string;
}): Promise<Envelope<{ appointment: Appointment }>> {
  return call(`/appointments/${input.appointmentId}/cancel`, {
    method: "POST",
    body: JSON.stringify({ starEmail: input.starEmail, reason: input.reason }),
  });
}
