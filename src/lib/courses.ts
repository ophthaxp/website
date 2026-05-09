import type { Doctor, Program } from "@/types";
import { DOCTORS, PROGRAMS } from "@/lib/data";

const NOCODE_BASE = process.env.NOCODE_API_BASE_URL || "";
const NOCODE_APP_ID = process.env.NOCODE_APP_ID || "";
// In the merged setup both courses and doctors live in one module ("doctors").
// Keep the legacy NOCODE_COURSES_MODULE override for backwards compat, but
// default it to the doctors module so a single create-module covers both.
const NOCODE_DOCTORS_MODULE = process.env.NOCODE_DOCTORS_MODULE || "doctors";
const NOCODE_MODULE = process.env.NOCODE_COURSES_MODULE || NOCODE_DOCTORS_MODULE;

const isBackendConfigured = Boolean(NOCODE_BASE && NOCODE_APP_ID);

type RawRecord = Record<string, unknown>;

function pickString(rec: RawRecord, ...keys: string[]): string | undefined {
  for (const k of keys) {
    const v = rec[k];
    if (typeof v === "string" && v.trim()) return v;
  }
  return undefined;
}

function pickNumber(rec: RawRecord, ...keys: string[]): number | undefined {
  for (const k of keys) {
    const v = rec[k];
    if (typeof v === "number" && !Number.isNaN(v)) return v;
    if (typeof v === "string" && v.trim() && !Number.isNaN(Number(v))) return Number(v);
  }
  return undefined;
}

/**
 * If the value is a relative path coming from the nocode backend (e.g.
 * "/api/public/files/foo.jpg"), prefix it with the backend base URL so the
 * browser can load it. Absolute URLs are returned as-is.
 */
