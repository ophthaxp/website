"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowUp } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export function Footer() {
  const year = new Date().getFullYear();
  const sectionRef = useRef<HTMLDivElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  // Parallax: bg moves up slower than scroll, creating depth
  useEffect(() => {
    const onScroll = () => {
      if (!sectionRef.current || !bgRef.current) return;
      const rect = sectionRef.current.getBoundingClientRect();
      const progress = rect.top / window.innerHeight; // 1 = above viewport, 0 = at top, -1 = below
      bgRef.current.style.transform = `translateY(${progress * -60}px)`;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Entrance: fade + scale-up when section scrolls into view
  useEffect(() => {
    if (!sectionRef.current) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold: 0.08 }
    );
    obs.observe(sectionRef.current);
    return () => obs.disconnect();
  }, []);

  return (
    <footer className="bg-ink-950">
      {/* ── Hero brand section ── */}
      <div
        ref={sectionRef}
        className="relative flex min-h-[70vh] flex-col items-center justify-between overflow-hidden pb-14 pt-16"
      >
        {/* Parallax background */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div
            ref={bgRef}
            className="absolute inset-0 scale-110 will-change-transform"
            style={{ transition: "transform 0.05s linear" }}
          >
            <Image
              src="/footer_frame_1.png"
              alt=""
              fill
              sizes="100vw"
              className="object-cover object-center"
              aria-hidden
            />
          </div>
          {/* Colour overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/75 via-black/50 to-black/80" />
          {/* Gold radial glow */}
          <div
            aria-hidden
            className="absolute inset-0 mix-blend-soft-light"
            style={{
              background:
                "radial-gradient(55% 45% at 50% 65%, rgba(171,131,77,0.30) 0%, transparent 70%)",
            }}
          />
          {/* Top / bottom page-blends */}
          <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-ink-950 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-ink-950 via-ink-950/60 to-transparent" />
        </div>

        {/* ── Eyebrow ── */}
        <div
          className="relative"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(16px)",
            transition: "opacity 0.7s ease, transform 0.7s ease",
            transitionDelay: "0ms",
          }}
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[#ab834d]">
            Mentor-led ophthalmology
          </p>
        </div>

        {/* ── Large static brand name ── */}
        <div
          className="relative flex flex-1 w-full items-center justify-center px-4"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "scale(1) translateY(0)" : "scale(0.92) translateY(20px)",
            transition: "opacity 1s ease, transform 1s ease",
            transitionDelay: "150ms",
          }}
        >
          <span
            className="select-none text-center font-black leading-none tracking-tighter text-white/95"
            style={{ fontSize: "clamp(3.5rem, 13vw, 17rem)" }}
          >
            Ophtha<span className="text-[#ab834d]">XP</span>
          </span>
        </div>

        {/* ── Tagline + Back to top ── */}
        <div
          className="relative flex flex-col items-center gap-5"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(20px)",
            transition: "opacity 0.7s ease, transform 0.7s ease",
            transitionDelay: "350ms",
          }}
        >
          <p className="max-w-md text-center text-sm text-white/60 sm:text-base">
            Learn directly from the surgeons who shaped Indian ophthalmology.
          </p>
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="group inline-flex items-center gap-2 rounded-full border border-[#ab834d]/50 bg-[#ab834d]/10 px-7 py-3 text-xs font-semibold uppercase tracking-[0.22em] text-white backdrop-blur-sm transition-all duration-300 hover:border-[#ab834d] hover:bg-[#ab834d]"
          >
            <ArrowUp className="h-3.5 w-3.5 transition-transform duration-300 group-hover:-translate-y-0.5" />
            Back to Top
          </button>
        </div>
      </div>

      {/* ── Bottom bar ── */}
      <div className="border-t border-[#ab834d]/20">
        <div className="mx-auto flex max-w-[1500px] flex-col items-center justify-between gap-2 px-4 py-4 text-sm text-white/50 sm:flex-row sm:px-12 lg:px-16">
          <span>© {year} OphthaXP · All Rights Reserved</span>
          <nav aria-label="Footer legal links" className="flex items-center">
            <Link href="/privacy" className="transition-colors hover:text-[#ab834d]">
              Privacy Policy
            </Link>
            <span aria-hidden className="px-2 text-white/25">|</span>
            <Link href="/terms" className="transition-colors hover:text-[#ab834d]">
              Terms
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
