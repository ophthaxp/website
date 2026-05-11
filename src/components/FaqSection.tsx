"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

const FAQS: { q: string; a: string }[] = [
  {
    q: "What is OphthaXP?",
    a: "OphthaXP is a mentor-led learning platform built specifically for ophthalmologists. Each program is taught by a senior surgeon — covering clinical reasoning, advanced surgical decision-making and the business of running a modern specialty practice. Cohorts are small, intentional and outcome-focused.",
  },
  {
    q: "Who is OphthaXP designed for?",
    a: "Practising ophthalmologists, fellows, DNB residents and clinic owners who want to move beyond textbook protocols. Whether you are sharpening a sub-specialty (cornea, glaucoma, retina, paediatric, oculoplasty) or scaling a practice, there is a track for your stage of career.",
  },
  {
    q: "How are the cohorts structured?",
    a: "Each cohort runs for a fixed duration with a published schedule of live mentor sessions, recorded modules, OR breakdowns and 1:1 office hours. You also get private community access for case discussion with peers and the mentor between sessions.",
  },
  {
    q: "Is the curriculum live or pre-recorded?",
    a: "It is hybrid. Foundational modules are recorded so you can move at your own pace, while case clinics, surgical breakdowns and Q&A are live with the mentor. Every live session is recorded and added to your library.",
  },
  {
    q: "Will I receive a certificate?",
    a: "Yes — on successful completion you receive a verifiable OphthaXP certificate co-signed by the mentor. Several programs are also recognised toward continuing medical education credits, depending on your council.",
  },
  {
    q: "What does the program cost? Are scholarships available?",
    a: "Tuition varies by mentor and program length and is shown on each course page. Need-based and merit scholarships are available — apply through the program page and our team will respond within 48 hours with an outcome.",
  },
  {
    q: "Do you offer EMI or refunds?",
    a: "Yes. Most programs support 3, 6 and 12-month EMI through partnered lenders. We also offer a 7-day full refund window from the cohort start, no questions asked.",
  },
  {
    q: "How is OphthaXP different from a typical online course?",
    a: "You learn from the surgeon, not a slide deck. Our mentors review your real cases, share unedited operating-room footage, and stay engaged through the cohort. The goal is measurable change in your clinical confidence and practice outcomes — not just a completion certificate.",
  },
];

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section
      aria-labelledby="faq-title"
      className="mx-auto max-w-4xl px-5 py-16 sm:px-8 sm:py-24"
    >
      <div className="text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[#a88251]">
          FAQ
        </p>
        <h2
          id="faq-title"
          className="mt-3 font-serif text-3xl leading-[1.15] sm:text-[44px]"
        >
          Frequently asked questions
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-white/55">
          Everything you need to know before joining a cohort. Still curious? Ask
          the OphthaXP Mentor Bot above or apply to any program for a 1:1 call.
        </p>
      </div>

      <ul className="mt-12 divide-y divide-white/5 overflow-hidden rounded-2xl border border-white/10 bg-[#0a0a0d]">
        {FAQS.map((item, i) => {
          const open = openIndex === i;
          const panelId = `faq-panel-${i}`;
          const buttonId = `faq-button-${i}`;
          return (
            <li key={item.q}>
              <button
                type="button"
                id={buttonId}
                aria-expanded={open}
                aria-controls={panelId}
                onClick={() => setOpenIndex(open ? null : i)}
                className="flex w-full items-center justify-between gap-6 px-5 py-5 text-left transition hover:bg-white/[0.02] sm:px-7 sm:py-6"
              >
                <span className="font-serif text-base leading-snug text-white sm:text-lg">
                  {item.q}
                </span>
                <span
                  aria-hidden
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/15 text-white/80 transition-transform duration-300 ${
                    open ? "rotate-45 border-[#a88251] text-[#a88251]" : ""
                  }`}
                >
                  <Plus className="h-4 w-4" />
                </span>
              </button>
              <div
                id={panelId}
                role="region"
                aria-labelledby={buttonId}
                className={`grid overflow-hidden transition-[grid-template-rows] duration-500 ease-out ${
                  open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                }`}
              >
                <div className="min-h-0">
                  <p className="px-5 pb-6 text-sm leading-relaxed text-white/70 sm:px-7 sm:pb-7 sm:text-[15px]">
                    {item.a}
                  </p>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
