/**
 * The two figures the ROI panel works out for itself.
 *
 * The backend model prices a single "patients treated" number at one average
 * selling price per specialty. It has no notion of an outpatient/inpatient
 * split and no fee inputs at all, so it cannot answer the question the panel
 * actually asks the reader — four numbers: how many of each, and what each is
 * worth. Population and disease burden stay the backend's; revenue and impact
 * are derived from the reader's own profile.
 *
 * The formulas live here, on their own, because three places need the same
 * answer: the panel that draws it, the browser copy of the outlook, and the
 * account copy written server-side. They used to be written once in the panel
 * and nowhere else, so the dashboard showed the backend's figures instead —
 * the same outlook reading ₹2.40 Cr on one screen and ₹1.50 Cr on the next.
 */

export interface PracticeProfile {
  annualOutpatients: number;
  opFeeInr: number;
  annualInpatients: number;
  ipFeeInr: number;
}

/** What the practice bills in a year: consultations plus admissions. */
export function practiceRevenue(profile: PracticeProfile): number {
  return (
    profile.annualOutpatients * profile.opFeeInr +
    profile.annualInpatients * profile.ipFeeInr
  );
}

/**
 * Share of the local disease burden this practice volume could reach.
 *
 * Everyone seen counts, outpatients included — reaching a patient is care,
 * whether or not they end up admitted. Capped at 100%: a practice cannot treat
 * more than all of them, and a burden of zero has no share to take.
 */
export function practiceImpactPct(
  profile: PracticeProfile,
  prevalenceCount: number,
): number {
  if (!prevalenceCount) return 0;
  const treated = profile.annualOutpatients + profile.annualInpatients;
  return Math.min(100, (treated / prevalenceCount) * 100);
}

/** The panel's own slider ceilings, which are also what the route will accept. */
const LIMITS: Record<keyof PracticeProfile, number> = {
  annualOutpatients: 40_000,
  opFeeInr: 5_000,
  annualInpatients: 20_000,
  ipFeeInr: 200_000,
};

function clamp(value: unknown, max: number): number | null {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.min(n, max);
}

/**
 * Read a profile off a request body, or null.
 *
 * These four numbers reach the server from the browser, so they are checked
 * rather than trusted — but note what they are for: a record of what this
 * doctor was shown, on their own dashboard. Nothing is priced off them and
 * nobody else reads them. A missing or malformed profile is not an error; it
 * means an older client, and the caller falls back to the backend's figures.
 */
export function parsePracticeProfile(value: unknown): PracticeProfile | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;

  const annualOutpatients = clamp(raw.annualOutpatients, LIMITS.annualOutpatients);
  const opFeeInr = clamp(raw.opFeeInr, LIMITS.opFeeInr);
  const annualInpatients = clamp(raw.annualInpatients, LIMITS.annualInpatients);
  const ipFeeInr = clamp(raw.ipFeeInr, LIMITS.ipFeeInr);

  if (
    annualOutpatients === null ||
    opFeeInr === null ||
    annualInpatients === null ||
    ipFeeInr === null
  ) {
    return null;
  }

  return { annualOutpatients, opFeeInr, annualInpatients, ipFeeInr };
}