function absoluteUrl(value?: string): string | undefined {
  if (!value) return undefined;
  if (/^https?:\/\//i.test(value) || value.startsWith("data:")) return value;
  if (!NOCODE_BASE) return value;
  return value.startsWith("/") ? `${NOCODE_BASE}${value}` : `${NOCODE_BASE}/${value}`;
}

function pickStringArray(rec: RawRecord, ...keys: string[]): string[] {
  for (const k of keys) {
    const v = rec[k];
    if (Array.isArray(v)) return v.map(String).filter(Boolean);
    if (typeof v === "string" && v.trim()) {
      try {
        const parsed = JSON.parse(v);
        if (Array.isArray(parsed)) return parsed.map(String);
      } catch {
        return v.split(/[\n,;]/).map((s) => s.trim()).filter(Boolean);
      }
    }
  }
  return [];
}

/**
 * Map a raw record from the nocode-backend public module endpoint into the
 * Program shape this app already uses. Field names map flexibly so the user
 * can name them either camelCase or snake_case in the admin panel.
 */
function mapRecordToProgram(rec: RawRecord): Program | null {
  // Merged module: prefer the course-specific slug/name when present, fall
  // back to the doctor-level slug/name for legacy single-purpose `courses` modules.
  const slug = pickString(rec, "courseSlug", "course_slug", "slug", "Slug");
  const name = pickString(
    rec,
    "courseName",
    "course_name",
    "name",
    "title",
    "courseName",
  );
  if (!slug || !name) return null;

  return {
    id: String(pickString(rec, "id") ?? rec.id ?? slug),
    slug,
    name,
    specialty:
      (pickString(rec, "specialty", "Specialty") as Program["specialty"]) ||
      ("popular" as Program["specialty"]),
    description:
      pickString(rec, "description", "summary", "bio", "shortBio") || "",
    durationWeeks: pickNumber(rec, "durationWeeks", "duration_weeks", "duration") ?? 0,
    cohortSize: pickNumber(rec, "cohortSize", "cohort_size", "seats") ?? 0,
    startDate:
      pickString(rec, "startDate", "start_date", "starts_at") ||
      new Date().toISOString().slice(0, 10),
    priceInr: pickNumber(rec, "priceInr", "price_inr", "price", "fee") ?? 0,
    highlights: pickStringArray(rec, "highlights", "Highlights"),
    doctorImage: absoluteUrl(
      pickString(rec, "doctorImage", "doctor_image", "imageUrl", "image_url"),
    ),
    specialistTitle: pickString(rec, "specialistTitle", "specialist_title", "title"),
    city: pickString(rec, "city", "location"),
    experienceYears: pickNumber(rec, "experienceYears", "experience_years", "experience"),
    bio: pickString(rec, "bio", "shortBio", "short_bio"),
    lessonsCount: pickNumber(rec, "lessonsCount", "lessons_count", "lessons"),
    durationMinutes: pickNumber(rec, "durationMinutes", "duration_minutes", "totalMinutes"),
    trailerVideoUrl: absoluteUrl(
      pickString(
        rec,
        "trailerVideo",
        "trailer_video",
        "trailerVideoUrl",
        "trailer_video_url",
        "trailerUrl",
        "trailer_url",
        "videoUrl",
      ),
    ),
    pricePerDayInr: pickNumber(rec, "pricePerDayInr", "price_per_day_inr", "pricePerDay"),
    billingPeriod: pickString(rec, "billingPeriod", "billing_period") as Program["billingPeriod"],
    moneyBackDays: pickNumber(rec, "moneyBackDays", "money_back_days"),
    relatedDoctorSlugs: pickStringArray(
      rec,
      "relatedDoctorSlugs",
      "related_doctor_slugs",
      "relatedDoctors",
    ),
  };
}

function pickBool(rec: RawRecord, ...keys: string[]): boolean | undefined {
  for (const k of keys) {
    const v = rec[k];
    if (typeof v === "boolean") return v;
    if (typeof v === "string") {
      const s = v.trim().toLowerCase();
      if (s === "true" || s === "1" || s === "yes") return true;
      if (s === "false" || s === "0" || s === "no") return false;
    }
    if (typeof v === "number") return v !== 0;
  }
  return undefined;
}

function mapRecordToDoctor(rec: RawRecord): Doctor | null {
  const slug = pickString(rec, "slug", "Slug");
  const name = pickString(rec, "name", "fullName");
  if (!slug || !name) return null;
  const specialtyRaw =
    pickString(rec, "specialty", "Specialty") ??
    (Array.isArray(rec.specialty) ? (rec.specialty as string[]).join(",") : "");
  const specialty = specialtyRaw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean) as Doctor["specialty"];

  const heroImages = pickStringArray(rec, "heroImages", "hero_images")
    .map((u) => absoluteUrl(u))
    .filter((u): u is string => Boolean(u));

  return {
    id: String(pickString(rec, "id") ?? rec.id ?? slug),
    slug,
    name,
    title: pickString(rec, "title", "designation") ?? "",
    specialty: specialty.length > 0 ? specialty : (["popular"] as Doctor["specialty"]),
    city: pickString(rec, "city", "location") ?? "",
    experienceYears: pickNumber(rec, "experienceYears", "experience_years") ?? 0,
    imageUrl: absoluteUrl(pickString(rec, "imageUrl", "image_url", "image")) ?? "",
    bio: pickString(rec, "bio", "shortBio") ?? "",
    heroImages,
    showInHeroSection: pickBool(rec, "showInHeroSection", "show_in_hero_section"),
    trailerVideoUrl: absoluteUrl(
      pickString(rec, "trailerVideoUrl", "trailer_video_url", "trailerVideo", "trailer_video"),
    ),
    isFeatured: pickBool(rec, "isFeatured", "is_featured"),
    isNew: pickBool(rec, "isNew", "is_new"),
    // Merged course-side fields
    qualification: pickString(rec, "qualification"),
    email: pickString(rec, "email"),
    phone: pickString(rec, "phone"),
    courseName: pickString(rec, "courseName", "course_name"),
    courseSlug: pickString(rec, "courseSlug", "course_slug"),
    specialistTitle: pickString(rec, "specialistTitle", "specialist_title"),
    doctorImage: absoluteUrl(
      pickString(rec, "doctorImage", "doctor_image", "courseHeroImage", "course_hero_image"),
    ),
    description: pickString(rec, "description", "fullDescription", "full_description"),
    lessonsCount: pickNumber(rec, "lessonsCount", "lessons_count", "lessons"),
    durationMinutes: pickNumber(rec, "durationMinutes", "duration_minutes"),
    durationWeeks: pickNumber(rec, "durationWeeks", "duration_weeks"),
    cohortSize: pickNumber(rec, "cohortSize", "cohort_size"),
    startDate: pickString(rec, "startDate", "start_date"),
    priceInr: pickNumber(rec, "priceInr", "price_inr", "price"),
    pricePerDayInr: pickNumber(rec, "pricePerDayInr", "price_per_day_inr", "pricePerDay"),
    billingPeriod: pickString(rec, "billingPeriod", "billing_period") as Doctor["billingPeriod"],
    moneyBackDays: pickNumber(rec, "moneyBackDays", "money_back_days"),
    highlights: pickStringArray(rec, "highlights"),
    learningOutcomes: pickStringArray(rec, "learningOutcomes", "learning_outcomes"),
    brochureUrl: absoluteUrl(pickString(rec, "brochureUrl", "brochure_url", "brochure")),
    relatedDoctorSlugs: pickStringArray(
      rec,
      "relatedDoctorSlugs",
      "related_doctor_slugs",
      "relatedDoctors",
    ),
    isActive: pickBool(rec, "isActive", "is_active"),
  };
}

