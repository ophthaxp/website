"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, GraduationCap } from "lucide-react";
import { DOCTORS, SPECIALTY_TABS } from "@/lib/data";
import type { Doctor, Specialty } from "@/types";
import { cn } from "@/lib/utils";

export function ProgramsSection({ doctors }: { doctors?: Doctor[] }) {
  // When the parent passes `doctors` (even an empty array), use it as the source of truth.
  // Only fall back to static data when the prop is omitted entirely (e.g. preview mode).
  const data: Doctor[] = doctors !== undefined ? doctors : DOCTORS;
  const [active, setActive] = useState<Specialty>("popular");
  const railRef = useRef<HTMLDivElement | null>(null);

  const filtered = useMemo(() => {
    if (active === "popular") return data;
    return data.filter((d) => d.specialty.includes(active));
  }, [active, data]);

  const scroll = (dir: "left" | "right") => {
    const el = railRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.8;
    el.scrollBy({ left: dir === "left" ? -amount : amount, behavior: "smooth" });
  };

  return (
    <section
      id="programs"
      aria-labelledby="programs-title"
      className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-24"
    >
      <h2
        id="programs-title"
        className="mx-auto max-w-3xl text-center font-serif text-3xl leading-tight text-white sm:text-5xl"
      >
        Programs Designed for Those <br className="hidden sm:block" />
        Who Are Ready for More
      </h2>
      <p className="mx-auto mt-4 max-w-2xl text-center text-sm text-white/60 sm:text-base">
        Each program is carefully structured and led by experienced practitioners,
        designed to help you advance through focused, real-time learning.
      </p>

      {/* Specialty tabs */}
      <div
        role="tablist"
        aria-label="Specialty filters"
        className="mx-auto mt-8 flex max-w-5xl flex-wrap justify-center gap-2 sm:gap-3"
      >
        {SPECIALTY_TABS.map((tab) => {
          const selected = active === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setActive(tab.key)}
              className={cn(
                "inline-flex items-center gap-2 rounded-[12px] border px-4 py-2.5 text-sm font-medium transition",
                selected
                  ? "border-white bg-[#1A1A1A] text-white"
                  : "border-[#2A2A2A] bg-[#1A1A1A] text-white/70 hover:bg-[#222]",
              )}
            >
              <GraduationCap className="h-4 w-4" aria-hidden />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Doctor rail — horizontal scroll with prev/next buttons */}
      <div className="relative mt-10">
        <div className="absolute right-2 top-0 z-10 hidden -translate-y-12 items-center gap-2 sm:flex">
          <button
            type="button"
            onClick={() => scroll("left")}
            aria-label="Scroll doctors left"
            className="inline-flex items-center justify-center rounded-full bg-black/60 p-2 text-white backdrop-blur-md transition hover:bg-black/80"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => scroll("right")}
            aria-label="Scroll doctors right"
            className="inline-flex items-center justify-center rounded-full bg-black/60 p-2 text-white backdrop-blur-md transition hover:bg-black/80"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        <div
          ref={railRef}
          role="region"
          aria-label="Featured mentors"
          className="no-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-2"
        >
          {data.length === 0 ? (
            <div className="w-full rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-white/55">
              No doctors yet — add records to the <code className="text-white/80">doctors</code> module
              in the admin panel.
            </div>
          ) : filtered.length === 0 ? (
            <div className="w-full rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-white/55">
              No mentors in this specialty yet.
            </div>
          ) : (
            filtered.map((d) => (
              <Link
                key={d.id}
                href={`/doctors/${d.slug}`}
                className="group relative aspect-[3/4] w-[240px] shrink-0 snap-start overflow-hidden rounded-2xl border border-white/10 bg-ink-800 sm:w-[300px]"
              >
                {d.imageUrl ? (
                  <Image
                    src={d.imageUrl}
                    alt={`${d.name}, ${d.title} — ${d.city}`}
                    fill
                    sizes="(max-width: 640px) 240px, 300px"
                    className="object-cover transition duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-700/40 to-violet-900/40" />
                )}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                  <p className="text-sm font-semibold text-white">{d.name}</p>
                  <p className="text-xs text-white/70">{d.title}</p>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>

      <div className="mt-8 flex justify-center">
        <Link
          href="/programs"
          className="rounded-[12px] border border-white/15 bg-white/5 px-5 py-2 text-sm font-medium text-white/80 transition hover:bg-white/10"
        >
          Explore More
        </Link>
      </div>
    </section>
  );
}
