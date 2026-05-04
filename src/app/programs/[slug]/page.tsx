import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { PROGRAMS } from "@/lib/data";
import { formatINR } from "@/lib/utils";
import { buildMetadata, SITE_NAME, SITE_URL } from "@/lib/seo";

export function generateStaticParams() {
  return PROGRAMS.map((p) => ({ slug: p.slug }));
}

export function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Metadata {
  const p = PROGRAMS.find((x) => x.slug === params.slug);
  if (!p) return buildMetadata({ title: "Program not found" });
  return buildMetadata({
    title: p.name,
    description: p.description,
    alternates: { canonical: `/programs/${p.slug}` },
  });
}

export default function ProgramDetailPage({ params }: { params: { slug: string } }) {
  const p = PROGRAMS.find((x) => x.slug === params.slug);
  if (!p) notFound();

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
      <main className="mx-auto max-w-3xl px-5 py-16 sm:px-8 sm:py-24">
        <p className="text-xs uppercase tracking-wider text-accent-soft">
          {p.specialty}
        </p>
        <h1 className="mt-2 font-serif text-4xl leading-tight text-white sm:text-5xl">
          {p.name}
        </h1>
        <p className="mt-4 text-white/70">{p.description}</p>

        <dl className="mt-8 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
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

        <h2 className="mt-10 text-sm font-semibold uppercase tracking-wider text-white/60">
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
      </main>
      <Footer />
    </>
  );
}
