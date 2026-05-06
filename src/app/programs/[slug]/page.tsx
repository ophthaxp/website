import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
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
    title: p.name,
    description: p.description,
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

export default async function ProgramDetailPage({ params }: { params: { slug: string } }) {
  const p = await fetchCourseFromBackend(params.slug);
  if (!p) notFound();

  const related = await fetchRelatedDoctors(p.relatedDoctorSlugs ?? []);
  const durationLabel = formatDuration(p.durationMinutes);

  const courseLd = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: p.name,
    description: p.description,
    provider: { "@type": "Organization", name: SITE_NAME, sameAs: SITE_URL },
    hasCourseInstance: {
      "@type": "CourseInstance",
      courseMode: "online",
      startDate: p.startDate,
      duration: `P${p.durationWeeks}W`,
    },
    offers: {
      "@type": "Offer",
      price: p.priceInr,
      priceCurrency: "INR",
      availability: "https://schema.org/InStock",
      url: `${SITE_URL}/programs/${p.slug}`,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(courseLd) }}
      />
      <Navbar />
      <main className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-16">
        {/* Hero: image + info card */}
        <section className="grid gap-8 lg:grid-cols-2 lg:items-stretch">
          {p.doctorImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={p.doctorImage}
              alt={p.name}
              className="aspect-[4/5] w-full rounded-2xl object-cover"
            />
          ) : (
            <div className="aspect-[4/5] w-full rounded-2xl bg-gradient-to-br from-fuchsia-700/40 to-violet-900/40" />
          )}

          <div className="flex flex-col justify-center">
            <h1 className="font-serif text-4xl leading-tight text-white sm:text-5xl">
              {p.name}
            </h1>
            <p className="mt-4 flex items-center gap-3 text-xs uppercase tracking-wider text-white/60">
              <span aria-hidden className="h-px w-8 bg-white/30" />
              Teaches {p.specialistTitle ?? p.specialty}
            </p>

            {(p.city || p.experienceYears) && (
              <p className="mt-6 font-semibold text-white">
                {p.city}
                {p.city && p.experienceYears ? " · " : ""}
                {p.experienceYears ? `${p.experienceYears} years of experience` : ""}
              </p>
            )}

            {p.bio && <p className="mt-3 text-white/70">{p.bio}</p>}

            {(p.lessonsCount || durationLabel || p.trailerVideoUrl) && (
              <p className="mt-6 flex items-center gap-4 text-sm text-white/80">
                {p.lessonsCount ? <span>{p.lessonsCount} Lessons</span> : null}
                {durationLabel ? <span>· {durationLabel}</span> : null}
                {p.trailerVideoUrl ? (
                  <a
                    href={p.trailerVideoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="ml-3 font-semibold text-white underline-offset-4 hover:underline"
                  >
                    Watch Trailer
                  </a>
                ) : null}
              </p>
            )}

            <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.04] p-5">
              <p className="text-center text-sm font-semibold text-white">
                Get this class and 7+ more
              </p>
              <button
                type="button"
                className="mt-4 w-full rounded-full bg-pink-500 py-3 text-sm font-semibold text-white transition hover:bg-pink-600"
              >
                Get Mentorship
              </button>
            </div>
            {p.priceInr ? (
              <p className="mt-4 text-xs text-white/55">
                Starting at{" "}
                <span className="font-semibold text-white">
                  {p.pricePerDayInr ? `₹${p.pricePerDayInr}/day` : `${formatINR(p.priceInr)}/year`}
                </span>
                {p.billingPeriod === "annual" ? ", billed annually" : null}
                {p.moneyBackDays ? `. ${p.moneyBackDays}-day money back guaranteed.` : null}
              </p>
            ) : null}
          </div>
        </section>

        {/* Cohort facts */}
        <dl className="mt-12 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
          <div className="card p-4">
            <dt className="text-white/50">Duration</dt>
            <dd className="mt-1 font-semibold text-white">{p.durationWeeks} weeks</dd>
          </div>
          <div className="card p-4">
            <dt className="text-white/50">Cohort</dt>
            <dd className="mt-1 font-semibold text-white">{p.cohortSize} seats</dd>
          </div>
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
          <div className="card p-4">
            <dt className="text-white/50">Fee</dt>
            <dd className="mt-1 font-semibold text-white">{formatINR(p.priceInr)}</dd>
          </div>
        </dl>

        {/* Highlights */}
        {p.highlights.length > 0 && (
          <>
            <h2 className="mt-12 text-sm font-semibold uppercase tracking-wider text-white/60">
              Highlights
            </h2>
            <ul className="mt-3 space-y-2 text-white/80">
              {p.highlights.map((h) => (
                <li key={h} className="flex gap-2">
                  <span aria-hidden className="text-accent-soft">
                    ◆
                  </span>
                  {h}
                </li>
              ))}
            </ul>
          </>
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
      </main>
      <Footer />
    </>
  );
}
