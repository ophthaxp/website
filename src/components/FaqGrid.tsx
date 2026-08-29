"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The card's chat glyph. Figma draws lucide's messages-square — two stacked
 * bubbles — as a solid fill, not the single stroked square lucide ships, so the
 * path is inlined rather than imported. The viewBox keeps the export's own
 * 28..68 coordinates so the geometry needs no translation.
 */
function ChatIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="28 28 40 40"
      fill="currentColor"
      aria-hidden
      className={className}
    >
      <path d="M62 50V56L56 50H44C42.9391 50 41.9217 49.5786 41.1716 48.8284C40.4214 48.0783 40 47.0609 40 46V32C40 29.8 41.8 28 44 28H64C65.0609 28 66.0783 28.4214 66.8284 29.1716C67.5786 29.9217 68 30.9391 68 32V46C68 47.0609 67.5786 48.0783 66.8284 48.8284C66.0783 49.5786 65.0609 50 64 50H62ZM56 54V58C56 59.0609 55.5786 60.0783 54.8284 60.8284C54.0783 61.5786 53.0609 62 52 62H40L34 68V62H32C30.9391 62 29.9217 61.5786 29.1716 60.8284C28.4214 60.0783 28 59.0609 28 58V44C28 41.8 29.8 40 32 40H36V46C36 48.1217 36.8429 50.1566 38.3431 51.6569C39.8434 53.1571 41.8783 54 44 54H56Z" />
    </svg>
  );
}

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
 * Opening one leaves the grid exactly where it is — it just falls back behind a
 * dark wash — and the answer comes forward on a single card over it. Nothing
 * moves, folds or reflows; the only thing that changes is what has your eye.
 *
 * The answer sticks near the top of the viewport while it is open, which keeps
 * it in sight on a phone, where the grid behind it runs far taller than a
 * screen.
 *
 * Shared by the home page and the course pages. The grid holds no memory of
 * what was open, so a parent swapping the item list should remount it with a
 * `key` to close whatever answer was showing.
 */
