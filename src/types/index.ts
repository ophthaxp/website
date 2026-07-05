export type Specialty =
  | "all"
  | "cornea-ocular-surface"
  | "phaco-refractive-surgery"
  | "retina-vitreo-retinal-surgery"
  | "glaucoma"
  | "pediatric-ophthalmology"
  | "oculoplasty"
  | "ophthalmology-practice-mastery";

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
  // Optional extras populated when sourced from the merged nocode `doctors` module
  heroImages?: string[];
  showInHeroSection?: boolean;
  trailerVideoUrl?: string;
  isFeatured?: boolean;
  isNew?: boolean;
  // Course-side fields (1:1 doctor↔course in the merged module)
  qualification?: string;
  email?: string;
  phone?: string;
  courseName?: string;
  courseSlug?: string;
  specialistTitle?: string;
  doctorImage?: string;
  description?: string;
  lessonsCount?: number;
  durationMinutes?: number;
  durationWeeks?: number;
  cohortSize?: number;
  startDate?: string;
  priceInr?: number;
  pricePerDayInr?: number;
  billingPeriod?: "annual" | "monthly" | "onetime";
  moneyBackDays?: number;
  highlights?: string[];
  learningOutcomes?: string[];
  brochureUrl?: string;
  relatedDoctorSlugs?: string[];
  isActive?: boolean;
}

export interface CourseFormatPhase {
  phase: string;
  description: string;
}

export interface CourseFaq {
  question: string;
  answer: string;
}

/** Compact doctor projection embedded into a Program as `faculty`. */
export interface Faculty {
  slug: string;
  name: string;
  title: string;
  city?: string;
  imageUrl?: string;
  qualification?: string;
  bio?: string;
  experienceYears?: number;
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
  // Detail page presentation
  headline?: string;
  tagline?: string;
  heroImage?: string;
  doctorImage?: string;
  specialistTitle?: string;
  city?: string;
  experienceYears?: number;
  bio?: string;
  lessonsCount?: number;
  durationMinutes?: number;
  durationMonths?: number;
  launchMonth?: string;
  launchYear?: number;
  trailerVideoUrl?: string;
  pricePerDayInr?: number;
  billingPeriod?: "annual" | "monthly" | "onetime";
  moneyBackDays?: number;
  relatedDoctorSlugs?: string[];
  // Rich content sections
  eligibility?: string;
  whatYouWillLearn?: string[];
  curriculumHighlights?: string[];
  courseFormat?: CourseFormatPhase[];
  faqs?: CourseFaq[];
  certificateNote?: string;
  sampleCertificateImage?: string;
  // CTA / flags
  ctaLabel?: string;
  brochureUrl?: string;
  isNew?: boolean;
  isFeatured?: boolean;
  isActive?: boolean;
  // Faculty resolved from `doctorSlug` reference
  doctorSlug?: string;
  faculty?: Faculty;
  // Doctor/mentor name carried on the course row itself. Used as a fallback for
  // the hero credit line ("with Dr. …") in merged-module rows where the linked
  // doctor record can't be resolved (doctor-side slug/name left blank).
  mentorName?: string;
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
