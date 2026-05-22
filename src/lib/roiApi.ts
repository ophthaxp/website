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
  source: string;
}

export interface RoiCalculateInput {
  specializationSlug: string;
  pincode: string;
  radiusKm: number;
  expectedPatients: number;
  leadEmail?: string;
}

export interface RoiCalculateResult {
  specialization: { slug: string; label: string };
  pincode: string;
  city: string | null;
  region: string | null;
  radiusKm: number;
  expectedPatients: number;
  serviceablePopulation: number;
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

export function calculateRoi(input: RoiCalculateInput): Promise<RoiCalculateResult> {
  return backendFetch<RoiCalculateResult>("/api/public/roi/calculate", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
