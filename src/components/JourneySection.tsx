"use client";

import { useEffect, useRef } from "react";

const STEPS: { word: string; title: string; blurb: string }[] = [
  {
    word: "Access",
    title: "Access the Inaccessible",
    blurb: "Reserved for those who seek knowledge beyond the ordinary.",
  },
  {
    word: "Knowledge",
    title: "Get Mentored from the Best",
    blurb: "Reserved for those who seek knowledge beyond the ordinary.",
  },
  {
    word: "Breakthrough",
    title: "Don't just upskill, Chase Breakthroughs",
    blurb: "Reserved for those who seek knowledge beyond the ordinary.",
  },
];

/** Rendered height the headline shrinks to once it has docked, in px. Capped
 *  against the sliver so it still clears the band on a short viewport, where
 *  --stack-step collapses well below its 60px maximum. */
const DOCKED_H = 28;

/** How far above the incoming card's edge the headline starts moving. Without
 *  this lead the shrink would only begin once the edge already touched the
 *  word, which reads as the word being shoved rather than making way. */
const DOCK_LEAD = 24;

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);

/** Smoothstep. The docking is scroll-linked, so both ends need to be flat — a
 *  linear ramp visibly jerks at the moment it starts and the moment it lands. */
const ease = (p: number) => p * p * (3 - 2 * p);

/**
 * The three-card promise block. Each card repeats its own headline word as an
 * oversized ghost layer that bleeds off the right edge — the card clips it,
 * which is what gives the crop its deliberate look.
 *
 * The cards stack on scroll: each one is sticky at a slightly lower offset than
 * the last (see .journey-card in globals.css), so a card that has been read
 * stays pinned as a thin edge behind the one arriving over it. The offsets come
 * from the card's index, passed down as the --i custom property.
 *
 * Once a card is down to that thin edge its headline is behind the card in
 * front of it, and the sliver is left unlabelled — three anonymous bars. So the
 * headline itself is scroll-linked: as the incoming card closes over it, the
 * word shrinks and rises, landing docked in the sliver at DOCKED_H. It is the
 * same element throughout rather than a second copy fading in, so the word
 * visibly becomes its own label and the sliver always says which card it is.
 *
 * The transform is written straight to the DOM rather than held in state: this
 * runs on every scroll frame, and routing it through React would re-render the
 * whole section each time for a change nothing else in it cares about.
 */
