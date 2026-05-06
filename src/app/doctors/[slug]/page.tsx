import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DOCTORS } from "@/lib/data";
import { buildMetadata, SITE_URL } from "@/lib/seo";
import { DoctorDetailClient } from "./DoctorDetailClient";

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
      <DoctorDetailClient doctor={d} />
    </>
  );
}
