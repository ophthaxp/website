import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { DOCTORS } from "@/lib/data";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Mentors",
  description:
    "Meet the senior ophthalmologists who lead OphthaXP cohorts — pioneers in cataract, retina, glaucoma, cornea, paediatric and refractive surgery.",
  alternates: { canonical: "/doctors" },
});

export default function DoctorsIndexPage() {
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
        <h1 className="font-serif text-4xl text-white sm:text-5xl">Our Mentors</h1>
        <p className="mt-3 max-w-2xl text-white/60">
          Active practitioners who teach what they do every day.
        </p>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {DOCTORS.map((d) => (
            <Link
              key={d.id}
              href={`/doctors/${d.slug}`}
              className="card group block overflow-hidden"
            >
              <div className="relative aspect-[4/5] w-full">
                <Image
                  src={d.imageUrl}
                  alt={`${d.name}, ${d.title}`}
                  fill
                  sizes="(max-width: 640px) 100vw, 33vw"
                  className="object-cover transition group-hover:scale-105"
                />
              </div>
              <div className="p-5">
                <p className="text-base font-semibold text-white">{d.name}</p>
                <p className="text-sm text-white/60">{d.title}</p>
                <p className="mt-2 text-xs text-white/45">
                  {d.city} · {d.experienceYears} yrs
                </p>
              </div>
            </Link>
          ))}
        </div>
      </main>
      <Footer />
    </>
  );
}
