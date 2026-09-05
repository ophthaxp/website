import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { ThreadItem } from "./thread";

/**
 * The frame every Your Space pane sits in.
 *
 * Four panes that each invented their own header would read as four products
 * bolted together. One frame — label, title, state, a rule, the body, and one
 * thing to do at the bottom — is what makes switching tabs feel like turning a
 * page rather than opening an app.
 */
export function PaneShell({
  eyebrow,
  meta,
  title,
  attribution,
  pill,
  intro,
  children,
  footnote,
  cta,
}: {
  eyebrow: string;
  /** The quiet second half of the label — "· generated 28 August". */
  meta?: string;
  title: string;
  attribution?: string;
  pill?: { label: string; tone: "ready" | "quiet" };
  intro?: string;
  children: React.ReactNode;
  footnote?: string;
  cta?: { label: string; href: string };
}) {
  return (
    <div className="flex h-full flex-col p-5 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/40">
            {eyebrow}
            {meta ? <span className="text-white/25"> · {meta}</span> : null}
          </p>
          <h3 className="mt-2.5 font-serif text-3xl leading-tight text-white sm:text-[2.6rem]">
            {title}
            {attribution ? (
              <span className="ml-2.5 font-serif text-xl italic text-white/45">
                {attribution}
              </span>
            ) : null}
          </h3>
          {intro ? (
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/45">{intro}</p>
          ) : null}
        </div>

        {pill ? (
          <span
            className={`inline-flex shrink-0 items-center gap-2 rounded-full px-3.5 py-2 text-xs font-medium ring-1 ${
              pill.tone === "ready"
                ? "bg-emerald-500/[0.08] text-emerald-300/90 ring-emerald-400/25"
                : "bg-white/[0.04] text-white/50 ring-white/[0.12]"
            }`}
          >
            <span
              aria-hidden
              className={`h-1.5 w-1.5 rounded-full ${
                pill.tone === "ready" ? "bg-emerald-400" : "bg-white/35"
              }`}
            />
            {pill.label}
          </span>
        ) : null}
      </div>

      <hr className="mt-6 border-white/[0.07]" />

      <div className="mt-6 flex-1">{children}</div>

      {footnote || cta ? (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
          <p className="text-sm text-white/45">{footnote}</p>
          {cta ? (
            <Link
              href={cta.href}
              className="group inline-flex shrink-0 items-center gap-2.5 rounded-full bg-accent px-6 py-3.5 text-[15px] font-semibold text-white transition hover:bg-accent-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-black"
            >
              {cta.label}
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden />
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/**
 * A tool that is not built yet.
 *
 * It gets a pane rather than being left off the thread, because the thread is
 * the promise of what this place will be and a doctor should be able to see the
 * whole of it. What it does not get is invented state — no "last asked two days
 * ago", no level, no streak. The moment one number here is decoration, none of
 * the numbers on the other panes can be trusted either, and those are real
 * catchments and real money.
 */
export function ComingSoonPane({ item }: { item: ThreadItem }) {
  return (
    <PaneShell
      eyebrow={item.eyebrow}
      title={item.name}
      attribution={item.attribution}
      pill={{ label: "Coming soon", tone: "quiet" }}
      footnote="We will tell you the moment it opens."
    >
      <div className="flex h-full min-h-[280px] flex-col items-center justify-center rounded-2xl border border-dashed border-white/12 bg-white/[0.02] px-6 py-14 text-center">
        <p className="max-w-md font-serif text-xl leading-snug text-white/85">{item.blurb}</p>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-white/45">
          It is being built now. Nothing to see here yet — and nothing made up to fill the space.
        </p>
      </div>
    </PaneShell>
  );
}
