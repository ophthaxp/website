"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Download,
  GraduationCap,
  PhoneCall,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { TrailerPlayer } from "@/components/TrailerPlayer";
import { PracticeGrowthCalculator } from "@/components/PracticeGrowthCalculator";
import { formatINR } from "@/lib/utils";
import type { Doctor } from "@/types";

const STEPS = [
  {
    icon: ClipboardList,
    num: "01",
    title: "Apply",
    desc: "Tell us about your practice and the outcomes you want.",
  },
  {
    icon: PhoneCall,
    num: "02",
    title: "Talk to a Legend",
    desc: "1:1 discovery call with the mentor to align on goals.",
  },
  {
    icon: GraduationCap,
    num: "03",
    title: "Onboarding",
    desc: "Cohort kickoff, schedule and private community access.",
  },
];

function formatDuration(minutes?: number): string | null {
  if (!minutes || minutes <= 0) return null;
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hrs && mins) return `${hrs}hr ${mins}min`;
  if (hrs) return `${hrs}hr`;
  return `${mins}min`;
}

export function DoctorDetailClient({
  doctor,
  otherDoctors,
}: {
  doctor: Doctor;
  otherDoctors: Doctor[];
}) {
  const railRef = useRef<HTMLDivElement>(null);
  const [showSticky, setShowSticky] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowSticky(window.scrollY > 540);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const memberAvatars = otherDoctors.slice(0, 5).map((d) => d.imageUrl);
  const fallbackAvatar = doctor.imageUrl;

  // Course-side fields with sensible fallbacks
  const courseName = doctor.courseName ?? doctor.title;
  const description = doctor.description ?? doctor.bio;
  const lessonsLabel = doctor.lessonsCount
    ? `${doctor.lessonsCount} Lessons`
    : null;
  const durationMinLabel = formatDuration(doctor.durationMinutes);
  const durationWeekLabel = doctor.durationWeeks
    ? `${doctor.durationWeeks} weeks`
    : null;
  const metaPills = [durationWeekLabel, lessonsLabel, durationMinLabel].filter(
    Boolean,
  ) as string[];

  const priceLabel = doctor.priceInr ? formatINR(doctor.priceInr) : null;
  const perDayLabel = doctor.pricePerDayInr
    ? `₹${doctor.pricePerDayInr}/day`
    : null;
  const billingLabel =
    doctor.billingPeriod === "annual"
      ? "billed annually"
      : doctor.billingPeriod === "monthly"
        ? "billed monthly"
        : doctor.billingPeriod === "onetime"
          ? "one-time payment"
          : null;

  const learnItems =
    doctor.learningOutcomes && doctor.learningOutcomes.length > 0
      ? doctor.learningOutcomes
      : doctor.highlights ?? [];

  const TESTIMONIALS = [
    {
      name: "Dr. Rohit Bansal",
      role: "MS Ophthalmology · Jaipur",
      avatar: otherDoctors[2]?.imageUrl ?? fallbackAvatar,
      quote:
        "It gives me the ability to use my down time to learn from senior surgeons instead of just scrolling on social media.",
    },
    {
      name: "Dr. Anjali Verma",
      role: "DNB Resident · Delhi",
      avatar: otherDoctors[1]?.imageUrl ?? fallbackAvatar,
      quote:
        "I have not found another platform that offers the same level or amount of amazing learning opportunities.",
    },
    {
      name: "Dr. Sahil Khanna",
      role: "Cornea Fellow · Bengaluru",
      avatar: otherDoctors[4]?.imageUrl ?? fallbackAvatar,
      quote:
        "I like the vast range of mentors available on this platform. There is literally something for every sub-specialty.",
    },
  ];

  const scrollRail = (dir: "left" | "right") => {
    const el = railRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.8;
    el.scrollBy({ left: dir === "left" ? -amount : amount, behavior: "smooth" });
  };

  return (
    <>
      <Navbar />
      <main className="bg-[#06070a] pb-24 text-white">
        {/* ──────────────────────────────────────────────────────────── */}
        {/* SECTION 1 — Hero Spotlight                                   */}
        {/* ──────────────────────────────────────────────────────────── */}
        <section
          aria-labelledby="featured-title"
          className="grid w-full grid-cols-1 lg:grid-cols-2"
        >
          <div className="relative aspect-[4/5] w-full overflow-hidden bg-[#06070a] lg:aspect-auto lg:min-h-[640px]">
            <Image
              src={doctor.imageUrl}
              alt={`${doctor.name}, ${doctor.title}`}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover object-top"
            />
            <div
              aria-hidden
              className="absolute inset-0 mix-blend-soft-light"
              style={{
                background:
                  "radial-gradient(110% 70% at 50% 10%, rgba(168,130,81,0.9) 0%, rgba(168,130,81,0) 65%)",
              }}
            />
            <div
              aria-hidden
              className="absolute inset-0"
              style={{
                background:
                  "radial-gradient(150% 100% at 50% 45%, transparent 38%, rgba(6,7,10,0.55) 100%)",
              }}
            />
            <div
              aria-hidden
              className="absolute inset-0 bg-gradient-to-t from-[#06070a]/45 via-transparent to-transparent"
            />
          </div>

          <div className="flex items-center justify-center bg-[#0a0a0d] px-6 py-14 sm:px-12 lg:px-16">
            <div className="w-full max-w-md">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-accent-soft">
                {courseName}
              </p>
              <h1
                id="featured-title"
                className="mt-3 font-serif text-4xl leading-tight tracking-tight sm:text-5xl"
              >
                {doctor.name}
              </h1>

              <div className="mt-4 flex items-center gap-3">
                <span className="h-px w-8 bg-white/40" />
                <span className="text-xs font-semibold tracking-[0.18em] text-white/70">
                  TEACHES {doctor.title.toUpperCase()}
                </span>
              </div>

              <p className="mt-6 text-sm font-semibold text-white/90">
                {doctor.city}
                {doctor.experienceYears
                  ? ` · ${doctor.experienceYears} years of experience`
                  : ""}
              </p>

              {description ? (
                <p className="mt-4 line-clamp-3 text-[15px] leading-relaxed text-white/70">
                  {description}
                </p>
              ) : null}

              {metaPills.length > 0 ? (
                <div className="mt-6 flex flex-wrap gap-2">
                  {metaPills.map((p) => (
                    <span
                      key={p}
                      className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-medium text-white/80"
                    >
                      {p}
                    </span>
                  ))}
                </div>
              ) : null}

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="#apply"
                  className="rounded-md bg-[#e8265c] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#d8214f]"
                >
                  Apply Now
                </Link>
                {doctor.brochureUrl ? (
                  <a
                    href={doctor.brochureUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-md border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                  >
                    <Download className="h-4 w-4" />
                    Download Brochure
                  </a>
                ) : null}
              </div>

              {doctor.trailerVideoUrl ? (
                <Link
                  href="#trailer"
                  className="mt-4 inline-block text-xs font-semibold text-white/70 underline-offset-4 hover:text-white hover:underline"
                >
                  ▶ Watch Trailer
                </Link>
              ) : null}
            </div>
          </div>
        </section>

        {/* ──────────────────────────────────────────────────────────── */}
        {/* SECTION 2 — Steps strip                                      */}
        {/* ──────────────────────────────────────────────────────────── */}
        <section
          aria-labelledby="steps-title"
          className="border-y border-white/5 bg-[#0a0a0d]"
        >
          <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8 sm:py-16">
            <p className="text-center text-[11px] font-semibold uppercase tracking-[0.22em] text-accent-soft">
              How it works
            </p>
            <h2
              id="steps-title"
              className="mt-3 text-center font-serif text-3xl leading-tight sm:text-4xl"
            >
              Three steps from interest to your first cohort call
            </h2>

            <ol className="mt-10 grid gap-4 sm:grid-cols-3">
              {STEPS.map(({ icon: Icon, num, title, desc }) => (
                <li
                  key={num}
                  className="rounded-xl border border-white/10 bg-white/[0.03] p-6 transition hover:border-accent/30 hover:bg-white/[0.06]"
                >
                  <div className="flex items-center gap-3">
                    <span
                      aria-hidden
                      className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-accent/15 text-accent-soft ring-1 ring-accent/30"
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="text-xs font-bold tracking-widest text-white/40">
                      {num}
                    </span>
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-white">{title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-white/60">{desc}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ──────────────────────────────────────────────────────────── */}
        {/* SECTION 3 — Trailer (top) + ROI calculator (below)           */}
        {/* ──────────────────────────────────────────────────────────── */}
        <section
          id="trailer"
          aria-labelledby="trailer-title"
          className="mx-auto max-w-7xl px-5 py-16 sm:px-8"
        >
          <h2 id="trailer-title" className="sr-only">
            Trailer and ROI estimator
          </h2>
          <div className="grid gap-10">
            {/* Video */}
            <div className="relative mx-auto aspect-video w-full max-w-5xl overflow-hidden rounded-md bg-black">
              {doctor.trailerVideoUrl ? (
                <TrailerPlayer
                  src={doctor.trailerVideoUrl}
                  poster={doctor.imageUrl}
                  title={`${doctor.name} — Trailer`}
                  className="absolute inset-0 h-full w-full"
                />
              ) : (
                <>
                  <Image
                    src={doctor.imageUrl}
                    alt={`${doctor.name} trailer poster`}
                    fill
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    className="object-cover opacity-70"
                  />
                  <div className="absolute inset-0 bg-black/30" />
                  <div className="absolute right-5 top-4 flex items-center gap-5 text-sm text-white">
                    <span className="font-semibold">Trailer</span>
                    <span className="text-white/60">Coming soon</span>
                  </div>
                </>
              )}
            </div>

            {/* ROI calculator — full left/right layout */}
            <PracticeGrowthCalculator
              defaultSpecialty={doctor.specialty[0]}
              courseTuitionInr={doctor.priceInr}
              ctaHref="#apply"
            />
          </div>
        </section>

        {/* ──────────────────────────────────────────────────────────── */}
        {/* SECTION 4 — What You'll Learn                                */}
        {/* ──────────────────────────────────────────────────────────── */}
        {learnItems.length > 0 ? (
          <section
            aria-labelledby="learn-title"
            className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20"
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-accent-soft">
              Curriculum
            </p>
            <h2
              id="learn-title"
              className="mt-2 font-serif text-3xl leading-tight sm:text-4xl"
            >
              What You&rsquo;ll Learn
            </h2>

            <ul className="mt-10 grid gap-x-10 gap-y-4 sm:grid-cols-2">
              {learnItems.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span
                    aria-hidden
                    className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent-soft ring-1 ring-accent/30"
                  >
                    <Check className="h-3.5 w-3.5" />
                  </span>
                  <span className="text-[15px] leading-relaxed text-white/85">
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {/* ──────────────────────────────────────────────────────────── */}
        {/* SECTION 5 — Pricing card + Register / Apply                  */}
        {/* ──────────────────────────────────────────────────────────── */}
        <section
          id="apply"
          aria-labelledby="apply-title"
          className="mx-auto max-w-6xl px-5 py-12 sm:px-8 sm:py-16"
        >
          <div className="grid gap-8 rounded-2xl bg-[#141417] p-8 ring-1 ring-white/5 sm:p-10 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-accent-soft">
                Investment
              </p>
              <p
                id="apply-title"
                className="mt-3 font-serif text-4xl leading-none text-white sm:text-5xl"
              >
                {priceLabel ?? perDayLabel ?? "Custom pricing"}
              </p>
              <p className="mt-2 text-sm text-white/55">
                {perDayLabel && priceLabel ? `Starting at ${perDayLabel}` : null}
                {perDayLabel && priceLabel && billingLabel ? " · " : null}
                {billingLabel ? billingLabel : null}
                {doctor.moneyBackDays
                  ? ` · ${doctor.moneyBackDays}-day money back`
                  : null}
              </p>
              <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-semibold text-accent-soft">
                <span aria-hidden>★</span> Scholarships available
              </p>
            </div>

            <div className="flex flex-wrap gap-3 lg:flex-nowrap">
              <Link
                href="#get-started"
                className="rounded-md border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Register
              </Link>
              <Link
                href="#get-started"
                className="rounded-md bg-[#e8265c] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#d8214f]"
              >
                Apply Now
              </Link>
            </div>
          </div>
        </section>

        {/* ──────────────────────────────────────────────────────────── */}
        {/* SECTION 6 — Member Stories (hidden)                          */}
        {/* ──────────────────────────────────────────────────────────── */}
        {false && (
          <section
            id="get-started"
            aria-labelledby="stories-title"
            className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20"
          >
            <h2
              id="stories-title"
              className="text-center text-2xl font-bold sm:text-3xl"
            >
              Member Stories
            </h2>

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
        )}

        {/* ──────────────────────────────────────────────────────────── */}
        {/* SECTION 7 — Other mentors rail                               */}
        {/* ──────────────────────────────────────────────────────────── */}
        {otherDoctors.length > 0 ? (
          <section
            aria-labelledby="rail-title"
            className="mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-16"
          >
            <div className="flex items-end justify-between">
              <div>
                <h2
                  id="rail-title"
                  className="text-2xl font-bold tracking-tight sm:text-3xl"
                >
                  From Here, Go Anywhere
                </h2>
                <p className="mt-1 text-sm text-white/55">
                  Included with a membership · {otherDoctors.length}+ more mentors
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

            <div
              ref={railRef}
              className="no-scrollbar mt-6 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2"
            >
              {otherDoctors.map((d) => (
                <Link
                  key={d.id}
                  href={`/doctors/${d.slug}`}
                  className="group relative aspect-[3/4] w-[170px] shrink-0 snap-start overflow-hidden rounded-2xl border border-white/10 bg-ink-800 sm:w-[210px]"
                >
                  <Image
                    src={d.imageUrl}
                    alt={`${d.name}, ${d.title}`}
                    fill
                    sizes="(max-width: 640px) 170px, 210px"
                    className="object-cover object-top transition duration-500 group-hover:scale-105"
                  />
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-[linear-gradient(to_top,rgba(0,0,0,0.95)_0%,rgba(0,0,0,0.7)_40%,rgba(0,0,0,0)_100%)]"
                  />
                  <div className="absolute inset-x-0 bottom-0 px-3 pb-4 pt-8 text-center">
                    <p className="font-serif text-lg leading-tight text-white sm:text-xl">
                      {d.name}
                    </p>
                    <span
                      className="mx-auto mt-1.5 block h-px w-6 bg-white/70"
                      aria-hidden
                    />
                    <p className="mt-1.5 text-[11px] font-semibold text-white/85 sm:text-xs">
                      {d.title}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ) : null}
      </main>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* Sticky bottom CTA (scroll-triggered)                         */}
      {/* ──────────────────────────────────────────────────────────── */}
      <div
        className={`fixed inset-x-0 bottom-0 z-40 border-t border-white/5 bg-[#0a0a0d]/95 backdrop-blur transition-transform duration-300 ${
          showSticky ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-3 sm:px-8">
          <div className="flex items-center gap-3">
            <div className="hidden -space-x-2 sm:flex">
              {memberAvatars.slice(0, 4).map((src, i) => (
                <span
                  key={i}
                  className="relative h-7 w-7 overflow-hidden rounded-full border-2 border-[#0a0a0d]"
                >
                  <Image
                    src={src}
                    alt=""
                    fill
                    sizes="28px"
                    className="object-cover"
                  />
                </span>
              ))}
            </div>
            <div className="text-xs leading-tight">
              <p className="font-semibold text-white">
                {priceLabel ? (
                  <>
                    From <span className="font-bold">{priceLabel}</span>
                  </>
                ) : perDayLabel ? (
                  <>
                    Starting at <span className="font-bold">{perDayLabel}</span>
                  </>
                ) : (
                  "Custom pricing"
                )}
              </p>
              {billingLabel ? (
                <p className="text-white/55">{billingLabel}</p>
              ) : null}
            </div>
          </div>
          <Link
            href="#apply"
            className="rounded-md bg-[#e8265c] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#d8214f]"
          >
            Apply Now
          </Link>
        </div>
      </div>

      <Footer />
    </>
  );
}