async function fetchJson(url: string): Promise<{ ok: boolean; json: any }> {
  try {
    console.log("[courses] GET", url);
    const res = await fetch(url, { cache: "no-store" });
    const text = await res.text();
    let json: any = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      console.error("[courses] non-JSON response from", url, text.slice(0, 200));
    }
    if (!res.ok) {
      console.error("[courses] non-OK", res.status, url, json);
      return { ok: false, json };
    }
    return { ok: true, json };
  } catch (err) {
    console.error("[courses] fetch failed:", url, err);
    return { ok: false, json: null };
  }
}

function extractRows(json: any): RawRecord[] {
  if (!json) return [];
  const candidates = [json?.data?.rows, json?.data?.data, json?.data, json?.rows];
  for (const c of candidates) {
    if (Array.isArray(c)) return c as RawRecord[];
  }
  return [];
}

export async function fetchCoursesFromBackend(): Promise<Program[]> {
  if (!isBackendConfigured) return PROGRAMS;

  // 1. Try the dedicated courses module first.
  const primaryUrl = `${NOCODE_BASE}/api/public/records/${NOCODE_APP_ID}/${encodeURIComponent(
    NOCODE_MODULE,
  )}?limit=100`;
  const { ok, json } = await fetchJson(primaryUrl);
  let programs: Program[] = [];
  if (ok) {
    const rows = extractRows(json);
    programs = rows.map(mapRecordToProgram).filter((p): p is Program => !!p);
    console.log(
      `[courses] fetched ${programs.length} programs from "${NOCODE_MODULE}"`,
    );
  }

  // 2. Fallback: derive programs from the doctors module when the dedicated
  // courses module is empty / missing / a different module. Each doctor record
  // is itself a mentorship offering in the merged setup, so we map it through
  // the same mapper (which already falls back to doctor-side field names).
  if (programs.length === 0 && NOCODE_MODULE !== NOCODE_DOCTORS_MODULE) {
    console.log(
      `[courses] "${NOCODE_MODULE}" returned 0 programs — falling back to doctors module "${NOCODE_DOCTORS_MODULE}"`,
    );
    const fallbackUrl = `${NOCODE_BASE}/api/public/records/${NOCODE_APP_ID}/${encodeURIComponent(
      NOCODE_DOCTORS_MODULE,
    )}?limit=100`;
    const fallback = await fetchJson(fallbackUrl);
    if (fallback.ok) {
      const rows = extractRows(fallback.json);
      programs = rows.map(mapRecordToProgram).filter((p): p is Program => !!p);
      console.log(
        `[courses] derived ${programs.length} programs from doctors module`,
      );
    }
  }

  // 3. Last resort: local mock data so the page is never empty in dev.
  if (programs.length === 0) {
    console.log(`[courses] backend returned no programs — using local PROGRAMS mock`);
    return PROGRAMS;
  }

  return programs;
}

