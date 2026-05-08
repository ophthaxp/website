import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { LegendsVideo } from "@/components/LegendsVideo";
import { ScrollHighlightText } from "@/components/ScrollHighlightText";
import { ProgramsSection } from "@/components/ProgramsSection";
import { SmartAssist } from "@/components/SmartAssist";
import { Footer } from "@/components/Footer";
import { courseListJsonLd } from "@/lib/seo";
import { fetchCoursesFromBackend, fetchDoctorsFromBackend } from "@/lib/courses";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [programs, doctors] = await Promise.all([
    fetchCoursesFromBackend(),
    fetchDoctorsFromBackend(),
  ]);

  const courseLd = courseListJsonLd(
    programs.map((p) => ({ name: p.name, slug: p.slug, description: p.description })),
  );

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(courseLd) }}
      />
      <Navbar />
      <main>
        <Hero />
        <LegendsVideo />
        <ProgramsSection doctors={doctors} />
        <SmartAssist />
        <ScrollHighlightText />
      </main>
      <Footer />
    </>
  );
}
