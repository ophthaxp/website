import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { fetchCoursesFromBackend } from "@/lib/courses";
import { formatINR } from "@/lib/utils";
import { buildMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildMetadata({
  title: "Programs",
  description:
    "Explore OphthaXP cohort-based mentorship programs across cataract, retina, glaucoma, cornea, paediatric, neuro and refractive ophthalmology.",
  alternates: { canonical: "/programs" },
});

export default async function ProgramsIndexPage() {
  const programs = await fetchCoursesFromBackend();

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
        <h1 className="font-serif text-4xl text-white sm:text-5xl">All Programs</h1>
        <p className="mt-3 max-w-2xl text-white/60">
          Cohort-based mentorship designed for practising ophthalmologists and recent MBBS graduates.
        </p>

        {programs.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-white/10 bg-white/[0.03] p-10 text-center">
            <p className="text-white/70">No programs available yet.</p>
            <p className="mt-2 text-sm text-white/45">Check back soon — new cohorts are added regularly.</p>
          </div>
        ) : (
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {programs.map((p) => {
              const meta = [
                p.durationWeeks ? `${p.durationWeeks} weeks` : null,
                p.cohortSize ? `cohort of ${p.cohortSize}` : null,
                p.experienceYears ? `${p.experienceYears} yrs experience` : null,
                p.city,
              ].filter(Boolean);

              return (
                <Link
                  key={p.id}
                  href={`/programs/${p.slug}`}
                  className="group block overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] transition hover:bg-white/[0.06]"
                >
                  {p.doctorImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.doctorImage}
                      alt={p.name}
                      className="aspect-[4/5] w-full object-cover transition group-hover:scale-[1.02]"
                    />
                  ) : (
                    <div
                      aria-hidden
                      className="aspect-[4/5] w-full bg-gradient-to-br from-accent/30 via-accent/10 to-ink-900"
                    />
                  )}

                  <div className="p-5">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-accent-soft">
                      Teaches {p.specialistTitle ?? p.specialty}
                    </p>
                    <h2 className="mt-2 font-serif text-xl leading-tight text-white">
                      {p.name}
                    </h2>
                    {p.description ? (
                      <p className="mt-2 line-clamp-3 text-sm text-white/60">{p.description}</p>
                    ) : null}

                    {meta.length > 0 ? (
                      <p className="mt-4 text-xs text-white/55">{meta.join(" · ")}</p>
                    ) : null}

                    {p.priceInr ? (
                      <p className="mt-1 text-sm font-semibold text-white">
                        {formatINR(p.priceInr)}
                      </p>
                    ) : null}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
