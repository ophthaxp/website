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
import { formatINR } from "@/lib/utils";
import type { Doctor, Program } from "@/types";

const DURATION_BUCKETS: { key: string; label: string; matches: (months: number) => boolean }[] = [
  { key: "all", label: "Any duration", matches: () => true },
  { key: "short", label: "≤ 3 months", matches: (m) => m > 0 && m <= 3 },
  { key: "mid", label: "4 – 6 months", matches: (m) => m >= 4 && m <= 6 },
  { key: "long", label: "7 – 12 months", matches: (m) => m >= 7 && m <= 12 },
  { key: "xlong", label: "12+ months", matches: (m) => m > 12 },
];

function programDurationInMonths(p: Program): number {
  if (typeof p.durationMonths === "number" && p.durationMonths > 0) {
    return p.durationMonths;
  }
  if (typeof p.durationWeeks === "number" && p.durationWeeks > 0) {
    return Math.round(p.durationWeeks / 4.345);
  }
  return 0;
}

export function ProgramsPageClient({
  programs,
  doctors,
  view = "courses",
}: {
  programs: Program[];
  doctors: Doctor[];
  view?: "courses" | "legends";
}) {
  // Resolve a legend (doctor) for each program. Priority:
  // 1. New schema: program.doctorSlug → doctors.slug (course → faculty reference)
  // 2. Legacy merged schema: doctor.courseSlug === program.slug
  // 3. Legacy: doctor.slug === program.slug (one-doctor-one-course)
  const legendByProgramSlug = useMemo(() => {
    const map = new Map<string, Doctor>();
    for (const p of programs) {
      const ref = p.doctorSlug;
      const refStr = ref != null ? String(ref) : "";
      const match =
        (refStr &&
          doctors.find((d) => d.slug === refStr || String(d.id) === refStr)) ||
        doctors.find((d) => d.courseSlug === p.slug || d.slug === p.slug);
      if (match) map.set(p.slug, match);
    }
    return map;
  }, [programs, doctors]);

  const [query, setQuery] = useState("");
  const [durationKey, setDurationKey] = useState<string>("all");

  /* Only show the duration buckets that have something in them — a filter that
     can only ever return nothing is a trap, not a choice. */
  const availableBuckets = useMemo(
    () =>
      DURATION_BUCKETS.filter(
        (b) =>
          b.key === "all" ||
          programs.some((p) => b.matches(programDurationInMonths(p))),
      ),
    [programs],
  );

  const filtered = useMemo(() => {
    const bucket =
      DURATION_BUCKETS.find((b) => b.key === durationKey) ?? DURATION_BUCKETS[0];
    const q = query.trim().toLowerCase();
    return programs.filter((p) => {
      if (!bucket.matches(programDurationInMonths(p))) return false;
      if (!q) return true;
      /* One search box across the program and the legend who teaches it. The
         old page had a course-name dropdown, which was a list of the same
         cards the reader was already looking at; typing is faster and also
         finds a mentor by name. */
      const legend = legendByProgramSlug.get(p.slug);
      return [p.name, p.headline, p.tagline, p.city, legend?.name, p.mentorName]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [programs, durationKey, query, legendByProgramSlug]);

  const isFiltered = durationKey !== "all" || query.trim() !== "";

  const resetFilters = () => {
    setQuery("");
    setDurationKey("all");
  };

  const isLegendsView = view === "legends";

  const mentorCount = useMemo(
    () => new Set(Array.from(legendByProgramSlug.values()).map((d) => d.id)).size,
    [legendByProgramSlug],
  );

  return (
    <>
      <Navbar />

      <CatalogHero
        titleLead="All"
        titleAccent={isLegendsView ? "Legends" : "Programs"}
        subtitle="Cohort-based mentorship for practising ophthalmologists and recent MBBS graduates — small groups, real cases, one Legend at the front of the room."
        stats={[
          { value: programs.length, label: isLegendsView ? "Legends" : "Programs" },
          ...(mentorCount > 0 ? [{ value: mentorCount, label: "Mentors" }] : []),
          { value: "Cohort", label: "Format" },
        ]}
      />

      <main className="mx-auto max-w-[1440px] px-5 pb-14 pt-4 sm:px-10 sm:pb-16 lg:px-[120px]">
        {/* Duration as pills rather than a dropdown: there are five of them, and
            a reader choosing how much of their year to commit should be able to
            see all five commitments at once. */}
        <div
          role="tablist"
          aria-label="Filter by duration"
          className="mx-auto flex max-w-5xl flex-wrap justify-center gap-3"
        >
          {availableBuckets.map((b) => (
            <FilterChip
              key={b.key}
              selected={durationKey === b.key}
              onClick={() => setDurationKey(b.key)}
            >
              {b.label}
            </FilterChip>
          ))}
        </div>

        <div className="mt-8 flex flex-col gap-4 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <SearchField
            id="program-search"
            label="Search programs"
            value={query}
            onChange={setQuery}
            placeholder="Search by program, mentor or city…"
            className="w-full sm:max-w-sm"
          />
          <ResultCount
            shown={filtered.length}
            total={programs.length}
            noun={isLegendsView ? "legends" : "programs"}
            filtered={isFiltered}
            onReset={resetFilters}
          />
        </div>

        <div className="mt-10">
          {programs.length === 0 ? (
            <CatalogEmpty
              title="No programs available yet"
              body="Check back soon — new cohorts are added regularly."
            />
          ) : filtered.length === 0 ? (
            <CatalogEmpty
              title="Nothing matches that"
              body="No program fits this duration and search together. Try one or the other."
              actionLabel="Clear filters"
              onAction={resetFilters}
            />
          ) : (
            <CatalogGrid>
              {filtered.map((p, i) => {
                const legend = legendByProgramSlug.get(p.slug);
                const launchLabel =
                  p.launchMonth && p.launchYear
                    ? `${p.launchMonth} ${p.launchYear}`
                    : p.launchMonth || null;
                const durationLabel = p.durationMonths
                  ? `${p.durationMonths} months`
                  : p.durationWeeks
                    ? `${p.durationWeeks} weeks`
                    : null;
                const mentorName = legend?.name ?? p.mentorName;

                return (
                  <CatalogCard
                    key={p.id}
                    href={`/programs/${p.slug}`}
                    imageUrl={p.heroImage || p.doctorImage || legend?.imageUrl}
                    imageAlt={p.name}
                    title={p.name}
                    credit={
                      mentorName
                        ? `with ${mentorName}`
                        : p.specialistTitle ?? p.specialty
                    }
                    meta={[
                      durationLabel,
                      p.cohortSize ? `cohort of ${p.cohortSize}` : null,
                      p.priceInr ? formatINR(p.priceInr) : null,
                    ]}
                    isNew={p.isNew}
                    tag={launchLabel ?? null}
                    cta="View program"
                    rawImage
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