export function JourneySection() {
  const stackRef = useRef<HTMLUListElement | null>(null);

  useEffect(() => {
    const stack = stackRef.current;
    if (!stack) return;

    // The stack only exists at lg, and it is disabled outright when motion is
    // reduced — in both cases the cards are a plain spaced list, nothing ever
    // covers anything, and the headlines must sit at their natural size.
    const stacked = window.matchMedia("(min-width: 1024px)");
    const still = window.matchMedia("(prefers-reduced-motion: reduce)");

    let raf = 0;
    const update = () => {
      const cards = Array.from(
        stack.querySelectorAll<HTMLElement>(".journey-card"),
      );
      const words = cards.map((c) =>
        c.querySelector<HTMLElement>(".journey-word"),
      );
      const clear = () => {
        for (const w of words) if (w) w.style.transform = "";
      };

      if (!stacked.matches || still.matches || cards.length < 2) {
        clear();
        return;
      }

      // How much of a pinned card stays visible above the next one. --stack-step
      // is registered with @property (see globals.css), which is what makes it
      // readable here: an *unregistered* custom property computes to its own
      // token stream, so this would otherwise hand back the literal "clamp(...)"
      // text instead of a resolved pixel length.
      const step = parseFloat(
        getComputedStyle(stack).getPropertyValue("--stack-step"),
      );
      if (!Number.isFinite(step) || step <= 0) {
        clear();
        return;
      }

      const dockedH = Math.min(DOCKED_H, step - 8);
      const tops = cards.map((c) => c.getBoundingClientRect().top);

      cards.forEach((_card, i) => {
        const word = words[i];
        if (!word) return;
        // The last card is never covered, so its headline never docks.
        if (i === cards.length - 1) {
          word.style.transform = "";
          return;
        }

        // offsetTop/offsetHeight are layout values — unlike getBoundingClientRect
        // they ignore the transform we are about to write, so the maths stays
        // anchored to where the word sits untransformed.
        const wordTop = word.offsetTop;
        const wordH = word.offsetHeight;
        if (!wordH) return;

        // What is still showing of this card: its own top to the next card's.
        const band = tops[i + 1] - tops[i];
        // Fully open while the incoming edge is still DOCK_LEAD below the word;
        // fully docked once the card is down to its sliver.
        const from = wordTop + wordH + DOCK_LEAD;
        const e = ease(clamp01((from - band) / Math.max(from - step, 1)));

        if (e <= 0) {
          word.style.transform = "";
          return;
        }

        // transform-origin is the word's top-left, so the scale pins that corner
        // and translateY alone decides where the word lands: wordTop + dy, which
        // at e = 1 centres it in the sliver.
        const scale = 1 + (dockedH / wordH - 1) * e;
        const dy = ((step - dockedH) / 2 - wordTop) * e;
        word.style.transform =
          "translateY(" + dy.toFixed(2) + "px) scale(" + scale.toFixed(4) + ")";
      });
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

  return (
    <section
      aria-labelledby="journey-title"
      className="mx-auto max-w-[1440px] px-5 py-12 sm:px-10 sm:py-14 lg:px-[120px]"
    >
      <h2
        id="journey-title"
        className="mx-auto max-w-3xl text-center text-[clamp(1.5rem,2.6vw,2.25rem)] font-extrabold leading-[1.25] tracking-[-0.01em] text-white"
      >
        The Journey That Changes
        <br className="hidden sm:block" /> More Than Your Skills
      </h2>

      <ul ref={stackRef} className="journey-stack mt-12 sm:mt-16">
        {STEPS.map((s, i) => (
          <li
            key={s.word}
            style={{ "--i": i } as React.CSSProperties}
            className="journey-card relative isolate overflow-hidden rounded-[24px] bg-ink-700 px-6 pb-8 pt-8 sm:rounded-[32px] sm:px-12 sm:pb-12 sm:pt-12 lg:min-h-[516px] lg:pt-[calc(var(--stack-step)+2rem)]"
          >
            {/* Ghost repeat — sits behind everything, cropped by the card. */}
            <span
              aria-hidden
              className="ghost-word pointer-events-none absolute bottom-0 left-0 -z-10 whitespace-nowrap font-display text-[26vw] leading-[0.76] sm:left-2 sm:text-[20vw] lg:bottom-2 lg:text-[225px]"
            >
              {s.word}
            </span>

            <p className="journey-word font-display text-[clamp(2.5rem,7.2vw,6.5rem)] leading-[0.9] text-accent">
              {s.word}
            </p>

            <p className="mt-5 max-w-[19rem] text-[clamp(1.375rem,2.8vw,2.5rem)] font-semibold leading-[1.24] text-white sm:mt-7">
              {s.title}
            </p>

            {/* Fine print — bottom-right on wide cards, in flow on narrow ones. */}
            <p className="mt-10 max-w-[19rem] text-sm leading-relaxed text-white/45 lg:absolute lg:bottom-[74px] lg:right-12 lg:mt-0">
              {s.blurb}
            </p>
          </li>
        ))}

        {/* Scroll runway for the lg stack. A sticky card is clamped to its
            container's content box, so without a trailing item the last card
            can never reach its own offset — it just drags the pinned cards away
            as it arrives. This spacer is what holds the finished stack on
            screen, and it costs no visible space: the pinned cards cover it the
            whole time. Its height is exactly how long the stack holds. */}
        <li aria-hidden className="hidden lg:block lg:h-[38vh]" />
      </ul>
    </section>
  );
}
