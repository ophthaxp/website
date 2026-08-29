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
/** How fast the band drifts, in CSS pixels per second. Held as a speed rather
    than as a loop duration so a portrait crosses a phone and a desktop at the
    same rate; a fixed duration would race on the narrow one. Slow enough to
    read as drift rather than as a carousel that wants clicking. */
const DRIFT_SPEED = 32;

/**
 * HeroBand — the strip of mentor portraits, lit like the CRED hero, drifting
 * left to right on an endless loop.
 *
 * The portraits sit dark and near-monochrome by default so the band reads as
 * one machined object rather than seven photos. Two things move: the band
 * itself, at a slow constant drift, and the light falling on it — a column
 * comes up to full colour and pushes forward as the light reaches it, its
 * neighbours catching progressively less of the same light.
 *
 * There is one lighting model with two drivers — the cursor when a pointer is
 * over the band, and an idle pass that crosses it on a loop otherwise. Sharing
 * the model is what makes the idle state read as a preview of the interaction
 * rather than a separate effect; an overlay gradient sweeping the same path
 * cannot, because screened light over an already-bright portrait backdrop
 * barely registers.
 *
 * The track carries two copies of the strip and travels exactly one copy's
 * width before wrapping, so the seam never shows. Drift and light share a
 * single rAF loop, which is what keeps them honest: the light is positioned
 * against columns that are moving underneath it, so it has to know where they
 * are this frame. That is also why the drift is driven from JS rather than a
 * CSS animation — the loop already needs the offset, and reading it back out
 * of a compositor-run animation costs more than owning it.
 *
 * Light position is written straight to each column's `--near` custom property
 * rather than through React state: the values change every frame, and a
 * re-render per frame is work with nothing to show for it. The CSS transitions
 * on `--near`'s consumers do the smoothing, so the light trails its driver
 * rather than snapping to it.
 */
