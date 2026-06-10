"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef } from "react";

const clamp = (v: number, min = 0, max = 1) => Math.min(max, Math.max(min, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export function Footer() {
  const year = new Date().getFullYear();
  const sectionRef = useRef<HTMLDivElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const wordRef = useRef<HTMLDivElement>(null);
  const wordTextRef = useRef<HTMLSpanElement>(null);
  const medicineRef = useRef<HTMLSpanElement>(null);
  const fgRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Scroll-driven reveal: dark sky → cityscape → giant word rises → bar appears
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;

    const apply = (
      bgY: number,
      overlay: number,
      wordY: number,
      wordOpacity: number,
      fgY: number,
      bottomY: number,
      bottomOpacity: number
    ) => {
      if (bgRef.current)
        bgRef.current.style.transform = `translate3d(0, ${bgY}%, 0) scale(1.3)`;
      if (overlayRef.current) overlayRef.current.style.opacity = String(overlay);
      if (wordRef.current) {
        wordRef.current.style.transform = `translate3d(0, ${wordY}vh, 0)`;
        wordRef.current.style.opacity = String(wordOpacity);
      }
      if (fgRef.current)
        fgRef.current.style.transform = `translate3d(0, ${fgY}%, 0) scale(1)`;
      if (bottomRef.current) {
        bottomRef.current.style.transform = `translate3d(0, ${bottomY}vh, 0)`;
        bottomRef.current.style.opacity = String(bottomOpacity);
      }
    };

    const update = () => {
      raf = 0;
      const section = sectionRef.current;
      if (!section) return;
      const rect = section.getBoundingClientRect();
      const vh = window.innerHeight;
      const total = rect.height - vh;
      const p = clamp(total > 0 ? -rect.top / total : 0);

      apply(
        -10, // background shifted up so the bright sunset sits above the word
        lerp(0.5, 0, clamp(p / 0.6)), // dark sky lifts to fully reveal the bright sunset cityscape
        lerp(48, 0, p), // word rises from below and settles a touch higher (clear of the ridge)
        clamp(p / 0.18), // word fades in early
        lerp(42, 28, p), // foreground sits low — hill ridge near the bottom, word shows above it
        lerp(28, 0, clamp((p - 0.55) / 0.35)), // bar slides up at the end
        clamp((p - 0.55) / 0.35)
      );

      // "Medicine" eases into its gold tint a little after the rest of the word
      if (medicineRef.current)
        medicineRef.current.style.opacity = String(clamp((p - 0.22) / 0.3));
    };

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    if (reduce) {
      // Respect reduced motion: show the resolved state, no scroll travel
      apply(-10, 0.14, 0, 1, 28, 0, 1);
      if (medicineRef.current) medicineRef.current.style.opacity = "1";
      return;
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    update();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  // Fit the giant word to ~90% of the viewport so it never clips, any width
  useEffect(() => {
    const fit = () => {
      const el = wordTextRef.current;
      const box = wordRef.current;
      if (!el || !box) return;
      el.style.fontSize = "200px";
      const w = el.scrollWidth;
      const avail = box.clientWidth * 0.9;
      if (!w || !avail) return;
      el.style.fontSize = `${(avail / w) * 200}px`;
    };
    requestAnimationFrame(() => requestAnimationFrame(fit));
    window.addEventListener("resize", fit);
    window.addEventListener("load", fit);
    // Re-fit once webfonts have loaded (metrics change after swap)
    if (document.fonts?.ready) document.fonts.ready.then(fit);
    return () => {
      window.removeEventListener("resize", fit);
      window.removeEventListener("load", fit);
    };
  }, []);

  return (
    <footer className="bg-ink-950">
      {/* Tall scroll track — the sticky panel below stays pinned while you scroll through it */}
      <div ref={sectionRef} className="relative h-[200vh]">
        <div className="sticky top-0 h-screen w-full overflow-hidden">
          {/* ── Parallax cityscape background ── */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div
              ref={bgRef}
              className="absolute inset-0 will-change-transform"
              style={{ transform: "translate3d(0,-10%,0) scale(1.3)" }}
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
            {/* Darkening that lifts as you scroll — sky first, city revealed */}
            <div
              ref={overlayRef}
              className="absolute inset-0 bg-black"
              style={{ opacity: 0.35 }}
            />
            {/* Blend into the page above */}
            <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-ink-950 to-transparent" />
            {/* Legibility under the bottom bar */}
            <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/40 to-transparent" />
          </div>

          {/* ── Giant brand word (rises up from behind the foreground) ── */}
          <div
            ref={wordRef}
            className="absolute inset-0 z-10 flex items-center justify-center px-4 will-change-transform"
            style={{ transform: "translate3d(0,45vh,0)", opacity: 0 }}
          >
            <span
              ref={wordTextRef}
              className="select-none whitespace-nowrap text-center uppercase leading-none text-white"
              style={{
                fontFamily:
                  "ui-sans-serif, system-ui, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
                fontWeight: 800,
                letterSpacing: "-0.04em",
                fontSize: "clamp(2rem, 13vw, 15rem)",
              }}
            >
              Legends of{" "}
              <span
                ref={medicineRef}
                style={{
                  opacity: 0,
                  backgroundImage: "linear-gradient(180deg, #f3d99a 0%, #c8924a 100%)",
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  color: "transparent",
                }}
              >
                Medicine
              </span>
            </span>
          </div>

          {/* ── Foreground layer (frame 2, alpha) — sits IN FRONT of the word ── */}
          <div
            ref={fgRef}
            className="pointer-events-none absolute inset-0 z-20 will-change-transform"
            style={{ transform: "translate3d(0,42%,0) scale(1)" }}
          >
            <Image
              src="/footer_frame_2.avif"
              alt=""
              fill
              sizes="100vw"
              className="object-cover object-bottom"
              aria-hidden
            />
          </div>

          {/* ── Back to top + bottom bar (slide in last) ── */}
          <div
            ref={bottomRef}
            className="absolute inset-x-0 bottom-0 z-30 will-change-transform"
            style={{ transform: "translate3d(0,28vh,0)", opacity: 0 }}
          >
            <div className="flex justify-center pb-10">
              <button
                onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                className="rounded-full border border-white/60 px-8 py-3 text-xs font-medium uppercase tracking-[0.22em] text-white transition-colors duration-300 hover:bg-white hover:text-black"
              >
                Back to Top
              </button>
            </div>
            <div className="mx-auto flex w-full max-w-[1500px] flex-col items-center justify-between gap-2 px-6 pb-6 text-sm text-white/70 sm:flex-row sm:px-16 lg:px-24">
              <span>© {year} OphthaXP · All Rights Reserved</span>
              <nav aria-label="Footer legal links" className="flex items-center">
                <Link href="/privacy" className="transition-colors hover:text-white">
                  Privacy Policy
                </Link>
                <span aria-hidden className="px-2 text-white/40">|</span>
                <Link href="/terms" className="transition-colors hover:text-white">
                  Terms
                </Link>
              </nav>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
