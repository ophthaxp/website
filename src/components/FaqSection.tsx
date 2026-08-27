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
    <svg viewBox="28 28 40 40" fill="currentColor" aria-hidden className={className}>
      <path d="M62 50V56L56 50H44C42.9391 50 41.9217 49.5786 41.1716 48.8284C40.4214 48.0783 40 47.0609 40 46V32C40 29.8 41.8 28 44 28H64C65.0609 28 66.0783 28.4214 66.8284 29.1716C67.5786 29.9217 68 30.9391 68 32V46C68 47.0609 67.5786 48.0783 66.8284 48.8284C66.0783 49.5786 65.0609 50 64 50H62ZM56 54V58C56 59.0609 55.5786 60.0783 54.8284 60.8284C54.0783 61.5786 53.0609 62 52 62H40L34 68V62H32C30.9391 62 29.9217 61.5786 29.1716 60.8284C28.4214 60.0783 28 59.0609 28 58V44C28 41.8 29.8 40 32 40H36V46C36 48.1217 36.8429 50.1566 38.3431 51.6569C39.8434 53.1571 41.8783 54 44 54H56Z" />
    </svg>
  );
}

type Faq = {
  q: string;
  a: string;
  cta?: { label: string; href: string };
  /** A closing prompt rather than a question. Nothing is hidden behind a
   *  click on these — there is no answer to reveal. */
  isPrompt?: boolean;
};

const CATEGORIES: { key: string; label: string; items: Faq[] }[] = [
  {
    key: "general",
    label: "General",
    items: [
      {
        q: "What is Legends of Medicine?",
        a: "Legends of Medicine is a premium platform where healthcare professionals learn directly from world-renowned medical legends.",
      },
      {
        q: "Who is Legends of Medicine designed for?",
        a: "Legends of Medicine is designed for healthcare professionals seeking advanced clinical expertise through live mentorship from world-renowned Legends.",
      },
      {
        q: "How many Mentors are currently on the Platform?",
        a: "We currently feature 10 world-renowned Legends, each bringing exceptional expertise, mentorship, and real-world clinical experience to every program.",
      },
      {
        q: "What makes us different?",
        a: "Our live, Legend-led programs provide direct access to renowned clinicians, delivering practical learning beyond traditional online courses.",
      },
      {
        q: "Still have questions?",
        a: "Contact our support team and we will make sure everything is clear and intuitive for you!",
        cta: { label: "Contact Support", href: "/contact" },
        isPrompt: true,
      },
    ],
  },
  {
    key: "cohorts",
    label: "Cohorts & Admission",
    items: [
      {
        q: "How are the cohorts structured?",
        a: "Each cohort runs for a fixed duration with a published schedule of live mentor sessions, recorded modules, OR breakdowns and 1:1 office hours.",
      },
      {
        q: "Is the curriculum live or pre-recorded?",
        a: "It is hybrid. Foundational modules are recorded so you can move at your own pace, while case clinics and Q&A are live with the mentor — and recorded for your library.",
      },
      {
        q: "How do I apply to a cohort?",
        a: "Apply from any program page. Our team reviews every application and responds within 48 hours, usually with a discovery call scheduled with the Legend.",
      },
      {
        q: "Will I receive a certificate?",
        a: "Yes — on successful completion you receive a verifiable Legends of Medicine certificate co-signed by the mentor.",
      },
    ],
  },
  {
    key: "pricing",
    label: "Pricings & Access",
    items: [
      {
        q: "What does the program cost?",
        a: "Tuition varies by mentor and program length and is shown on each program page. Need-based and merit scholarships are available on application.",
      },
      {
        q: "Do you offer EMI or refunds?",
        a: "Yes. Most programs support 3, 6 and 12-month EMI through partnered lenders, plus a 7-day full refund window from the cohort start.",
      },
      {
        q: "How long do I keep access?",
        a: "Recorded modules, live-session replays and the case library stay available to you well past the cohort — you can revisit them whenever a case calls for it.",
      },
    ],
  },
];

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

