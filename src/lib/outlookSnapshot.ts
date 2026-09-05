/**
 * The last outlook a doctor ran, kept so their dashboard has something of their
 * own on it the moment they land.
 *
 * The snapshot has two homes, and this file is the shape they agree on:
 *
 *   - **the browser**, here, in `localStorage` — instant, and all an anonymous
 *     visitor gets. It is also why running an outlook before signing up is not
 *     wasted: the record is waiting on the dashboard afterwards.
 *   - **the account**, via `outlookApi.ts` — written server-side when there is
 *     a session, so signing in on a phone shows what was run on a laptop.
 *
 * The account copy wins where both exist. The browser copy is the fallback, and
 * on a second device it is simply empty.
 *
 * A snapshot is a projection, not the result. Only the handful of fields the
 * pane actually draws are kept, so the shape the calculator returns can grow
 * without quietly bloating either store.
 */

const KEY = "lom.outlook.v1";

/** One pincode inside the radius, placed for the dial. */
export interface OutlookPoint {
  /** Offset from the circle's centre, as a fraction of the radius. East is +x. */
  dx: number;
  /** Same, north is +y. Screens grow downward, so the dial flips this itself. */
  dy: number;
  /** Share of that pincode's people inside the circle, 0-1. Sizes the dot. */
  weight: number;
}

export interface OutlookSnapshot {
  /** ISO 8601, in UTC. Rendered in the reader's locale, never stored formatted. */
  savedAt: string;
  specialization: string;
  pincode: string;
  place: string | null;
  region: string | null;
  radiusKm: number;
  serviceablePopulation: number;
  prevalenceCount: number;
  projectedRevenue: number;
  impactPct: number;
  pincodesInRadius: number;
  points: OutlookPoint[];
}

/** Degrees of latitude to kilometres. Longitude shrinks by cos(latitude). */
const KM_PER_DEG = 110.57;
const KM_PER_DEG_LON = 111.32;

/** Plenty for a legible dial, and it keeps a dense metro's payload small. */
const MAX_POINTS = 48;

interface Contribution {
  exposurePct: number;
  lat?: number;
  lon?: number;
}

/**
 * Place each pincode relative to the circle's centre.
 *
 * Done here, at save time, so the pane never has to know that the numbers
 * behind the dial are geography. An older backend omits the centroids, in which
 * case there is nothing to plot and the dial draws its rings alone.
 */
function toPoints(
  breakdown: Contribution[] | undefined,
  centre: { lat: number; lon: number } | undefined,
  radiusKm: number,
): OutlookPoint[] {
  if (!breakdown?.length || !centre || !(radiusKm > 0)) return [];

  const cosLat = Math.cos((centre.lat * Math.PI) / 180);

  return breakdown
    .filter((row) => typeof row.lat === "number" && typeof row.lon === "number")
    .slice(0, MAX_POINTS)
    .map((row) => ({
      dx: (((row.lon as number) - centre.lon) * KM_PER_DEG_LON * cosLat) / radiusKm,
      dy: (((row.lat as number) - centre.lat) * KM_PER_DEG) / radiusKm,
      weight: Math.min(1, Math.max(0, row.exposurePct / 100)),
    }));
}

/** What the calculator hands over — its result, loosely typed on purpose. */
interface CalculatorResult {
  specialization: { label: string };
  pincode: string;
  city: string | null;
  region: string | null;
  radiusKm: number;
  serviceablePopulation: number;
  prevalenceCount: number;
  projectedRevenue: number;
  impactPct: number;
  pincodesInRadius?: number;
  breakdown?: Contribution[];
  center?: { lat: number; lon: number };
}

/**
 * Reduce a calculator result to the snapshot both stores hold.
 *
 * Pure, and free of anything browser-only, because the server route that
 * persists an outlook against the account calls this too. One builder means the
 * two copies of an outlook can never be different shapes.
 */
export function toSnapshot(result: CalculatorResult): OutlookSnapshot {
  return {
    savedAt: new Date().toISOString(),
    specialization: result.specialization.label,
    pincode: result.pincode,
    place: result.city,
    region: result.region,
    radiusKm: result.radiusKm,
    serviceablePopulation: result.serviceablePopulation,
    prevalenceCount: result.prevalenceCount,
    projectedRevenue: result.projectedRevenue,
    impactPct: result.impactPct,
    pincodesInRadius: result.pincodesInRadius ?? result.breakdown?.length ?? 0,
    points: toPoints(result.breakdown, result.center, result.radiusKm),
  };
}

/**
 * Remember this outlook in the browser. Never throws: storage switched off, or
 * a quota that is full, must not take the calculator down with it.
 */
export function saveOutlook(result: CalculatorResult): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(toSnapshot(result)));
  } catch {
    // Storage is a convenience here, not a requirement.
  }
}

/**
 * Make a stored value safe to render, or null.
 *
 * Everything is checked rather than trusted, and both stores go through here.
 * A record is written by a version of this site that may not be the one reading
 * it — half-written, older-shaped, or hand-edited in the admin panel — and any
 * of those should show the empty state rather than a pane of `undefined`.
 */
export function parseOutlook(value: unknown): OutlookSnapshot | null {
  try {
    const parsed = value as Partial<OutlookSnapshot>;
    if (
      typeof parsed?.savedAt !== "string" ||
      typeof parsed.specialization !== "string" ||
      typeof parsed.pincode !== "string" ||
      typeof parsed.serviceablePopulation !== "number"
    ) {
      return null;
    }

    return {
      savedAt: parsed.savedAt,
      specialization: parsed.specialization,
      pincode: parsed.pincode,
      place: parsed.place ?? null,
      region: parsed.region ?? null,
      radiusKm: Number(parsed.radiusKm) || 0,
      serviceablePopulation: parsed.serviceablePopulation,
      prevalenceCount: Number(parsed.prevalenceCount) || 0,
      projectedRevenue: Number(parsed.projectedRevenue) || 0,
      impactPct: Number(parsed.impactPct) || 0,
      pincodesInRadius: Number(parsed.pincodesInRadius) || 0,
      points: Array.isArray(parsed.points) ? parsed.points : [],
    };
  } catch {
    return null;
  }
}

/** The browser's copy of the last outlook, or null. */
export function readOutlook(): OutlookSnapshot | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? parseOutlook(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}
