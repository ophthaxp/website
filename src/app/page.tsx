import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { LegendsVideo } from "@/components/LegendsVideo";
import { HowLearningHappens } from "@/components/HowLearningHappens";
import { ProgramsSection } from "@/components/ProgramsSection";
import { SmartAssist } from "@/components/SmartAssist";
import { ClosingCta } from "@/components/ClosingCta";
import { Footer } from "@/components/Footer";
import { courseListJsonLd } from "@/lib/seo";
import { PROGRAMS } from "@/lib/data";

export default function HomePage() {
  const courseLd = courseListJsonLd(
    PROGRAMS.map((p) => ({ name: p.name, slug: p.slug, description: p.description })),
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
        <HowLearningHappens />
        <ProgramsSection />
        <SmartAssist />
        <ClosingCta />
      </main>
      <Footer />
    </>
  );
}
