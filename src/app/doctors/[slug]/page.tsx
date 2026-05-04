import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { DOCTORS } from "@/lib/data";
import { buildMetadata, SITE_URL } from "@/lib/seo";

export function generateStaticParams() {
  return DOCTORS.map((d) => ({ slug: d.slug }));
}

export function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Metadata {
  const d = DOCTORS.find((x) => x.slug === params.slug);
  if (!d) return buildMetadata({ title: "Mentor not found" });
  return buildMetadata({
    title: `${d.name} — ${d.title}`,
    description: `${d.name}, ${d.title} based in ${d.city}. ${d.bio}`,
    alternates: { canonical: `/doctors/${d.slug}` },
  });
}

export default function DoctorDetailPage({ params }: { params: { slug: string } }) {
  const d = DOCTORS.find((x) => x.slug === params.slug);
  if (!d) notFound();

  const personLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: d.name,
    jobTitle: d.title,
    description: d.bio,
    image: d.imageUrl,
    url: `${SITE_URL}/doctors/${d.slug}`,
    address: {
      "@type": "PostalAddress",
      addressLocality: d.city,
      addressCountry: "IN",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personLd) }}
      />
      <Navbar />
      <main className="mx-auto max-w-4xl px-5 py-16 sm:px-8 sm:py-24">
        <div className="grid gap-10 sm:grid-cols-[280px_1fr] sm:items-start">
          <div className="relative aspect-[4/5] overflow-hidden rounded-3xl border border-white/10">
            <Image
              src={d.imageUrl}
              alt={`${d.name}, ${d.title}`}
              fill
              sizes="280px"
              className="object-cover"
              priority
            />
          </div>
          <div>
            <h1 className="font-serif text-4xl leading-tight text-white sm:text-5xl">
              {d.name}
            </h1>
            <p className="mt-2 text-white/70">{d.title}</p>
            <p className="mt-1 text-sm text-white/50">
              {d.city} · {d.experienceYears} years of experience
            </p>
            <p className="mt-6 text-white/80">{d.bio}</p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
