"use client";

import { useMemo, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import {
  CatalogCard,
  CatalogEmpty,
  CatalogGrid,
  CatalogHero,
  FilterChip,
  ResultCount,
  SearchField,
} from "@/components/CatalogUI";
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

/* The chip row has to hold eight filters on one or two lines, so the pills use
   the short clinical name the home rail uses rather than the full title. */
const SHORT_LABELS: Partial<Record<Specialty, string>> = {
  all: "All",
  "cornea-ocular-surface": "Cornea",
  "phaco-refractive-surgery": "Refractive Surgery",
  "retina-vitreo-retinal-surgery": "Retina",
  "pediatric-ophthalmology": "Paediatric",
  "ophthalmology-practice-mastery": "Practice Management",
};

export function DoctorsPageClient({ doctors: DOCTORS }: { doctors: Doctor[] }) {
  const [specialty, setSpecialty] = useState<Specialty>("all");
  const [nameQuery, setNameQuery] = useState("");

  const filtered = useMemo(() => {
    const q = nameQuery.trim().toLowerCase();
    return DOCTORS.filter((d) => {
      if (specialty !== "all" && !d.specialty.includes(specialty)) return false;
      if (!q) return true;
      /* Search the whole card, not just the name — a reader who types "cornea"
         or "Chennai" means it as a search, not as a failed name lookup. */
      return [d.name, d.title, d.city, d.qualification]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [DOCTORS, specialty, nameQuery]);

  const isFiltered = specialty !== "all" || nameQuery.trim() !== "";

  const resetFilters = () => {
    setSpecialty("all");
    setNameQuery("");
  };

  /* Only offer a specialty the roster can actually answer for. An empty filter
     is worse than a missing one. */
  const availableTabs = useMemo(() => {
    const present = new Set<string>();
    for (const d of DOCTORS) for (const s of d.specialty) present.add(s);
    return SPECIALTY_TABS.filter((t) => t.key === "all" || present.has(t.key));
  }, [DOCTORS]);

  const cityCount = useMemo(
    () => new Set(DOCTORS.map((d) => d.city).filter(Boolean)).size,
    [DOCTORS],
  );

  if (DOCTORS.length === 0) {
    return (
      <>
        <Navbar />
        <CatalogHero
          titleLead="All"
          titleAccent="Legends"
          subtitle="The senior ophthalmologists who lead every cohort."
        />
        <main className="mx-auto max-w-[1440px] px-5 py-12 sm:px-10 sm:py-14 lg:px-[120px]">
          <CatalogEmpty
            title="No legends yet"
            body="Add doctor records in the admin panel and they will appear here."
          />
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />

      <CatalogHero
        titleLead="All"
        titleAccent="Legends"
        subtitle="Senior ophthalmologists shaping practice across India — each one teaching the judgement behind the technique, not just the technique."
        stats={[
          { value: DOCTORS.length, label: "Legends" },
          { value: availableTabs.length - 1, label: "Specialisations" },
          ...(cityCount > 0 ? [{ value: cityCount, label: "Cities" }] : []),
        ]}
      />

      <main className="mx-auto max-w-[1440px] px-5 pb-14 pt-4 sm:px-10 sm:pb-16 lg:px-[120px]">
        {/* Filter row. Specialisation reads as a band of pills rather than a
            dropdown, because on this page the specialisations are the map of
            the roster — hiding them inside a select hides what is on offer. */}
        <div
          role="tablist"
          aria-label="Filter by specialisation"
          className="mx-auto flex max-w-5xl flex-wrap justify-center gap-3"
        >
          {availableTabs.map((t) => (
            <FilterChip
              key={t.key}
              selected={specialty === t.key}
              onClick={() => setSpecialty(t.key)}
            >
              {SHORT_LABELS[t.key] ?? t.label}
            </FilterChip>
          ))}
        </div>

        <div className="mt-8 flex flex-col gap-4 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <SearchField
            id="legend-search"
            label="Search legends"
            value={nameQuery}
            onChange={setNameQuery}
            placeholder="Search by name, city or title…"
            className="w-full sm:max-w-sm"
          />
          <ResultCount
            shown={filtered.length}
            total={DOCTORS.length}
            noun="legends"
            filtered={isFiltered}
            onReset={resetFilters}
          />
        </div>

        <div className="mt-10">
          {filtered.length === 0 ? (
            <CatalogEmpty
              title="Nothing matches that"
              body="No legend fits this specialisation and search together. Try one or the other."
              actionLabel="Clear filters"
              onAction={resetFilters}
            />
          ) : (
            <CatalogGrid>
              {filtered.map((d, i) => {
                const primarySpecialty = d.specialty.find((s) => s !== "all");
                const specialtyLabel = primarySpecialty
                  ? SPECIALTY_LABELS[primarySpecialty] ?? primarySpecialty
                  : null;
                return (
                  <CatalogCard
                    key={d.id}
                    href={`/doctors/${d.slug}`}
                    imageUrl={d.imageUrl}
                    imageAlt={d.name}
                    title={d.name}
                    credit={d.title}
                    meta={[specialtyLabel, d.city]}
                    isNew={d.isNew}
                    tag={d.experienceYears ? `${d.experienceYears} yrs` : null}
                    cta="View profile"
                    priority={i < 4}
                  />
                );
              })}
            </CatalogGrid>
          )}
        </div>
      </main>

      <Footer />
    </>
  );
}
