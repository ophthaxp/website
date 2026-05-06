export type Specialty =
  | "popular"
  | "cataract"
  | "retina"
  | "glaucoma"
  | "cornea"
  | "pediatric"
  | "neuro"
  | "vitreo-retinal"
  | "anterior-segment"
  | "case-based"
  | "refractive"
  | "advanced"
  | "uveitis";

export interface Doctor {
  id: string;
  slug: string;
  name: string;
  title: string;
  specialty: Specialty[];
  city: string;
  experienceYears: number;
  imageUrl: string;
  bio: string;
}

export interface Program {
  id: string;
  slug: string;
  name: string;
  specialty: Specialty;
  description: string;
  durationWeeks: number;
  cohortSize: number;
  startDate: string; // ISO
  priceInr: number;
  highlights: string[];
  // Course detail page extras (optional — populated when sourced from nocode backend)
  doctorImage?: string;
  specialistTitle?: string;
  city?: string;
  experienceYears?: number;
  bio?: string;
  lessonsCount?: number;
  durationMinutes?: number;
  trailerVideoUrl?: string;
  pricePerDayInr?: number;
  billingPeriod?: "annual" | "monthly" | "onetime";
  moneyBackDays?: number;
  relatedDoctorSlugs?: string[];
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  ts: number;
}

export interface LeadPayload {
  fullName: string;
  email: string;
  phone?: string;
  qualification: "MBBS" | "MS" | "MD" | "DNB" | "FELLOW" | "OTHER";
  yearOfCompletion?: number;
  interestedIn?: Specialty;
  message?: string;
  source?: string;
}
