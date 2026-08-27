"use client";

import { useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import type { CourseModule } from "@/types";

/** Rows shown before the fade cuts the list off. Figma shows one open card and
 *  four closed ones under it, with the sixth disappearing into the gradient. */
const VISIBLE = 5;

type Item = CourseModule & {
  /** Summary rows (outcomes, curriculum) carry a tick instead of a number, so
   *  the 01/02/03 sequence stays a count of teaching modules. */
  badge?: "check";
  /** Heading above the checklist. Defaults to the per-module wording. */
  outcomesLabel?: string;
};

export function CourseRoadmap({
  items,
  title = "The Roadmap",
  subtitle = "A structured journey from foundational knowledge to surgical confidence.",
}: {
  items: Item[];
  title?: string;
  subtitle?: string;
}) {
  // Figma opens the first module on arrival. Only do that when it has outcomes
  // to reveal — auto-opening a row further down would park the expanded card
  // under the Read More fade, where nobody can read it.
  const [openIndex, setOpenIndex] = useState<number | null>(
    items[0]?.outcomes.length ? 0 : null,
  );
  const [showAll, setShowAll] = useState(false);

  if (items.length === 0) return null;

  const collapsible = items.length > VISIBLE;
  const collapsed = collapsible && !showAll;
  const rows = collapsed ? items.slice(0, VISIBLE) : items;

  // Modules are numbered; the trailing summary rows are not, so the counter
  // runs independently of the loop index.
  let moduleNo = 0;

  return (
    <section
      aria-labelledby="roadmap-title"
      className="mx-auto max-w-[1440px] px-5 py-16 sm:px-10 sm:py-24 lg:px-[120px]"
    >
      <h2
        id="roadmap-title"
        className="text-[clamp(1.75rem,3.4vw,2.875rem)] font-extrabold leading-tight tracking-[-0.015em] text-white"
      >
        {title}
      </h2>
      <p className="mt-3 max-w-[420px] text-[15px] font-semibold leading-[1.45] text-[#A5A5A5]">
        {subtitle}
      </p>

      <div className="relative mt-10 sm:mt-14">
        <ul className="flex flex-col gap-[18px]">
          {rows.map((item, i) => {
            const expandable = item.outcomes.length > 0;
            const open = expandable && openIndex === i;
            const isCheck = item.badge === "check";
            if (!isCheck) moduleNo += 1;
            const label = isCheck ? null : String(moduleNo).padStart(2, "0");
            const panelId = `roadmap-panel-${i}`;
            const buttonId = `roadmap-button-${i}`;

            const head = (
              <>
                <span
                  aria-hidden
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-base font-semibold text-white sm:h-[49px] sm:w-[49px] sm:text-lg"
                >
                  {isCheck ? <Check className="h-5 w-5" /> : label}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block text-lg font-semibold leading-snug text-white sm:text-2xl">
                    {item.title}
                  </span>
                  {item.description && (
                    <span
                      className={`mt-2 block text-sm leading-[1.6] tracking-[0.01em] text-[#A5A5A5] sm:text-[15px] ${
                        open || !expandable ? "" : "line-clamp-1"
                      }`}
                    >
                      {item.description}
                    </span>
                  )}
                </span>

                {/* Only rows that hide something get a disclosure control. */}
                {expandable && (
                  <span
                    aria-hidden
                    className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/50 text-white transition-transform duration-300 ${
                      open ? "rotate-180" : ""
                    }`}
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </span>
                )}
              </>
            );

            const headCls =
              "flex w-full items-center gap-4 px-5 py-5 text-left sm:gap-[22px] sm:px-6 sm:py-6";

            return (
              <li
                key={`${item.title}-${i}`}
                /* Open rows lift to #1D1D1D; closed ones sit a shade back at
                   #1A1A1A so the expanded card reads as the active one. */
                className={`rounded-[12px] border-[1.5px] border-ink-700 transition-colors ${
                  open ? "bg-ink-800" : "bg-[#1A1A1A]"
                }`}
              >
                <h3>
                  {expandable ? (
                    <button
                      type="button"
                      id={buttonId}
                      aria-expanded={open}
                      aria-controls={panelId}
                      onClick={() => setOpenIndex(open ? null : i)}
                      className={headCls}
                    >
                      {head}
                    </button>
                  ) : (
                    <span className={headCls}>{head}</span>
                  )}
                </h3>

                {expandable && (
                  <div
                    id={panelId}
                    role="region"
                    aria-labelledby={buttonId}
                    className={`grid overflow-hidden transition-[grid-template-rows] duration-500 ease-out ${
                      open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                    }`}
                  >
                    <div className="min-h-0">
                      <div className="px-5 pb-6 sm:pl-[95px] sm:pr-6">
                        <p className="text-sm text-[#A5A5A5] sm:text-[15px]">
                          {item.outcomesLabel ??
                            "By the end of this module, you'll be able to"}
                        </p>
                        <ul className="mt-4 flex flex-col gap-3">
                          {item.outcomes.map((o, j) => (
                            <li
                              key={`${o}-${j}`}
                              className="flex items-center gap-4 rounded-lg border border-[#4A4A4A] bg-ink-600 px-4 py-3 text-sm leading-snug text-white sm:min-h-12 sm:px-[25px] sm:py-2.5"
                            >
                              <Check
                                aria-hidden
                                className="h-4 w-4 shrink-0 text-white"
                              />
                              {o}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>

        {/* The tail fades into the page rather than stopping on a hard edge,
            and the Read More slab sits in that fade the way Figma has it. */}
        {collapsed && (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-[280px] rounded-b-[12px] bg-[linear-gradient(to_top,#000_0%,#000_5.8%,rgba(0,0,0,0.5)_42.3%,rgba(76,76,76,0.07)_68.75%,rgba(255,255,255,0)_100%)]"
          />
        )}

        {collapsible && (
          <div
            className={
              collapsed
                ? "absolute inset-x-0 bottom-[30px] z-10 flex justify-center"
                : "mt-8 flex justify-center"
            }
          >
            <button
              type="button"
              onClick={() => setShowAll((v) => !v)}
              className="inline-flex h-12 items-center gap-2.5 rounded-[12px] bg-accent px-6 text-sm font-medium text-white transition hover:bg-accent-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-ink-950"
            >
              {showAll ? "Show Less" : "Read More"}
              <span
                aria-hidden
                className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-white/60"
              >
                <ChevronDown
                  className={`h-3 w-3 transition-transform duration-300 ${
                    showAll ? "rotate-180" : ""
                  }`}
                />
              </span>
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
