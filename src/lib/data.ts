import type { Doctor, Program, Specialty } from "@/types";

export const SPECIALTY_TABS: { key: Specialty; label: string }[] = [
  { key: "popular", label: "Popular" },
  { key: "cataract", label: "Cataract" },
  { key: "retina", label: "Retina" },
  { key: "glaucoma", label: "Glaucoma" },
  { key: "cornea", label: "Cornea" },
  { key: "pediatric", label: "Pediatric Ophthalmology" },
  { key: "neuro", label: "Neuro-Ophthalmology" },
  { key: "vitreo-retinal", label: "Vitreo-Retinal Surgery" },
  { key: "anterior-segment", label: "Anterior Segment" },
  { key: "case-based", label: "Case-Based Learning" },
  { key: "refractive", label: "Refractive Surgery" },
  { key: "advanced", label: "Advanced Techniques" },
  { key: "uveitis", label: "Uveitis" },
];

// Placeholder portraits — replace with /public/doctors/*.jpg once assets are ready.
const PORTRAIT_M =
  "https://images.unsplash.com/photo-1612531386530-97286d97c2d2?auto=format&fit=crop&w=600&q=80";
const PORTRAIT_F =
  "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=600&q=80";
const PORTRAIT_SENIOR =
  "https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&w=1600&q=80";

export const HERO_IMAGES: { src: string; alt: string }[] = Array.from({ length: 10 }).map(
  (_, i) => ({
    src: i % 2 === 0 ? PORTRAIT_F : PORTRAIT_M,
    alt: `OphthaXP mentor portrait ${i + 1}`,
  }),
);

export const HERO_VIDEO_POSTER = PORTRAIT_SENIOR;
export const HERO_VIDEO_SRC =
  "https://cdn.coverr.co/videos/coverr-a-doctor-walking-through-a-hospital-1572/1080p.mp4";

export const DOCTORS: Doctor[] = [
  {
    id: "d1",
    slug: "dr-arun-mehta",
    name: "Dr. Arun Mehta",
    title: "Senior Vitreo-Retinal Surgeon",
    specialty: ["vitreo-retinal", "retina", "popular"],
    city: "Mumbai",
    experienceYears: 32,
    imageUrl: PORTRAIT_SENIOR,
    bio: "Pioneer in micro-incision vitrectomy with over 15,000 surgeries to his name.",
  },
  {
    id: "d2",
    slug: "dr-priya-natarajan",
    name: "Dr. Priya Natarajan",
    title: "Cornea & Refractive Specialist",
    specialty: ["cornea", "refractive", "anterior-segment", "popular"],
    city: "Chennai",
    experienceYears: 24,
    imageUrl: PORTRAIT_F,
    bio: "Author of two textbooks on keratoconus management and CXL.",
  },
  {
    id: "d3",
    slug: "dr-rahul-deshpande",
    name: "Dr. Rahul Deshpande",
    title: "Glaucoma Consultant",
    specialty: ["glaucoma", "case-based"],
    city: "Pune",
    experienceYears: 19,
    imageUrl: PORTRAIT_M,
    bio: "MIGS faculty at multiple international congresses.",
  },
  {
    id: "d4",
    slug: "dr-sneha-iyer",
    name: "Dr. Sneha Iyer",
    title: "Pediatric Ophthalmologist",
    specialty: ["pediatric", "popular"],
    city: "Bengaluru",
    experienceYears: 16,
    imageUrl: PORTRAIT_F,
    bio: "Strabismus and amblyopia specialist; runs a teaching practice.",
  },
  {
    id: "d5",
    slug: "dr-vikram-sahni",
    name: "Dr. Vikram Sahni",
    title: "Cataract & IOL Specialist",
    specialty: ["cataract", "anterior-segment", "popular"],
    city: "Delhi",
    experienceYears: 28,
    imageUrl: PORTRAIT_M,
    bio: "Trains surgeons in premium IOL outcomes and complications management.",
  },
  {
    id: "d6",
    slug: "dr-meera-rao",
    name: "Dr. Meera Rao",
    title: "Neuro-Ophthalmology Lead",
    specialty: ["neuro", "advanced"],
    city: "Hyderabad",
    experienceYears: 22,
    imageUrl: PORTRAIT_F,
    bio: "Optic neuropathy and idiopathic intracranial hypertension expertise.",
  },
  {
    id: "d7",
    slug: "dr-imran-qureshi",
    name: "Dr. Imran Qureshi",
    title: "Uveitis Specialist",
    specialty: ["uveitis", "case-based"],
    city: "Lucknow",
    experienceYears: 18,
    imageUrl: PORTRAIT_M,
    bio: "Runs a dedicated uveitis clinic with a 4,000+ patient registry.",
  },
  {
    id: "d8",
    slug: "dr-kavita-shah",
    name: "Dr. Kavita Shah",
    title: "Refractive Surgery Director",
    specialty: ["refractive", "advanced"],
    city: "Ahmedabad",
    experienceYears: 21,
    imageUrl: PORTRAIT_F,
    bio: "SMILE and topo-guided LASIK trainer for South Asia.",
  },
];