export function FaqGrid({ items, label }: { items: FaqItem[]; label: string }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const rootRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const total = items.length;

  const close = useCallback(() => {
    const returning = openIndex;
    setOpenIndex(null);
    // Hand focus back to the card that was opened, or a keyboard visitor is
    // dropped back at the top of the document.
    if (returning !== null) {
      requestAnimationFrame(() => cardRefs.current[returning]?.focus());
    }
  }, [openIndex]);

  const step = useCallback(
    (delta: number) =>
      setOpenIndex((i) => (i === null ? i : (i + delta + total) % total)),
    [total],
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
  // rather than sitting on a card that is now behind the wash.
  useEffect(() => {
    if (openIndex !== null) panelRef.current?.focus({ preventScroll: true });
  }, [openIndex]);

  // The card is sticky, so it follows the reader down the grid — but if the
  // section's top is already above the fold when a card is clicked, pull it
  // back so the answer opens in view rather than off screen.
  useEffect(() => {
    if (openIndex === null || !rootRef.current) return;
    if (rootRef.current.getBoundingClientRect().top < -80) {
      rootRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [openIndex]);

  if (total === 0) return null;

  const slug = label.replace(/\s+/g, "-").toLowerCase();
  const idFor = (i: number) => `faq-${slug}-${i}`;
  const item = openIndex === null ? null : items[openIndex];
  const isOpen = item !== null && openIndex !== null;

  return (
    <div ref={rootRef} className="relative scroll-mt-28">
      <div
        aria-hidden={isOpen}
        className={cn(
          "grid gap-3 transition-all duration-300 ease-out motion-reduce:transition-none sm:grid-cols-2 sm:gap-4 lg:grid-cols-3",
          isOpen && "pointer-events-none scale-[0.99] opacity-35",
        )}
      >
        {items.map((card, i) => (
          <button
            key={card.q}
            type="button"
            id={`${idFor(i)}-button`}
            ref={(el) => {
              cardRefs.current[i] = el;
            }}
            tabIndex={isOpen ? -1 : undefined}
            aria-expanded={i === openIndex}
            onClick={() => setOpenIndex(i)}
            className={cn(
              "group flex min-h-[112px] w-full flex-col justify-between gap-4 rounded-[18px] border p-5 text-left transition-all duration-300 ease-out motion-reduce:transition-none sm:min-h-[128px] sm:p-6",
              card.isPrompt
                ? "border-accent/40 bg-accent/10 hover:bg-accent/20"
                : "border-white/10 bg-ink-800 hover:border-white/25 hover:bg-ink-700",
              /* The card the answer came from stays lit and pushed forward
                 under the wash, so the pop has a visible source. */
              i === openIndex && "scale-[1.05] border-accent bg-ink-700",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
            )}
          >
            {/* Untagged cards keep the empty chip line, so their question sits
                on the same baseline as every tagged card in the row. */}
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
        ))}
      </div>

      {isOpen && (
        /* Covers the grid only — the rest of the page carries on as normal, and
           a click anywhere on the wash closes the answer. */
        <div
          className="absolute inset-0 z-20 animate-fadeIn motion-reduce:animate-none"
          onClick={close}
        >
          <div
            aria-hidden
            className="absolute inset-0 -m-4 rounded-[32px] bg-black/75 backdrop-blur-[7px]"
          />

          <div className="sticky top-24 mx-auto w-full max-w-[720px] px-1 sm:px-4">
            <div
              key={openIndex}
              ref={panelRef}
              tabIndex={-1}
              role="region"
              aria-labelledby={`${idFor(openIndex)}-heading`}
              onClick={(e) => e.stopPropagation()}
              className="relative max-h-[78vh] overflow-y-auto overflow-x-hidden rounded-[28px] border border-white/[0.14] bg-gradient-to-b from-[#221C1A] via-[#171514] to-[#121111] p-6 shadow-[0_40px_120px_-20px_rgba(0,0,0,0.95),0_0_60px_-12px_rgba(183,90,68,0.35)] ring-1 ring-accent/15 animate-popIn motion-reduce:animate-none focus:outline-none sm:p-9"
            >
              {/* The diffused lift Figma draws behind the card, so it reads as
                  raised rather than as a flat block on black. */}
              <span
                aria-hidden
                className="pointer-events-none absolute -top-[140px] left-1/2 h-[300px] w-[460px] -translate-x-1/2 rounded-full bg-accent/40 blur-[110px] animate-glowIn motion-reduce:animate-none"
              />
              <span
                aria-hidden
                className="pointer-events-none absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent via-accent/80 to-transparent"
              />

              <div className="relative">
                <div
                  style={{ animationDelay: "90ms" }}
                  className="flex items-center justify-between gap-4 animate-riseIn motion-reduce:animate-none"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[15px] bg-accent/15 ring-1 ring-accent/30">
                      <ChatIcon className="h-[22px] w-[22px] text-accent-soft" />
                    </span>

                    <span className="truncate rounded-full bg-accent/15 px-3 py-1.5 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-accent-soft ring-1 ring-accent/25">
                      {item.tag ?? "Question"}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={close}
                    aria-label="Close answer"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/15 bg-black/30 text-white/70 transition hover:border-white/35 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    <X aria-hidden className="h-4 w-4" />
                  </button>
                </div>

                <h3
                  id={`${idFor(openIndex)}-heading`}
                  style={{ animationDelay: "170ms" }}
                  className="mt-7 max-w-[95%] text-2xl font-bold leading-[34px] text-white animate-riseIn motion-reduce:animate-none sm:text-[30px] sm:leading-[40px]"
                >
                  {item.q}
                </h3>

                <p
                  style={{ animationDelay: "240ms" }}
                  className="mt-4 whitespace-pre-line text-[16px] leading-[28px] text-white/75 animate-riseIn motion-reduce:animate-none sm:text-lg sm:leading-[31px]"
                >
                  {item.a}
                </p>

                {item.cta && (
                  <Link
                    href={item.cta.href}
                    style={{ animationDelay: "310ms" }}
                    className="mt-6 inline-flex items-center rounded-[10px] bg-accent px-6 py-3 text-sm font-semibold text-white transition animate-riseIn hover:bg-accent-deep motion-reduce:animate-none"
                  >
                    {item.cta.label}
                  </Link>
                )}

                {total > 1 && (
                  <div
                    style={{ animationDelay: "370ms" }}
                    className="mt-7 flex items-center justify-between gap-4 border-t border-white/10 pt-4 animate-riseIn motion-reduce:animate-none"
                  >
                    <span className="tabular-nums text-[13px] text-white/35">
                      {openIndex + 1} / {total}
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => step(-1)}
                        aria-label="Previous question"
                        className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-white/70 transition hover:border-white/35 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                      >
                        <ChevronLeft aria-hidden className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => step(1)}
                        aria-label="Next question"
                        className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-white/70 transition hover:border-white/35 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                      >
                        <ChevronRight aria-hidden className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Only the open answer is in the DOM, so the full set is listed here for
          crawlers and for anyone reading the page without clicking through. */}
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
