import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { fetchDoctorsFromBackend } from "@/lib/courses";
import { buildMetadata, SITE_URL } from "@/lib/seo";
import { DoctorDetailClient } from "./DoctorDetailClient";

export const dynamic = "force-dynamic";

export async function generateStaticParams() {
  const doctors = await fetchDoctorsFromBackend();
  return doctors.map((d) => ({ slug: d.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const doctors = await fetchDoctorsFromBackend();
  const d = doctors.find((x) => x.slug === params.slug);
  if (!d) return buildMetadata({ title: "Mentor not found" });
  return buildMetadata({
    title: `${d.name} — ${d.title}`,
    description: `${d.name}, ${d.title} based in ${d.city}. ${d.bio}`,
    alternates: { canonical: `/doctors/${d.slug}` },
  });
}

export default async function DoctorDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const doctors = await fetchDoctorsFromBackend();
  const d = doctors.find((x) => x.slug === params.slug);
  if (!d) notFound();
  const others = doctors.filter((x) => x.id !== d.id);

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
      <DoctorDetailClient doctor={d} otherDoctors={others} />
    </>
  );
}
