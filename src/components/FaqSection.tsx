"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronsLeft, ChevronsRight, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

type Faq = { q: string; a: string; cta?: { label: string; href: string } };

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

  const category = CATEGORIES[catIndex];
  const items = category.items;
  const total = items.length;

  const go = (delta: number) => setIndex((i) => (i + delta + total) % total);

  const pickCategory = (i: number) => {
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
          className="relative h-[402px] w-full max-w-[378px]"
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
                  "faq-card absolute inset-0 flex flex-col rounded-[24px] border p-7",
                  isFront
                    ? "border-white/12 bg-black/55 backdrop-blur-xl"
                    : "border-transparent bg-accent",
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <MessageSquare
                    className={cn("h-7 w-7", isFront ? "text-accent" : "text-white/70")}
                    aria-hidden
                  />
                  {/* Position within the category */}
                  <div className="flex items-center gap-1.5 pt-1.5" aria-hidden>
                    {items.map((c, ci) => (
                      <span
                        key={c.q}
                        className={cn(
                          "h-[3px] w-[18px] rounded-full",
                          ci === index && isFront
                            ? "bg-accent"
                            : isFront
                              ? "bg-white/25"
                              : "bg-white/30",
                        )}
                      />
                    ))}
                  </div>
                </div>

                <h3
                  className={cn(
                    "mt-6 text-[20px] font-bold leading-[1.3]",
                    isFront ? "text-white" : "text-white/90",
                  )}
                >
                  {item.q}
                </h3>

                <p
                  className={cn(
                    "mt-auto text-[17px] leading-[1.5]",
                    isFront ? "text-white/90" : "text-white/80",
                  )}
                >
                  {item.a}
                </p>

                {item.cta && (
                  <Link
                    href={item.cta.href}
                    tabIndex={isFront ? undefined : -1}
                    className={cn(
                      "mt-5 inline-flex w-fit items-center rounded-[10px] px-6 py-3 text-sm font-semibold transition",
                      isFront
                        ? "bg-accent text-white hover:bg-accent-deep"
                        : "bg-white/15 text-white",
                    )}
                  >
                    {item.cta.label}
                  </Link>
                )}
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
