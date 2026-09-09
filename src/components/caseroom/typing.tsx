"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Text that arrives whole and is written out.
 *
 * Shared by Iris's analysis and the attending's replies. Being straight about
 * what this is: both of those land in one response, so nothing here makes an
 * answer arrive sooner — it is a reveal of text already in hand. It earns its
 * place because both are somebody speaking, and speech that appears all at once
 * reads as a field that got filled in rather than an answer.
 *
 * Which is also why the two guards are not optional. Anyone rereading a reply
 * is now waiting on an animation, so it can always be cut short, and anyone who
 * has asked their machine for less motion never sees it at all.
 */

/** How often the reveal advances. Below about 16ms nothing more is visible. */
const TICK_MS = 24;

const REDUCED = "(prefers-reduced-motion: reduce)";

/**
 * True unless the reader has asked their machine for less motion.
 *
 * Answered on the first client render rather than one render later. A component
 * that mounts already holding its text — a reply that has just arrived — would
 * otherwise paint the whole thing, learn a beat afterwards that it may animate,
 * and snap back to nothing to type it out. The server has no such setting to
 * read, so there it is the still version.
 */
export function useMotionAllowed(): boolean {
  const [allowed, setAllowed] = useState(() =>
    typeof window === "undefined" ? false : !window.matchMedia(REDUCED).matches,
  );

  // And if they change the setting while the page is open, honour that too.
  useEffect(() => {
    const query = window.matchMedia(REDUCED);
    const sync = () => setAllowed(!query.matches);

    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  return allowed;
}

/**
 * Reveals `text` a few characters at a time.
 *
 * The rate comes from the length rather than being fixed per character, so a
 * short line does not finish in a blink or a long one outstay its welcome.
 * `durationMs` is what the whole of it should take.
 */
export function useTypewriter(
  text: string,
  { animate, durationMs = 2600 }: { animate: boolean; durationMs?: number },
) {
  const [count, setCount] = useState(animate ? 0 : text.length);
  const timer = useRef<number | null>(null);

  const stop = useCallback(() => {
    if (timer.current !== null) {
      window.clearInterval(timer.current);
      timer.current = null;
    }
  }, []);

  /** Straight to the end — for a skip, or for whatever comes next. */
  const finish = useCallback(() => {
    stop();
    setCount(text.length);
  }, [stop, text.length]);

  useEffect(() => {
    if (!animate) {
      setCount(text.length);
      return;
    }

    setCount(0);
    if (text.length === 0) return;

    const step = Math.max(1, Math.ceil(text.length / (durationMs / TICK_MS)));
    let shown = 0;

    timer.current = window.setInterval(() => {
      shown = Math.min(text.length, shown + step);
      setCount(shown);
      if (shown >= text.length) stop();
    }, TICK_MS);

    return stop;
  }, [text, animate, durationMs, stop]);

  return { count, shown: text.slice(0, count), done: count >= text.length, finish };
}

/** The bar at the end of the sentence being written. */
export function Caret() {
  return (
    <span
      aria-hidden
      className="ml-0.5 inline-block h-[0.95em] w-[2px] translate-y-[0.15em] animate-pulse bg-accent"
    />
  );
}
