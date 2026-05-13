import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { LegendsVideo } from "@/components/LegendsVideo";
import { ProgramsSection } from "@/components/ProgramsSection";
import { CertificatesPromo } from "@/components/CertificatesPromo";
import { PracticeGrowthCalculator } from "@/components/PracticeGrowthCalculator";
import { SmartAssist } from "@/components/SmartAssist";
import { FaqSection } from "@/components/FaqSection";
import { Footer } from "@/components/Footer";
import { courseListJsonLd } from "@/lib/seo";
import {
  fetchCoursesFromBackend,
  fetchDoctorsFromBackend,
  fetchHeroImagesFromBackend,
} from "@/lib/courses";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [programs, doctors, heroImages] = await Promise.all([
    fetchCoursesFromBackend(),
    fetchDoctorsFromBackend(),
    fetchHeroImagesFromBackend(),
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
        <Hero images={heroImages} />
        <LegendsVideo />
        <ProgramsSection doctors={doctors} />
        <section
          aria-labelledby="roi-title"
          className="mx-auto max-w-7xl px-5 pb-8 sm:px-8"
        >
          <div className="mb-8 text-center">
            <h2
              id="roi-title"
              className="font-serif text-3xl leading-tight text-white sm:text-4xl"
            >
              See Your <span className="text-accent-soft">Return on Investment</span>
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm text-white/60 sm:text-base">
              Pick your specialty and patient volume to project the additional
              income an OphthaXP mentorship can unlock for your practice.
            </p>
          </div>
          <PracticeGrowthCalculator />
        </section>
        <CertificatesPromo />
        <SmartAssist />
        <FaqSection />
      </main>
      <Footer />
    </>
  );
}
