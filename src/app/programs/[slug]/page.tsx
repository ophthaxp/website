import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Award,
  Check,
  ClipboardList,
  Users,
  Video,
  Stethoscope,
  BookOpen,
  GraduationCap,
  PhoneCall,
  Sparkles,
} from "lucide-react";

// Rotating icon pool for the Course-format timeline. Admin can add any number
// of phases — we cycle through these so each step gets a relevant glyph.
const FORMAT_ICONS = [ClipboardList, Users, Video, Stethoscope, BookOpen, GraduationCap];
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { TrailerPlayer } from "@/components/TrailerPlayer";
import { CourseRoiBlock } from "@/components/CourseRoiBlock";
import { CourseStickyFooter } from "@/components/CourseStickyFooter";
import { CourseFaqList } from "@/components/CourseFaqList";
import { CourseApplyButton } from "@/components/CourseApplyButton";
import {
  fetchCourseFromBackend,
  fetchCourseSlugsFromBackend,
  fetchDoctorsFromBackend,
  fetchRelatedDoctors,
} from "@/lib/courses";
import type { Doctor, Faculty } from "@/types";
import { formatINR } from "@/lib/utils";
import { buildMetadata, SITE_NAME, SITE_URL } from "@/lib/seo";

export const dynamic = "force-dynamic";

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
  const cta = "Apply Now";
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
      <main className="text-white">
        {/* ══════════════════════════════════════════════════════════════
            § 1 — HERO   Cinematic portrait + fellowship enrollment
        ══════════════════════════════════════════════════════════════ */}
        <section
          aria-labelledby="program-title"
          className="relative overflow-hidden bg-[#06070a]"
        >
          {/* Portrait — full-bleed on mobile, constrained to the left ~62% on
              desktop. It runs a touch past centre so the horizontal scrim can
              fade the right edge into the dark panel with no visible seam. */}
          <div className="absolute inset-y-0 left-0 right-0 lg:right-auto lg:w-[62%]">
            {heroImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={heroImage}
                alt={faculty?.name || p.name}
                className="h-full w-full object-cover object-[center_top]"
              />
            ) : (
              <div className="h-full w-full bg-gradient-to-br from-accent/15 via-ink-900 to-ink-950" />
            )}
          </div>

          {/* Overall mood wash — knocks the photo back so it reads cinematic
              rather than a bright stock shot. */}
          <div className="absolute inset-0 bg-black/25" />

          {/* Mobile scrim — darken the whole photo so bottom text is readable */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#06070a] via-[#06070a]/80 to-[#06070a]/45 lg:hidden" />

          {/* Desktop horizontal scrim — solid dark on the right, then a long,
              gentle fade that carries well past the photo's 62% edge so the
              image dissolves into the panel instead of ending on a hard line. */}
          <div className="absolute inset-0 hidden bg-gradient-to-l from-[#06070a] from-42% via-[#06070a]/85 via-62% to-transparent to-90% lg:block" />

          {/* Desktop vertical vignette — subtle top/bottom darkening for depth. */}
          <div className="absolute inset-0 hidden bg-gradient-to-b from-[#06070a]/55 via-transparent to-[#06070a]/65 lg:block" />

          {/* Content — text column pinned to the right on desktop */}
          <div className="relative mx-auto flex min-h-[86svh] max-w-[1500px] flex-col justify-end px-6 pb-16 pt-40 sm:px-16 lg:min-h-[92svh] lg:flex-row lg:justify-end lg:px-24 lg:pb-0 lg:pt-0">
            <div className="flex w-full flex-col items-center justify-center text-center lg:w-[46%] lg:py-24">
              {/* Title (marketing headline; falls back to the raw name) */}
              <h1
                id="program-title"
                className="font-serif text-4xl leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-[3.4rem]"
              >
                {p.headline || p.name}
              </h1>

              <span aria-hidden className="mt-6 block h-px w-8 bg-white/40" />

              {/* Hero credit — link to the doctor page when a faculty record
                  resolved; otherwise fall back to the mentor name carried on
                  the course row so the "with Dr. …" line always appears. */}
              {faculty?.name ? (
                <Link
                  href={`/doctors/${faculty.slug}`}
                  className="mt-6 text-sm text-white/55 transition hover:text-white"
                >
                  with{" "}
                  <span className="font-semibold text-white">
                    Dr. {faculty.name.replace(/^Dr\.?\s+/i, "")}
                  </span>
                </Link>
              ) : mentorName ? (
                <p className="mt-6 text-sm text-white/55">
                  with{" "}
                  <span className="font-semibold text-white">
                    Dr. {mentorName.replace(/^Dr\.?\s+/i, "")}
                  </span>
                </p>
              ) : null}

              {p.tagline && (
                <p className="mt-5 max-w-md text-sm leading-relaxed text-white/60 sm:text-[15px]">
                  {p.tagline}
                </p>
              )}

              {p.trailerVideoUrl && (
                <a
                  href="#trailer"
                  className="mt-6 text-sm font-semibold text-white underline decoration-white/40 underline-offset-4 transition hover:decoration-white"
                >
                  Watch Trailer
                </a>
              )}

              {/* Stat strip — duration · cohort · launch */}
              {(heroDuration || p.cohortSize || launchLabel) && (
                <div className="mt-10 flex items-stretch justify-center divide-x divide-white/10 text-center">
                  {heroDuration && (
                    <div className="px-5 sm:px-7">
                      <p className="font-serif text-xl font-semibold text-white sm:text-2xl">
                        {heroDuration}
                      </p>
                      <p className="mt-1.5 text-[11px] uppercase tracking-[0.14em] text-white/45">
                        Fellowship duration
                      </p>
                    </div>
                  )}
                  {p.cohortSize ? (
                    <div className="px-5 sm:px-7">
                      <p className="font-serif text-xl font-semibold text-white sm:text-2xl">
                        {String(p.cohortSize).padStart(2, "0")}
                      </p>
                      <p className="mt-1.5 text-[11px] uppercase tracking-[0.14em] text-white/45">
                        Cohort Size
                      </p>
                    </div>
                  ) : null}
                  {launchLabel && (
                    <div className="px-5 sm:px-7">
                      <p className="font-serif text-xl font-semibold text-white sm:text-2xl">
                        {launchLabel}
                      </p>
                      <p className="mt-1.5 text-[11px] uppercase tracking-[0.14em] text-white/45">
                        Program Begins
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Enrollment card */}
              <div className="mt-10 w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-sm">
                <p className="text-sm font-semibold text-white">
                  Fellowship Enrollment
                </p>
                <div className="mt-4">
                  <CourseApplyButton
                    courseId={p.id}
                    courseName={p.name}
                    mentorName={faculty?.name}
                    brochureUrl={p.brochureUrl}
                    label={enrollLabel}
                    block
                  />
                </div>
                <p className="mt-4 text-xs leading-relaxed text-white/45">
                  Every module is designed to translate directly into clinical
                  practice.
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
            className="scroll-mt-24 bg-[#06070a] pb-4 pt-14 sm:pt-20"
          >
            <div className="mx-auto max-w-[1500px] px-6 sm:px-16 lg:px-24">
              <h2
                id="legend-title"
                className="font-serif text-3xl leading-tight text-white sm:text-4xl"
              >
                Meet your Legend
              </h2>
              <div className="mt-8 overflow-hidden rounded-3xl border border-white/10 bg-black">
                <TrailerPlayer
                  src={p.trailerVideoUrl}
                  poster={heroImage}
                  title={`${faculty?.name || p.name} — Documentary Trailer`}
                  className="aspect-video w-full"
                />
              </div>
            </div>
          </section>
        )}

        {/* ── Remaining detail sections (constrained column) ── */}
        <div className="mx-auto max-w-[1500px] px-6 py-10 pb-28 sm:px-16 sm:py-14 sm:pb-32 lg:px-24">
          {/* Back link */}
          <Link
            href="/programs"
            className="inline-flex items-center gap-2 text-sm text-white/55 transition hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to all courses
          </Link>

        {/* Faculty card */}
        {faculty && (
          <section aria-labelledby="faculty-title" className="mt-14">
            <h2
              id="faculty-title"
              className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[#a88251]"
            >
              Faculty
            </h2>
            <div className="card mt-3 flex items-start gap-5 p-5 sm:p-6">
              {faculty.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={faculty.imageUrl}
                  alt={faculty.name}
                  className="h-16 w-16 shrink-0 rounded-full border border-white/10 object-cover sm:h-20 sm:w-20"
                />
              ) : (
                <div className="h-16 w-16 shrink-0 rounded-full bg-accent/20 sm:h-20 sm:w-20" />
              )}
              <div className="min-w-0 flex-1">
                <Link
                  href={`/doctors/${faculty.slug}`}
                  className="font-serif text-xl text-white transition hover:text-accent-soft sm:text-2xl"
                >
                  {faculty.name}
                </Link>
                {faculty.city && (
                  <p className="text-sm text-white/55">{faculty.city}</p>
                )}
                <p className="mt-3 text-sm leading-relaxed text-white/75 sm:text-[15px]">
                  {faculty.title}
                </p>
                {faculty.qualification && (
                  <p className="mt-2 text-xs uppercase tracking-wider text-white/45">
                    {faculty.qualification}
                    {faculty.experienceYears
                      ? ` · ${faculty.experienceYears} yrs experience`
                      : ""}
                  </p>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Eligibility */}
        {p.eligibility && (
          <section aria-labelledby="eligibility-title" className="mt-14">
            <h2
              id="eligibility-title"
              className="font-serif text-3xl text-white sm:text-4xl"
            >
              The Roadmap
            </h2>
            <p className="mt-4 whitespace-pre-line text-base leading-relaxed text-white/75 sm:text-lg">
              {p.eligibility}
            </p>
          </section>
        )}

        {/* "What you will learn" + "Curriculum highlights" — paired inside a
            single rounded container with a visual divider, so the two columns
            read as one cohesive component instead of competing styles. Rows on
            each side share the same height rhythm (separator lines + accent
            glyph + text), giving the section a balanced grid feel. */}
        {((p.whatYouWillLearn && p.whatYouWillLearn.length > 0) ||
          (p.curriculumHighlights && p.curriculumHighlights.length > 0)) && (
          <div className="mt-16 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.04] via-white/[0.015] to-transparent">
            <div className="grid gap-px bg-white/10 lg:grid-cols-2">
              {/* What you will learn */}
              {p.whatYouWillLearn && p.whatYouWillLearn.length > 0 && (
                <section
                  aria-labelledby="learn-title"
                  className="bg-ink-950/40 p-7 sm:p-9"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[#ab834d]">
                    Outcomes
                  </p>
                  <h2
                    id="learn-title"
                    className="mt-2 font-serif text-2xl leading-tight text-white sm:text-3xl"
                  >
                    What you will learn
                  </h2>

                  <ul className="mt-6 divide-y divide-white/5">
                    {p.whatYouWillLearn.map((item, i) => (
                      <li
                        key={`learn-${i}`}
                        className="flex items-start gap-3 py-3.5 first:pt-0 last:pb-0"
                      >
                        <span
                          aria-hidden
                          className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/20 text-accent-soft"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </span>
                        <span className="text-sm leading-relaxed text-white/85 sm:text-[15px]">
                          {item}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* Curriculum highlights */}
              {p.curriculumHighlights && p.curriculumHighlights.length > 0 && (
                <section
                  aria-labelledby="curriculum-title"
                  className="bg-ink-950/40 p-7 sm:p-9"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[#ab834d]">
                    Curriculum
                  </p>
                  <h2
                    id="curriculum-title"
                    className="mt-2 font-serif text-2xl leading-tight text-white sm:text-3xl"
                  >
                    Highlights
                  </h2>

                  <ol className="mt-6 divide-y divide-white/5">
                    {p.curriculumHighlights.map((item, i) => (
                      <li
                        key={`curr-${i}`}
                        className="flex items-start gap-4 py-3.5 first:pt-0 last:pb-0"
                      >
                        <span
                          aria-hidden
                          className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[#ab834d]/40 bg-[#ab834d]/10 font-serif text-[11px] font-semibold tabular-nums text-[#d6a76b]"
                        >
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <span className="text-sm leading-relaxed text-white/85 sm:text-[15px]">
                          {item}
                        </span>
                      </li>
                    ))}
                  </ol>
                </section>
              )}
            </div>
          </div>
        )}

        {/* Course format — horizontal step timeline */}
        {p.courseFormat && p.courseFormat.length > 0 && (
          <section
            aria-labelledby="format-title"
            className="mt-20 sm:mt-24"
          >
            {/* Centered header */}
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[#ab834d]">
                Course Format
              </p>
              <h2
                id="format-title"
                className="mt-4 font-serif text-4xl leading-tight text-white sm:text-5xl"
              >
                How your cohort unfolds
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-sm text-white/55 sm:text-base">
                A mentor-led path designed to take you from first session to
                surgical confidence.
              </p>
            </div>

            {/* Steps grid */}
            <ol
              className={`relative mx-auto mt-16 grid gap-12 sm:gap-8 ${
                p.courseFormat.length === 1
                  ? "max-w-md grid-cols-1"
                  : p.courseFormat.length === 2
                    ? "max-w-3xl grid-cols-1 sm:grid-cols-2"
                    : p.courseFormat.length === 3
                      ? "max-w-5xl grid-cols-1 sm:grid-cols-3"
                      : "max-w-6xl grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
              }`}
            >
              {/* Faint horizontal connector line — sits behind the circles on
                  sm+ where the layout is horizontal. Hidden on mobile (stacked). */}
              {p.courseFormat.length > 1 && (
                <span
                  aria-hidden
                  className="pointer-events-none absolute left-12 right-12 top-[42px] hidden h-px bg-gradient-to-r from-transparent via-white/15 to-transparent sm:block"
                />
              )}

              {p.courseFormat.map((phase, i) => {
                const Icon = FORMAT_ICONS[i % FORMAT_ICONS.length];
                const stepNum = String(i + 1).padStart(2, "0");
                return (
                  <li
                    key={`phase-${i}`}
                    className="relative flex flex-col items-center text-center"
                  >
                    {/* Faint giant step number behind the icon */}
                    <span
                      aria-hidden
                      className="pointer-events-none absolute top-2 select-none font-serif text-7xl font-bold leading-none text-white/[0.04] sm:text-8xl"
                    >
                      {stepNum}
                    </span>
                    {/* Circle icon */}
                    <span
                      aria-hidden
                      className="relative z-10 inline-flex h-[84px] w-[84px] items-center justify-center rounded-full border border-[#ab834d]/40 bg-ink-950"
                    >
                      <Icon className="h-7 w-7 text-[#ab834d]" />
                    </span>
                    {/* Step label */}
                    <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#ab834d]">
                      Step {stepNum}
                    </p>
                    {/* Title (phase name) */}
                    <h3 className="mt-3 font-serif text-2xl leading-tight text-white sm:text-3xl">
                      {phase.phase}
                    </h3>
                    {/* Description */}
                    <p className="mt-3 max-w-[260px] text-sm leading-relaxed text-white/60">
                      {phase.description}
                    </p>
                  </li>
                );
              })}
            </ol>
          </section>
        )}

        {/* ROI calculator — render unconditionally so visitors always see the
            projection. Wrapped in CourseRoiBlock so the "Know more" CTA opens
            the brochure form prefilled with this course's context. */}
        <CourseRoiBlock
          courseId={p.id}
          courseName={p.name}
          courseSlug={p.slug}
          defaultSpecialty={p.specialty}
          mentorName={faculty?.name}
          brochureUrl={p.brochureUrl}
        />

        {/* How it works — three fixed steps from interest to first cohort call */}
        <section aria-labelledby="how-it-works-title" className="mt-20 sm:mt-24">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[#ab834d]">
              How it works
            </p>
            <h2
              id="how-it-works-title"
              className="mt-4 font-serif text-4xl leading-tight text-white sm:text-5xl"
            >
              Three steps from interest to your first cohort call
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-sm text-white/55 sm:text-base">
              A simple, mentor-led path designed to align outcomes from day one.
            </p>
          </div>

          <ol className="relative mx-auto mt-16 grid max-w-5xl grid-cols-1 gap-12 sm:grid-cols-3 sm:gap-8">
            <span
              aria-hidden
              className="pointer-events-none absolute left-12 right-12 top-[42px] hidden h-px bg-gradient-to-r from-transparent via-white/15 to-transparent sm:block"
            />
            {[
              {
                Icon: ClipboardList,
                title: "Apply",
                description:
                  "Tell us about your practice and the outcomes you want.",
              },
              {
                Icon: PhoneCall,
                title: "Talk to the Legend",
                description:
                  "1:1 discovery call with the mentor to align on goals.",
              },
              {
                Icon: Sparkles,
                title: "Onboarding",
                description:
                  "Cohort kickoff, schedule and private community access.",
              },
            ].map(({ Icon, title, description }, i) => {
              const stepNum = String(i + 1).padStart(2, "0");
              return (
                <li
                  key={`hiw-${i}`}
                  className="relative flex flex-col items-center text-center"
                >
                  <span
                    aria-hidden
                    className="pointer-events-none absolute top-2 select-none font-serif text-7xl font-bold leading-none text-white/[0.04] sm:text-8xl"
                  >
                    {stepNum}
                  </span>
                  <span
                    aria-hidden
                    className="relative z-10 inline-flex h-[84px] w-[84px] items-center justify-center rounded-full border border-[#ab834d]/40 bg-ink-950"
                  >
                    <Icon className="h-7 w-7 text-[#ab834d]" />
                  </span>
                  <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#ab834d]">
                    Step {stepNum}
                  </p>
                  <h3 className="mt-3 font-serif text-2xl leading-tight text-white sm:text-3xl">
                    {title}
                  </h3>
                  <p className="mt-3 max-w-[260px] text-sm leading-relaxed text-white/60">
                    {description}
                  </p>
                </li>
              );
            })}
          </ol>
        </section>

        {/* Investment — single horizontal pricing card */}
        {p.priceInr ? (
          <section aria-labelledby="investment-title" className="mt-20 sm:mt-24">
            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.04] via-white/[0.015] to-transparent p-6 sm:p-8">
              <div className="grid gap-6 sm:grid-cols-[1fr_auto] sm:items-center">
                <div>
                  <p
                    id="investment-title"
                    className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[#ab834d]"
                  >
                    Investment
                  </p>
                  <p className="mt-3 font-serif text-4xl leading-none text-white sm:text-5xl">
                    {formatINR(p.priceInr)}
                  </p>
                  <p className="mt-2 text-sm text-white/55">
                    {p.pricePerDayInr ? `Starting at ₹${p.pricePerDayInr}/day · ` : ""}
                    excluding GST
                  </p>
                  <span className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#ab834d]/40 bg-[#ab834d]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#d6a76b]">
                    <span aria-hidden>✦</span>
                    Scholarships available
                  </span>
                </div>
                <div className="sm:justify-self-end">
                  <CourseApplyButton
                    courseId={p.id}
                    courseName={p.name}
                    mentorName={faculty?.name}
                    brochureUrl={p.brochureUrl}
                    label={cta}
                  />
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {/* Certificate */}
        {(p.certificateNote || p.sampleCertificateImage) && (
          <section aria-labelledby="cert-title" className="mt-14">
            <h2
              id="cert-title"
              className="font-serif text-3xl text-white sm:text-4xl"
            >
              Certificate
            </h2>
            <div className="card mt-6 grid gap-6 p-5 sm:grid-cols-[1fr_auto] sm:items-center sm:p-7">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full border border-[#a88251]/40 bg-[#a88251]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-[#d6a76b]">
                  <Award className="h-3.5 w-3.5" /> Verifiable
                </span>
                <p className="mt-4 text-base leading-relaxed text-white/80 sm:text-lg">
                  {p.certificateNote ||
                    "Candidates will be awarded a certificate of completion on fulfilling the mentioned minimum criteria."}
                </p>
              </div>
              {p.sampleCertificateImage && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={p.sampleCertificateImage}
                  alt="Sample certificate"
                  className="w-full max-w-[280px] rounded-xl border border-white/10 shadow-xl"
                />
              )}
            </div>
          </section>
        )}

        {/* Course-specific highlights (card-level) */}
        {p.highlights.length > 0 && (
          <section aria-labelledby="highlights-title" className="mt-14">
            <h2
              id="highlights-title"
              className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[#a88251]"
            >
              Highlights
            </h2>
            <ul className="mt-3 space-y-2 text-white/80">
              {p.highlights.map((h) => (
                <li key={h} className="flex gap-2">
                  <span aria-hidden className="text-accent-soft">◆</span>
                  {h}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* FAQs */}
        {p.faqs && p.faqs.length > 0 && (
          <section aria-labelledby="faqs-title" className="mt-14">
            <h2
              id="faqs-title"
              className="font-serif text-3xl text-white sm:text-4xl"
            >
              Frequently asked questions
            </h2>
            <div className="mt-6">
              <CourseFaqList items={p.faqs} />
            </div>
          </section>
        )}

        {/* Related doctors carousel */}
        {related.length > 0 && (
          <section className="mt-16">
            <h2 className="font-serif text-3xl text-white sm:text-4xl">
              From Here, Go Anywhere
            </h2>
            <p className="mt-1 text-sm text-white/55">
              Included with a membership. And {related.length}+ more
            </p>
            <div className="mt-6 grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
              {related.map((d) => (
                <Link
                  key={d.id}
                  href={`/doctors/${d.slug}`}
                  className="group block overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] transition hover:bg-white/[0.06]"
                >
                  <div className="aspect-[3/4] w-full overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={d.imageUrl}
                      alt={d.name}
                      className="h-full w-full object-cover transition group-hover:scale-105"
                    />
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-semibold text-white">{d.name}</p>
                    <p className="mt-0.5 text-xs text-white/55">{d.title}</p>
                    <p className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-white/80">
                      ▶ Watch Trailer
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
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
