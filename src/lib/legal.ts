/**
 * Single source of truth for everything the legal pages have to name.
 *
 * Razorpay's website checks — and India's IT Rules, 2011 / SPDI Rules and the
 * Consumer Protection (E-Commerce) Rules, 2020 — all want a *named* entity with
 * a real postal address and a reachable grievance officer. Those details live
 * here rather than inside the page copy so there is exactly one place to edit,
 * and no chance of the address on /privacy drifting from the one on /contact.
 *
 * Each value can be overridden from the environment (see .env.example, the
 * LEGAL_* keys) so the entity details can be changed without a code edit. The
 * literal below each `fromEnv` call is the live fallback, NOT a placeholder:
 * if the env var is missing or blank, the page still renders the correct
 * registered details rather than the word "undefined". Only override an env
 * key when the value genuinely needs to differ from what ships in this file.
 *
 * ⚠️ These pages are statically rendered, so changing an env var needs a
 * redeploy to take effect on the live site.
 *
 * ⚠️ TODO — the values still marked TODO below are placeholders and BLOCK
 * Razorpay activation. Razorpay rejects placeholder text, and a policy naming
 * no grievance officer is not compliant with Rule 5(9) of the SPDI Rules.
 */

/** Use the env value when it is set and non-blank, otherwise the shipped default. */
function fromEnv(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : fallback;
}

/**
 * Address lines come through the environment as one string, pipe-separated,
 * because env vars cannot hold arrays:
 *   LEGAL_REGISTERED_ADDRESS="#714A, Suite No. 30J|Spencer Plaza…|Chennai…"
 */
function addressFromEnv(value: string | undefined, fallback: string[]): string[] {
  const lines = (value ?? "")
    .split("|")
    .map((line) => line.trim())
    .filter(Boolean);
  return lines.length > 0 ? lines : fallback;
}

export const LEGAL = {
  /** Registered name of the company as it appears on the certificate of incorporation. */
  entityName: fromEnv(process.env.LEGAL_ENTITY_NAME, "Medxpanse Private Limited"),

  /** The consumer-facing brand. */
  brandName: fromEnv(process.env.LEGAL_BRAND_NAME, "Legends of Medicine"),

  /** Full registered address, including PIN code. Razorpay verifies this. */
  registeredAddress: addressFromEnv(process.env.LEGAL_REGISTERED_ADDRESS, [
    "#714A, Suite No. 30J",
    "Spencer Plaza, Phase II, 7th Floor",
    "#769, Anna Salai, Thousand Lights",
    "Chennai – 600002, Tamil Nadu, India",
  ]),

  /** TODO — confirm each of these is monitored before going live. */
  supportEmail: fromEnv(
    process.env.LEGAL_SUPPORT_EMAIL,
    "admissions@legendsofmedicine.com",
  ),
  privacyEmail: fromEnv(
    process.env.LEGAL_PRIVACY_EMAIL,
    "TODO — privacy@legendsofmedicine.com",
  ),

  /** A working number with a stated answering window. Razorpay requires a phone number. */
  supportPhone: fromEnv(process.env.LEGAL_SUPPORT_PHONE, "+91 88701 05999"),
  supportHours: fromEnv(
    process.env.LEGAL_SUPPORT_HOURS,
    "Monday to Friday, 10:00 – 18:00 IST",
  ),

  /**
   * Rule 5(9) of the SPDI Rules requires a named grievance officer whose name
   * and contact details are published on the website.
   */
  grievanceOfficer: {
    name: fromEnv(process.env.LEGAL_GRIEVANCE_NAME, "TODO — Full Name"),
    designation: fromEnv(
      process.env.LEGAL_GRIEVANCE_DESIGNATION,
      "Grievance Officer",
    ),
    email: fromEnv(
      process.env.LEGAL_GRIEVANCE_EMAIL,
      "TODO — grievance@legendsofmedicine.com",
    ),
    responseWindow: "30 days",
  },

  /**
   * Shown as "Last updated" on every policy page. Bump this by hand whenever the
   * text changes materially — an auto-generated date would silently claim the
   * policy was reviewed on every deploy, which is worse than a stale date.
   */
  lastUpdated: fromEnv(process.env.LEGAL_LAST_UPDATED, "20 August 2026"),

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
   * customer is entitled to whichever is more generous. Deliberately NOT
   * env-driven for that reason — it must match code in another repo.
   */
  defaultRefundWindowDays: 7,
} as const;

/** "TODO — City, State" → true. Used to flag unfilled values visibly in dev. */
export function isPlaceholder(value: string): boolean {
  return value.trim().startsWith("TODO");
}