export function HeroBand({ strip }: { strip: HeroImg[] }) {
  const bandRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const barsRef = useRef<(HTMLDivElement | null)[]>([]);
  /** Band box and column width, cached so the rAF loop never reads layout.
      Every column is the same width, so where each one sits is arithmetic on
      the drift offset rather than fourteen rect reads a frame. */
  const geomRef = useRef({ x: 0, w: 1, colW: 1, halfW: 0 });
  /** Drift progress through one copy of the strip, 0-1. Kept as a fraction so
      a resize changes the distance travelled without jumping the band. */
  const progRef = useRef(0);
  const pointerRef = useRef<number | null>(null);
  const pausedRef = useRef(false);
  const motionRef = useRef(true);
  const rafRef = useRef(0);
  const lastRef = useRef(0);
  const idleStartRef = useRef(0);
  /** Timestamp before which the idle pass stays off, so the light does not
      jump straight from the cursor to the far side of the strip. */
  const idleHoldRef = useRef(0);

  // Two copies of the strip: the first is what the reader sees at rest, the
  // second is what slides in behind it. Only the first is announced.
  const lane = [...strip, ...strip];
  const count = strip.length;

  /**
   * How far the track has travelled, in pixels. Rests one full copy of the
   * strip to the left and runs back to zero, so the portraits move left to
   * right and new faces arrive at the left edge. Copy two starts where copy
   * one ends, so at the end of the run the track is showing exactly what it
   * showed at the start and the wrap is invisible.
   *
   * Both the drift and the light read the offset from here, so they cannot
   * disagree about where a column is.
   */
  const offsetPx = useCallback(
    () => geomRef.current.halfW * (progRef.current - 1),
    [],
  );

  /** Writes the current drift offset to the track. */
  const draw = useCallback(() => {
    const track = trackRef.current;
    if (!track || geomRef.current.halfW <= 0) return;
    track.style.transform = `translate3d(${offsetPx().toFixed(2)}px, 0, 0)`;
  }, [offsetPx]);

  const measure = useCallback(() => {
    const band = bandRef.current;
    if (!band) return;
    const b = band.getBoundingClientRect();
    // A translation does not change a rect's width, so this stays correct
    // mid-drift.
    const colW = barsRef.current[0]?.getBoundingClientRect().width || 1;
    geomRef.current = { x: b.left, w: b.width || 1, colW, halfW: colW * count };
    draw();
  }, [count, draw]);

  /**
   * Lights the band from a single light at viewport `x`, at `strength` (0-1).
   * `x === null` puts the band back to its resting dark.
   */
  const apply = useCallback((x: number | null, strength: number) => {
    const { x: bx, w, colW } = geomRef.current;
    const offset = offsetPx();
    barsRef.current.forEach((el, i) => {
      if (!el) return;
      let near = 0;
      if (x !== null && colW > 0) {
        // Where this column is *now*: its resting slot in the track, carried
        // along by the drift. Columns that have wrapped off either edge fall
        // out of range on their own, so they need no special case.
        const cx = bx + offset + (i + 0.5) * colW;
        const t = Math.max(0, 1 - Math.abs(x - cx) / colW / REACH);
        near = t * t * (3 - 2 * t) * strength; // smoothstep — a rounder falloff
      }
      el.style.setProperty("--near", near.toFixed(3));
    });
    const band = bandRef.current;
    if (!band) return;
    band.style.setProperty("--lit", x === null ? "0" : strength.toFixed(3));
    if (x !== null) {
      band.style.setProperty("--gx", `${(((x - bx) / w) * 100).toFixed(2)}%`);
    }
  }, [offsetPx]);

  const stop = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
    lastRef.current = 0;
    idleStartRef.current = 0;
  }, []);

  const start = useCallback(() => {
    if (rafRef.current) return;

    const step = (now: number) => {
      rafRef.current = requestAnimationFrame(step);
      // A tab returning to the front hands back a large gap; clamp it so the
      // band resumes where it left off instead of leaping across a copy.
      const dt = lastRef.current === 0 ? 0 : Math.min(64, now - lastRef.current);
      lastRef.current = now;

      const { halfW } = geomRef.current;
      if (motionRef.current && !pausedRef.current && dt > 0 && halfW > 0) {
        progRef.current =
          (progRef.current + ((dt / 1000) * DRIFT_SPEED) / halfW) % 1;
        draw();
      }

      if (pointerRef.current !== null) {
        apply(pointerRef.current, 1);
        return;
      }
      if (!motionRef.current) {
        // With motion reduced there is nothing left for the loop to do once
        // the cursor has gone: the band holds still and dark until a pointer
        // brings it back. Running on regardless would be a battery cost with
        // nothing on screen to show for it.
        apply(null, 0);
        stop();
        return;
      }
      if (now < idleHoldRef.current) {
        apply(null, 0);
        return;
      }
      if (idleStartRef.current === 0) idleStartRef.current = now;
      const phase = (now - idleStartRef.current) % IDLE_PERIOD;
      if (phase < IDLE_TRAVEL) {
        const p = phase / IDLE_TRAVEL;
        const eased = p * p * (3 - 2 * p);
        const { x, w } = geomRef.current;
        // Starts and ends off the band, so the outer columns are lit from
        // outside instead of having the light switch on top of them.
        const lightX = x + (-0.2 + 1.4 * eased) * w;
        // Fades up and down across the pass, so nothing arrives abruptly.
        const strength = Math.min(1, Math.sin(Math.PI * p) * 1.7) * IDLE_STRENGTH;
        apply(lightX, Math.max(0, strength));
      } else {
        apply(null, 0);
      }
    };

    rafRef.current = requestAnimationFrame(step);
  }, [apply, draw, stop]);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const readMotion = () => {
      motionRef.current = !reduce.matches;
    };
    readMotion();
    reduce.addEventListener("change", readMotion);

    measure();
    window.addEventListener("resize", measure);

    // The loop runs only while the band is on screen and the tab is in front —
    // an animation nobody can see is only a battery cost.
    const band = bandRef.current;
    const io = new IntersectionObserver(
      ([e]) => (e.isIntersecting && !document.hidden ? start() : stop()),
      { threshold: 0.05 },
    );
    if (band) io.observe(band);

    const onVisibility = () => (document.hidden ? stop() : start());
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      reduce.removeEventListener("change", readMotion);
      window.removeEventListener("resize", measure);
      document.removeEventListener("visibilitychange", onVisibility);
      io.disconnect();
      stop();
    };
  }, [measure, start, stop]);

  const handleMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const band = bandRef.current;
    if (!band) return;
    const r = band.getBoundingClientRect();
    band.style.setProperty("--gy", `${((e.clientY - r.top) / r.height) * 100}%`);
    pointerRef.current = e.clientX;
  };

  /* The band holds still under a pointer, so a face can be looked at rather
     than chased across the screen. */
  const handleEnter = () => {
    pausedRef.current = true;
    measure();
    // With motion reduced the loop parks itself; a pointer is the one thing
    // that still needs it.
    start();
  };

  const handleLeave = () => {
    pausedRef.current = false;
    pointerRef.current = null;
    // A beat before the band starts lighting itself again.
    idleHoldRef.current = performance.now() + IDLE_RESUME;
    idleStartRef.current = 0;
  };

  return (
    <div
      ref={bandRef}
      className="hero-band relative overflow-hidden"
      onPointerMove={handleMove}
      onPointerEnter={handleEnter}
      onPointerLeave={handleLeave}
    >
      <div
        ref={trackRef}
        className="hero-rail-track flex h-[260px] w-max sm:h-[320px] lg:h-[400px]"
        /* Matches the resting offset the loop writes, so the very first paint
           is already covered edge to edge instead of opening a gap on the left
           before the loop's first frame lands. */
        style={{ transform: "translate3d(-50%, 0, 0)" }}
      >
        {lane.map((img, i) => (
          <div
            key={`${img.src}-${i}`}
            ref={(el) => {
              barsRef.current[i] = el;
            }}
            /* Both copies of a portrait arrive together, so the entrance
               stagger still runs left to right across the copy on screen. */
            style={{ "--i": i % count } as React.CSSProperties}
            aria-hidden={i >= count}
            className="hero-bar w-[calc(100vw/3)] shrink-0 sm:w-[calc(100vw/4)] lg:w-[calc(100vw/7)]"
          >
            <div className="hero-bar-inner">
              <Image
                src={img.src}
                alt={i < count ? img.alt : ""}
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
