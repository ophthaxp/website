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

const EXTENDED_BIO = `In ophthalmology, there are accomplished surgeons, accomplished researchers, and accomplished teachers. Rarely does one individual excel across all three. Dr. Murali Ariga belongs to that uncommon group.

Over more than three decades, Dr. Murali has built a reputation as one of the most respected clinician-academicians in Indian ophthalmology. While many know him for his expertise in premium cataract surgery, glaucoma management, refractive procedures, and ophthalmic lasers, his influence extends far beyond the operating room. Throughout his career, he has remained deeply committed to advancing the scientific foundations of ophthalmic practice, constantly bridging the gap between what is performed in clinics and what is validated through evidence.

As a trusted referral specialist for complex glaucoma cases, Dr. Murali became known not only for his surgical skill but also for his methodical approach to decision-making. Colleagues often sought his opinion on challenging cases because his recommendations were grounded in both extensive clinical experience and a deep understanding of the scientific literature. In an era where medicine increasingly demands evidence-based practice, he exemplified what it means to combine judgment with scholarship.

His academic contributions have been equally significant. With more than 44 scientific publications and 15 book chapters to his name, Dr. Murali has helped shape the body of knowledge that guides ophthalmologists across the country. As a reviewer for leading journals including the Indian Journal of Ophthalmology, Journal of Current Glaucoma Practice, TJOSR, and AJO Case Reports, he has also played an important role in maintaining the quality and integrity of ophthalmic research itself.

Yet perhaps his greatest contribution lies in the example he has set for generations of ophthalmologists. Through his work as a clinician, researcher, teacher, and mentor, Dr. Murali has demonstrated that excellence in medicine is not achieved through technical mastery alone. It is achieved through a lifelong commitment to learning, questioning, publishing, teaching, and continually pushing the profession forward.

For many ophthalmologists, Dr. Murali Ariga represents an ideal that few achieve — the complete ophthalmologist, equally respected in the clinic, the operating room, and the academic world. Learning from him is not merely about understanding surgical techniques or disease management. It is about understanding how a life dedicated to both science and patient care can leave a lasting mark on an entire profession.`;

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

  const fullBio = doctor.description ?? EXTENDED_BIO;
  const PREVIEW_LEN = 460;
  const needsTruncation = fullBio.length > PREVIEW_LEN;
  const previewBio = needsTruncation
    ? `${fullBio.slice(0, PREVIEW_LEN).trimEnd()}…`
    : fullBio;
  const pullQuote =
    fullBio.split(/\.|\n/)[0]?.trim().replace(/^["']/, "") ?? doctor.bio;

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
          {/* Portrait — parallax layer, constrained on desktop so the face isn't blown up */}
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
              className="absolute inset-0 bg-[#06070a]/30 mix-blend-multiply"
            />
            {/* Soft left feather on the image itself — kills the hard vertical edge */}
            <div
              aria-hidden
              className="absolute inset-y-0 left-0 hidden w-32 bg-gradient-to-r from-[#06070a] to-transparent lg:block"
            />
            {/* Subtle bottom fade so the page flows into the next section */}
            <div
              aria-hidden
              className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#06070a] to-transparent"
            />
          </div>

          {/* Mobile: full-image dim + bottom-up fade so text at bottom is readable */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#06070a] via-[#06070a]/65 to-[#06070a]/35 lg:hidden" />

          {/* Desktop: long, gentle left→right fade carrying the dark over the image edge */}
          <div className="absolute inset-0 hidden bg-gradient-to-r from-[#06070a] from-35% via-[#06070a]/60 via-55% to-transparent to-85% lg:block" />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(50% 65% at 12% 75%, rgba(171,131,77,0.13) 0%, transparent 65%)",
            }}
          />

          {/* Content */}
          <div className="relative mx-auto flex min-h-[100svh] max-w-[1500px] flex-col justify-end px-6 pb-20 pt-36 sm:px-16 lg:justify-center lg:pb-0 lg:pt-24 lg:px-24">
            <div className="max-w-2xl">

              {/* Badge */}
              <div className="inline-flex items-center gap-2 rounded-full border border-[#ab834d]/40 bg-[#ab834d]/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.28em] text-[#ab834d]">
                <span aria-hidden>★</span> LEGEND. OPHTHALMOLOGY
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
              Introduction
            </h2>

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
          <div className="mx-auto max-w-[1500px] px-6 sm:px-16 lg:px-24">

            {/* Two-column: bio + at-a-glance card */}
            <div className="grid gap-12 lg:grid-cols-3 lg:gap-16">

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
            § 4 — SHARE   "Spread the word" section
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
            § 5 — OTHER LEGENDS RAIL
        ════════════════════════════════════════════════════════════ */}
        {otherDoctors.length > 0 && (
          <section
            aria-labelledby="other-legends-title"
            className="mx-auto max-w-[1500px] px-6 py-14 sm:px-16 sm:py-16 lg:px-24"
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
              {otherDoctors.map((d) => (
                <Link
                  key={d.id}
                  href={`/doctors/${d.slug}`}
                  className="group relative aspect-[3/4] w-[170px] shrink-0 snap-start overflow-hidden rounded-2xl border border-white/10 bg-ink-800 sm:w-[210px]"
                >
                  <Image
                    src={d.imageUrl}
                    alt={d.name}
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
                    {d.title && (
                      <>
                        <span
                          className="mx-auto mt-1.5 block h-px w-6 bg-[#ab834d]/70"
                          aria-hidden
                        />
                        <p className="mt-1.5 text-[11px] font-semibold text-white/80 sm:text-xs">
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
