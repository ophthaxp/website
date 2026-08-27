"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronsLeft, ChevronsRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The card's chat glyph. Figma draws lucide's messages-square — two stacked
 * bubbles — as a solid fill at 40px, not the single stroked square lucide
 * ships, so the path is inlined rather than imported. The viewBox keeps the
 * export's own 28..68 coordinates so the geometry needs no translation.
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
  /** A closing prompt rather than a question. Nothing is hidden behind a
   *  click on these — there is no answer to reveal. */
  isPrompt?: boolean;
};

/** Where each card in the deck sits relative to the one in front. */
function deckStyle(offset: number): React.CSSProperties {
  const abs = Math.abs(offset);
  if (abs === 0) {
    return { transform: "translate3d(0,0,0) scale(1)", zIndex: 30, opacity: 1 };
  }
  const dir = offset > 0 ? 1 : -1;
  const x = dir * (abs === 1 ? 46 : 84);
  const y = abs === 1 ? 46 : 78;
  const scale = abs === 1 ? 0.94 : 0.88;
  return {
    transform: `translate3d(${x}px, ${y}px, 0) scale(${scale}) rotate(${dir * 2.5}deg)`,
    zIndex: 30 - abs,
    opacity: abs === 1 ? 1 : 0.55,
  };
}

/**
 * The stacked FAQ card deck. One question faces front; its answer stays hidden
 * until the card is clicked. Shared by the home page (which stacks a category
 * filter on top) and the course pages (which feed it that course's own FAQs).
 *
 * The deck holds no memory of which card was showing, so a parent swapping the
 * item list should remount it with a `key` to send it back to the first card.
 */
