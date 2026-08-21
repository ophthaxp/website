const NOCODE_BASE = process.env.NOCODE_API_BASE_URL || "";

export interface RoiSpecialization {
  slug: string;
  label: string;
  avgSellingPriceInr: number;
  prevalencePct: number;
  factsBlurb: string | null;
}

export interface RoiPincodeLookup {
  pincode: string;
  officeName?: string | null;
  city?: string | null;
  district?: string | null;
  state?: string | null;
  region?: string | null;
  populationPerSqKm: number;
  /** The pincode's own geographic footprint (km2); null when unknown. */
  areaSqKm?: number | null;
  source: string;
}

/** One row of the location typeahead: a place name and the pincode behind it. */
export interface RoiPlaceSuggestion {
  pincode: string;
  /** Display name — the India Post office name minus its type code. */
  place: string;
  officeName: string;
  population: number;
  /** Whether the query hit the place name or the pincode digits. */
  matchedOn: "place" | "pincode";
}

export interface RoiCalculateInput {
  specializationSlug: string;
  pincode: string;
  radiusKm: number;
  expectedPatients: number;
  leadEmail?: string;
}

/** One pincode's contribution to the radius, as the backend catchment reports it. */
export interface RoiCatchmentContribution {
  pincode: string;
  office: string;
  /** Centre-to-centre distance; can exceed the radius while the pincode's edge is inside. */
  distanceKm: number;
  /** Share of that pincode's PEOPLE inside the circle — population-based, not area. */
  exposurePct: number;
  totalPop: number;
  inCirclePop: number;
}

export interface RoiCalculateResult {
  specialization: { slug: string; label: string };
  pincode: string;
  city: string | null;
  region: string | null;
  radiusKm: number;
  expectedPatients: number;
  serviceablePopulation: number;
  /** How the population was derived: real pincode catchment, or an area x density estimate. */
  serviceablePopulationSource?: "catchment" | "density";
  /** Pincodes the radius touches. */
  pincodesInRadius?: number;
  /** Per-pincode split, nearest first. Absent when the catchment falls back to density. */
  breakdown?: RoiCatchmentContribution[];
  prevalencePct: number;
  prevalenceCount: number;
  avgSellingPriceInr: number;
  projectedRevenue: number;
  impactPct: number;
  stature: string;
}

interface Envelope<T> {
  success: boolean;
  data?: T;
  error?: string;
}

async function backendFetch<T>(path: string, init?: RequestInit): Promise<T> {
  if (!NOCODE_BASE) {
    throw new Error("NOCODE_API_BASE_URL not configured");
  }
  const url = `${NOCODE_BASE.replace(/\/$/, "")}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
    cache: "no-store",
  });
  const text = await res.text();
  let body: Envelope<T>;
  try {
    body = JSON.parse(text);
  } catch {
    throw new Error(`Non-JSON response from ${path}: ${text.slice(0, 200)}`);
  }
  if (!res.ok || !body.success) {
    throw new Error(body.error || `Backend ROI call failed (${res.status})`);
  }
  return body.data as T;
}

export function fetchSpecializations(): Promise<RoiSpecialization[]> {
  return backendFetch<RoiSpecialization[]>("/api/public/roi/specializations");
}

export function fetchPincode(pincode: string): Promise<RoiPincodeLookup> {
  return backendFetch<RoiPincodeLookup>(
    `/api/public/roi/pincode/${encodeURIComponent(pincode)}`,
  );
}

export function fetchPlaces(q: string, limit = 8): Promise<RoiPlaceSuggestion[]> {
  return backendFetch<RoiPlaceSuggestion[]>(
    `/api/public/roi/places?q=${encodeURIComponent(q)}&limit=${limit}`,
  );
}

export function calculateRoi(input: RoiCalculateInput): Promise<RoiCalculateResult> {
  return backendFetch<RoiCalculateResult>("/api/public/roi/calculate", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
