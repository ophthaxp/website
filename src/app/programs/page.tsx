import type { Metadata } from "next";
import { ProgramsPageClient } from "./ProgramsPageClient";
import { fetchCoursesFromBackend, fetchDoctorsFromBackend } from "@/lib/courses";
import { buildMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildMetadata({
  title: "Programs",
  description:
    "Explore OphthaXP cohort-based mentorship programs across cataract, retina, glaucoma, cornea, paediatric, neuro and refractive ophthalmology.",
  alternates: { canonical: "/programs" },
});

export default async function ProgramsIndexPage() {
  const [programs, doctors] = await Promise.all([
    fetchCoursesFromBackend(),
    fetchDoctorsFromBackend(),
  ]);

  return <ProgramsPageClient programs={programs} doctors={doctors} />;
}
