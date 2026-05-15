"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, GraduationCap } from "lucide-react";
import { DOCTORS, SPECIALTY_TABS } from "@/lib/data";
import type { Doctor, Specialty } from "@/types";
import { cn } from "@/lib/utils";

export function ProgramsSection({ doctors }: { doctors?: Doctor[] }) {
  // When the parent passes `doctors` (even an empty array), use it as the source of truth.
  // Only fall back to static data when the prop is omitted entirely (e.g. preview mode).
  const data: Doctor[] = doctors !== undefined ? doctors : DOCTORS;
  const [active, setActive] = useState<Specialty>("all");
  const [pageCount, setPageCount] = useState(1);
  const [activePage, setActivePage] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const railRef = useRef<HTMLDivElement | null>(null);

  const filtered = useMemo(() => {
    if (active === "all") return data;
    return data.filter((d) => d.specialty.includes(active));
  }, [active, data]);

  // Track scroll position so the bottom dot pagination reflects the user's place
  // in the rail. Recomputes on scroll, on filter change, and when the rail resizes.
  useEffect(() => {
    const el = railRef.current;
    if (!el) return;

    const update = () => {
      const maxScroll = el.scrollWidth - el.clientWidth;
      if (maxScroll <= 1) {
        setPageCount(1);
        setActivePage(0);
        return;
      }
      const pages = Math.max(1, Math.ceil(el.scrollWidth / el.clientWidth));
      setPageCount(pages);
      const ratio = el.scrollLeft / maxScroll;
      setActivePage(Math.min(pages - 1, Math.round(ratio * (pages - 1))));
    };

    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);

    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, [filtered.length]);

  const scroll = (dir: "left" | "right") => {
    const el = railRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.8;
    el.scrollBy({ left: dir === "left" ? -amount : amount, behavior: "smooth" });
  };

  const goToPage = (i: number) => {
    const el = railRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    const target = pageCount > 1 ? (i / (pageCount - 1)) * maxScroll : 0;
    el.scrollTo({ left: target, behavior: "smooth" });
  };

  // Auto-advance the carousel every 4s. Pauses while the user hovers the rail
  // (so they can read), and skips entirely when the document tab is hidden.
  useEffect(() => {
    if (pageCount <= 1 || isPaused) return;

    const id = window.setInterval(() => {
      if (document.hidden) return;
      const next = (activePage + 1) % pageCount;
      goToPage(next);
    }, 4000);

    return () => window.clearInterval(id);
    // goToPage is stable for current refs; intentionally omitting it from deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageCount, activePage, isPaused]);

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
                  ? "border-[#ab834d] bg-[#ab834d] text-white"
                  : "border-[#2A2A2A] bg-[#1A1A1A] text-white/70 hover:border-[#ab834d] hover:bg-[#ab834d] hover:text-white",
              )}
            >
              <GraduationCap className="h-4 w-4" aria-hidden />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Doctor rail carousel. Outer wrapper stays within the section's max-w-7xl
          so the chevron buttons align with the heading's right edge. The inner rail
          breaks out to the viewport right with mr-[calc(50%-50vw)], so cards visibly
          overflow past the main layout instead of being clipped at section padding.
          Body has overflow-x: hidden so this doesn't trigger horizontal page scroll. */}
      <div className="relative mt-10">
        <div className="absolute right-2 top-0 z-10 hidden -translate-y-12 items-center gap-2 sm:flex">
          <button
            type="button"
            onClick={() => scroll("left")}
            aria-label="Scroll doctors left"
            className="inline-flex items-center justify-center rounded-full bg-black/60 p-2 text-white backdrop-blur-md transition hover:bg-[#ab834d]"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => scroll("right")}
            aria-label="Scroll doctors right"
            className="inline-flex items-center justify-center rounded-full bg-black/60 p-2 text-white backdrop-blur-md transition hover:bg-[#ab834d]"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        <div
          ref={railRef}
          role="region"
          aria-label="Featured mentors"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          onFocusCapture={() => setIsPaused(true)}
          onBlurCapture={() => setIsPaused(false)}
          onTouchStart={() => setIsPaused(true)}
          className="no-scrollbar mr-[calc(50%-50vw)] flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-2 pr-5 sm:pr-8"
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
                className="group relative aspect-[3/4] w-[170px] shrink-0 snap-start overflow-hidden rounded-2xl border border-white/10 bg-ink-800 sm:w-[210px]"
              >
                {d.imageUrl ? (
                  <Image
                    src={d.imageUrl}
                    alt={`${d.name}${d.courseName ? `, ${d.courseName}` : ""}${d.city ? ` — ${d.city}` : ""}`}
                    fill
                    sizes="(max-width: 640px) 170px, 210px"
                    className="object-cover object-top transition duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-700/40 to-violet-900/40" />
                )}
                {/* Bottom-up dark scrim — extends ~half the card so titles stay legible */}
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-[linear-gradient(to_top,rgba(0,0,0,0.95)_0%,rgba(0,0,0,0.7)_40%,rgba(0,0,0,0)_100%)]" />
                <div className="absolute inset-x-0 bottom-0 px-3 pb-4 pt-8 text-center">
                  <p className="font-serif text-lg leading-tight text-white sm:text-xl">
                    {d.name}
                  </p>
                  {d.courseName ? (
                    <>
                      <span
                        className="mx-auto mt-1.5 block h-px w-6 bg-white/70"
                        aria-hidden
                      />
                      <p className="mt-1.5 line-clamp-2 text-[11px] font-semibold text-white/85 sm:text-xs">
                        {d.courseName}
                      </p>
                    </>
                  ) : null}
                </div>
              </Link>
            ))
          )}
        </div>

        {/* Bottom carousel pagination — clickable dots reflect rail scroll position */}
        {pageCount > 1 && (
          <div
            role="tablist"
            aria-label="Doctor list pages"
            className="mt-6 flex items-center justify-center gap-2"
          >
            {Array.from({ length: pageCount }).map((_, i) => {
              const selected = i === activePage;
              return (
                <button
                  key={i}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  aria-label={`Go to page ${i + 1} of ${pageCount}`}
                  onClick={() => goToPage(i)}
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-300",
                    selected
                      ? "w-6 bg-[#ab834d]"
                      : "w-1.5 bg-white/30 hover:bg-white/60",
                  )}
                />
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          href="/programs"
          className="rounded-[12px] border border-[#ab834d] bg-[#ab834d] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#8a6a40]"
        >
          Explore Courses
        </Link>
        <Link
          href="/programs?view=legends"
          className="rounded-[12px] border border-white/15 bg-white/5 px-5 py-2 text-sm font-medium text-white/80 transition hover:bg-white/10"
        >
          Explore Legends
        </Link>
      </div>
    </section>
  );
}