export function FaqSection() {
  const [catIndex, setCatIndex] = useState(0);
  const [index, setIndex] = useState(0);
  // Answers open one at a time and close again whenever the front card
  // changes — a revealed answer should never carry over to a new question.
  const [open, setOpen] = useState(false);

  const category = CATEGORIES[catIndex];
  const items = category.items;
  const total = items.length;

  const go = (delta: number) => {
    setOpen(false);
    setIndex((i) => (i + delta + total) % total);
  };

  const pickCategory = (i: number) => {
    setOpen(false);
    setCatIndex(i);
    setIndex(0);
  };

  return (
    <section
      aria-labelledby="faq-title"
      className="mx-auto max-w-[1440px] px-5 py-16 sm:px-10 sm:py-24 lg:px-[120px]"
    >
      <h2
        id="faq-title"
        className="text-center text-[clamp(1.75rem,3.1vw,2.6rem)] font-extrabold leading-tight tracking-[-0.015em] text-white"
      >
        Frequently asked questions
      </h2>

      {/* Category filter */}
      <div
        role="tablist"
        aria-label="FAQ categories"
        className="mt-10 flex flex-wrap justify-center gap-3"
      >
        {CATEGORIES.map((c, i) => {
          const selected = i === catIndex;
          return (
            <button
              key={c.key}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => pickCategory(i)}
              className={cn(
                "rounded-[10px] px-7 py-3.5 text-[15px] transition",
                selected
                  ? "bg-accent font-medium text-white"
                  : "bg-ink-800 text-white/60 hover:bg-ink-700 hover:text-white",
              )}
            >
              {c.label}
            </button>
          );
        })}
      </div>

      {/* Card deck */}
      <div className="relative mt-14 flex items-center justify-center sm:mt-20">
        <button
          type="button"
          onClick={() => go(-1)}
          aria-label="Previous question"
          className="absolute left-0 z-40 inline-flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-full bg-ink-800 text-white transition hover:bg-ink-700 sm:left-4 lg:left-[calc(50%-372px)]"
        >
          <ChevronsLeft className="h-5 w-5" />
        </button>

        <div
          className="relative h-[400px] w-full max-w-[380px]"
          role="group"
          aria-roledescription="carousel"
          aria-label={`${category.label} questions`}
        >
          {items.map((item, i) => {
            // Shortest signed distance around the ring, so wrapping from the
            // last card to the first slides one step instead of rewinding.
            let offset = i - index;
            if (offset > total / 2) offset -= total;
            if (offset < -total / 2) offset += total;
            if (Math.abs(offset) > 2) return null;
            const isFront = offset === 0;

            return (
              <article
                key={item.q}
                aria-hidden={!isFront}
                style={deckStyle(offset)}
                className={cn(
                  "faq-card absolute inset-0 flex flex-col overflow-hidden rounded-[26px] p-7",
                  /* Figma draws this card standalone; in the deck its 60% fill lets
                     the stacked cards behind it show through, so the backdrop
                     blur has to be heavy enough that their headings read as a
                     colour wash rather than legible ghost text. */
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
                      className="pointer-events-none absolute left-1/2 top-[289px] h-[250px] w-[250px] -translate-x-1/2 rounded-full bg-white blur-[250px]"
                    />
                    <span
                      aria-hidden
                      className="pointer-events-none absolute left-1/2 top-[225px] h-[250px] w-[250px] -translate-x-1/2 rounded-full bg-[#1A1A1A] blur-[200px]"
                    />
                  </>
                )}
                {isFront && !item.isPrompt && (
                  <button
                    type="button"
                    onClick={() => setOpen((v) => !v)}
                    aria-expanded={open}
                    aria-controls={`faq-answer-${category.key}-${i}`}
                    className="absolute inset-0 z-10 cursor-pointer rounded-[26px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    <span className="sr-only">
                      {open ? `Hide the answer to: ${item.q}` : `Show the answer to: ${item.q}`}
                    </span>
                  </button>
                )}

                <div className="relative flex items-center justify-between gap-4">
                  <ChatIcon
                    className={cn("h-10 w-10", isFront ? "text-accent" : "text-white/70")}
                  />
                  {/* Position within the category — 24x6 pills on a 4px gutter. */}
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
                    "mt-7 text-xl font-bold leading-[30px] sm:text-2xl sm:leading-[34px]",
                    isFront ? "text-white" : "text-white/90",
                  )}
                >
                  {item.q}
                </h3>

                {/* The answer keeps its original spot at the foot of the card;
                    it is simply collapsed until the card is clicked. */}
                <div
                  id={`faq-answer-${category.key}-${i}`}
                  className={cn(
                    "mt-auto grid transition-[grid-template-rows] duration-500 ease-out",
                    isFront && (open || item.isPrompt)
                      ? "grid-rows-[1fr]"
                      : "grid-rows-[0fr]",
                  )}
                >
                  <div className="min-h-0 overflow-hidden">
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
                        tabIndex={isFront && (open || item.isPrompt) ? undefined : -1}
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

        <button
          type="button"
          onClick={() => go(1)}
          aria-label="Next question"
          className="absolute right-0 z-40 inline-flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-full bg-white text-black transition hover:bg-white/85 sm:right-4 lg:right-[calc(50%-372px)]"
        >
          <ChevronsRight className="h-5 w-5" />
        </button>
      </div>

      {/* Screen-reader fallback: the deck only exposes the front card, so list
          every question in full for anyone not driving the carousel visually. */}
      <div className="sr-only">
        <h3>{category.label} — all questions</h3>
        <dl>
          {items.map((item) => (
            <div key={item.q}>
              <dt>{item.q}</dt>
              <dd>{item.a}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
