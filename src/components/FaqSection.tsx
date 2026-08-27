"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { FaqDeck, type FaqItem } from "@/components/FaqDeck";

const CATEGORIES: { key: string; label: string; items: FaqItem[] }[] = [
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

export function FaqSection() {
  const [catIndex, setCatIndex] = useState(0);
  const category = CATEGORIES[catIndex];

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
              onClick={() => setCatIndex(i)}
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

      {/* Remounting on the category key sends the deck back to its first card
          and closes whatever answer was open. */}
      <div className="mt-14 sm:mt-20">
        <FaqDeck key={category.key} items={category.items} label={category.label} />
      </div>
    </section>
  );
}
