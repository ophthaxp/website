"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

/** How long the expansion runs, and the curve it runs on. */
const DURATION = 520;
const EASING = "cubic-bezier(0.32, 0.72, 0, 1)";
/** Matches the cards' `rounded-[18px]`, so the reveal has their corners. */
const RADIUS = 18;

export type FaqItem = {
  q: string;
  a: string;
  cta?: { label: string; href: string };
  /** Optional grouping label shown as a chip on the card (e.g. "Pricing"). */
  tag?: string;
  /** A closing prompt rather than a question — rendered in accent so it reads
   *  as the "talk to us" card rather than one more question. */
  isPrompt?: boolean;
};

/**
 * The FAQ grid. Every question is a card, all of them on screen from the start.
 * Opening one expands that card in place: it widens across two columns and
 * grows to fit its answer, and the grid re-lays itself around it.
 *
 * How the expansion is animated is the whole difficulty here, so it is worth
 * writing down. A card cannot occupy one and a half columns halfway through, so
 * there is no CSS property to transition — the new layout simply exists, all at
 * once. What is animated instead is the difference between the two layouts,
 * measured after the fact:
 *
 *   - Every card that moved is put back where it was with a transform and
 *     released, so it slides to its new place instead of appearing there.
 *   - The card that opened has its answer laid out at full size from the first
 *     frame and revealed by a growing rounded window, so the card appears to
 *     open outwards while the text inside stays exactly where it will end up.
 *
 * That second point is the one that matters. The obvious alternatives — a view
 * transition, or a FLIP scale — animate a *photograph* of the finished card up
 * from the size of the question card, which enlarges the text along with it.
 * Reading text that is swelling into place is what makes an expansion feel
 * unsteady no matter how long you give it. Here nothing is ever scaled.
 *
 * Shared by the home page and the course pages. The grid holds no memory of
 * what was open, so a parent swapping the item list should remount it with a
 * `key` to close whatever answer was showing.
 */
