"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  CalendarClock,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  GraduationCap,
  Link2,
  MapPin,
  PhoneCall,
  Play,
  Share2,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { TrailerPlayer } from "@/components/TrailerPlayer";
import { ApplyFormModal } from "@/components/ApplyFormModal";
import { PracticeGrowthCalculator } from "@/components/PracticeGrowthCalculator";
import { formatINR } from "@/lib/utils";
import type { Doctor } from "@/types";

// ─── Constants ────────────────────────────────────────────────────────────────

const SPECIALTY_LABELS: Record<string, string> = {
  "cornea-ocular-surface": "Cornea & Ocular Surface",
  "phaco-refractive-surgery": "Phaco & Refractive Surgery",
  "retina-vitreo-retinal-surgery": "Vitreo-Retinal Surgery",
  glaucoma: "Glaucoma",
  "pediatric-ophthalmology": "Paediatric Ophthalmology",
  oculoplasty: "Oculoplasty",
  "ophthalmology-practice-mastery": "Practice Mastery",
};

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

const FALLBACK_LEARN_ITEMS = [
  "How to set up eye banking and initiate a transplant program in your hospital",
  "Principles of donor tissue selection and grading",
  "Techniques for DMEK, DSAEK, and DALK",
  "Patient selection and pre-operative evaluation and planning",
  "Post-operative care and complication management",
  "Graft survival optimisation and long-term follow-up",
  "Clear decision pathways for choosing the right lamellar technique in real clinical settings",
];

const FALLBACK_HIGHLIGHTS = [
  "End-to-end exposure from infrastructure to surgical execution",
  "Practical, technique-focused approach throughout",
  "Case discussions covering routine and complex transplants",
  "Ideal for ophthalmologists expanding into corneal surgery",
  "Structured learning that accelerates surgical confidence",
];

const FALLBACK_FORMAT = [
  { when: "Month 1", what: "2-Day In-Person Transplant Training Program" },
  { when: "Months 2–5", what: "Online Surgical Theory & Case Modules" },
  { when: "Month 6", what: "2-Day In-Person Advanced Lamellar Surgery Workshop" },
  { when: "Months 7–10", what: "Online Surgical Case Reviews & Mentorship Sessions" },
];

const EXTENDED_BIO = `In Indian ophthalmology, few names are as inseparable from Cornea as Dr. Srinivas K Rao. Long before advanced corneal reconstruction became mainstream in India, surgeons across the country were already studying Dr. Rao's methods for solving cases many believed had no solutions. At a time when complex corneal blindness was still considered untreatable and anterior segment surgery was evolving globally, Dr. Rao was quietly expanding India's surgical horizons — pioneering limbal stem cell transplantation, lamellar corneal surgery, keratoprosthesis and complex cataract reconstruction years before they became widely adopted.

Over time, difficult corneal cases across hospitals often ended with a familiar conclusion: "Send it to Dr. Rao." Revered for his surgical instinct, composure and uncompromising standards, he became one of the defining forces behind modern corneal practice in India and across Asia. His contributions to blindness prevention were internationally recognised when the Asia-Pacific Academy of Ophthalmology honoured him with the Outstanding Service in the Prevention of Blindness Award — an honour reserved for those whose work fundamentally changes the future of eye care.

But legends are rarely remembered only for what they performed. They are remembered for what the field became because they existed. Beyond the operating room, Dr. Rao shaped the very culture of Cornea in India — mentoring generations of surgeons, influencing how complex anterior segment surgery is practiced, and eventually founding the Cornea Society of India itself.

For many ophthalmologists, Dr. Rao is not merely a surgeon, teacher or speaker; he is a benchmark for mastery itself. His techniques are studied, his judgment is quoted and his philosophy continues to influence how Cornea is practiced, taught and imagined even today. In many ways, learning Cornea from Dr. Rao is not simply learning a specialty — it is learning from one of the surgeons who helped define the specialty itself.`;

// ─── Helper ───────────────────────────────────────────────────────────────────

