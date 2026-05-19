"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import type { CourseFaq } from "@/types";

export function CourseFaqList({ items }: { items: CourseFaq[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  if (!items.length) return null;

  return (
    <ul className="divide-y divide-white/5 overflow-hidden rounded-2xl border border-white/10 bg-[#0a0a0d]">
      {items.map((item, i) => {
        const open = openIndex === i;
        const panelId = `course-faq-panel-${i}`;
        const buttonId = `course-faq-button-${i}`;
        return (
          <li key={`${item.question}-${i}`}>
            <button
              type="button"
              id={buttonId}
              aria-expanded={open}
              aria-controls={panelId}
              onClick={() => setOpenIndex(open ? null : i)}
              className="flex w-full items-center justify-between gap-6 px-5 py-5 text-left transition hover:bg-white/[0.02] sm:px-7 sm:py-6"
            >
              <span className="font-serif text-base leading-snug text-white sm:text-lg">
                {item.question}
              </span>
              <span
                aria-hidden
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/15 text-white/80 transition-transform duration-300 ${
                  open ? "rotate-45 border-accent text-accent-soft" : ""
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
                <p className="whitespace-pre-line px-5 pb-6 text-sm leading-relaxed text-white/70 sm:px-7 sm:pb-7 sm:text-[15px]">
                  {item.answer}
                </p>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
