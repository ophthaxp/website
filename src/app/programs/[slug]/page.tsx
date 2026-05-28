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
} from "lucide-react";

// Rotating icon pool for the Course-format timeline. Admin can add any number
// of phases — we cycle through these so each step gets a relevant glyph.
const FORMAT_ICONS = [ClipboardList, Users, Video, Stethoscope, BookOpen, GraduationCap];
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { TrailerPlayer } from "@/components/TrailerPlayer";
import { PracticeGrowthCalculator } from "@/components/PracticeGrowthCalculator";
import { CourseFaqList } from "@/components/CourseFaqList";
import { CourseApplyButton } from "@/components/CourseApplyButton";
import {
  fetchCourseFromBackend,
  fetchCourseSlugsFromBackend,
  fetchRelatedDoctors,
} from "@/lib/courses";
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

export default async function ProgramDetailPage({ params }: { params: { slug: string } }) {
  const p = await fetchCourseFromBackend(params.slug);
  if (!p) notFound();

  const related = await fetchRelatedDoctors(p.relatedDoctorSlugs ?? []);
  const durationLabel = formatDuration(p.durationMinutes);
  const launchLabel = formatLaunch(p);
  const cta = "Apply Now";

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
    instructor: p.faculty
      ? {
          "@type": "Person",
          name: p.faculty.name,
          jobTitle: p.faculty.title,
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
      <main className="mx-auto max-w-[1500px] px-6 py-10 sm:px-16 sm:py-14 lg:px-24">
        {/* Back link */}
        <Link
          href="/programs"
          className="inline-flex items-center gap-2 text-sm text-white/55 transition hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to all courses
        </Link>

        {/* Hero: trailer/cover (60%) + info card (40%) */}
        <section className="mt-6 grid gap-8 lg:grid-cols-[6fr_4fr] lg:items-stretch">
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-accent/15 via-ink-900 to-ink-950">
            <div className="relative aspect-video w-full lg:aspect-auto lg:h-full lg:min-h-[460px]">
              {p.trailerVideoUrl ? (
                // Cover poster doubles as the play surface — click anywhere on
                // the image to start the trailer inline (TrailerPlayer handles
                // YouTube, Vimeo, and direct mp4/webm/mov).
                <TrailerPlayer
                  src={p.trailerVideoUrl}
                  poster={p.heroImage}
                  title={`${p.name} — Trailer`}
                  className="absolute inset-0 h-full w-full"
                />
              ) : p.heroImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={p.heroImage}
                  alt={p.name}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[#ab834d]">
                    Trailer
                  </span>
                  <span className="mt-1 text-sm text-white/70">Coming soon</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col justify-center">
            {/* Course title — prefer marketing headline, fall back to specialist
                title, then to the raw course name so the heading is always set. */}
            <h1 className="font-serif text-3xl leading-tight text-white sm:text-4xl lg:text-[2.6rem]">
              {p.headline || p.specialistTitle || p.name}
            </h1>
            {p.faculty?.name && (
              <p className="mt-3 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.28em] text-white/55">
                <span aria-hidden className="h-px w-6 bg-white/40" />
                <span>
                  By{" "}
                  <Link
                    href={`/doctors/${p.faculty.slug}`}
                    className="text-white transition hover:text-accent-soft"
                  >
                    Dr. {p.faculty.name.replace(/^Dr\.?\s+/i, "")}
                  </Link>
                </span>
              </p>
            )}
            {p.tagline && (
              <p className="mt-5 text-base leading-relaxed text-white/75 sm:text-lg">
                {p.tagline}
              </p>
            )}

            {/* Quick facts — stacked vertical list under the tagline */}
            {(launchLabel ||
              p.durationMonths ||
              p.durationWeeks ||
              p.lessonsCount ||
              durationLabel ||
              p.cohortSize ||
              p.startDate ||
              p.priceInr) && (
              <ul className="mt-6 divide-y divide-white/10 border-y border-white/10 text-sm">
                {launchLabel && (
                  <li className="flex items-center justify-between py-2.5">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-accent-soft">
                      Launches
                    </span>
                    <span className="text-white/85">{launchLabel}</span>
                  </li>
                )}
                {(p.durationMonths || p.durationWeeks) && (
                  <li className="flex items-center justify-between py-2.5">
                    <span className="text-white/55">Duration</span>
                    <span className="text-white/85">
                      {p.durationMonths
                        ? `${p.durationMonths} months`
                        : `${p.durationWeeks} weeks`}
                    </span>
                  </li>
                )}
                {p.lessonsCount ? (
                  <li className="flex items-center justify-between py-2.5">
                    <span className="text-white/55">Lessons</span>
                    <span className="text-white/85">{p.lessonsCount}</span>
                  </li>
                ) : null}
                {durationLabel && !p.durationMonths && !p.durationWeeks ? (
                  <li className="flex items-center justify-between py-2.5">
                    <span className="text-white/55">Length</span>
                    <span className="text-white/85">{durationLabel}</span>
                  </li>
                ) : null}
                {p.cohortSize ? (
                  <li className="flex items-center justify-between py-2.5">
                    <span className="text-white/55">Cohort</span>
                    <span className="text-white/85">
                      {p.cohortSize} seats
                    </span>
                  </li>
                ) : null}
                {p.startDate ? (
                  <li className="flex items-center justify-between py-2.5">
                    <span className="text-white/55">Starts</span>
                    <span className="text-white/85">
                      {new Date(p.startDate).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </li>
                ) : null}
                {p.priceInr ? (
                  <li className="flex items-center justify-between py-2.5">
                    <span className="text-white/55">Fee</span>
                    <span className="text-white/85">
                      {p.pricePerDayInr
                        ? `₹${p.pricePerDayInr}/day`
                        : formatINR(p.priceInr)}
                      {p.billingPeriod === "annual" ? " · annually" : null}
                    </span>
                  </li>
                ) : null}
              </ul>
            )}

            <div className="mt-7">
              <CourseApplyButton
                courseId={p.id}
                courseName={p.name}
                mentorName={p.faculty?.name}
                brochureUrl={p.brochureUrl}
                label={cta}
                block
              />
              {p.brochureUrl && (
                <a
                  href={p.brochureUrl}
                  target="_blank"
                  rel="noopener"
                  className="mt-3 block text-center text-xs text-white/55 underline-offset-4 hover:text-white hover:underline"
                >
                  Download brochure (PDF)
                </a>
              )}
            </div>
          </div>
        </section>

        {/* Faculty card */}
        {p.faculty && (
          <section aria-labelledby="faculty-title" className="mt-14">
            <h2
              id="faculty-title"
              className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[#a88251]"
            >
              Faculty
            </h2>
            <div className="card mt-3 flex items-start gap-5 p-5 sm:p-6">
              {p.faculty.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={p.faculty.imageUrl}
                  alt={p.faculty.name}
                  className="h-16 w-16 shrink-0 rounded-full border border-white/10 object-cover sm:h-20 sm:w-20"
                />
              ) : (
                <div className="h-16 w-16 shrink-0 rounded-full bg-accent/20 sm:h-20 sm:w-20" />
              )}
              <div className="min-w-0 flex-1">
                <Link
                  href={`/doctors/${p.faculty.slug}`}
                  className="font-serif text-xl text-white transition hover:text-accent-soft sm:text-2xl"
                >
                  {p.faculty.name}
                </Link>
                {p.faculty.city && (
                  <p className="text-sm text-white/55">{p.faculty.city}</p>
                )}
                <p className="mt-3 text-sm leading-relaxed text-white/75 sm:text-[15px]">
                  {p.faculty.title}
                </p>
                {p.faculty.qualification && (
                  <p className="mt-2 text-xs uppercase tracking-wider text-white/45">
                    {p.faculty.qualification}
                    {p.faculty.experienceYears
                      ? ` · ${p.faculty.experienceYears} yrs experience`
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
              Eligibility
            </h2>
            <p className="mt-4 whitespace-pre-line text-base leading-relaxed text-white/75 sm:text-lg">
              {p.eligibility}
            </p>
          </section>
        )}

        {/* What you will learn */}
        {p.whatYouWillLearn && p.whatYouWillLearn.length > 0 && (
          <section aria-labelledby="learn-title" className="mt-14">
            <h2
              id="learn-title"
              className="font-serif text-3xl text-white sm:text-4xl"
            >
              What you will learn
            </h2>
            <ul className="mt-6 grid gap-3 sm:grid-cols-2">
              {p.whatYouWillLearn.map((item, i) => (
                <li
                  key={`learn-${i}`}
                  className="card flex items-start gap-3 p-4 sm:p-5"
                >
                  <span
                    aria-hidden
                    className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/20 text-accent-soft"
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
          <section aria-labelledby="curriculum-title" className="mt-14">
            <h2
              id="curriculum-title"
              className="font-serif text-3xl text-white sm:text-4xl"
            >
              Curriculum highlights
            </h2>
            <ul className="mt-6 space-y-3">
              {p.curriculumHighlights.map((item, i) => (
                <li
                  key={`curr-${i}`}
                  className="flex items-start gap-3 text-sm leading-relaxed text-white/80 sm:text-[15px]"
                >
                  <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent-soft" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>
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

        {/* Cohort facts */}
        {(p.durationWeeks || p.cohortSize || p.priceInr || p.startDate) && (
          <dl className="mt-14 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
            {(p.durationMonths || p.durationWeeks) && (
              <div className="card p-4">
                <dt className="text-white/50">Duration</dt>
                <dd className="mt-1 font-semibold text-white">
                  {p.durationMonths
                    ? `${p.durationMonths} months`
                    : `${p.durationWeeks} weeks`}
                </dd>
              </div>
            )}
            {p.cohortSize ? (
              <div className="card p-4">
                <dt className="text-white/50">Cohort</dt>
                <dd className="mt-1 font-semibold text-white">{p.cohortSize} seats</dd>
              </div>
            ) : null}
            {p.startDate && (
              <div className="card p-4">
                <dt className="text-white/50">Starts</dt>
                <dd className="mt-1 font-semibold text-white">
                  {new Date(p.startDate).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </dd>
              </div>
            )}
            {p.priceInr ? (
              <div className="card p-4">
                <dt className="text-white/50">Fee</dt>
                <dd className="mt-1 font-semibold text-white">{formatINR(p.priceInr)}</dd>
              </div>
            ) : null}
          </dl>
        )}

        {/* ROI calculator */}
        {p.priceInr ? (
          <PracticeGrowthCalculator
            defaultSpecialty={p.specialty}
            courseTuitionInr={p.priceInr}
          />
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

        {/* Final CTA banner */}
        <section className="mt-20 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-accent/15 via-ink-900 to-ink-950 p-8 sm:p-12">
          <div className="grid gap-6 sm:grid-cols-[1fr_auto] sm:items-center">
            <div>
              <h3 className="font-serif text-2xl text-white sm:text-3xl">
                Ready to shift from theory to surgical confidence?
              </h3>
              <p className="mt-2 text-sm text-white/65 sm:text-base">
                Seats are limited each cohort. Apply now and we&apos;ll reach out as soon as your application is reviewed.
              </p>
            </div>
            <CourseApplyButton
              courseId={p.id}
              courseName={p.name}
              mentorName={p.faculty?.name}
              brochureUrl={p.brochureUrl}
              label={cta}
            />
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
