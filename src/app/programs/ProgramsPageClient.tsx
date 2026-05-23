"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ThemedSelect } from "@/components/ThemedSelect";
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

  const courseOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const p of programs) {
      const label = p.headline || p.name;
      if (!seen.has(p.slug)) seen.set(p.slug, label);
    }
    return Array.from(seen.entries())
      .map(([slug, name]) => ({ slug, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [programs]);

  const [courseSlug, setCourseSlug] = useState<string>("all");
  const [durationKey, setDurationKey] = useState<string>("all");

  const filtered = useMemo(() => {
    const bucket =
      DURATION_BUCKETS.find((b) => b.key === durationKey) ?? DURATION_BUCKETS[0];
    return programs.filter((p) => {
      if (courseSlug !== "all" && p.slug !== courseSlug) return false;
      if (!bucket.matches(programDurationInMonths(p))) return false;
      return true;
    });
  }, [programs, courseSlug, durationKey]);

  const resetFilters = () => {
    setCourseSlug("all");
    setDurationKey("all");
  };

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
        <h1 className="font-serif text-4xl text-white sm:text-5xl">
          {view === "legends" ? "All Legends" : "All Programs"}
        </h1>
        <p className="mt-3 max-w-2xl text-white/75">
          Cohort-based mentorship designed for practising ophthalmologists and recent MBBS graduates.
        </p>

        {/* Filter bar — Course Name / Course Duration */}
        <div
          role="search"
          aria-label="Filter courses"
          className="mt-8 grid gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-4 sm:grid-cols-2 sm:items-end lg:grid-cols-[1.5fr_1fr_auto]"
        >
          <div>
            <label
              htmlFor="course-name"
              className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60"
            >
              Course Name
            </label>
            <ThemedSelect
              id="course-name"
              ariaLabel="Filter by course"
              value={courseSlug}
              onChange={setCourseSlug}
              options={[
                { value: "all", label: "All courses" },
                ...courseOptions.map((c) => ({ value: c.slug, label: c.name })),
              ]}
              className="mt-2"
            />
          </div>
          <div>
            <label
              htmlFor="course-duration"
              className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60"
            >
              Course Duration
            </label>
            <ThemedSelect
              id="course-duration"
              ariaLabel="Filter by duration"
              value={durationKey}
              onChange={setDurationKey}
              options={DURATION_BUCKETS.map((b) => ({ value: b.key, label: b.label }))}
              className="mt-2"
            />
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
          Showing {filtered.length} of {programs.length} courses
        </p>

        {programs.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-white/10 bg-white/[0.03] p-10 text-center">
            <p className="text-white/70">No programs available yet.</p>
            <p className="mt-2 text-sm text-white/45">
              Check back soon — new cohorts are added regularly.
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-10 text-center">
            <p className="text-white/70">No courses match these filters.</p>
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
            {filtered.map((p) => {
              const legend = legendByProgramSlug.get(p.slug);
              const launchLabel =
                p.launchMonth && p.launchYear
                  ? `Launches ${p.launchMonth} ${p.launchYear}`
                  : p.launchMonth
                    ? `Launches ${p.launchMonth}`
                    : null;
              const durationLabel = p.durationMonths
                ? `${p.durationMonths} months`
                : p.durationWeeks
                  ? `${p.durationWeeks} weeks`
                  : null;
              const meta = [
                durationLabel,
                p.cohortSize ? `cohort of ${p.cohortSize}` : null,
                legend?.experienceYears
                  ? `${legend.experienceYears} yrs experience`
                  : p.experienceYears
                    ? `${p.experienceYears} yrs experience`
                    : null,
                p.city || legend?.city,
              ].filter(Boolean);

              const cardImage = p.heroImage || p.doctorImage || legend?.imageUrl;

              return (
                <Link
                  key={p.id}
                  href={`/programs/${p.slug}`}
                  className="group relative block overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] transition hover:-translate-y-0.5 hover:border-accent/40 hover:bg-white/[0.06] hover:shadow-xl hover:shadow-accent/10"
                >
                  {p.isNew && (
                    <span className="absolute left-3 top-3 z-10 rounded-full bg-emerald-400/95 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-950 shadow">
                      New
                    </span>
                  )}
                  {cardImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={cardImage}
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
                      Teaches {legend?.name ?? p.specialistTitle ?? p.specialty}
                    </p>
                    <h2 className="mt-2 font-serif text-xl leading-tight text-white">
                      {p.name}
                    </h2>
                    {p.tagline || p.description ? (
                      <p className="mt-2 line-clamp-3 text-sm text-white/75">
                        {p.tagline || p.description}
                      </p>
                    ) : null}

                    {launchLabel && (
                      <p className="mt-4 text-[11px] font-semibold uppercase tracking-wider text-[#d6a76b]">
                        {launchLabel}
                      </p>
                    )}

                    {meta.length > 0 ? (
                      <p className="mt-2 text-xs text-white/55">{meta.join(" · ")}</p>
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
