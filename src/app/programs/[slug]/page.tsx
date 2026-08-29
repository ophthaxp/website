import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Award, Check } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { LegendTrailer } from "@/components/LegendTrailer";
import { CourseMastery } from "@/components/CourseMastery";
import { CourseRoadmap } from "@/components/CourseRoadmap";
import { PracticeGrowthCalculator } from "@/components/PracticeGrowthCalculator";
import { FaqGrid } from "@/components/FaqGrid";
import { CourseStickyFooter } from "@/components/CourseStickyFooter";
import { CourseApplyButton } from "@/components/CourseApplyButton";
import {
  fetchCourseFromBackend,
  fetchCourseSlugsFromBackend,
  fetchDoctorsFromBackend,
  fetchRelatedDoctors,
} from "@/lib/courses";
import type { CourseModule, Doctor, Faculty } from "@/types";
import { buildMetadata, SITE_NAME, SITE_URL } from "@/lib/seo";

export const dynamic = "force-dynamic";

/* The page column, shared with every section on the home page: 1200px of
   content inside 120px gutters at the 1440 design width. */
const SHELL = "mx-auto max-w-[1440px] px-5 sm:px-10 lg:px-[120px]";
const SECTION = `${SHELL} py-16 sm:py-24`;
/* Figma sets the section headings at 46px — a step above the home page's 41.6,
   which is why this is spelled out rather than reusing the shared clamp. */
const HEADING =
  "text-[clamp(1.75rem,3.4vw,2.875rem)] font-extrabold leading-tight tracking-[-0.015em] text-white";

/* Hero scrim. Solid black under the right-hand copy column, dissolving to
   nothing before it reaches the subject's face on the left. */
const HERO_SCRIM =
  "linear-gradient(to left, #000 0%, #000 13.46%, rgba(0,0,0,0.5) 42.3%, rgba(76,76,76,0.26) 68.75%, rgba(157,157,157,0) 100%)";

/* Shown when the course row carries no highlights of its own. */
const DEFAULT_INCLUSIONS = [
  "Legend Mentorship",
  "Hands-on Clinical Exposure",
  "Program Certification",
  "Lifetime Professional Network",
];

export async function generateStaticParams() {
  const slugs = await fetchCourseSlugsFromBackend();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const p = await fetchCourseFromBackend(params.slug);
  if (!p) return buildMetadata({ title: "Program not found" });
  return buildMetadata({
    title: p.headline ? `${p.name} — ${p.headline}` : p.name,
    description: p.tagline || p.description,
    alternates: { canonical: `/programs/${p.slug}` },
  });
}

function formatDuration(minutes?: number): string | null {
  if (!minutes || minutes <= 0) return null;
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hrs && mins) return `${hrs}hr ${mins}mins`;
  if (hrs) return `${hrs}hr`;
  return `${mins}mins`;
}

function formatLaunch(p: { launchMonth?: string; launchYear?: number; startDate?: string }) {
  if (p.launchMonth && p.launchYear) return `${p.launchMonth} ${p.launchYear}`;
  if (p.launchMonth) return `${p.launchMonth}`;
  if (p.startDate) {
    const d = new Date(p.startDate);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
    }
  }
  return null;
}

function doctorToFaculty(d: Doctor): Faculty {
  return {
    slug: d.slug,
    name: d.name,
    title: d.title,
    city: d.city || undefined,
    imageUrl: d.imageUrl || undefined,
    qualification: d.qualification,
    bio: d.bio || undefined,
    experienceYears: d.experienceYears || undefined,
  };
}

