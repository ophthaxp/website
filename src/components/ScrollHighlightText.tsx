"use client";

import { useEffect, useRef, useState } from "react";

const SENTENCE =
  "What you choose to learn shapes how you grow, and the right path goes beyond knowledge to truly expand your impact. Take a moment to see where it can lead you.";

const WORDS = SENTENCE.split(" ");

/**
 * ScrollHighlightText — a tall section with a sticky narrow column of text.
 * As the user scrolls through the section, each word transitions from dim
 * to bright white, creating a word-by-word reveal effect.
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
      // Section scrolls from "top of section meets top of viewport" until
      // "bottom of section meets bottom of viewport".
      const total = rect.height - viewportH;
      const scrolled = Math.min(Math.max(-rect.top, 0), Math.max(total, 1));
      const p = total > 0 ? scrolled / total : 0;
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

  // Map progress (0..1) onto the words. A small "fade window" lets each
  // word ease in across a slice of the scroll, instead of snapping.
  const litCount = progress * WORDS.length;

  return (
    <section
      ref={sectionRef}
      aria-label="Why what you learn matters"
      className="relative h-[260vh] w-full"
    >
      <div className="sticky top-0 flex h-screen items-center justify-center px-5">
        <p className="mx-auto max-w-xl font-serif text-3xl leading-[2] tracking-tight sm:text-5xl sm:leading-[1.9]">
          {WORDS.map((word, i) => {
            const t = Math.min(Math.max(litCount - i, 0), 1);
            // Interpolate from a dim white to fully bright white
            const opacity = 0.15 + t * 0.85;
            return (
              <span
                key={i}
                style={{
                  color: `rgba(255,255,255,${opacity})`,
                  transition: "color 120ms linear",
                }}
              >
                {word}
                {i < WORDS.length - 1 ? " " : ""}
              </span>
            );
          })}
        </p>
      </div>
    </section>
  );
}
