"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  CalendarClock,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  GraduationCap,
  PhoneCall,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { TrailerPlayer } from "@/components/TrailerPlayer";
import { PracticeGrowthCalculator } from "@/components/PracticeGrowthCalculator";
import { ApplyFormModal } from "@/components/ApplyFormModal";
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
  const footerSentinelRef = useRef<HTMLDivElement>(null);
  const [showSticky, setShowSticky] = useState(false);
  const [footerVisible, setFooterVisible] = useState(false);
  const [applyOpen, setApplyOpen] = useState(false);
  const [applyIntent, setApplyIntent] = useState<"apply" | "brochure">("apply");
  const [bioExpanded, setBioExpanded] = useState(false);
  const openApply = () => {
    setApplyIntent("apply");
    setApplyOpen(true);
  };
  const closeApply = () => setApplyOpen(false);

  useEffect(() => {
    const onScroll = () => setShowSticky(window.scrollY > 540);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const el = footerSentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setFooterVisible(entry.isIntersecting),
      { rootMargin: "16px 0px 0px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const memberAvatars = otherDoctors.slice(0, 5).map((d) => d.imageUrl);
  const fallbackAvatar = doctor.imageUrl;

  // Course-side fields with sensible fallbacks
  const courseName = doctor.courseName ?? doctor.title;
  const baseDescription =
    doctor.description ??
    doctor.bio ??
    `In Indian ophthalmology, few names are as inseparable from Cornea as Dr. Srinivas K Rao. Long before advanced corneal reconstruction became mainstream in India, surgeons across the country were already studying Dr. Rao’s methods for solving cases many believed had no solutions. At a time when complex corneal blindness was still considered untreatable and anterior segment surgery was evolving globally, Dr. Rao was quietly expanding India’s surgical horizons—pioneering limbal stem cell transplantation, lamellar corneal surgery, keratoprosthesis and complex cataract reconstruction years before they became widely adopted.`;
  const extendedDescription = `In Indian ophthalmology, few names are as inseparable from Cornea as Dr. Srinivas K Rao. Long before advanced corneal reconstruction became mainstream in India, surgeons across the country were already studying Dr. Rao’s methods for solving cases many believed had no solutions. At a time when complex corneal blindness was still considered untreatable and anterior segment surgery was evolving globally, Dr. Rao was quietly expanding India’s surgical horizons—pioneering limbal stem cell transplantation, lamellar corneal surgery, keratoprosthesis and complex cataract reconstruction years before they became widely adopted.

Over time, difficult corneal cases across hospitals often ended with a familiar conclusion: “Send it to Dr. Rao.” Revered for his surgical instinct, composure and uncompromising standards, he became one of the defining forces behind modern corneal practice in India and across Asia. His contributions to blindness prevention were internationally recognised when the Asia-Pacific Academy of Ophthalmology honoured him with the Outstanding Service in the Prevention of Blindness Award—an honour reserved for those whose work fundamentally changes the future of eye care.

But legends are rarely remembered only for what they performed. They are remembered for what the field became because they existed. Beyond the operating room, Dr. Rao shaped the very culture of Cornea in India—mentoring generations of surgeons, influencing how complex anterior segment surgery is practiced, and eventually founding the Cornea Society of India itself.

For many ophthalmologists, Dr. Rao is not merely a surgeon, teacher or speaker; he is a benchmark for mastery itself. His techniques are studied, his judgment is quoted and his philosophy continues to influence how Cornea is practiced, taught and imagined even today. In many ways, learning Cornea from Dr. Rao is not simply learning a specialty—it is learning from one of the surgeons who helped define the specialty itself.`;
  const description = baseDescription;
  const lessonsLabel = doctor.lessonsCount
    ? `${doctor.lessonsCount} Modules`
    : null;
  const durationMinLabel = formatDuration(doctor.durationMinutes);
  const durationWeekLabel = doctor.durationWeeks
    ? `${doctor.durationWeeks} Months`
    : null;
  const metaPills = [durationWeekLabel, lessonsLabel].filter(
    Boolean,
  ) as string[];

  const priceLabel = doctor.priceInr ? formatINR(doctor.priceInr) : null;
  const perDayLabel = doctor.pricePerDayInr
    ? `₹${doctor.pricePerDayInr}/day`
    : null;
  const billingLabel = "excluding GST";

  const FALLBACK_LEARN_ITEMS = [
    "How to set up eye banking and initiate a transplant program in your hospital",
    "Principles of donor tissue selection and grading",
    "Techniques for DMEK, DSAEK, and DALK",
    "Patient selection and pre-operative evaluation and planning",
    "Post-operative care and complication management",
    "Graft survival optimisation and long-term follow-up",
    "Clear decision pathways for choosing the right lamellar technique in real clinical settings",
  ];
  const learnItems =
    doctor.learningOutcomes && doctor.learningOutcomes.length > 0
      ? doctor.learningOutcomes
      : doctor.highlights && doctor.highlights.length > 0
        ? doctor.highlights
        : FALLBACK_LEARN_ITEMS;

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
        {/* SECTION 1 — Hero: image + trailer (75%) | info (25%)         */}
        {/* ──────────────────────────────────────────────────────────── */}
        <section
          aria-labelledby="featured-title"
          className="grid w-full grid-cols-1 lg:grid-cols-5"
        >
          <div className="bg-[#06070a] lg:col-span-3">
            {/* Trailer */}
            <div
              id="trailer"
              className="relative aspect-video w-full overflow-hidden bg-black"
            >
              {doctor.trailerVideoUrl ? (
                <TrailerPlayer
                  src={doctor.trailerVideoUrl}
                  poster={doctor.doctorImage ?? doctor.imageUrl}
                  title={`${doctor.name} — Trailer`}
                  className="absolute inset-0 h-full w-full"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-[#0a0a0d]">
                  <div className="text-center">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[#a88251]">
                      Trailer
                    </p>
                    <p className="mt-2 text-sm text-white/55">Coming soon</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-center bg-[#0a0a0d] px-6 py-12 sm:px-8 lg:col-span-2 lg:px-10 lg:py-12">
            <div className="w-full">
              <h1
                id="featured-title"
                className="font-serif text-3xl leading-tight tracking-tight sm:text-4xl"
              >
                {courseName}
              </h1>

              <div className="mt-4 flex items-center gap-3">
                <span className="h-px w-8 bg-white/40" />
                <span className="text-xs font-semibold tracking-[0.18em] text-white/70">
                  BY {doctor.name.toUpperCase()}
                </span>
              </div>

              <p className="mt-6 line-clamp-4 text-sm leading-relaxed text-white/70">
                {baseDescription}
              </p>

              {metaPills.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-2">
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

              <div className="mt-8">
                <button
                  type="button"
                  onClick={openApply}
                  className="inline-flex rounded-md bg-[#a88251] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#8a6a40]"
                >
                  Apply Now
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ──────────────────────────────────────────────────────────── */}
        {/* SECTION 2 — About the mentor (bio) with Know More expand     */}
        {/* ──────────────────────────────────────────────────────────── */}
        {(() => {
          const fullBio = extendedDescription;
          const PREVIEW_LEN = 500;
          const needsTruncation = fullBio.length > PREVIEW_LEN;
          const previewText = needsTruncation
            ? `${fullBio.slice(0, PREVIEW_LEN).trimEnd()}…`
            : fullBio;
          return (
            <section
              aria-labelledby="bio-title"
              className="mx-auto max-w-4xl px-5 py-16 sm:px-8 sm:py-20"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-accent-soft">
                About the mentor
              </p>
              <h2
                id="bio-title"
                className="mt-2 font-serif text-3xl leading-tight sm:text-4xl"
              >
                {doctor.name}
              </h2>

              <p
                id="bio-text"
                className="mt-6 whitespace-pre-line text-[15px] leading-relaxed text-white/75"
              >
                {bioExpanded ? fullBio : previewText}
              </p>

              {needsTruncation ? (
                <button
                  type="button"
                  onClick={() => setBioExpanded((v) => !v)}
                  aria-expanded={bioExpanded}
                  aria-controls="bio-text"
                  className="mt-6 inline-flex items-center gap-2 rounded-md border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/85 transition hover:bg-white/10"
                >
                  {bioExpanded ? "Show less" : "Know more"}
                  <span
                    aria-hidden
                    className={`inline-block transition-transform duration-300 ${
                      bioExpanded ? "rotate-180" : ""
                    }`}
                  >
                    ↓
                  </span>
                </button>
              ) : null}
            </section>
          );
        })()}

        {/* ──────────────────────────────────────────────────────────── */}
        {/* SECTION 3 — ROI calculator                                   */}
        {/* ──────────────────────────────────────────────────────────── */}
        <section
          aria-labelledby="roi-title"
          className="mx-auto max-w-7xl px-5 py-16 sm:px-8"
        >
          <h2 id="roi-title" className="sr-only">
            ROI estimator
          </h2>
          <PracticeGrowthCalculator
            defaultSpecialty={doctor.specialty[0]}
            courseTuitionInr={doctor.priceInr}
            lockSpecialty
            onCtaClick={openApply}
          />
        </section>

        {/* ──────────────────────────────────────────────────────────── */}
        {/* SECTION 4 — Curriculum (left: What You'll Learn, right: Highlights) */}
        {/* ──────────────────────────────────────────────────────────── */}
        {learnItems.length > 0 ? (
          <section
            aria-labelledby="learn-title"
            className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24"
          >
            <p className="font-serif text-5xl leading-tight tracking-tight text-accent-soft sm:text-6xl">
              Curriculum
            </p>

            <div className="mt-14 grid gap-12 md:grid-cols-2 lg:grid-cols-3 lg:gap-10">
              {/* COL 1 — What You'll Learn */}
              <div>
                <h2
                  id="learn-title"
                  className="font-serif text-3xl leading-tight sm:text-4xl"
                >
                  What You&rsquo;ll Learn
                </h2>
                <ul className="mt-8 space-y-4">
                  {learnItems.map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <span
                        aria-hidden
                        className="mt-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent-soft ring-1 ring-accent/30"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </span>
                      <span className="text-base leading-relaxed text-white/90 sm:text-lg">
                        {item}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* COL 2 — Curriculum Highlights */}
              <div>
                <h2 className="font-serif text-3xl leading-tight sm:text-4xl">
                  Highlights
                </h2>
                <ul className="mt-8 space-y-4">
                  {[
                    "End-to-end exposure from infrastructure to surgical execution",
                    "Practical, technique-focused approach",
                    "Case discussions covering routine and complex transplants",
                    "Ideal for ophthalmologists expanding into corneal surgery",
                    "Structured learning that accelerates your shift from theory to hands-on surgical confidence",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <span
                        aria-hidden
                        className="mt-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#a88251]/15 text-[#a88251] ring-1 ring-[#a88251]/30"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </span>
                      <span className="text-base leading-relaxed text-white/90 sm:text-lg">
                        {item}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* COL 3 — Course format (blended learning) */}
              <div>
                <h2 className="font-serif text-3xl leading-tight sm:text-4xl">
                  Course format
                  <span className="mt-1 block whitespace-nowrap font-sans text-sm font-normal tracking-normal text-white/55">
                    {/* (blended learning) */}
                  </span>
                </h2>
                <ul className="mt-8 space-y-4">
                  {[
                    {
                      when: "Month 1",
                      what: "2-Day In-Person Transplant Training Program",
                    },
                    {
                      when: "Months 2–5",
                      what: "Online Surgical Theory & Case Modules",
                    },
                    {
                      when: "Month 6",
                      what: "2-Day In-Person Advanced Lamellar Surgery Workshop",
                    },
                    {
                      when: "Months 7–10",
                      what: "Online Surgical Case Reviews & Mentorship Sessions",
                    },
                  ].map((item) => (
                    <li key={item.when} className="flex items-start gap-3">
                      <span
                        aria-hidden
                        className="mt-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent-soft ring-1 ring-accent/30"
                      >
                        <CalendarClock className="h-3.5 w-3.5" />
                      </span>
                      <span className="text-base leading-relaxed text-white/90 sm:text-lg">
                        <span className="font-semibold text-white">
                          {item.when}:
                        </span>{" "}
                        {item.what}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
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
              </p>
              <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-semibold text-accent-soft">
                <span aria-hidden>★</span> Scholarships available
              </p>
            </div>

            <div className="flex flex-wrap gap-3 lg:flex-nowrap">
              <button
                type="button"
                onClick={openApply}
                className="rounded-md bg-[#a88251] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#8a6a40]"
              >
                Apply Now
              </button>
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
        {/* SECTION 7 — Steps strip (final)                              */}
        {/* ──────────────────────────────────────────────────────────── */}
        <section
          aria-labelledby="steps-title"
          className="relative overflow-hidden border-y border-white/5 bg-[#0a0a0d]"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(70% 60% at 50% 0%, rgba(168,130,81,0.08) 0%, transparent 70%)",
            }}
          />

          <div className="relative mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-24">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[#a88251]">
                How it works
              </p>
              <h2
                id="steps-title"
                className="mt-4 font-serif text-3xl leading-[1.15] sm:text-[44px]"
              >
                Three steps from interest to your first cohort call
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-white/55">
                A simple, mentor-led path designed to align outcomes from day one.
              </p>
            </div>

            <div className="relative mt-16">
              {/* Connector line — desktop only, masked by icon bubble shadows */}
              <div
                aria-hidden
                className="pointer-events-none absolute left-0 right-0 top-[50px] hidden sm:block"
              >
                <div className="mx-auto h-px max-w-[66%] bg-gradient-to-r from-transparent via-[#a88251]/40 to-transparent" />
              </div>

              <ol className="relative grid gap-14 sm:grid-cols-3 sm:gap-8">
                {STEPS.map(({ icon: Icon, num, title, desc }) => (
                  <li key={num} className="group relative text-center">
                    <div className="relative mx-auto flex h-[100px] items-center justify-center">
                      <span
                        aria-hidden
                        className="select-none font-serif text-[96px] font-light leading-none text-white/[0.06]"
                      >
                        {num}
                      </span>
                      <span
                        aria-hidden
                        className="absolute inline-flex h-14 w-14 items-center justify-center rounded-full border border-[#a88251]/40 bg-[#0a0a0d] text-[#a88251] shadow-[0_0_0_6px_#0a0a0d] transition duration-300 group-hover:scale-105 group-hover:border-[#a88251] group-hover:shadow-[0_0_0_6px_#0a0a0d,0_0_30px_-4px_rgba(168,130,81,0.55)]"
                      >
                        <Icon className="h-5 w-5" />
                      </span>
                    </div>

                    <p className="mt-6 text-[10px] font-bold tracking-[0.32em] text-[#a88251]">
                      STEP {num}
                    </p>
                    <h3 className="mt-2 font-serif text-2xl leading-tight text-white">
                      {title}
                    </h3>
                    <p className="mx-auto mt-3 max-w-[260px] text-sm leading-relaxed text-white/60">
                      {desc}
                    </p>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

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
              {otherDoctors.map((d) => {
                const subtitle = d.courseName ?? d.title;
                return (
                  <Link
                    key={d.id}
                    href={`/doctors/${d.slug}`}
                    className="group relative aspect-[3/4] w-[170px] shrink-0 snap-start overflow-hidden rounded-2xl border border-white/10 bg-ink-800 sm:w-[210px]"
                  >
                    <Image
                      src={d.imageUrl}
                      alt={`${d.name}, ${subtitle}`}
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
                      {subtitle ? (
                        <>
                          <span
                            className="mx-auto mt-1.5 block h-px w-6 bg-white/70"
                            aria-hidden
                          />
                          <p className="mt-1.5 text-[11px] font-semibold text-white/85 sm:text-xs">
                            {subtitle}
                          </p>
                        </>
                      ) : null}
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        ) : null}
      </main>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* Sticky bottom CTA (scroll-triggered)                         */}
      {/* ──────────────────────────────────────────────────────────── */}
      <div
        className={`fixed inset-x-0 bottom-0 z-40 border-t border-white/5 bg-[#0a0a0d]/95 backdrop-blur transition-transform duration-300 ${
          showSticky && !footerVisible ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-3 sm:px-8">
          <div className="flex items-center gap-3">
            <span className="relative h-9 w-9 overflow-hidden rounded-full border border-white/10">
              <Image
                src={doctor.imageUrl}
                alt={doctor.name}
                fill
                sizes="36px"
                className="object-cover"
              />
            </span>
            <div className="text-xs leading-tight">
              <p
                className="line-clamp-1 max-w-[200px] font-semibold text-white sm:max-w-[420px]"
                title={courseName}
              >
                {courseName}
              </p>
              <p className="text-white/55">
                {doctor.name}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={openApply}
              className="rounded-md border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Know More
            </button>
            <button
              type="button"
              onClick={openApply}
              className="rounded-md bg-[#a88251] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#8a6a40]"
            >
              Apply Now
            </button>
          </div>
        </div>
      </div>

      <ApplyFormModal
        open={applyOpen}
        onClose={closeApply}
        intent={applyIntent}
        courseId={doctor.id}
        courseName={courseName}
        brochureUrl={doctor.brochureUrl}
      />

      <div ref={footerSentinelRef} aria-hidden className="h-px" />
      <Footer />
    </>
  );
}