export const PROGRAMS: Program[] = [
  {
    id: "p1",
    slug: "cataract-mastery-cohort",
    name: "Cataract Mastery Cohort",
    specialty: "cataract",
    description:
      "A 12-week practitioner-first program covering phaco fundamentals, complication management and premium IOL outcomes.",
    durationWeeks: 12,
    cohortSize: 24,
    startDate: "2026-06-01",
    priceInr: 75000,
    highlights: [
      "Live Wet-lab walkthroughs",
      "Real OR case discussions",
      "1:1 surgical video reviews",
    ],
  },
  {
    id: "p2",
    slug: "vitreo-retinal-track",
    name: "Vitreo-Retinal Surgery Track",
    specialty: "vitreo-retinal",
    description:
      "Cohort-based program for residents and fellows interested in posterior segment surgery.",
    durationWeeks: 16,
    cohortSize: 18,
    startDate: "2026-07-15",
    priceInr: 110000,
    highlights: ["MIVS techniques", "Complex RD cases", "Imaging interpretation"],
  },
  {
    id: "p3",
    slug: "cornea-refractive-fellowship-prep",
    name: "Cornea & Refractive Fellowship Prep",
    specialty: "cornea",
    description:
      "Designed for MBBS graduates preparing for cornea fellowships — case-based with senior mentors.",
    durationWeeks: 10,
    cohortSize: 30,
    startDate: "2026-05-20",
    priceInr: 60000,
    highlights: ["Keratoconus & CXL", "Slit-lamp mastery", "Topography reading"],
  },
  {
    id: "p4",
    slug: "glaucoma-clinic",
    name: "Glaucoma Clinic Program",
    specialty: "glaucoma",
    description: "Real-time clinical decision making with senior glaucomatologists.",
    durationWeeks: 8,
    cohortSize: 20,
    startDate: "2026-08-10",
    priceInr: 50000,
    highlights: ["MIGS faculty", "OCT reading", "Visual field interpretation"],
  },
  {
    id: "p5",
    slug: "pediatric-ophthalmology-foundations",
    name: "Pediatric Ophthalmology Foundations",
    specialty: "pediatric",
    description: "From paediatric refraction to strabismus — built for the practising ophthalmologist.",
    durationWeeks: 8,
    cohortSize: 25,
    startDate: "2026-09-01",
    priceInr: 45000,
    highlights: ["Strabismus", "Amblyopia", "Retinopathy of prematurity"],
  },
];

export const FEATURE_CARDS = [
  {
    title: "Learn live, not recorded",
    body: "Every session is interactive and shaped in real time.",
  },
  {
    title: "Real cases, real thinking",
    body: "Understand how experts approach and solve decisions.",
  },
  {
    title: "Small groups, better focus",
    body: "Learn in a space where every voice matters.",
  },
  {
    title: "Practice-first curriculum",
    body: "Built around what actually happens in real scenarios.",
  },
  {
    title: "Led by active professionals",
    body: "Learn from those who are doing it every day.",
  },
];
