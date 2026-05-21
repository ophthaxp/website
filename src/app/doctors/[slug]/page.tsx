import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { fetchDoctorsFromBackend } from "@/lib/courses";
import { buildMetadata, SITE_NAME, SITE_URL } from "@/lib/seo";
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

  const descSnippet = ((d.description ?? d.bio) || "").slice(0, 200);
  const ogImage = d.doctorImage ?? d.imageUrl;
  const pageUrl = `${SITE_URL}/doctors/${d.slug}`;

  const base = buildMetadata({
    title: `${d.name} — ${d.title}`,
    description: descSnippet,
    alternates: { canonical: `/doctors/${d.slug}` },
  });

  return {
    ...base,
    openGraph: {
      type: "profile",
      url: pageUrl,
      siteName: SITE_NAME,
      title: `${d.name} — ${d.title} · OphthaXP`,
      description: descSnippet,
      locale: "en_IN",
      images: ogImage
        ? [{ url: ogImage, width: 1200, height: 630, alt: d.name }]
        : [{ url: "/og.jpg", width: 1200, height: 630, alt: SITE_NAME }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${d.name} — ${d.title} · OphthaXP`,
      description: descSnippet,
      images: ogImage ? [ogImage] : ["/og.jpg"],
    },
  };
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
