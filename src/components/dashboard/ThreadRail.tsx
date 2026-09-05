"use client";

import { useRef } from "react";
import { ArrowRight } from "lucide-react";
import { THREAD, threadNumber } from "./thread";

/**
 * The thread down the left of Your Space: the four tools, numbered, with a line
 * running through them.
 *
 * The line is the point. Presented as a grid of tiles these read as four
 * unrelated features; strung together they read as one path with a place you
 * are currently standing on.
 *
 * They are tabs, not links. Each one swaps the pane beside it, so moving
 * between the four costs nothing and the doctor never loses their place — which
 * matters most for the first, where a half-configured calculator would be
 * thrown away by a navigation.
 */
export function ThreadRail({
  active,
  onSelect,
}: {
  active: string;
  onSelect: (key: string) => void;
}) {
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);

  /* A tablist is one tab stop, and the arrows move within it. Up and down
     because this list runs down the page; Home and End for the ends of it. */
  const onKeyDown = (event: React.KeyboardEvent, index: number) => {
    const last = THREAD.length - 1;
    let next: number | null = null;
    if (event.key === "ArrowDown") next = index === last ? 0 : index + 1;
    else if (event.key === "ArrowUp") next = index === 0 ? last : index - 1;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = last;
    if (next === null) return;

    event.preventDefault();
    onSelect(THREAD[next].key);
    tabs.current[next]?.focus();
  };

  return (
    <div className="p-5 sm:p-7">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/40">
        Your LoM thread
      </p>
      <p className="mt-1.5 text-sm text-white/45">Where you are in it</p>

      <div
        role="tablist"
        aria-label="Your LoM thread"
        aria-orientation="vertical"
        className="mt-6"
      >
        {THREAD.map((item, index) => {
          const selected = item.key === active;
          const Icon = item.icon;
          const last = index === THREAD.length - 1;

          return (
            <div key={item.key} className="relative flex gap-4">
              {/* The connector, drawn behind the icons and stopped before the
                  last one so the thread ends rather than trailing off. */}
              {!last ? (
                <span
                  aria-hidden
                  className="absolute left-[19px] top-10 h-[calc(100%-16px)] w-px bg-white/10"
                />
              ) : null}

              <span
                aria-hidden
                className={`relative z-10 mt-3 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ring-1 transition ${
                  selected
                    ? "bg-accent/20 text-accent-soft ring-accent/40"
                    : "bg-ink-850 text-white/45 ring-white/10"
                }`}
              >
                <Icon className="h-[18px] w-[18px]" strokeWidth={1.6} />
              </span>

              <button
                type="button"
                role="tab"
                id={`thread-tab-${item.key}`}
                aria-selected={selected}
                aria-controls={`thread-pane-${item.key}`}
                tabIndex={selected ? 0 : -1}
                ref={(node) => {
                  tabs.current[index] = node;
                }}
                onClick={() => onSelect(item.key)}
                onKeyDown={(event) => onKeyDown(event, index)}
                className={`group -mx-2 mb-1 flex min-w-0 flex-1 items-start gap-3 rounded-xl px-3 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 ${
                  selected
                    ? "bg-gradient-to-r from-accent/[0.14] to-transparent ring-1 ring-accent/25"
                    : "hover:bg-white/[0.03]"
                }`}
              >
                <span className="min-w-0 flex-1">
                  <span
                    className={`block text-[10px] font-semibold uppercase tracking-[0.16em] ${
                      selected ? "text-accent-soft" : "text-white/35"
                    }`}
                  >
                    {threadNumber(index)} · {item.eyebrow}
                  </span>
                  <span className="mt-1 block truncate font-serif text-lg text-white">
                    {item.name}
                    {item.attribution ? (
                      <span className="ml-1.5 font-sans text-xs italic text-white/45">
                        {item.attribution}
                      </span>
                    ) : null}
                  </span>
                  <span className="mt-0.5 block text-xs text-white/45">{item.status}</span>
                </span>

                <ArrowRight
                  aria-hidden
                  className={`mt-1 h-4 w-4 shrink-0 transition group-hover:translate-x-0.5 ${
                    selected ? "text-accent-soft" : "text-white/25 group-hover:text-white/50"
                  }`}
                />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
