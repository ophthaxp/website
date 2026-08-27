"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef } from "react";

type HeroImg = { src: string; alt: string };

/** How far the light reaches from its centre, measured in column widths. */
const REACH = 1.7;
/** One idle pass across the band, plus the dark rest before the next one. */
const IDLE_TRAVEL = 5200;
const IDLE_PERIOD = 8400;
/** The idle pass is deliberately dimmer than the cursor, so a visitor's own
    light always outshines it. */
const IDLE_STRENGTH = 0.78;
/** How long the band waits after the cursor leaves before lighting itself. */
const IDLE_RESUME = 900;

/**
 * HeroBand — the strip of mentor portraits, lit like the CRED hero.
 *
 * The portraits sit dark and near-monochrome by default so the band reads as
 * one machined object rather than seven photos. Light is the only thing that
 * moves: a column comes up to full colour and pushes forward as the light
 * reaches it, its neighbours catching progressively less of the same light.
 *
 * There is one lighting model with two drivers — the cursor when a pointer is
 * over the band, and an idle pass that crosses it on a loop otherwise. Sharing
 * the model is what makes the idle state read as a preview of the interaction
 * rather than a separate effect; an overlay gradient sweeping the same path
 * cannot, because screened light over an already-bright portrait backdrop
 * barely registers.
 *
 * Light position is written straight to each column's `--near` custom property
 * from a rAF loop rather than through React state: the values change every
 * frame, and a re-render per frame for seven elements is work with nothing to
 * show for it. The CSS transitions on `--near`'s consumers do the smoothing,
 * so the light trails its driver rather than snapping to it.
 */
