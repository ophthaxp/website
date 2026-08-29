"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { FaqGrid, type FaqItem } from "@/components/FaqGrid";

/**
 * Every question the home page answers, in one flat list. `tag` is both the
 * chip on the card and what the category filter matches on, so the two can
 * never drift apart.
 */
const FAQS: FaqItem[] = [
  {
    tag: "General",
    q: "What is Legends of Medicine?",
    a: "Legends of Medicine is a premium platform where healthcare professionals learn directly from world-renowned medical legends.",
  },
  {
    tag: "General",
    q: "Who is Legends of Medicine designed for?",
    a: "Legends of Medicine is designed for healthcare professionals seeking advanced clinical expertise through live mentorship from world-renowned Legends.",
  },
  {
    tag: "General",
    q: "How many Mentors are currently on the Platform?",
    a: "We currently feature 10 world-renowned Legends, each bringing exceptional expertise, mentorship, and real-world clinical experience to every program.",
  },
  {
    tag: "General",
    q: "What makes us different?",
    a: "Our live, Legend-led programs provide direct access to renowned clinicians, delivering practical learning beyond traditional online courses.",
  },
  {
    tag: "Cohorts & Admission",
    q: "How are the cohorts structured?",
    a: "Each cohort runs for a fixed duration with a published schedule of live mentor sessions, recorded modules, OR breakdowns and 1:1 office hours.",
  },
  {
    tag: "Cohorts & Admission",
    q: "Is the curriculum live or pre-recorded?",
    a: "It is hybrid. Foundational modules are recorded so you can move at your own pace, while case clinics and Q&A are live with the mentor — and recorded for your library.",
  },
  {
    tag: "Cohorts & Admission",
    q: "How do I apply to a cohort?",
    a: "Apply from any program page. Our team reviews every application and responds within 48 hours, usually with a discovery call scheduled with the Legend.",
  },
  {
    tag: "Cohorts & Admission",
    q: "Will I receive a certificate?",
    a: "Yes — on successful completion you receive a verifiable Legends of Medicine certificate co-signed by the mentor.",
  },
  {
    tag: "Pricing & Access",
    q: "What does the program cost?",
    a: "Tuition varies by mentor and program length and is shown on each program page. Need-based and merit scholarships are available on application.",
  },
  {
    tag: "Pricing & Access",
    q: "Do you offer EMI or refunds?",
    a: "Yes. Most programs support 3, 6 and 12-month EMI through partnered lenders, plus a 7-day full refund window from the cohort start.",
  },
  {
    tag: "Pricing & Access",
    q: "How long do I keep access?",
    a: "Recorded modules, live-session replays and the case library stay available to you well past the cohort — you can revisit them whenever a case calls for it.",
  },
];

/** Closes out every tab, so the way to a human is never a tab away. */
const CONTACT_PROMPT: FaqItem = {
  tag: "Support",
  q: "Still have questions?",
  a: "Contact our support team and we will make sure everything is clear and intuitive for you!",
  cta: { label: "Contact Support", href: "/contact" },
  isPrompt: true,
};

/** "All" leads, so the first thing a visitor sees is the whole set. */
const TABS = ["All", "General", "Cohorts & Admission", "Pricing & Access"];

export function FaqSection() {
  const [tab, setTab] = useState(TABS[0]);

  const shown =
    tab === "All" ? FAQS : FAQS.filter((f) => f.tag === tab);

  return (
    <section
      aria-labelledby="faq-title"
      className="mx-auto max-w-[1440px] px-5 py-12 sm:px-10 sm:py-14 lg:px-[120px]"
    >
      <h2
        id="faq-title"
        className="text-center text-[clamp(1.75rem,3.1vw,2.6rem)] font-extrabold leading-tight tracking-[-0.015em] text-white"
      >
        Frequently asked questions
      </h2>

      <p className="mx-auto mt-4 max-w-[560px] text-center text-[15px] leading-relaxed text-white/50">
        Pick a question to see its answer.
      </p>

      <div
        role="tablist"
        aria-label="FAQ categories"
        className="mt-8 flex flex-wrap justify-center gap-3"
      >
        {TABS.map((t) => {
          const selected = t === tab;
          return (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setTab(t)}
              className={cn(
                "rounded-[10px] px-6 py-3 text-[15px] transition sm:px-7 sm:py-3.5",
                selected
                  ? "bg-accent font-medium text-white"
                  : "bg-ink-800 text-white/60 hover:bg-ink-700 hover:text-white",
              )}
            >
              {t}
              {t === "All" && (
                <span className="ml-2 text-[13px] opacity-60">{FAQS.length}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Remounting on the tab sends the grid back to the question list, so a
          filter change never leaves last tab's answer sitting open. */}
      <div className="mt-10 sm:mt-12">
        <FaqGrid
          key={tab}
          items={[...shown, CONTACT_PROMPT]}
          label="Legends of Medicine"
        />
      </div>
    </section>
  );
}
