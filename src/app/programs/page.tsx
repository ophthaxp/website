import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { PROGRAMS } from "@/lib/data";
import { formatINR } from "@/lib/utils";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Programs",
  description:
    "Explore OphthaXP cohort-based mentorship programs across cataract, retina, glaucoma, cornea, paediatric, neuro and refractive ophthalmology.",
  alternates: { canonical: "/programs" },
});

export default function ProgramsIndexPage() {
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
        <h1 className="font-serif text-4xl text-white sm:text-5xl">All Programs</h1>
        <p className="mt-3 max-w-2xl text-white/60">
          Cohort-based mentorship designed for practising ophthalmologists and recent MBBS graduates.
        </p>

        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          {PROGRAMS.map((p) => (
            <Link
              key={p.id}
              href={`/programs/${p.slug}`}
              className="card block p-6 transition hover:bg-white/[0.04]"
            >
              <p className="text-xs uppercase tracking-wider text-white/45">
                {p.specialty}
              </p>
              <h2 className="mt-2 text-lg font-semibold text-white">{p.name}</h2>
              <p className="mt-2 text-sm text-white/60">{p.description}</p>
              <p className="mt-4 text-sm text-white/70">
                {p.durationWeeks} weeks · cohort of {p.cohortSize} ·{" "}
                <span className="font-medium text-white">{formatINR(p.priceInr)}</span>
              </p>
            </Link>
          ))}
        </div>
      </main>
      <Footer />
    </>
  );
}
