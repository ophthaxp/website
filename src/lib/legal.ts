/**
 * Single source of truth for everything the legal pages have to name.
 *
 * Razorpay's website checks — and India's IT Rules, 2011 / SPDI Rules and the
 * Consumer Protection (E-Commerce) Rules, 2020 — all want a *named* entity with
 * a real postal address and a reachable grievance officer. Those details live
 * here rather than inside the page copy so there is exactly one place to edit
 * when the paperwork is final, and no chance of the address on /privacy drifting
 * from the one on /contact.
 *
 * ⚠️ TODO — every value marked TODO below is a placeholder. Replace all of them
 * BEFORE submitting the site to Razorpay for activation. Razorpay rejects
 * placeholder text, and a policy naming the wrong entity is not a policy.
 */

export const LEGAL = {
  /** Registered name of the company as it appears on the certificate of incorporation. */
  entityName: "TODO — Registered Entity Pvt. Ltd.",

  /** The consumer-facing brand. Safe to leave as-is. */
  brandName: "Legends of Medicine",

  /** TODO — full registered address, including PIN code. Razorpay verifies this. */
  registeredAddress: [
    "TODO — Building / Street",
    "TODO — Area",
    "TODO — City, State",
    "TODO — PIN code, India",
  ],

  /** TODO — confirm each of these is monitored before going live. */
  supportEmail: "admissions@legendsofmedicine.com",
  privacyEmail: "TODO — privacy@legendsofmedicine.com",

  /** TODO — a working number with a stated answering window. Razorpay requires a phone number. */
  supportPhone: "TODO — +91 XXXXX XXXXX",
  supportHours: "Monday to Friday, 10:00 – 18:00 IST",

  /**
   * Rule 5(9) of the SPDI Rules requires a named grievance officer whose name
   * and contact details are published on the website.
   */
  grievanceOfficer: {
    name: "TODO — Full Name",
    designation: "Grievance Officer",
    email: "TODO — grievance@legendsofmedicine.com",
    responseWindow: "30 days",
  },

  /**
   * Shown as "Last updated" on every policy page. Bump this by hand whenever the
   * text changes materially — an auto-generated date would silently claim the
   * policy was reviewed on every deploy, which is worse than a stale date.
   */
  lastUpdated: "20 August 2026",

  /**
   * Fallback money-back window, in days, counted from the COHORT START DATE.
   *
   * This is a floor, not the promise. Each course row carries its own
   * `moneyBackDays`, and that is what the selection email interpolates into
   * "a full refund is available within N days of the cohort start date". The
   * platform falls back to this same 7 when a course has not set one
   * (nocode-backend: enrollment.service.ts, DEFAULT_REFUND_WINDOW_DAYS).
   *
   * ⚠️ Keep this number equal to the platform's default. If the two drift, the
   * website promises one window and the email promises another, and the
   * customer is entitled to whichever is more generous.
   */
  defaultRefundWindowDays: 7,
} as const;

/** "TODO — City, State" → true. Used to flag unfilled values visibly in dev. */
export function isPlaceholder(value: string): boolean {
  return value.trim().startsWith("TODO");
}
