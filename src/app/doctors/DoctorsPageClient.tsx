"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { MapPin, Search } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ThemedSelect } from "@/components/ThemedSelect";
import { SPECIALTY_TABS } from "@/lib/data";
import type { Doctor, Specialty } from "@/types";

const SPECIALTY_LABELS: Record<string, string> = {
  "cornea-ocular-surface": "Cornea & Ocular Surface",
  "phaco-refractive-surgery": "Phaco & Refractive Surgery",
  "retina-vitreo-retinal-surgery": "Vitreo-Retinal Surgery",
  glaucoma: "Glaucoma",
  "pediatric-ophthalmology": "Paediatric Ophthalmology",
  oculoplasty: "Oculoplasty",
  "ophthalmology-practice-mastery": "Practice Mastery",
};

export function DoctorsPageClient({ doctors: DOCTORS }: { doctors: Doctor[] }) {
  const [specialty, setSpecialty] = useState<Specialty>("all");
  const [nameQuery, setNameQuery] = useState("");

  const filtered = useMemo(() => {
    const q = nameQuery.trim().toLowerCase();
    return DOCTORS.filter((d) => {
      if (specialty !== "all" && !d.specialty.includes(specialty)) return false;
      if (q && !d.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [DOCTORS, specialty, nameQuery]);

  const resetFilters = () => {
    setSpecialty("all");
    setNameQuery("");
  };

  if (DOCTORS.length === 0) {
    return (
      <>
        <Navbar />
        <main className="mx-auto max-w-3xl px-5 py-24 text-center text-white">
          <h1 className="font-serif text-3xl">No legends yet</h1>
          <p className="mt-4 text-white/60">
            Add doctor records in the admin panel to see them here.
          </p>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-[1500px] px-6 py-16 sm:px-16 sm:py-24 lg:px-24">
        <h1 className="font-serif text-4xl text-white sm:text-5xl">All Legends</h1>
        <p className="mt-3 max-w-2xl text-white/75">
          Meet the senior ophthalmologists shaping practice across India.
        </p>

        {/* Filter bar — Specialisation / Legend Name */}
        <div
          role="search"
          aria-label="Filter legends"
          className="mt-8 grid gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-4 sm:grid-cols-2 sm:items-end lg:grid-cols-[1.2fr_1fr_auto]"
        >
          <div>
            <label
              htmlFor="legend-specialty"
              className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60"
            >
              Specialisation
            </label>
            <ThemedSelect
              id="legend-specialty"
              ariaLabel="Filter by specialty"
              value={specialty}
              onChange={(v) => setSpecialty(v as Specialty)}
              options={SPECIALTY_TABS.map((t) => ({ value: t.key, label: t.label }))}
              className="mt-2"
            />
          </div>
          <div>
            <label
              htmlFor="legend-name"
              className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60"
            >
              Legend Name
            </label>
            <div className="relative mt-2">
              <Search
                aria-hidden
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40"
              />
              <input
                id="legend-name"
                type="search"
                value={nameQuery}
                onChange={(e) => setNameQuery(e.target.value)}
                placeholder="Search by name…"
                className="w-full rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] py-2.5 pl-9 pr-3 text-sm text-white placeholder-white/35 transition hover:border-[#ab834d] focus:border-[#ab834d] focus:outline-none focus:ring-2 focus:ring-[#ab834d]/40"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={resetFilters}
            className="rounded-lg border border-[#ab834d] bg-[#ab834d]/10 px-4 py-2.5 text-sm font-semibold text-[#ab834d] transition hover:bg-[#ab834d] hover:text-white"
          >
            Reset
          </button>
        </div>
        <p className="mt-3 text-xs text-white/55">
          Showing {filtered.length} of {DOCTORS.length} legends
        </p>

        {filtered.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-10 text-center">
            <p className="text-white/70">No legends match these filters.</p>
            <button
              type="button"
              onClick={resetFilters}
              className="mt-4 rounded-lg border border-white/15 px-4 py-2 text-sm text-white/80 hover:bg-white/10"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((d) => {
              const primarySpecialty = d.specialty.find((s) => s !== "all");
              const specialtyLabel = primarySpecialty
                ? SPECIALTY_LABELS[primarySpecialty] ?? primarySpecialty
                : null;
              return (
                <Link
                  key={d.id}
                  href={`/doctors/${d.slug}`}
                  className="group relative block overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] transition hover:-translate-y-0.5 hover:border-accent/40 hover:bg-white/[0.06] hover:shadow-xl hover:shadow-accent/10"
                >
                  {d.isNew && (
                    <span className="absolute left-3 top-3 z-10 rounded-full bg-emerald-400/95 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-950 shadow">
                      New
                    </span>
                  )}
                  <div className="relative aspect-[4/5] w-full overflow-hidden">
                    <Image
                      src={d.imageUrl}
                      alt={d.name}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover transition group-hover:scale-[1.02]"
                    />
                  </div>
                  <div className="p-5">
                    {specialtyLabel && (
                      <p className="text-[11px] uppercase tracking-[0.18em] text-accent-soft">
                        {specialtyLabel}
                      </p>
                    )}
                    <h2 className="mt-2 font-serif text-xl leading-tight text-white">
                      {d.name}
                    </h2>
                    <p className="mt-1 text-sm text-white/70">{d.title}</p>
                    {d.city && (
                      <p className="mt-3 flex items-center gap-1.5 text-xs text-white/55">
                        <MapPin className="h-3.5 w-3.5" aria-hidden />
                        {d.city}
                      </p>
                    )}
                    <p className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-[#ab834d]">
                      View Profile →
                    </p>
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