export default async function ProgramDetailPage({ params }: { params: { slug: string } }) {
  const p = await fetchCourseFromBackend(params.slug);
  if (!p) notFound();

  const related = await fetchRelatedDoctors(p.relatedDoctorSlugs ?? []);

  // Resolve a faculty record for the hero, even when the backend course
  // doesn't have a `doctorSlug` reference set. Priority:
  //   1. p.faculty (already attached server-side via doctorSlug)
  //   2. First doctor from relatedDoctorSlugs (already fetched as `related`)
  //   3. Legacy lookup: any doctor whose courseSlug or slug equals p.slug
  let faculty: Faculty | undefined = p.faculty;
  if (!faculty && related[0]) {
    faculty = doctorToFaculty(related[0]);
  }
  if (!faculty) {
    const allDoctors = await fetchDoctorsFromBackend();
    const match = allDoctors.find(
      (d) => d.courseSlug === p.slug || d.slug === p.slug,
    );
    if (match) faculty = doctorToFaculty(match);
  }

  const durationLabel = formatDuration(p.durationMinutes);
  const launchLabel = formatLaunch(p);
  // Hero stat: prefer whole-month/week fellowship duration, fall back to the
  // lesson-length label so the strip always shows something meaningful.
  const heroDuration = p.durationMonths
    ? `${p.durationMonths} ${p.durationMonths === 1 ? "Month" : "Months"}`
    : p.durationWeeks
      ? `${p.durationWeeks} ${p.durationWeeks === 1 ? "Week" : "Weeks"}`
      : durationLabel;
  const enrollLabel = p.ctaLabel || "Reserve your Seat";
  const heroImage = p.doctorImage || p.heroImage;
  // Fallback mentor name for the hero credit line when no faculty record could
  // be resolved. Skip it if it just duplicates the course title/headline.
  const mentorName =
    p.mentorName && p.mentorName !== p.name && p.mentorName !== p.headline
      ? p.mentorName
      : undefined;
  const legendName = faculty?.name || mentorName || p.name;

  // The roadmap runs off the `modules` field when the admin has filled it in.
  // Courses that predate it still have `courseFormat`, whose phases carry the
  // same shape minus the per-module outcome list.
  const modules: CourseModule[] =
    p.modules && p.modules.length > 0
      ? p.modules
      : (p.courseFormat ?? []).map((f) => ({
          title: f.phase,
          description: f.description,
          outcomes: [],
        }));

  // Programme-wide lists close the roadmap out. They are not modules, so they
  // take a tick rather than a number and don't disturb the 01/02/03 count.
  const roadmapItems: (CourseModule & {
    badge?: "check";
    outcomesLabel?: string;
  })[] = [
    ...modules,
    ...(p.whatYouWillLearn?.length
      ? [
          {
            title: "What You'll Be Able To Do",
            description: "The outcomes the whole programme is built to deliver.",
            outcomes: p.whatYouWillLearn,
            outcomesLabel: "By the end of the programme, you'll be able to",
            badge: "check" as const,
          },
        ]
      : []),
    ...(p.curriculumHighlights?.length
      ? [
          {
            title: "How the Programme Is Taught",
            description: "The teaching approach running through every module.",
            outcomes: p.curriculumHighlights,
            outcomesLabel: "What sets the teaching apart",
            badge: "check" as const,
          },
        ]
      : []),
  ];

  // The FAQ deck speaks q/a; the `faqs` column on the course row is
  // question/answer, so it is mapped rather than duplicated in two shapes.
  const faqItems = (p.faqs ?? [])
    .filter((f) => f.question && f.answer)
    .map((f) => ({ q: f.question, a: f.answer }));

  const inclusions = p.highlights.length > 0 ? p.highlights.slice(0, 4) : DEFAULT_INCLUSIONS;
  const priceText = p.priceInr
    ? new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(p.priceInr)
    : null;

  const courseLd = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: p.name,
    description: p.tagline || p.description,
    provider: { "@type": "Organization", name: SITE_NAME, sameAs: SITE_URL },
    hasCourseInstance: {
      "@type": "CourseInstance",
      courseMode: "blended",
      startDate: p.startDate,
      duration: p.durationMonths ? `P${p.durationMonths}M` : `P${p.durationWeeks}W`,
    },
    instructor: faculty
      ? {
          "@type": "Person",
          name: faculty.name,
          jobTitle: faculty.title,
        }
      : undefined,
    offers: p.priceInr
      ? {
          "@type": "Offer",
          price: p.priceInr,
          priceCurrency: "INR",
          availability: "https://schema.org/InStock",
          url: `${SITE_URL}/programs/${p.slug}`,
        }
      : undefined,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(courseLd) }}
      />
      <Navbar />
      <main className="bg-ink-950 text-white">
        {/* ══════════════════════════════════════════════════════════════
            § 1 — HERO   Full-bleed portrait, copy column on the right
        ══════════════════════════════════════════════════════════════ */}
        <section aria-labelledby="program-title" className="relative overflow-hidden bg-black">
          <div className="absolute inset-0">
            {heroImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={heroImage}
                alt={legendName}
                /* The subject sits just left of centre in these portraits.
                   Desktop shows the whole frame, so the crop only matters on
                   narrow screens — where anchoring at 30% lands on the
                   background instead of the face. */
                className="h-full w-full object-cover object-[50%_top] lg:object-[30%_top]"
              />
            ) : (
              <div className="h-full w-full bg-gradient-to-br from-accent/15 via-ink-900 to-black" />
            )}
          </div>

          {/* Desktop: the copy sits in the solid right-hand end of a horizontal
              scrim. Mobile has no room for a side column, so the photo is
              darkened from the bottom instead and the copy stacks over it. */}
          <span
            aria-hidden
            className="absolute inset-0 hidden lg:block"
            style={{ backgroundImage: HERO_SCRIM }}
          />
          <span
            aria-hidden
            className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-black/40 lg:hidden"
          />

          {/* The photo has to dissolve into the black page below it. Figma fades
             the last ~60px to nothing; left uncut, a bright frame (a lit wall, a
             stack of books) ends on a hard horizontal seam. Mobile already gets
             this from the scrim above. */}
          <span
            aria-hidden
            className="absolute inset-x-0 bottom-0 hidden h-[120px] bg-gradient-to-t from-black via-black/60 to-transparent lg:block"
          />

          <div
            className={`relative flex min-h-[640px] items-center justify-center pb-16 pt-32 sm:min-h-[720px] lg:h-[760px] lg:justify-end lg:py-0 lg:pr-[152px] ${SHELL}`}
          >
            <div className="w-full max-w-[420px] text-center">
              <h1
                id="program-title"
                className="font-serif text-[clamp(2rem,3.4vw,2.875rem)] leading-[1.11] text-white"
              >
                {p.headline || p.name}
              </h1>

              <span aria-hidden className="mx-auto mt-7 block h-0.5 w-5 bg-white/80" />

              {faculty?.name ? (
                <Link
                  href={`/doctors/${faculty.slug}`}
                  className="mt-6 inline-block text-sm text-[#A5A5A5] transition hover:text-white"
                >
                  with{" "}
                  <span className="font-semibold text-white">
                    Dr. {faculty.name.replace(/^Dr\.?\s+/i, "")}
                  </span>
                </Link>
              ) : mentorName ? (
                <p className="mt-6 text-sm text-[#A5A5A5]">
                  with{" "}
                  <span className="font-semibold text-white">
                    Dr. {mentorName.replace(/^Dr\.?\s+/i, "")}
                  </span>
                </p>
              ) : null}

              {p.tagline && (
                <p className="mt-5 text-sm leading-[1.6] text-[#A5A5A5]">{p.tagline}</p>
              )}

              {p.trailerVideoUrl && (
                <a
                  href="#trailer"
                  className="mt-6 inline-block text-sm font-semibold text-white underline decoration-white/50 underline-offset-[6px] transition hover:decoration-white"
                >
                  Watch Trailer
                </a>
              )}

              {/* Stat strip — duration · cohort · launch */}
              {(heroDuration || p.cohortSize || launchLabel) && (
                <div className="mt-9 flex items-stretch justify-center divide-x divide-white/15 text-center">
                  {[
                    heroDuration && { value: heroDuration, label: "Fellowship duration" },
                    p.cohortSize
                      ? {
                          value: String(p.cohortSize).padStart(2, "0"),
                          label: "Cohort Size",
                        }
                      : null,
                    launchLabel && { value: launchLabel, label: "Program Begins" },
                  ]
                    .filter(Boolean)
                    .map((stat) => {
                      const s = stat as { value: string; label: string };
                      return (
                        <div key={s.label} className="px-3 sm:px-5">
                          <p className="whitespace-nowrap text-lg font-bold text-white sm:text-xl">
                            {s.value}
                          </p>
                          <p className="mt-1.5 whitespace-nowrap text-[13px] text-[#A5A5A5]">
                            {s.label}
                          </p>
                        </div>
                      );
                    })}
                </div>
              )}

              {/* Enrollment card */}
              <div className="mx-auto mt-10 w-full max-w-[360px] rounded-[12px] border border-[#4A4A4A] bg-ink-800 p-[23px]">
                <p className="text-[15px] font-semibold text-white">Program Enrollment</p>
                <div className="mt-4">
                  <CourseApplyButton
                    courseId={p.id}
                    courseSlug={p.slug}
                    courseName={p.name}
                    mentorName={faculty?.name}
                    brochureUrl={p.brochureUrl}
                    label={enrollLabel}
                    variant="accent"
                    block
                  />
                </div>
                <p className="mt-4 text-xs leading-[1.45] text-[#A5A5A5]">
                  Every module is designed to translate directly into clinical practice.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════
            § 2 — MEET YOUR LEGEND   Documentary trailer
        ══════════════════════════════════════════════════════════════ */}
        {(p.trailerVideoUrl || heroImage) && (
          <section
            id="trailer"
            aria-labelledby="legend-title"
            className={`scroll-mt-24 ${SECTION}`}
          >
            <h2 id="legend-title" className={HEADING}>
              Meet your Legend
            </h2>
            <div className="mt-10 sm:mt-14">
              <LegendTrailer
                src={p.trailerVideoUrl}
                poster={heroImage}
                name={legendName}
              />
            </div>
          </section>
        )}

        {/* § 3 — WHAT YOU'LL MASTER */}
        <CourseMastery />

        {/* § 4 — THE ROADMAP */}
        <CourseRoadmap
          items={roadmapItems}
          subtitle={
            p.eligibility ||
            "A structured journey from foundational knowledge to surgical confidence."
          }
        />

        {/* § 5 — THE DIFFERENCE IT MAKES   Shared ROI calculator */}
        <div className={SHELL}>
          <PracticeGrowthCalculator
            courseName={p.name}
            courseSlug={p.slug}
            defaultSpecialty={p.specialty}
          />
        </div>

        {/* ══════════════════════════════════════════════════════════════
            § 6 — INVESTMENT
        ══════════════════════════════════════════════════════════════ */}
        {priceText && (
          <section aria-labelledby="investment-title" className={SECTION}>
            <h2 id="investment-title" className={`text-center ${HEADING}`}>
              One Fellowship,
              <br />A Lifetime of Clinical Impact
            </h2>

            <div className="mt-10 rounded-[12px] border-[1.5px] border-[#4A4A4A] bg-ink-800 p-7 sm:mt-16 sm:p-12">
              <div className="grid gap-10 lg:grid-cols-2">
                <div>
                  <p className="text-[17px] text-[#A5A5A5]">Course Investment</p>
                  <p className="mt-3 flex flex-wrap items-baseline gap-x-3 text-white">
                    <span className="text-[clamp(1.75rem,3.2vw,2.75rem)] font-bold leading-none">
                      ₹ {priceText}
                    </span>
                    <span className="text-lg font-bold text-[#A5A5A5]">+ GST</span>
                  </p>
                  <p className="mt-4 text-[15px] text-[#A5A5A5]">
                    More than a fellowship — an investment in mastery.
                  </p>
                  {p.moneyBackDays ? (
                    <p className="mt-2 text-sm text-[#A5A5A5]">
                      {p.moneyBackDays}-day refund window. See our{" "}
                      <Link href="/refunds" className="underline underline-offset-4 hover:text-white">
                        refund policy
                      </Link>
                      .
                    </p>
                  ) : null}
                </div>

                <ul className="flex flex-col gap-[13px] lg:justify-self-end">
                  {inclusions.map((item) => (
                    <li key={item} className="flex items-start gap-3.5 text-white">
                      <Check aria-hidden className="mt-0.5 h-[18px] w-[18px] shrink-0" />
                      <span className="text-[15px] leading-snug sm:text-base">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-10 flex flex-col items-stretch gap-3 sm:mt-12 sm:flex-row sm:items-center sm:justify-center">
                <Link
                  href="/contact"
                  className="inline-flex h-12 items-center justify-center rounded-[12px] border-[1.5px] border-[#4A4A4A] bg-[#1A1A1A] px-7 text-sm font-medium text-[#A0A0A0] transition hover:border-white/25 hover:text-white"
                >
                  Speak To Concierge
                </Link>
                <CourseApplyButton
                  courseId={p.id}
                  courseSlug={p.slug}
                  courseName={p.name}
                  mentorName={faculty?.name}
                  brochureUrl={p.brochureUrl}
                  label="Apply for Program"
                  variant="accent"
                />
              </div>
            </div>
          </section>
        )}

        {/* ══════════════════════════════════════════════════════════════
            § 7 — SUPPORTING DETAIL   FAQs · Certificate · other Legends
        ══════════════════════════════════════════════════════════════ */}
        {faqItems.length > 0 && (
          <section aria-labelledby="course-faq-title" className={SECTION}>
            <h2 id="course-faq-title" className={`text-center ${HEADING}`}>
              Frequently asked questions
            </h2>
            <div className="mt-10 sm:mt-16">
              <FaqGrid key={p.slug} items={faqItems} label={p.name} />
            </div>
          </section>
        )}

        {(p.certificateNote || p.sampleCertificateImage) && (
          <section aria-labelledby="cert-title" className={SECTION}>
            <h2 id="cert-title" className={HEADING}>
              Certificate
            </h2>
            <div className="mt-10 grid gap-8 rounded-[12px] border-[1.5px] border-ink-700 bg-ink-800 p-7 sm:grid-cols-[1fr_auto] sm:items-center sm:p-10">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-accent-soft">
                  <Award className="h-3.5 w-3.5" /> Verifiable
                </span>
                <p className="mt-4 text-[15px] leading-relaxed text-[#A5A5A5] sm:text-base">
                  {p.certificateNote ||
                    "Candidates will be awarded a certificate of completion on fulfilling the mentioned minimum criteria."}
                </p>
              </div>
              {p.sampleCertificateImage && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={p.sampleCertificateImage}
                  alt="Sample certificate"
                  className="w-full max-w-[280px] rounded-lg border border-[#4A4A4A]"
                />
              )}
            </div>
          </section>
        )}

        {related.length > 0 && (
          <section aria-labelledby="related-title" className={SECTION}>
            <h2 id="related-title" className={HEADING}>
              From Here, Go Anywhere
            </h2>
            <p className="mt-3 text-[15px] text-[#A5A5A5]">
              Included with a membership. And {related.length}+ more
            </p>
            <ul className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5 lg:gap-5">
              {related.map((d) => (
                <li key={d.id}>
                  <Link
                    href={`/doctors/${d.slug}`}
                    className="group block overflow-hidden rounded-[12px] border border-[#4A4A4A] bg-ink-800 transition hover:border-white/25"
                  >
                    <div className="aspect-[3/4] w-full overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={d.imageUrl}
                        alt={d.name}
                        className="h-full w-full object-cover transition group-hover:scale-105"
                      />
                    </div>
                    <div className="p-4">
                      <p className="text-sm font-semibold text-white">{d.name}</p>
                      <p className="mt-0.5 text-xs text-[#A5A5A5]">{d.title}</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className={`${SHELL} pb-24`}>
          <Link
            href="/programs"
            className="inline-flex items-center gap-2 text-sm text-[#A5A5A5] transition hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to all courses
          </Link>
        </div>
      </main>
      <Footer />
      <CourseStickyFooter
        courseId={p.id}
        courseName={p.name}
        facultyTitle={p.specialistTitle || faculty?.title}
        facultyName={faculty?.name}
        // Fallback chain: explicit faculty image → the course row's own
        // doctorImage/imageUrl → the hero image. Covers merged-module rows
        // where doctor-side `slug`/`name` were left blank so attachFaculty()
        // couldn't link a faculty record, but the row's portrait was still
        // uploaded against the course-side `imageUrl`/`doctorImage` field.
        facultyImageUrl={faculty?.imageUrl || p.doctorImage || p.heroImage}
        brochureUrl={p.brochureUrl}
      />
    </>
  );
}