export async function fetchCourseFromBackend(slug: string): Promise<Program | null> {
  if (!isBackendConfigured) {
    return PROGRAMS.find((p) => p.slug === slug) ?? null;
  }

  // Use the records endpoint with a slug filter
  const url = `${NOCODE_BASE}/api/public/records/${NOCODE_APP_ID}/${encodeURIComponent(
    NOCODE_MODULE,
  )}?slug=${encodeURIComponent(slug)}&limit=1`;
  const { ok, json } = await fetchJson(url);
  if (ok) {
    const rows = extractRows(json);
    if (rows[0]) {
      const mapped = mapRecordToProgram(rows[0]);
      if (mapped) return mapped;
    }
  }

  // Fallback: list all + find by slug
  const all = await fetchCoursesFromBackend();
  return all.find((p) => p.slug === slug) ?? null;
}

export async function fetchCourseSlugsFromBackend(): Promise<string[]> {
  const all = await fetchCoursesFromBackend();
  return all.map((p) => p.slug);
}

export async function fetchDoctorsFromBackend(): Promise<Doctor[]> {
  if (!isBackendConfigured) return DOCTORS;
  const url = `${NOCODE_BASE}/api/public/records/${NOCODE_APP_ID}/${encodeURIComponent(
    NOCODE_DOCTORS_MODULE,
  )}?limit=100`;
  const { ok, json } = await fetchJson(url);
  if (!ok) {
    console.warn(
      `[courses] doctors module fetch failed — returning empty list. ` +
        `Make sure module "${NOCODE_DOCTORS_MODULE}" exists in app_id=${NOCODE_APP_ID} on the nocode backend ` +
        `and that nocode-backend is running on ${NOCODE_BASE}.`,
    );
    return [];
  }
  const rows = extractRows(json);
  console.log(`[courses] fetched ${rows.length} doctor rows`);
  return rows.map(mapRecordToDoctor).filter((d): d is Doctor => !!d);
}

/**
 * Build the list of images shown in the homepage Hero marquee.
 * Only includes doctors whose `showInHeroSection` switch is ON.
 * Each such doctor contributes their `heroImages[]` if set, otherwise their
 * single `imageUrl`. Returns [] when no doctors are flagged — caller can fall
 * back to a static placeholder list.
 */
export async function fetchHeroImagesFromBackend(): Promise<{ src: string; alt: string }[]> {
  const doctors = await fetchDoctorsFromBackend();
  const out: { src: string; alt: string }[] = [];
  for (const d of doctors) {
    if (!d.showInHeroSection) continue;
    const list = d.heroImages?.length ? d.heroImages : d.imageUrl ? [d.imageUrl] : [];
    list.forEach((src, i) => {
      if (src) out.push({ src, alt: `${d.name} portrait ${i + 1}` });
    });
  }
  return out;
}

export async function fetchRelatedDoctors(slugs: string[]): Promise<Doctor[]> {
  if (slugs.length === 0) return [];
  const all = await fetchDoctorsFromBackend();
  const set = new Set(slugs);
  return all.filter((d) => set.has(d.slug));
}