export function FaqDeck({ items, label }: { items: FaqItem[]; label: string }) {
  const [index, setIndex] = useState(0);
  // Answers open one at a time and close again whenever the front card
  // changes — a revealed answer should never carry over to a new question.
  const [open, setOpen] = useState(false);

  const total = items.length;
  if (total === 0) return null;

  const go = (delta: number) => {
    setOpen(false);
    setIndex((i) => (i + delta + total) % total);
  };

  const arrow =
    "absolute z-40 inline-flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-full transition";

  return (
    <>
      {/* Below sm the fanned back cards bleed past the content column and hand
          the page ~24px of sideways scroll. Clipping at the viewport edge —
          rather than at the column — kills the scroll while leaving the fan
          looking exactly as it does now. From sm up there is room for the fan,
          so nothing is clipped. */}
      <div className="-mx-5 overflow-x-clip px-5 sm:mx-0 sm:overflow-x-visible sm:px-0">
        <div className="relative flex items-center justify-center">
          {/* A single-question deck has nothing to page through. */}
          {total > 1 && (
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Previous question"
              className={cn(
                arrow,
                "left-0 bg-ink-800 text-white hover:bg-ink-700 sm:left-4 lg:left-[calc(50%-372px)]",
              )}
            >
              <ChevronsLeft className="h-5 w-5" />
            </button>
          )}

          <div
            className="relative h-[400px] w-full max-w-[380px]"
            role="group"
            aria-roledescription="carousel"
            aria-label={`${label} questions`}
          >
            {items.map((item, i) => {
              // Shortest signed distance around the ring, so wrapping from the
              // last card to the first slides one step instead of rewinding.
              let offset = i - index;
              if (offset > total / 2) offset -= total;
              if (offset < -total / 2) offset += total;
              if (Math.abs(offset) > 2) return null;
              const isFront = offset === 0;
              // Prompt cards have nothing to reveal, so they read as always open.
              const revealed = isFront && (open || item.isPrompt);
              const answerId = `faq-answer-${label}-${i}`.replace(/\s+/g, "-");

              return (
                <article
                  key={item.q}
                  aria-hidden={!isFront}
                  style={deckStyle(offset)}
                  className={cn(
                    /* Every card is absolutely positioned, so none of them can
                       stretch the deck: it stays the 400px Figma draws however
                       long the answer is, and an answer that does not fit
                       scrolls inside the card. */
                    "faq-card absolute inset-0 flex flex-col overflow-hidden rounded-[26px] p-7",
                    /* Figma draws this card standalone; in the deck its 60% fill
                     lets the stacked cards behind it show through, so the
                     backdrop blur has to be heavy enough that their headings
                     read as a colour wash rather than legible ghost text. */
                    isFront ? "bg-[#1D1D1D]/60 backdrop-blur-3xl" : "bg-accent",
                  )}
                >
                  {/* Two hugely diffused circles Figma clips to the card: a white
                    one sitting just past the bottom edge, knocked back by a
                    near-black one over it. Net effect is a faint lift at the
                    foot of the card rather than a flat panel. */}
                  {isFront && (
                    <>
                      <span
                        aria-hidden
                        className="pointer-events-none absolute -bottom-[139px] left-1/2 h-[250px] w-[250px] -translate-x-1/2 rounded-full bg-white blur-[250px]"
                      />
                      <span
                        aria-hidden
                        className="pointer-events-none absolute -bottom-[75px] left-1/2 h-[250px] w-[250px] -translate-x-1/2 rounded-full bg-[#1A1A1A] blur-[200px]"
                      />
                    </>
                  )}

                  {isFront && !item.isPrompt && (
                    <button
                      type="button"
                      onClick={() => setOpen((v) => !v)}
                      aria-expanded={open}
                      aria-controls={answerId}
                      className="absolute inset-0 z-10 cursor-pointer rounded-[26px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    >
                      <span className="sr-only">
                        {open
                          ? `Hide the answer to: ${item.q}`
                          : `Show the answer to: ${item.q}`}
                      </span>
                    </button>
                  )}

                  <div className="relative flex shrink-0 items-center justify-between gap-4">
                    <ChatIcon
                      className={cn(
                        "h-10 w-10",
                        isFront ? "text-accent" : "text-white/70",
                      )}
                    />
                    {/* Position within the deck — 24x6 pills on a 4px gutter. */}
                    <div className="flex items-center gap-1" aria-hidden>
                      {items.map((c, ci) => (
                        <span
                          key={c.q}
                          className={cn(
                            "h-1.5 w-6 rounded-full",
                            ci === index && isFront
                              ? "bg-accent"
                              : isFront
                                ? "bg-white/50"
                                : "bg-white/40",
                          )}
                        />
                      ))}
                    </div>
                  </div>

                  <h3
                    className={cn(
                      /* Figma's 24px is sized for the 380px card, which is what
                       every viewport from sm up gets. Below that the card
                       narrows with the screen and the scale has to come down or
                       a long answer runs past the card's foot. */
                      "mb-6 mt-7 shrink-0 text-xl font-bold leading-[30px] sm:text-2xl sm:leading-[34px]",
                      isFront ? "text-white" : "text-white/90",
                    )}
                  >
                    {item.q}
                  </h3>

                  {/* The answer keeps its original spot at the foot of the card;
                    it is simply collapsed until the card is clicked. */}
                  <div
                    id={answerId}
                    className={cn(
                      "mt-auto grid min-h-0 transition-[grid-template-rows] duration-500 ease-out",
                      revealed ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
                      /* Above the card-wide toggle once open, so a wheel over the
                       answer scrolls it instead of falling through to the page,
                       and the text can be selected. The header stays uncovered,
                       so there is still plenty of card left to click to close. */
                      revealed && "relative z-20",
                    )}
                  >
                    <div
                      className={cn(
                        "min-h-0",
                        revealed ? "overflow-y-auto" : "overflow-hidden",
                      )}
                      style={{
                        scrollbarWidth: "thin",
                        scrollbarColor: "rgba(255,255,255,0.35) transparent",
                      }}
                    >
                      <p
                        className={cn(
                          "text-[17px] leading-[27px] sm:text-xl sm:leading-[32px]",
                          isFront ? "text-white" : "text-white/80",
                        )}
                      >
                        {item.a}
                      </p>

                      {item.cta && (
                        <Link
                          href={item.cta.href}
                          tabIndex={revealed ? undefined : -1}
                          /* Above the card-wide toggle, so it stays a link. */
                          className={cn(
                            "relative z-20 mt-5 inline-flex w-fit items-center rounded-[10px] px-6 py-3 text-sm font-semibold transition",
                            isFront
                              ? "bg-accent text-white hover:bg-accent-deep"
                              : "bg-white/15 text-white",
                          )}
                        >
                          {item.cta.label}
                        </Link>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {total > 1 && (
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Next question"
              className={cn(
                arrow,
                "right-0 bg-white text-black hover:bg-white/85 sm:right-4 lg:right-[calc(50%-372px)]",
              )}
            >
              <ChevronsRight className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      {/* Screen-reader fallback: the deck only exposes the front card, so list
          every question in full for anyone not driving the carousel visually. */}
      <div className="sr-only">
        <h3>{label} — all questions</h3>
        <dl>
          {items.map((item) => (
            <div key={item.q}>
              <dt>{item.q}</dt>
              <dd>{item.a}</dd>
            </div>
          ))}
        </dl>
      </div>
    </>
  );
}