function formatDuration(minutes?: number): string | null {
  if (!minutes || minutes <= 0) return null;
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hrs && mins) return `${hrs}hr ${mins}min`;
  if (hrs) return `${hrs}hr`;
  return `${mins}min`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DoctorDetailClient({
  doctor,
  otherDoctors,
}: {
  doctor: Doctor;
  otherDoctors: Doctor[];
}) {
  const railRef = useRef<HTMLDivElement>(null);
  const footerSentinelRef = useRef<HTMLDivElement>(null);
  const videoSectionRef = useRef<HTMLElement>(null);
  const heroImgRef = useRef<HTMLDivElement>(null);

  const [showSticky, setShowSticky] = useState(false);
  const [footerVisible, setFooterVisible] = useState(false);
  const [applyOpen, setApplyOpen] = useState(false);
  const [applyIntent, setApplyIntent] = useState<"apply" | "brochure">("apply");
  const [bioExpanded, setBioExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pageUrl, setPageUrl] = useState("");

  const openApply = () => { setApplyIntent("apply"); setApplyOpen(true); };
  const openBrochure = () => { setApplyIntent("brochure"); setApplyOpen(true); };

  const scrollToVideo = () =>
    videoSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  // Capture page URL client-side only
  useEffect(() => { setPageUrl(window.location.href); }, []);

  // Sticky bar trigger
  useEffect(() => {
    const onScroll = () => setShowSticky(window.scrollY > 540);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Subtle parallax on hero portrait
  useEffect(() => {
    const onScroll = () => {
      if (!heroImgRef.current) return;
      heroImgRef.current.style.transform = `translateY(${window.scrollY * 0.22}px)`;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Hide sticky bar when footer is visible
  useEffect(() => {
    const el = footerSentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setFooterVisible(entry.isIntersecting),
      { rootMargin: "16px 0px 0px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Share handlers
  const handleShare = useCallback(async () => {
    const title = `${doctor.name} — ${doctor.title} · OphthaXP`;
    const text = `${doctor.name}, ${doctor.title}, is teaching at OphthaXP. Learn directly from one of India's finest ophthalmologists.`;
    if (typeof navigator !== "undefined" && navigator.share) {
      try { await navigator.share({ title, text, url: pageUrl }); } catch {}
    } else {
      await navigator.clipboard.writeText(pageUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [doctor, pageUrl]);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(pageUrl || window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [pageUrl]);

  // ─── Computed values ──────────────────────────────────────────────────────

  const courseName = doctor.courseName ?? doctor.title;
  const fullBio = doctor.description ?? EXTENDED_BIO;
  const PREVIEW_LEN = 460;
  const needsTruncation = fullBio.length > PREVIEW_LEN;
  const previewBio = needsTruncation
    ? `${fullBio.slice(0, PREVIEW_LEN).trimEnd()}…`
    : fullBio;
  const pullQuote =
    fullBio.split(/\.|\n/)[0]?.trim().replace(/^["']/, "") ?? doctor.bio;

  const learnItems =
    doctor.learningOutcomes?.length
      ? doctor.learningOutcomes
      : doctor.highlights?.length
        ? doctor.highlights
        : FALLBACK_LEARN_ITEMS;

  const priceLabel = doctor.priceInr ? formatINR(doctor.priceInr) : null;
  const perDayLabel = doctor.pricePerDayInr
    ? `₹${doctor.pricePerDayInr}/day`
    : null;
  const metaPills = [
    doctor.durationWeeks ? `${doctor.durationWeeks} Months` : null,
    doctor.lessonsCount ? `${doctor.lessonsCount} Modules` : null,
    formatDuration(doctor.durationMinutes),
  ].filter(Boolean) as string[];

  const shareText = encodeURIComponent(
    `${doctor.name}, ${doctor.title}, is teaching at OphthaXP — learn directly from one of India's finest ophthalmologists.`
  );
  const shareUrlEnc = pageUrl ? encodeURIComponent(pageUrl) : "";
  const whatsappHref = `https://wa.me/?text=${shareText}${shareUrlEnc ? `%20${shareUrlEnc}` : ""}`;
  const linkedinHref = shareUrlEnc
    ? `https://www.linkedin.com/sharing/share-offsite/?url=${shareUrlEnc}`
    : "#";
  const twitterHref = shareUrlEnc
    ? `https://twitter.com/intent/tweet?text=${shareText}&url=${shareUrlEnc}`
    : "#";

  const primarySpecialties = doctor.specialty.filter((s) => s !== "all").slice(0, 2);

  return (
    <>
      <Navbar />
      <main className="bg-[#06070a] pb-24 text-white">

        {/* ════════════════════════════════════════════════════════════
            § 1 — HERO   Full-viewport cinematic identity
        ════════════════════════════════════════════════════════════ */}
        <section
          aria-labelledby="legend-name"
          className="relative min-h-[100svh] overflow-hidden"
        >
          {/* Portrait — parallax layer */}
          <div
            ref={heroImgRef}
            className="absolute inset-0 will-change-transform"
            style={{ top: "-10%", bottom: "-10%" }}
          >
            <Image
              src={doctor.doctorImage ?? doctor.imageUrl}
              alt={doctor.name}
              fill
              priority
              sizes="100vw"
              className="object-cover object-top"
            />
          </div>

          {/* Overlays */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#06070a] via-[#06070a]/88 to-[#06070a]/25 lg:to-[#06070a]/10" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#06070a] via-transparent to-[#06070a]/55" />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(50% 65% at 12% 75%, rgba(171,131,77,0.13) 0%, transparent 65%)",
            }}
          />

          {/* Content */}
          <div className="relative mx-auto flex min-h-[100svh] max-w-7xl flex-col justify-end px-5 pb-20 pt-36 sm:px-8 lg:justify-center lg:pb-0 lg:pt-24">
            <div className="max-w-2xl">

              {/* Badge */}
              <div className="inline-flex items-center gap-2 rounded-full border border-[#ab834d]/40 bg-[#ab834d]/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.28em] text-[#ab834d]">
                <span aria-hidden>★</span> Legend · OphthaXP
              </div>

              {/* Name */}
              <h1
                id="legend-name"
                className="mt-5 font-serif text-5xl leading-[1.04] tracking-tight sm:text-6xl lg:text-[4.5rem]"
              >
                {doctor.name}
              </h1>

              {/* Title */}
              <div className="mt-5 flex items-start gap-3">
                <span className="mt-[11px] h-px w-10 shrink-0 bg-[#ab834d]/60" aria-hidden />
                <p className="text-lg leading-snug text-white/70 sm:text-xl">
                  {doctor.title}
                </p>
              </div>

              {/* Location */}
              {doctor.city && (
                <p className="mt-2 flex items-center gap-1.5 text-sm text-white/45">
                  <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  {doctor.city}, India
                </p>
              )}

              {/* Bio excerpt */}
              {doctor.bio && (
                <p className="mt-6 max-w-xl text-[15px] leading-relaxed text-white/60 line-clamp-3">
                  {doctor.bio}
                </p>
              )}

              {/* CTAs */}
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={openApply}
                  className="rounded-md bg-[#a88251] px-7 py-3 text-sm font-semibold text-white transition hover:bg-[#8a6a40]"
                >
                  Apply Now
                </button>
                <button
                  type="button"
                  onClick={scrollToVideo}
                  className="inline-flex items-center gap-2 rounded-md border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/10"
                >
                  <Play className="h-4 w-4 fill-white" aria-hidden />
                  Watch Intro
                </button>
              </div>

              {/* Stats strip */}
              {(doctor.experienceYears > 0 || primarySpecialties.length > 0) && (
                <div className="mt-14 flex flex-wrap gap-8 border-t border-white/10 pt-8">
                  {doctor.experienceYears > 0 && (
                    <div>
                      <p className="font-serif text-[2.6rem] font-black leading-none text-white">
                        {doctor.experienceYears}+
                      </p>
                      <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/40">
                        Years
                      </p>
                    </div>
                  )}
                  {primarySpecialties.map((s) => (
                    <div key={s}>
                      <p className="font-serif text-[2.6rem] font-black leading-none text-[#ab834d]">
                        ★
                      </p>
                      <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/40">
                        {SPECIALTY_LABELS[s] ?? s}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════════
            § 2 — VIDEO   Full-width cinematic trailer
        ════════════════════════════════════════════════════════════ */}
        <section
          ref={videoSectionRef}
          aria-labelledby="video-title"
          className="bg-black py-16 sm:py-20"
        >
          <div className="mx-auto max-w-5xl px-5 sm:px-8">
            <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[#ab834d]">
              From the Legend
            </p>
            <h2
              id="video-title"
              className="mt-3 font-serif text-3xl leading-tight sm:text-4xl"
            >
              {courseName}
            </h2>

            {metaPills.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {metaPills.map((p) => (
                  <span
                    key={p}
                    className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs font-medium text-white/70"
                  >
                    {p}
                  </span>
                ))}
              </div>
            )}

            <div className="mt-8 overflow-hidden rounded-2xl border border-white/5">
              {doctor.trailerVideoUrl ? (
                <TrailerPlayer
                  src={doctor.trailerVideoUrl}
                  poster={doctor.doctorImage ?? doctor.imageUrl}
                  title={`${doctor.name} — Introduction`}
                  className="aspect-video w-full"
                />
              ) : (
                <div className="flex aspect-video items-center justify-center bg-[#0a0a0d]">
                  <div className="text-center">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-[#ab834d]/30 bg-[#ab834d]/10">
                      <Play className="h-6 w-6 text-[#ab834d]" aria-hidden />
                    </div>
                    <p className="mt-3 text-sm text-white/40">Intro video coming soon</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════════
            § 3 — ABOUT   Editorial bio with pull-quote + at-a-glance
        ════════════════════════════════════════════════════════════ */}
        <section
          aria-labelledby="about-heading"
          className="bg-[#0a0a0d] py-20 sm:py-28"
        >
          <div className="mx-auto max-w-7xl px-5 sm:px-8">

            {/* Pull-quote */}
            <div className="relative max-w-4xl">
              <span
                aria-hidden
                className="pointer-events-none absolute -left-4 -top-8 select-none font-serif text-[10rem] leading-none text-[#ab834d]/10 sm:-left-8 sm:text-[14rem]"
              >
                "
              </span>
              <blockquote className="relative z-10 font-serif text-2xl leading-relaxed text-white/90 sm:text-3xl sm:leading-relaxed">
                {pullQuote}
              </blockquote>
            </div>

            {/* Two-column: bio + at-a-glance card */}
            <div className="mt-16 grid gap-12 lg:grid-cols-3 lg:gap-16">

              {/* Bio */}
              <div className="lg:col-span-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[#ab834d]">
                  About the Legend
                </p>
                <div
                  id="about-heading"
                  className="mt-5 whitespace-pre-line text-[15px] leading-relaxed text-white/70"
                >
                  {bioExpanded || !needsTruncation ? fullBio : previewBio}
                </div>
                {needsTruncation && (
                  <button
                    type="button"
                    onClick={() => setBioExpanded((v) => !v)}
                    className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#ab834d] transition hover:text-[#c9a06a]"
                  >
                    {bioExpanded ? "Show less" : "Read full biography"}
                    <span
                      aria-hidden
                      className={`inline-block transition-transform duration-300 ${bioExpanded ? "rotate-180" : ""}`}
                    >
                      ↓
                    </span>
                  </button>
                )}
              </div>

              {/* At-a-glance card */}
              <div className="rounded-2xl border border-white/8 bg-[#141417] p-7">
                <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[#ab834d]">
                  At a Glance
                </p>
                <dl className="mt-5 space-y-5">
                  {doctor.experienceYears > 0 && (
                    <div className="border-b border-white/8 pb-5">
                      <dt className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/40">
                        Experience
                      </dt>
                      <dd className="mt-1.5 font-serif text-3xl leading-none text-white">
                        {doctor.experienceYears}+{" "}
                        <span className="font-sans text-base font-normal text-white/55">
                          years
                        </span>
                      </dd>
                    </div>
                  )}
                  {primarySpecialties.map((s, i) => (
                    <div
                      key={s}
                      className={`pb-5 ${i < primarySpecialties.length - 1 ? "border-b border-white/8" : ""}`}
                    >
                      <dt className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/40">
                        Specialty
                      </dt>
                      <dd className="mt-1.5 text-base font-medium text-white">
                        {SPECIALTY_LABELS[s] ?? s}
                      </dd>
                    </div>
                  ))}
                  {doctor.city && (
                    <div>
                      <dt className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/40">
                        Based in
                      </dt>
                      <dd className="mt-1.5 flex items-center gap-1.5 text-base font-medium text-white">
                        <MapPin className="h-4 w-4 shrink-0 text-[#ab834d]" aria-hidden />
                        {doctor.city}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════════
            § 4 — CURRICULUM
        ════════════════════════════════════════════════════════════ */}
        {learnItems.length > 0 && (
          <section
            aria-labelledby="curriculum-title"
            className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24"
          >
            <p className="font-serif text-5xl leading-tight tracking-tight text-accent-soft sm:text-6xl">
              Curriculum
            </p>

            <div className="mt-14 grid gap-12 md:grid-cols-2 lg:grid-cols-3 lg:gap-10">
              {/* What You'll Learn */}
              <div>
                <h2
                  id="curriculum-title"
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

              {/* Highlights */}
              <div>
                <h2 className="font-serif text-3xl leading-tight sm:text-4xl">
                  Highlights
                </h2>
                <ul className="mt-8 space-y-4">
                  {FALLBACK_HIGHLIGHTS.map((item) => (
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

              {/* Course Format */}
              <div>
                <h2 className="font-serif text-3xl leading-tight sm:text-4xl">
                  Course Format
                </h2>
                <ul className="mt-8 space-y-4">
                  {FALLBACK_FORMAT.map((item) => (
                    <li key={item.when} className="flex items-start gap-3">
                      <span
                        aria-hidden
                        className="mt-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent-soft ring-1 ring-accent/30"
                      >
                        <CalendarClock className="h-3.5 w-3.5" />
                      </span>
                      <span className="text-base leading-relaxed text-white/90 sm:text-lg">
                        <span className="font-semibold text-white">{item.when}:</span>{" "}
                        {item.what}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        )}

        {/* ════════════════════════════════════════════════════════════
            § 5 — ROI CALCULATOR
        ════════════════════════════════════════════════════════════ */}
        <section
          aria-label="Practice growth calculator"
          className="mx-auto max-w-6xl px-5 sm:px-8"
        >
          <PracticeGrowthCalculator
            defaultSpecialty={doctor.specialty?.[0]}
            courseTuitionInr={doctor.priceInr}
            onCtaClick={openBrochure}
            lockSpecialty
          />
        </section>

        {/* ════════════════════════════════════════════════════════════
            § 6 — SHARE   "Spread the word" section
        ════════════════════════════════════════════════════════════ */}
        <section
          aria-labelledby="share-title"
          className="relative overflow-hidden border-y border-[#ab834d]/15 bg-[#0a0a0d] py-16 sm:py-20"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(55% 65% at 50% 55%, rgba(171,131,77,0.07) 0%, transparent 70%)",
            }}
          />

          <div className="relative mx-auto max-w-2xl px-5 text-center sm:px-8">
            <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[#ab834d]">
              Spread the Word
            </p>
            <h2
              id="share-title"
              className="mt-3 font-serif text-3xl leading-tight sm:text-4xl"
            >
              Know someone who should learn from{" "}
              {doctor.name.split(" ").at(-1)}?
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-white/55">
              Share this page with colleagues, juniors and anyone you believe
              deserves to learn from the best in Indian ophthalmology.
            </p>

            {/* Share preview card */}
            <div className="mx-auto mt-8 max-w-sm rounded-2xl border border-white/10 bg-[#141417] p-5 text-left shadow-xl">
              <div className="flex items-center gap-3">
                <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full border border-white/15">
                  <Image
                    src={doctor.imageUrl}
                    alt={doctor.name}
                    fill
                    sizes="44px"
                    className="object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <p className="truncate font-semibold text-white">{doctor.name}</p>
                  <p className="truncate text-xs text-white/50">
                    {doctor.title} · OphthaXP
                  </p>
                </div>
              </div>
              {doctor.bio && (
                <p className="mt-3 text-sm leading-relaxed text-white/60 line-clamp-2">
                  {doctor.bio}
                </p>
              )}
              <p className="mt-3 text-xs text-[#ab834d]">ophthaxp.com</p>
            </div>

            {/* Share buttons */}
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={handleShare}
                className="inline-flex items-center gap-2 rounded-full bg-[#ab834d] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#8a6a40]"
              >
                <Share2 className="h-4 w-4" aria-hidden /> Share
              </button>
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-400" aria-hidden />
                ) : (
                  <Link2 className="h-4 w-4" aria-hidden />
                )}
                {copied ? "Copied!" : "Copy Link"}
              </button>
              <a
                href={whatsappHref}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                WhatsApp
              </a>
              <a
                href={linkedinHref}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                LinkedIn
              </a>
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════════
            § 7 — PRICING + APPLY
        ════════════════════════════════════════════════════════════ */}
        <section
          id="apply"
          aria-labelledby="pricing-title"
          className="mx-auto max-w-6xl px-5 py-12 sm:px-8 sm:py-16"
        >
          <div className="grid gap-8 rounded-2xl bg-[#141417] p-8 ring-1 ring-white/5 sm:p-10 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-accent-soft">
                Investment
              </p>
              <p
                id="pricing-title"
                className="mt-3 font-serif text-4xl leading-none text-white sm:text-5xl"
              >
                {priceLabel ?? perDayLabel ?? "Custom pricing"}
              </p>
              <p className="mt-2 text-sm text-white/55">
                {perDayLabel && priceLabel ? `Starting at ${perDayLabel} · ` : ""}
                excluding GST
              </p>
              <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-semibold text-accent-soft">
                <span aria-hidden>★</span> Scholarships available
              </p>
            </div>
            <div className="flex flex-wrap gap-3 lg:flex-nowrap">
              <button
                type="button"
                onClick={openBrochure}
                className="rounded-md border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Know More
              </button>
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

        {/* ════════════════════════════════════════════════════════════
            § 8 — HOW IT WORKS
        ════════════════════════════════════════════════════════════ */}
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

        {/* ════════════════════════════════════════════════════════════
            § 9 — OTHER LEGENDS RAIL
        ════════════════════════════════════════════════════════════ */}
        {otherDoctors.length > 0 && (
          <section
            aria-labelledby="other-legends-title"
            className="mx-auto max-w-7xl px-5 py-14 sm:px-8 sm:py-16"
          >
            <div className="flex items-end justify-between">
              <div>
                <h2
                  id="other-legends-title"
                  className="font-serif text-2xl leading-tight sm:text-3xl"
                >
                  More Legends
                </h2>
                <p className="mt-1 text-sm text-white/50">
                  {otherDoctors.length}+ mentors across all specialties
                </p>
              </div>
              <div className="hidden gap-2 sm:flex">
                <button
                  type="button"
                  aria-label="Scroll legends left"
                  onClick={() =>
                    railRef.current?.scrollBy({
                      left: -(railRef.current.clientWidth * 0.8),
                      behavior: "smooth",
                    })
                  }
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white/80 transition hover:bg-white/10"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label="Scroll legends right"
                  onClick={() =>
                    railRef.current?.scrollBy({
                      left: railRef.current.clientWidth * 0.8,
                      behavior: "smooth",
                    })
                  }
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
                      className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-[linear-gradient(to_top,rgba(0,0,0,0.95)_0%,rgba(0,0,0,0.6)_50%,rgba(0,0,0,0)_100%)]"
                    />
                    <div className="absolute inset-x-0 bottom-0 px-3 pb-4 pt-8 text-center">
                      <p className="font-serif text-lg leading-tight text-white sm:text-xl">
                        {d.name}
                      </p>
                      {subtitle && (
                        <>
                          <span
                            className="mx-auto mt-1.5 block h-px w-6 bg-[#ab834d]/70"
                            aria-hidden
                          />
                          <p className="mt-1.5 text-[11px] font-semibold text-white/80 sm:text-xs">
                            {subtitle}
                          </p>
                        </>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </main>

      {/* ════════════════════════════════════════════════════════════
          Sticky bottom CTA (scroll-triggered, hides at footer)
      ════════════════════════════════════════════════════════════ */}
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
              <p className="text-white/55">{doctor.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={openBrochure}
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
        onClose={() => setApplyOpen(false)}
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
