"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Link2,
  MapPin,
  Play,
  Share2,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { TrailerPlayer } from "@/components/TrailerPlayer";
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

// ─── Component ────────────────────────────────────────────────────────────────

export function DoctorDetailClient({
  doctor,
  otherDoctors,
}: {
  doctor: Doctor;
  otherDoctors: Doctor[];
}) {
  const railRef = useRef<HTMLDivElement>(null);
  const videoSectionRef = useRef<HTMLElement>(null);
  const heroImgRef = useRef<HTMLDivElement>(null);

  const [bioExpanded, setBioExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pageUrl, setPageUrl] = useState("");

  const scrollToVideo = () =>
    videoSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  // Capture page URL client-side only
  useEffect(() => { setPageUrl(window.location.href); }, []);

  // Subtle parallax on hero portrait
  useEffect(() => {
    const onScroll = () => {
      if (!heroImgRef.current) return;
      heroImgRef.current.style.transform = `translateY(${window.scrollY * 0.22}px)`;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Share handlers
  const handleShare = useCallback(async () => {
    const title = `${doctor.name} — ${doctor.title} · Legends of Medicine`;
    const text = `${doctor.name}, ${doctor.title}, is teaching at Legends of Medicine. Learn directly from one of India's finest ophthalmologists.`;
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

  const fullBio = (doctor.description || doctor.bio || "").trim();
  const hasBio = fullBio.length > 0;
  const PREVIEW_LEN = 460;
  const needsTruncation = fullBio.length > PREVIEW_LEN;
  const previewBio = needsTruncation
    ? `${fullBio.slice(0, PREVIEW_LEN).trimEnd()}…`
    : fullBio;
  const pullQuote =
    fullBio.split(/\.|\n/)[0]?.trim().replace(/^["']/, "") ?? doctor.bio;

  const shareText = encodeURIComponent(
    `${doctor.name}, ${doctor.title}, is teaching at Legends of Medicine — learn directly from one of India's finest ophthalmologists.`
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
      <main className="bg-black pb-20 text-white">

        {/* ════════════════════════════════════════════════════════════
            § 1 — HERO   Full-viewport cinematic identity
        ════════════════════════════════════════════════════════════ */}
        <section
          aria-labelledby="legend-name"
          className="relative min-h-[100svh] overflow-hidden"
        >
          {/* Portrait — full-bleed background. Mobile fills the section;
              desktop is constrained to the right ~62% so the face isn't blown
              up and the text column on the left stays readable. */}
          <div
            ref={heroImgRef}
            className="absolute inset-y-0 left-0 right-0 will-change-transform lg:left-auto lg:w-[62%]"
            style={{ top: "-4%", bottom: "-4%" }}
          >
            <Image
              src={doctor.doctorImage ?? doctor.imageUrl}
              alt={doctor.name}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 62vw"
              className="object-cover object-right-top"
            />
            {/* Tone the photo background into the dark theme */}
            <div
              aria-hidden
              className="absolute inset-0 bg-black/30 mix-blend-multiply"
            />
            {/* Soft left feather — kills the hard vertical edge on desktop */}
            <div
              aria-hidden
              className="absolute inset-y-0 left-0 hidden w-32 bg-gradient-to-r from-black to-transparent lg:block"
            />
            {/* Subtle bottom fade so the page flows into the next section */}
            <div
              aria-hidden
              className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black to-transparent"
            />
          </div>

          {/* Mobile: full-image dim + bottom-up fade so text at bottom is readable */}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/65 to-black/35 lg:hidden" />

          {/* Desktop: long left→right fade carrying the dark over the image edge */}
          <div className="absolute inset-0 hidden bg-gradient-to-r from-black from-35% via-black/60 via-55% to-transparent to-85% lg:block" />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(50% 65% at 12% 75%, rgba(183,90,68,0.18) 0%, transparent 65%)",
            }}
          />

          {/* Content — two-column grid on desktop: text + portrait card */}
          <div className="relative mx-auto flex min-h-[100svh] max-w-[1440px] flex-col justify-end px-5 pb-20 pt-36 sm:px-10 lg:justify-center lg:px-[120px] lg:pb-0 lg:pt-24">
            <div className="max-w-2xl">

              {/* Badge */}
              <div className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.28em] text-accent-soft">
                <span aria-hidden>★</span> LEGEND. OPHTHALMOLOGY
              </div>

              {/* Name */}
              <h1
                id="legend-name"
                className="mt-5 font-display text-[clamp(2.5rem,5.5vw,4.5rem)] uppercase leading-[0.98] tracking-[-0.01em]"
              >
                {doctor.name}
              </h1>

              {/* Title */}
              <div className="mt-5 flex items-start gap-3">
                <span className="mt-[11px] h-px w-10 shrink-0 bg-accent" aria-hidden />
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
              {/* A profile with no way through to what the Legend actually
                  teaches is a dead end, so the program leads and the trailer
                  becomes the second choice. */}
              <div className="mt-8 flex flex-wrap items-center gap-3">
                {doctor.courseSlug && (
                  <Link
                    href={`/programs/${doctor.courseSlug}`}
                    className="inline-flex items-center justify-center rounded-[10px] bg-accent px-7 py-3.5 text-[15px] font-semibold text-white transition hover:bg-accent-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                  >
                    View Program
                  </Link>
                )}
                <button
                  type="button"
                  onClick={scrollToVideo}
                  className="inline-flex items-center gap-2 rounded-[10px] bg-ink-800 px-7 py-3.5 text-[15px] font-medium text-white/85 backdrop-blur-sm transition hover:bg-ink-700 hover:text-white"
                >
                  <Play className="h-4 w-4 fill-current" aria-hidden />
                  Watch Intro
                </button>
              </div>

              {/* Stats strip */}
              {(doctor.experienceYears > 0 || primarySpecialties.length > 0) && (
                <div className="mt-14 flex flex-wrap gap-8 border-t border-white/10 pt-8">
                  {doctor.experienceYears > 0 && (
                    <div>
                      <p className="font-display text-[2.6rem] leading-none text-white">
                        {doctor.experienceYears}+
                      </p>
                      <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/40">
                        Years
                      </p>
                    </div>
                  )}
                  {primarySpecialties.map((s) => (
                    <div key={s}>
                      <p className="font-display text-[2.6rem] leading-none text-accent">
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
            <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-accent-soft">
              From the Legend
            </p>
            <h2
              id="video-title"
              className="mt-3 text-[clamp(1.75rem,3.1vw,2.6rem)] font-extrabold leading-[1.25] tracking-[-0.015em] text-white"
            >
              Introduction
            </h2>

            <div className="mt-8 overflow-hidden rounded-xl border border-white/15">
              {doctor.trailerVideoUrl ? (
                <TrailerPlayer
                  src={doctor.trailerVideoUrl}
                  poster={doctor.doctorImage ?? doctor.imageUrl}
                  title={`${doctor.name} — Introduction`}
                  className="aspect-video w-full"
                />
              ) : (
                <div className="flex aspect-video items-center justify-center bg-ink-850">
                  <div className="text-center">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-accent/30 bg-accent/10">
                      <Play className="h-6 w-6 text-accent" aria-hidden />
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
          className="bg-ink-900 py-16 sm:py-20"
        >
          <div className="mx-auto max-w-[1440px] px-5 sm:px-10 lg:px-[120px]">

            {/* Section headline */}
            <div className="max-w-4xl">
              <h2 className="text-[clamp(1.75rem,3.1vw,2.6rem)] font-extrabold leading-[1.25] tracking-[-0.015em] text-white">
                Making of the Legend
              </h2>
            </div>

            {/* Two-column: bio + at-a-glance card */}
            <div className="mt-16 grid gap-12 lg:grid-cols-3 lg:gap-16">

              {/* Bio */}
              <div className="lg:col-span-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-accent-soft">
                  Bio
                </p>
                <div
                  id="about-heading"
                  className="mt-5 whitespace-pre-line text-[15px] leading-relaxed text-white/70"
                >
                  {hasBio
                    ? bioExpanded || !needsTruncation
                      ? fullBio
                      : previewBio
                    : "Biography coming soon."}
                </div>
                {hasBio && needsTruncation && (
                  <button
                    type="button"
                    onClick={() => setBioExpanded((v) => !v)}
                    className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-accent-soft transition hover:text-accent-tint"
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
              <div className="rounded-xl border border-white/15 bg-ink-850 p-7">
                <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-accent-soft">
                  At a Glance
                </p>
                <dl className="mt-5 space-y-5">
                  {doctor.experienceYears > 0 && (
                    <div className="border-b border-white/10 pb-5">
                      <dt className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/40">
                        Experience
                      </dt>
                      <dd className="mt-1.5 font-display text-3xl leading-none text-white">
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
                      className={`pb-5 ${i < primarySpecialties.length - 1 ? "border-b border-white/10" : ""}`}
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
                        <MapPin className="h-4 w-4 shrink-0 text-accent" aria-hidden />
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
            § 4 — SHARE   "Spread the word" section
        ════════════════════════════════════════════════════════════ */}
        <section
          aria-labelledby="share-title"
          className="relative overflow-hidden border-y border-white/10 bg-black py-16 sm:py-20"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(55% 65% at 50% 55%, rgba(183,90,68,0.12) 0%, transparent 70%)",
            }}
          />

          <div className="relative mx-auto max-w-2xl px-5 text-center sm:px-8">
            <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-accent-soft">
              Spread the Word
            </p>
            <h2
              id="share-title"
              className="mt-3 text-[clamp(1.5rem,2.6vw,2.25rem)] font-extrabold leading-[1.25] tracking-[-0.015em] text-white"
            >
              Know someone who should learn from{" "}
              {doctor.name.split(" ").at(-1)}?
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-white/55">
              Share this page with colleagues, juniors and anyone you believe
              deserves to learn from the best in Indian ophthalmology.
            </p>

            {/* Share preview card */}
            <div className="mx-auto mt-8 max-w-sm rounded-xl border border-white/15 bg-ink-850 p-5 text-left shadow-xl">
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
                    {doctor.title} · Legends of Medicine
                  </p>
                </div>
              </div>
              {doctor.bio && (
                <p className="mt-3 text-sm leading-relaxed text-white/60 line-clamp-2">
                  {doctor.bio}
                </p>
              )}
              <p className="mt-3 text-xs text-accent-soft">legendsofmedicine.com</p>
            </div>

            {/* Share buttons */}
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={handleShare}
                className="inline-flex items-center gap-2 rounded-[10px] bg-accent px-6 py-3 text-sm font-semibold text-white transition hover:bg-accent-deep"
              >
                <Share2 className="h-4 w-4" aria-hidden /> Share
              </button>
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-2 rounded-[10px] bg-ink-800 px-6 py-3 text-sm font-medium text-white/85 transition hover:bg-ink-700 hover:text-white"
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
                className="inline-flex items-center rounded-[10px] bg-ink-800 px-6 py-3 text-sm font-medium text-white/85 transition hover:bg-ink-700 hover:text-white"
              >
                WhatsApp
              </a>
              <a
                href={linkedinHref}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center rounded-[10px] bg-ink-800 px-6 py-3 text-sm font-medium text-white/85 transition hover:bg-ink-700 hover:text-white"
              >
                LinkedIn
              </a>
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════════
            § 5 — OTHER LEGENDS RAIL
        ════════════════════════════════════════════════════════════ */}
        {otherDoctors.length > 0 && (
          <section
            aria-labelledby="other-legends-title"
            className="mx-auto max-w-[1440px] px-5 py-12 sm:px-10 sm:py-14 lg:px-[120px]"
          >
            <div className="flex items-end justify-between">
              <div>
                <h2
                  id="other-legends-title"
                  className="text-[clamp(1.5rem,2.6vw,2.25rem)] font-extrabold leading-[1.25] tracking-[-0.015em] text-white"
                >
                  More Legends
                </h2>
                <p className="mt-2 text-sm text-white/45">
                  {otherDoctors.length} mentors across every specialty
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
                  className="inline-flex h-[46px] w-[46px] items-center justify-center rounded-full bg-ink-800 text-white transition hover:bg-ink-700"
                >
                  <ChevronLeft className="h-5 w-5" />
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
                  className="inline-flex h-[46px] w-[46px] items-center justify-center rounded-full bg-white text-black transition hover:bg-white/85"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div
              ref={railRef}
              className="no-scrollbar mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2"
            >
              {otherDoctors.map((d) => (
                <Link
                  key={d.id}
                  href={`/doctors/${d.slug}`}
                  className="group relative aspect-[306/482] w-[200px] shrink-0 snap-start overflow-hidden rounded-xl border border-white/15 bg-ink-850 transition duration-300 hover:border-accent/60 sm:w-[248px]"
                >
                  <Image
                    src={d.imageUrl}
                    alt={d.name}
                    fill
                    sizes="(max-width: 640px) 200px, 248px"
                    className="object-cover object-top transition duration-500 group-hover:scale-[1.04]"
                  />
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-x-0 bottom-0 h-3/5 bg-[linear-gradient(to_top,rgba(0,0,0,0.95)_0%,rgba(0,0,0,0.72)_38%,rgba(0,0,0,0)_100%)]"
                  />
                  <div className="absolute inset-x-0 bottom-0 px-5 pb-6 pt-12 text-center">
                    <p className="line-clamp-2 font-serif text-[22px] font-medium leading-[1.12] text-white">
                      {d.name}
                    </p>
                    {d.title && (
                      <>
                        <span
                          className="mx-auto mt-3 block h-px w-5 bg-white/70 transition-all duration-300 group-hover:w-10"
                          aria-hidden
                        />
                        <p className="mt-3 line-clamp-1 text-[13px] text-white/70">
                          {d.title}
                        </p>
                      </>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>

      <Footer />
    </>
  );
}
