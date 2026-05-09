"use client";

import { useEffect, useRef, useState } from "react";

const LINES = [
  "What you choose to learn",
  "shapes how you grow,",
  "and the right path",
  "goes beyond knowledge",
  "to truly expand your impact.",
  "Take a moment to see",
  "where it can lead you.",
];

// vh of scroll runway per line. Slower runway = each line gets more screen time.
const VH_PER_LINE = 40;

/**
 * ScrollHighlightText — sticky panel where each line of copy rises into focus
 * as the user scrolls through the section.
 *
 * Timing contract:
 *   - line 0 begins revealing the moment the section pins.
 *   - line N-1 is fully revealed exactly when the section unpins.
 *   - no empty scroll before or after.
 */
export function ScrollHighlightText() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    let raf = 0;
    const update = () => {
      const rect = el.getBoundingClientRect();
      const viewportH = window.innerHeight;
      // Progress 0  = section's top edge just entered viewport from below.
      // Progress ~1 = section has scrolled past so its bottom hits viewport bottom.
      // This way the FIRST line begins lighting up the moment the text appears,
      // and by the time the sticky pins, line 0 is fully lit.
      const total = Math.max(rect.height, 1);
      const scrolled = viewportH - rect.top;
      const p = Math.min(Math.max(scrolled / total, 0), 1);
      setProgress(p);
    };

    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  // Smoothstep — soft easing instead of linear
  const smoothstep = (t: number) => {
    const x = Math.max(0, Math.min(1, t));
    return x * x * (3 - 2 * x);
  };

  // Each line owns an even slice of the progress range. Overlap is only on
  // the START side, so each line ends exactly at its slice boundary —
  // meaning the last line is fully bright the moment scroll reaches the end.
  const slice = 1 / LINES.length;
  const overlap = slice * 0.25;

  // Section height = 100vh sticky + (lines × per-line runway).
  const sectionHeight = `${100 + LINES.length * VH_PER_LINE}vh`;

  return (
    <section
      ref={sectionRef}
      aria-label="Why what you learn matters"
      className="relative w-full"
      style={{ height: sectionHeight }}
    >
      <div className="sticky top-0 flex h-screen items-center justify-center overflow-hidden px-6 sm:px-10">
        <div className="mx-auto max-w-6xl text-center">
          {LINES.map((line, i) => {
            // Start a bit early, end exactly at the slice boundary.
            const start = i * slice - overlap;
            const end = (i + 1) * slice;
            const local = (progress - start) / (end - start);
            const eased = smoothstep(local);

            // Higher floor (0.25) so unlit lines stay readable instead of
            // disappearing into the background.
            const opacity = 0.25 + eased * 0.75;
            const translateY = (1 - eased) * 10;
            const blur = (1 - eased) * 1.5;

            return (
              <p
                key={i}
                className="font-serif font-medium leading-[1.15] tracking-tight text-2xl sm:text-4xl lg:text-5xl"
                style={{
                  color: `rgba(255,255,255,${opacity})`,
                  transform: `translateY(${translateY}px)`,
                  filter: `blur(${blur}px)`,
                  willChange: "color, transform, filter",
                  transition:
                    "color 220ms cubic-bezier(0.22,1,0.36,1), transform 260ms cubic-bezier(0.22,1,0.36,1), filter 260ms cubic-bezier(0.22,1,0.36,1)",
                  marginTop: i === 0 ? 0 : "0.45em",
                }}
              >
                {line}
              </p>
            );
          })}
        </div>
      </div>
    </section>
  );
}
