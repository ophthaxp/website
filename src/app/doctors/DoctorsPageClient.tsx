"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import { ChevronLeft, ChevronRight, Play, Volume2, Maximize2 } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { HERO_VIDEO_POSTER } from "@/lib/data";
import type { Doctor } from "@/types";

export function DoctorsPageClient({ doctors: DOCTORS }: { doctors: Doctor[] }) {
  if (DOCTORS.length === 0) {
    return (
      <>
        <Navbar />
        <main className="mx-auto max-w-3xl px-5 py-24 text-center text-white">
          <h1 className="font-serif text-3xl">No mentors yet</h1>
          <p className="mt-4 text-white/60">
            Add doctor records in the admin panel to see them here.
          </p>
        </main>
        <Footer />
      </>
    );
  }

  const FEATURED_DOCTOR = DOCTORS[0];
  const FEATURED_COVER = FEATURED_DOCTOR.doctorImage ?? FEATURED_DOCTOR.imageUrl;
  const MEMBER_AVATARS = DOCTORS.slice(1, 6).map((d) => d.imageUrl);
  const TESTIMONIALS = [
    {
      name: "Dr. Rohit Bansal",
      role: "MS Ophthalmology · Jaipur",
      avatar: (DOCTORS[2] ?? DOCTORS[0]).imageUrl,
      quote:
        "It gives me the ability to use my down time to learn from senior surgeons instead of just scrolling on social media.",
    },
    {
      name: "Dr. Anjali Verma",
      role: "DNB Resident · Delhi",
      avatar: (DOCTORS[1] ?? DOCTORS[0]).imageUrl,
      quote:
        "I have not found another platform that offers the same level or amount of amazing learning opportunities.",
    },
    {
      name: "Dr. Sahil Khanna",
      role: "Cornea Fellow · Bengaluru",
      avatar: (DOCTORS[4] ?? DOCTORS[0]).imageUrl,
      quote:
        "I like the vast range of mentors available on this platform. There is literally something for every sub-specialty.",
    },
  ];
  const railRef = useRef<HTMLDivElement>(null);

  const scrollRail = (dir: "left" | "right") => {
    const el = railRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.8;
    el.scrollBy({ left: dir === "left" ? -amount : amount, behavior: "smooth" });
  };

  return (
    <>
      <Navbar />
      <main className="bg-[#06070a] text-white">
        {/* ──────────────────────────────────────────────────────────── */}
        {/* SECTION 1 — Hero Spotlight                                   */}
        {/* ──────────────────────────────────────────────────────────── */}
        <section
          aria-labelledby="featured-title"
          className="grid w-full grid-cols-1 lg:grid-cols-2"
        >
          {/* Left — featured portrait with magenta/orange gradient */}
          <div className="relative aspect-[4/5] w-full overflow-hidden lg:aspect-auto lg:min-h-[640px]">
            <div
              aria-hidden
              className="absolute inset-0"
              style={{
                background:
                  "radial-gradient(120% 80% at 50% 20%, #ffb56b 0%, #ff5f9e 35%, #d63ad6 65%, #1a0628 100%)",
              }}
            />
            <Image
              src={FEATURED_COVER}
              alt={`${FEATURED_DOCTOR.name}, ${FEATURED_DOCTOR.title}`}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover object-center mix-blend-luminosity"
            />
            <div
              aria-hidden
              className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent"
            />
          </div>

          {/* Right — copy + CTA */}
          <div className="flex items-center justify-center bg-[#0a0a0d] px-6 py-14 sm:px-12 lg:px-16">
            <div className="w-full max-w-md">
              <h1
                id="featured-title"
                className="font-serif text-4xl leading-tight tracking-tight sm:text-5xl"
              >
                {FEATURED_DOCTOR.courseName ?? FEATURED_DOCTOR.title}
              </h1>

              <div className="mt-5 flex items-center gap-3">
                <span className="h-px w-8 bg-white/40" />
                <span className="text-xs font-semibold tracking-[0.18em] text-white/70">
                  BY {FEATURED_DOCTOR.name.toUpperCase()}
                </span>
              </div>

              <p className="mt-6 text-[15px] leading-relaxed text-white/70">
                {FEATURED_DOCTOR.description ??
                  FEATURED_DOCTOR.bio ??
                  `Senior ophthalmologists show you how to turn live, cohort-based mentorship into surgical mastery — review real cases, refine technique, and operate with confidence.`}
              </p>

              {(() => {
                const months = FEATURED_DOCTOR.durationWeeks
                  ? Math.max(1, Math.round(FEATURED_DOCTOR.durationWeeks / 4))
                  : null;
                const modules = FEATURED_DOCTOR.lessonsCount ?? null;
                const parts: string[] = [];
                if (months)
                  parts.push(`${months} ${months === 1 ? "month" : "months"}`);
                if (modules)
                  parts.push(
                    `${modules} ${modules === 1 ? "module" : "modules"}`,
                  );
                if (parts.length === 0) return null;
                return (
                  <div className="mt-7 flex items-center gap-4 text-sm text-white/85">
                    <span>{parts.join(" · ")}</span>
                    <Link
                      href="#trailer"
                      className="font-semibold text-white underline-offset-4 hover:underline"
                    >
                      Watch Trailer
                    </Link>
                  </div>
                );
              })()}

              <div className="mt-10 rounded-xl bg-[#141417] p-5">
                <div className="flex items-center justify-center gap-3">
                  <div className="flex -space-x-2">
                    {MEMBER_AVATARS.map((src, i) => (
                      <span
                        key={i}
                        className="relative h-8 w-8 overflow-hidden rounded-full border-2 border-[#141417]"
                      >
                        <Image
                          src={src}
                          alt=""
                          fill
                          sizes="32px"
                          className="object-cover"
                        />
                      </span>
                    ))}
                  </div>
                </div>
                <p className="mt-3 text-center text-sm font-semibold">
                  Get this class and {DOCTORS.length - 1}+ more
                </p>
                <Link
                  href="#get-started"
                  className="mt-4 block rounded-md bg-[#a88251] px-5 py-3 text-center text-sm font-semibold text-white transition hover:bg-[#8a6a40]"
                >
                  Get Mentorship
                </Link>
              </div>

              <p className="mt-4 text-center text-xs text-white/55">
                Starting at <span className="font-semibold text-white/85">₹29.56/day</span>,
                billed annually. 30-day money back guaranteed.
              </p>
            </div>
          </div>
        </section>

        {/* ──────────────────────────────────────────────────────────── */}
        {/* SECTION 2 — Trailer + horizontal doctor rail                 */}
        {/* ──────────────────────────────────────────────────────────── */}
        <section
          id="trailer"
          aria-labelledby="trailer-title"
          className="mx-auto max-w-7xl px-5 py-16 sm:px-8"
        >
          {/* Trailer player (poster) */}
          <div className="relative aspect-video w-full overflow-hidden rounded-md bg-black">
            <Image
              src={HERO_VIDEO_POSTER}
              alt="Featured mentor trailer"
              fill
              sizes="100vw"
              className="object-cover opacity-70"
            />
            <div className="absolute inset-0 bg-black/30" />

            {/* Trailer / Sample tabs */}
            <div className="absolute right-5 top-4 flex items-center gap-5 text-sm text-white">
              <span className="font-semibold">Trailer</span>
              <span className="text-white/60">Sample</span>
            </div>

            {/* Bottom controls */}
            <div className="absolute inset-x-0 bottom-0 px-4 pb-4">
              <div className="h-[3px] w-full rounded-full bg-white/20">
                <div className="h-full w-0 rounded-full bg-white" />
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-white/85">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    aria-label="Play trailer"
                    className="flex h-7 w-7 items-center justify-center rounded-sm bg-white/15 hover:bg-white/25"
                  >
                    <Play className="h-3.5 w-3.5 fill-white text-white" />
                  </button>
                  <Volume2 className="h-4 w-4 text-white/80" />
                  <span>0:00 / 1:19</span>
                </div>
                <div className="flex items-center gap-3 text-white/80">
                  <span>1x</span>
                  <Maximize2 className="h-4 w-4" />
                </div>
              </div>
            </div>
          </div>

          {/* Rail header */}
          <div className="mt-10 flex items-end justify-between">
            <div>
              <h2
                id="trailer-title"
                className="text-2xl font-bold tracking-tight sm:text-3xl"
              >
                From Here, Go Anywhere
              </h2>
              <p className="mt-1 text-sm text-white/55">
                Included with a membership. And {DOCTORS.length}+ more
              </p>
            </div>
            <div className="hidden gap-2 sm:flex">
              <button
                type="button"
                aria-label="Scroll mentors left"
                onClick={() => scrollRail("left")}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white/80 transition hover:bg-white/10"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label="Scroll mentors right"
                onClick={() => scrollRail("right")}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white/80 transition hover:bg-white/10"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Horizontal mentor rail */}
          <div
            ref={railRef}
            className="no-scrollbar mt-6 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2"
          >
            {DOCTORS.map((d, i) => {
              const subtitle = d.courseName ?? d.title;
              return (
                <Link
                  key={d.id}
                  href={`/doctors/${d.slug}`}
                  className="group relative w-[220px] shrink-0 snap-start overflow-hidden rounded-md bg-[#141417] sm:w-[240px]"
                >
                  <div className="relative aspect-[3/4] w-full">
                    <Image
                      src={d.imageUrl}
                      alt={`${d.name}, ${subtitle}`}
                      fill
                      sizes="240px"
                      className="object-cover transition duration-500 group-hover:scale-105"
                    />
                    {i === 4 || i === 5 ? (
                      <span className="absolute left-3 top-3 rounded-sm bg-white/90 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-black">
                        New
                      </span>
                    ) : null}
                    <div
                      aria-hidden
                      className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent"
                    />
                    <div className="absolute inset-x-0 bottom-0 p-4">
                      <p className="font-serif text-lg leading-tight">
                        {d.name.replace("Dr. ", "")}
                      </p>
                      {subtitle ? (
                        <p className="mt-1 text-xs text-white/70">{subtitle}</p>
                      ) : null}
                      <span className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-white">
                        <Play className="h-3 w-3 fill-white text-white" />
                        Watch Trailer
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Pagination dots (decorative) */}
          <div className="mt-5 flex justify-center gap-1.5">
            <span className="h-1.5 w-6 rounded-full bg-white/80" />
            <span className="h-1.5 w-1.5 rounded-full bg-white/30" />
            <span className="h-1.5 w-1.5 rounded-full bg-white/30" />
          </div>
        </section>

        {/* Sticky bottom CTA bar — only sticky around the rail section */}
        <div className="sticky bottom-0 z-30 border-t border-white/5 bg-[#0a0a0d]/95 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-3 sm:px-8">
            <div className="flex items-center gap-3">
              <div className="flex -space-x-2">
                {MEMBER_AVATARS.slice(0, 4).map((src, i) => (
                  <span
                    key={i}
                    className="relative h-7 w-7 overflow-hidden rounded-full border-2 border-[#0a0a0d]"
                  >
                    <Image src={src} alt="" fill sizes="28px" className="object-cover" />
                  </span>
                ))}
              </div>
              <div className="text-xs leading-tight">
                <p className="font-semibold">
                  Starting at <span className="font-bold">₹29.56/day</span>
                </p>
                <p className="text-white/55">(billed annually) for all classes</p>
              </div>
            </div>
            <Link
              href="#get-started"
              className="rounded-md bg-[#a88251] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#8a6a40]"
            >
              Get Mentorship
            </Link>
          </div>
        </div>

        {/* ──────────────────────────────────────────────────────────── */}
        {/* SECTION 3 — Start Your Journey + Member Stories              */}
        {/* ──────────────────────────────────────────────────────────── */}
        <section
          id="get-started"
          aria-labelledby="journey-title"
          className="mx-auto max-w-6xl px-5 py-20 text-center sm:px-8 sm:py-28"
        >
          <h2
            id="journey-title"
            className="font-serif text-3xl leading-tight sm:text-4xl"
          >
            Start Your
            <br />
            Journey Today
          </h2>
          <p className="mt-5 text-sm text-white/65">
            From <span className="font-semibold text-white">₹29.56/day</span>{" "}
            <span className="text-white/45">(billed annually)</span>
          </p>
          <Link
            href="/programs"
            className="mt-8 inline-flex rounded-md bg-[#a88251] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#8a6a40]"
          >
            Get Mentorship
          </Link>

          <h3 className="mt-24 text-2xl font-bold sm:text-3xl">Member Stories</h3>

          <div className="mt-10 grid gap-5 text-left sm:grid-cols-3">
            {TESTIMONIALS.map((t) => (
              <figure
                key={t.name}
                className="rounded-md bg-[#141417] p-7 text-center"
              >
                <div className="mx-auto h-20 w-20 overflow-hidden rounded-[40%]">
                  <div className="relative h-full w-full">
                    <Image
                      src={t.avatar}
                      alt={t.name}
                      fill
                      sizes="80px"
                      className="object-cover"
                    />
                  </div>
                </div>
                <blockquote className="mt-5 text-sm leading-relaxed text-white/85">
                  &ldquo;{t.quote}&rdquo;
                </blockquote>
                <figcaption className="mt-4 text-xs text-white/55">
                  <p className="font-semibold text-white/80">{t.name}</p>
                  <p>{t.role}</p>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
