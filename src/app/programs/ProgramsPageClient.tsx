"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { formatINR } from "@/lib/utils";
import type { Doctor, Program } from "@/types";

const DURATION_BUCKETS: { key: string; label: string; matches: (weeks: number) => boolean }[] = [
  { key: "all", label: "Any duration", matches: () => true },
  { key: "short", label: "≤ 8 weeks", matches: (w) => w > 0 && w <= 8 },
  { key: "mid", label: "9 – 12 weeks", matches: (w) => w >= 9 && w <= 12 },
  { key: "long", label: "13+ weeks", matches: (w) => w >= 13 },
];

export function ProgramsPageClient({
  programs,
  doctors,
  view = "courses",
}: {
  programs: Program[];
  doctors: Doctor[];
  view?: "courses" | "legends";
}) {
  // Resolve a legend (doctor) for each program when possible. In the merged
  // doctors-as-courses backend, doctor.courseSlug === program.slug.
  const legendByProgramSlug = useMemo(() => {
    const map = new Map<string, Doctor>();
    for (const p of programs) {
      const match = doctors.find(
        (d) => d.courseSlug === p.slug || d.slug === p.slug,
      );
      if (match) map.set(p.slug, match);
    }
    return map;
  }, [programs, doctors]);

  const legendOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const d of doctors) {
      if (!seen.has(d.slug)) seen.set(d.slug, d.name);
    }
    return Array.from(seen.entries())
      .map(([slug, name]) => ({ slug, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [doctors]);

  const [legendSlug, setLegendSlug] = useState<string>("all");
  const [nameQuery, setNameQuery] = useState("");
  const [durationKey, setDurationKey] = useState<string>("all");

  const filtered = useMemo(() => {
    const q = nameQuery.trim().toLowerCase();
    const bucket =
      DURATION_BUCKETS.find((b) => b.key === durationKey) ?? DURATION_BUCKETS[0];
    return programs.filter((p) => {
      if (legendSlug !== "all") {
        const d = legendByProgramSlug.get(p.slug);
        if (!d || d.slug !== legendSlug) return false;
      }
      if (q && !p.name.toLowerCase().includes(q)) return false;
      if (!bucket.matches(p.durationWeeks ?? 0)) return false;
      return true;
    });
  }, [programs, legendByProgramSlug, legendSlug, nameQuery, durationKey]);

  const resetFilters = () => {
    setLegendSlug("all");
    setNameQuery("");
    setDurationKey("all");
  };

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
        <h1 className="font-serif text-4xl text-white sm:text-5xl">
          {view === "legends" ? "All Legends" : "All Programs"}
        </h1>
        <p className="mt-3 max-w-2xl text-white/60">
          Cohort-based mentorship designed for practising ophthalmologists and recent MBBS graduates.
        </p>

        {/* Filter bar — Legend Name / Course Name / Course Duration */}
        <div
          role="search"
          aria-label="Filter courses"
          className="mt-8 grid gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-4 sm:grid-cols-[1.2fr_1fr_1fr_auto] sm:items-end"
        >
          <div>
            <label
              htmlFor="course-legend"
              className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60"
            >
              Legend Name
            </label>
            <select
              id="course-legend"
              value={legendSlug}
              onChange={(e) => setLegendSlug(e.target.value)}
              className="mt-2 w-full cursor-pointer appearance-none rounded-lg bg-[#141417] px-3 py-2.5 text-sm text-white ring-1 ring-white/10 transition focus:outline-none focus:ring-2 focus:ring-[#ab834d]"
            >
              <option value="all" className="bg-[#141417]">
                All legends
              </option>
              {legendOptions.map((l) => (
                <option key={l.slug} value={l.slug} className="bg-[#141417]">
                  {l.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor="course-name"
              className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60"
            >
              Course Name
            </label>
            <div className="relative mt-2">
              <Search
                aria-hidden
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40"
              />
              <input
                id="course-name"
                type="search"
                value={nameQuery}
                onChange={(e) => setNameQuery(e.target.value)}
                placeholder="Search courses…"
                className="w-full rounded-lg bg-[#141417] py-2.5 pl-9 pr-3 text-sm text-white placeholder-white/35 ring-1 ring-white/10 transition focus:outline-none focus:ring-2 focus:ring-[#ab834d]"
              />
            </div>
          </div>
          <div>
            <label
              htmlFor="course-duration"
              className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60"
            >
              Course Duration
            </label>
            <select
              id="course-duration"
              value={durationKey}
              onChange={(e) => setDurationKey(e.target.value)}
              className="mt-2 w-full cursor-pointer appearance-none rounded-lg bg-[#141417] px-3 py-2.5 text-sm text-white ring-1 ring-white/10 transition focus:outline-none focus:ring-2 focus:ring-[#ab834d]"
            >
              {DURATION_BUCKETS.map((b) => (
                <option key={b.key} value={b.key} className="bg-[#141417]">
                  {b.label}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={resetFilters}
            className="rounded-lg border border-white/15 bg-transparent px-4 py-2.5 text-sm font-medium text-white/80 transition hover:bg-white/10"
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
              const meta = [
                p.durationWeeks ? `${p.durationWeeks} weeks` : null,
                p.cohortSize ? `cohort of ${p.cohortSize}` : null,
                p.experienceYears ? `${p.experienceYears} yrs experience` : null,
                p.city,
              ].filter(Boolean);

              const href = legend
                ? `/doctors/${legend.slug}`
                : `/programs/${p.slug}`;

              return (
                <Link
                  key={p.id}
                  href={href}
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
                      {legend
                        ? `By ${legend.name}`
                        : `Teaches ${p.specialistTitle ?? p.specialty}`}
                    </p>
                    <h2 className="mt-2 font-serif text-xl leading-tight text-white">
                      {p.name}
                    </h2>
                    {p.description ? (
                      <p className="mt-2 line-clamp-3 text-sm text-white/60">
                        {p.description}
                      </p>
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