export function HeroBand({ strip }: { strip: HeroImg[] }) {
  const bandRef = useRef<HTMLDivElement | null>(null);
  const barsRef = useRef<(HTMLDivElement | null)[]>([]);
  /** Column centres in viewport x, cached so the rAF loop never reads layout. */
  const centersRef = useRef<{ x: number; w: number }[]>([]);
  const bandRectRef = useRef<{ x: number; w: number }>({ x: 0, w: 1 });
  const pointerRef = useRef<number | null>(null);
  const frameRef = useRef(0);
  const idleRef = useRef(0);
  const idleStartRef = useRef(0);
  const resumeRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const measure = useCallback(() => {
    centersRef.current = barsRef.current.map((el) => {
      const r = el?.getBoundingClientRect();
      // Columns hidden at this breakpoint measure 0 wide; they fall out of
      // range on their own, so they need no special case.
      return r ? { x: r.left + r.width / 2, w: r.width || 1 } : { x: -1e6, w: 1 };
    });
    const b = bandRef.current?.getBoundingClientRect();
    if (b) bandRectRef.current = { x: b.left, w: b.width || 1 };
  }, []);

  /**
   * Lights the band from a single light at viewport `x`, at `strength` (0-1).
   * `x === null` puts the band back to its resting dark.
   */
  const apply = useCallback((x: number | null, strength: number) => {
    barsRef.current.forEach((el, i) => {
      if (!el) return;
      let near = 0;
      const c = centersRef.current[i];
      if (x !== null && c) {
        const t = Math.max(0, 1 - Math.abs(x - c.x) / c.w / REACH);
        near = t * t * (3 - 2 * t) * strength; // smoothstep — a rounder falloff
      }
      el.style.setProperty("--near", near.toFixed(3));
    });
    const band = bandRef.current;
    if (!band) return;
    band.style.setProperty("--lit", x === null ? "0" : strength.toFixed(3));
    if (x !== null) {
      const { x: bx, w } = bandRectRef.current;
      band.style.setProperty("--gx", `${(((x - bx) / w) * 100).toFixed(2)}%`);
    }
  }, []);

  /** Cursor-driven: one frame per pointermove, coalesced. */
  const paintPointer = useCallback(() => {
    frameRef.current = 0;
    apply(pointerRef.current, 1);
  }, [apply]);

  const schedule = useCallback(() => {
    if (frameRef.current) return;
    frameRef.current = requestAnimationFrame(paintPointer);
  }, [paintPointer]);

  const stopIdle = useCallback(() => {
    if (resumeRef.current) {
      clearTimeout(resumeRef.current);
      resumeRef.current = null;
    }
    if (idleRef.current) {
      cancelAnimationFrame(idleRef.current);
      idleRef.current = 0;
    }
  }, []);

  const startIdle = useCallback(() => {
    if (idleRef.current || pointerRef.current !== null) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    idleStartRef.current = 0;
    const step = (now: number) => {
      if (!idleStartRef.current) idleStartRef.current = now;
      const phase = (now - idleStartRef.current) % IDLE_PERIOD;
      if (phase < IDLE_TRAVEL) {
        const p = phase / IDLE_TRAVEL;
        const eased = p * p * (3 - 2 * p);
        const { x, w } = bandRectRef.current;
        // Starts and ends off the band, so the outer columns are lit from
        // outside instead of having the light switch on top of them.
        const lightX = x + (-0.2 + 1.4 * eased) * w;
        // Fades up and down across the pass, so nothing arrives abruptly.
        const strength = Math.min(1, Math.sin(Math.PI * p) * 1.7) * IDLE_STRENGTH;
        apply(lightX, Math.max(0, strength));
      } else {
        apply(null, 0);
      }
      idleRef.current = requestAnimationFrame(step);
    };
    idleRef.current = requestAnimationFrame(step);
  }, [apply]);

  useEffect(() => {
    measure();
    window.addEventListener("resize", measure);

    // The loop runs only while the band is on screen and the tab is in front —
    // an animation nobody can see is only a battery cost.
    const band = bandRef.current;
    const io = new IntersectionObserver(
      ([e]) => (e.isIntersecting && !document.hidden ? startIdle() : stopIdle()),
      { threshold: 0.05 },
    );
    if (band) io.observe(band);

    const onVisibility = () => (document.hidden ? stopIdle() : startIdle());
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.removeEventListener("resize", measure);
      document.removeEventListener("visibilitychange", onVisibility);
      io.disconnect();
      stopIdle();
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [measure, startIdle, stopIdle]);

  const handleMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const band = bandRef.current;
    if (!band) return;
    const r = band.getBoundingClientRect();
    band.style.setProperty("--gy", `${((e.clientY - r.top) / r.height) * 100}%`);
    pointerRef.current = e.clientX;
    schedule();
  };

  const handleEnter = () => {
    stopIdle();
    measure();
    bandRef.current?.classList.add("hero-band--live");
  };

  const handleLeave = () => {
    bandRef.current?.classList.remove("hero-band--live");
    pointerRef.current = null;
    schedule();
    // A beat before the band starts lighting itself again, so the light does
    // not jump straight from the cursor to the far side of the strip.
    resumeRef.current = setTimeout(startIdle, IDLE_RESUME);
  };

  return (
    <div
      ref={bandRef}
      className="hero-band relative"
      onPointerMove={handleMove}
      onPointerEnter={handleEnter}
      onPointerLeave={handleLeave}
    >
      <div className="grid h-[260px] grid-cols-3 sm:h-[320px] sm:grid-cols-4 lg:h-[400px] lg:grid-cols-7">
        {strip.map((img, i) => (
          <div
            key={`${img.src}-${i}`}
            ref={(el) => {
              barsRef.current[i] = el;
            }}
            style={{ "--i": i } as React.CSSProperties}
            className={[
              "hero-bar",
              i >= 3 ? "hidden sm:block" : "",
              i >= 4 ? "hidden lg:block" : "",
            ].join(" ")}
          >
            <div className="hero-bar-inner">
              <Image
                src={img.src}
                alt={img.alt}
                fill
                sizes="(max-width: 640px) 34vw, (max-width: 1024px) 25vw, 15vw"
                className="object-cover object-top"
                priority={i < 4}
              />
            </div>
            {/* Warm rim light down both machined edges, brightest on the column
                the light has reached. */}
            <span aria-hidden className="hero-bar-rim" />
          </div>
        ))}
      </div>

      {/* The pool of warm light itself, spanning the whole band so the lift
          does not stop dead at a column edge. */}
      <span aria-hidden className="hero-glow" />

      {/* Portraits are lit brighter than the reference frames, so the band
          carries an even scrim before the fade takes over — otherwise the
          strip glares against the black page around it. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-black/15" />
      {/* Bottom fade to black — the headline reads as if the band melts into it. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-3/5 bg-hero-fade"
      />
    </div>
  );
}
