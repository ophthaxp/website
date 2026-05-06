import type { Metadata } from "next";
import { DoctorsPageClient } from "./DoctorsPageClient";
import { buildMetadata } from "@/lib/seo";
import { fetchDoctorsFromBackend } from "@/lib/courses";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildMetadata({
  title: "Mentors",
  description:
    "Meet the senior ophthalmologists who lead OphthaXP cohorts — pioneers in cataract, retina, glaucoma, cornea, paediatric and refractive surgery.",
  alternates: { canonical: "/doctors" },
});

export default async function DoctorsIndexPage() {
  const doctors = await fetchDoctorsFromBackend();
  return <DoctorsPageClient doctors={doctors} />;
}