export function FaqGrid({ items, label }: { items: FaqItem[]; label: string }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const panelRef = useRef<HTMLDivElement | null>(null);
  const cellRefs = useRef<(HTMLDivElement | null)[]>([]);
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const total = items.length;

  /**
   * Change which answer is open, and animate the difference it makes.
   *
   * The state change is flushed synchronously so the new layout is on screen to
   * be measured before this function returns — React would otherwise render it
   * afterwards, by which time both layouts are no longer available to compare.
   */
  const transition = useCallback((next: number | null) => {
    const cells = cellRefs.current;
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduced) {
      setOpenIndex(next);
      return;
    }

    const before = cells.map((cell) => cell?.getBoundingClientRect());
    flushSync(() => setOpenIndex(next));
    const after = cells.map((cell) => cell?.getBoundingClientRect());

    cells.forEach((cell, i) => {
      const a = before[i];
      const b = after[i];
      if (!cell || !a || !b) return;

      const dx = a.left - b.left;
      const dy = a.top - b.top;
      const moved = Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5;
      const grew = Math.abs(a.height - b.height) > 0.5;

      // Cards that were displaced slide in from where they used to be. A
      // transform costs no layout, so a dozen of these run together happily.
      if (moved) {
        cell.animate(
          [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "translate(0, 0)" }],
          { duration: DURATION, easing: EASING },
        );
      }

      // Cards beside the open one stretch to the taller row. Their own height is
      // safe to animate: the row is already as tall as the open card, so none of
      // this feeds back into the layout.
      if (grew && i !== next) {
        cell.animate([{ height: `${a.height}px` }, { height: `${b.height}px` }], {
          duration: DURATION,
          easing: EASING,
        });
      }
    });

    // And the card that opened: a rounded window over the finished answer,
    // starting at the size the question card was and growing to the whole of it.
    const panel = panelRef.current;
    const from = next === null ? undefined : before[next];
    const to = next === null ? undefined : after[next];

    if (panel && from && to) {
      const right = Math.max(0, to.width - from.width);
      const bottom = Math.max(0, to.height - from.height);

      panel.animate(
        [
          { clipPath: `inset(0px ${right}px ${bottom}px 0px round ${RADIUS}px)` },
          { clipPath: `inset(0px 0px 0px 0px round ${RADIUS}px)` },
        ],
        { duration: DURATION, easing: EASING },
      );
    }
  }, []);

  const close = useCallback(() => {
    const returning = openIndex;
    transition(null);
    // Hand focus back to the card that was open, or a keyboard visitor is
    // dropped back at the top of the document.
    if (returning !== null) {
      requestAnimationFrame(() => buttonRefs.current[returning]?.focus());
    }
  }, [openIndex, transition]);

  const step = useCallback(
    (delta: number) => {
      if (openIndex === null) return;
      transition((openIndex + delta + total) % total);
    },
    [openIndex, total, transition],
  );

  // Escape closes; the arrow keys walk the set without going back to the grid.
  useEffect(() => {
    if (openIndex === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openIndex, close, step]);

  // Move focus onto the answer as it opens, so a screen reader reads the answer
  // rather than staying on the question it just left.
  useEffect(() => {
    if (openIndex !== null) panelRef.current?.focus({ preventScroll: true });
  }, [openIndex]);

  // Growing a card can push its own bottom past the fold. This waits out the
  // expansion: `nearest` measures against the finished card, and scrolling while
  // it is still opening would fight the motion.
  useEffect(() => {
    if (openIndex === null) return;
    const timer = setTimeout(() => {
      cellRefs.current[openIndex]?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }, DURATION);
    return () => clearTimeout(timer);
  }, [openIndex]);

  if (total === 0) return null;

  const slug = label.replace(/\s+/g, "-").toLowerCase();
  const idFor = (i: number) => `faq-${slug}-${i}`;

  return (
    <div className="scroll-mt-28">
      {/* Plain row flow, deliberately not dense. Dense packing sends the cards
          after the open one *backwards* to fill the hole a two-column card
          leaves, so half the grid changes places on a single click. A tidier
          fill is not worth watching that happen. */}
      <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
        {items.map((card, i) => {
          const open = i === openIndex;

          return (
            <div
              key={card.q}
              ref={(el) => {
                cellRefs.current[i] = el;
              }}
              /* Two columns wide once open — enough width for the answer to read
                 as prose rather than as a narrow ribbon, without taking the
                 whole row and turning the grid into a list. */
              className={cn("flex scroll-mt-28", open && "sm:col-span-2")}
            >
              {open ? (
                /* The whole card is the way back to the question — clicking
                   anywhere on it collapses it. The minus keeps a visible
                   affordance and gives the keyboard something to land on. */
                <div
                  ref={panelRef}
                  tabIndex={-1}
                  role="region"
                  aria-labelledby={`${idFor(i)}-heading`}
                  onClick={close}
                  /* Asks the browser to rasterise the card once and do the
                     reveal on the compositor. Without it the card — bloom,
                     gradient and all — is repainted on every frame of the
                     expansion, which is the difference between smooth and not. */
                  style={{ willChange: "clip-path" }}
                  /* No drop shadow, deliberately: the reveal clips everything
                     the card paints, and a shadow falls outside its box, so it
                     would be missing for the whole expansion and then appear.
                     The accent border and the bloom inside do the lifting. */
                  className="relative w-full cursor-pointer overflow-hidden rounded-[18px] border border-accent bg-gradient-to-b from-[#221C1A] via-[#171514] to-[#121111] p-5 ring-1 ring-accent/15 focus:outline-none sm:p-6"
                >
                  {/* The diffused lift Figma draws behind the card, so it reads
                      as raised rather than as a flat block on black. Not
                      animated: a blur this wide is the most expensive thing on
                      the card to paint, and paying for it on every frame of the
                      expansion is what would cost the motion its smoothness. */}
                  <span
                    aria-hidden
                    className="pointer-events-none absolute -top-[120px] left-1/2 h-[240px] w-[380px] -translate-x-1/2 rounded-full bg-accent/30 blur-[100px]"
                  />
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-accent/80 to-transparent"
                  />

                  <div className="relative">
                    <div className="flex items-start justify-between gap-3">
                      <span className="truncate rounded-full bg-accent/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-accent-soft ring-1 ring-accent/25">
                        {card.tag ?? "Question"}
                      </span>

                      {/* The control that opened the card closes it, in the same
                          corner it was in — the plus simply becomes a minus.
                          Stops the card's own handler so one click is one close. */}
                      <button
                        type="button"
                        id={`${idFor(i)}-button`}
                        ref={(el) => {
                          buttonRefs.current[i] = el;
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          close();
                        }}
                        aria-expanded
                        aria-label="Close answer"
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-accent/50 bg-accent/10 text-white transition hover:border-accent hover:bg-accent/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                      >
                        <Minus aria-hidden className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <h3
                      id={`${idFor(i)}-heading`}
                      className="mt-3.5 text-[17px] font-bold leading-[26px] text-white sm:text-[19px] sm:leading-[28px]"
                    >
                      {card.q}
                    </h3>

                    <p className="mt-2.5 whitespace-pre-line text-[14.5px] leading-[25px] text-white/75 sm:text-[15px] sm:leading-[26px]">
                      {card.a}
                    </p>

                    {/* Stops the card's own close handler, or following the link
                        would collapse the card on the way out. */}
                    {card.cta && (
                      <Link
                        href={card.cta.href}
                        onClick={(e) => e.stopPropagation()}
                        className="mt-4 inline-flex w-fit items-center rounded-[10px] bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-deep"
                      >
                        {card.cta.label}
                      </Link>
                    )}
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  id={`${idFor(i)}-button`}
                  ref={(el) => {
                    buttonRefs.current[i] = el;
                  }}
                  aria-expanded={false}
                  onClick={() => transition(i)}
                  className={cn(
                    "group flex min-h-[112px] w-full flex-col justify-between gap-4 rounded-[18px] border p-5 text-left transition-colors duration-300 ease-out motion-reduce:transition-none sm:min-h-[128px] sm:p-6",
                    card.isPrompt
                      ? "border-accent/40 bg-accent/10 hover:bg-accent/20"
                      : "border-white/10 bg-ink-800 hover:border-white/25 hover:bg-ink-700",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                  )}
                >
                  {/* Untagged cards keep the empty chip line, so their question
                      sits on the same baseline as every tagged card in the row. */}
                  {card.tag ? (
                    <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-white/35">
                      {card.tag}
                    </span>
                  ) : (
                    <span aria-hidden className="h-[13px]" />
                  )}

                  <span className="flex w-full items-start justify-between gap-4">
                    <span className="text-[15px] font-semibold leading-[24px] text-white sm:text-base sm:leading-[26px]">
                      {card.q}
                    </span>

                    <span
                      aria-hidden
                      className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/15 text-white/60 transition group-hover:border-white/35 group-hover:text-white"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </span>
                  </span>
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Only the open answer is rendered as prose, so the full set is listed
          here for crawlers and for anyone reading the page without clicking. */}
      <div className="sr-only">
        <h3>{label} — all questions and answers</h3>
        <dl>
          {items.map((entry) => (
            <div key={entry.q}>
              <dt>{entry.q}</dt>
              <dd>{entry.a}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
