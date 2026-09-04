import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { ThreadItem } from "./thread";

/**
 * One tool, as a card in the Growth Lab.
 *
 * The name is set large and the description small on purpose: these are three
 * things a doctor is meant to recognise at a glance and pick between, not three
 * paragraphs to read. The glow behind each one is the same terracotta the rest
 * of the site uses to mean "this is ours" — a card without it would read as
 * borrowed chrome.
 *
 * A tool that is not finished still gets a card. Leaving it out until launch
 * means nobody knows it is coming; drawing it with an invented state would mean
 * they cannot trust the states on the cards either side of it. So it is shown,
 * and plainly labelled as not ready.
 */
export function ToolCard({ item }: { item: ThreadItem }) {
  const Icon = item.icon;

  const body = (
    <>
      {/* The bloom sits low and right, clipped by the card, so the corner it
          lights is the one the eye finishes on. */}
      <span
        aria-hidden
        className="pointer-events-none absolute -bottom-24 -right-16 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(183,90,68,0.22),rgba(183,90,68,0)_68%)] opacity-80 transition duration-500 group-hover:opacity-100"
      />

      <div className="relative flex items-start justify-between gap-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">
          {item.eyebrow}
        </p>
        <Icon className="h-[18px] w-[18px] shrink-0 text-white/35" strokeWidth={1.6} aria-hidden />
      </div>

      <div className="relative mt-auto pt-14">
        <h2 className="font-serif text-[clamp(2rem,3.4vw,2.9rem)] leading-[1.05] text-white">
          {item.name}
        </h2>
        {item.attribution ? (
          <p className="mt-1 font-serif text-xl italic text-white/45">{item.attribution}</p>
        ) : null}
        <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/55">{item.blurb}</p>
      </div>

      <div className="relative mt-8 flex items-center justify-between gap-4 border-t border-white/[0.09] pt-4">
        {/* A card that is not open says so once, in the chip. Repeating the
            same two words on the left of the same row reads as a mistake. */}
        {item.comingSoon ? <span /> : <span className="text-sm text-white/45">{item.status}</span>}
        {item.comingSoon ? (
          <span className="rounded-full bg-white/[0.05] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/45 ring-1 ring-white/10">
            Coming soon
          </span>
        ) : (
          <ArrowRight
            className="h-4 w-4 shrink-0 text-accent transition group-hover:translate-x-0.5"
            aria-hidden
          />
        )}
      </div>
    </>
  );

  const shell =
    "group relative flex min-h-[420px] flex-col overflow-hidden rounded-[22px] bg-ink-900/70 p-6 ring-1 ring-white/[0.08] sm:p-8";

  if (item.comingSoon) {
    return <div className={shell}>{body}</div>;
  }

  return (
    <Link
      href={item.href}
      className={`${shell} transition hover:ring-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60`}
    >
      {body}
    </Link>
  );
}
