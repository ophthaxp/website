"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The shared furniture for the two index pages — /programs and /doctors.
 *
 * Everything here is built from the landing page's vocabulary rather than a
 * new one, so arriving from the home rail feels like staying in the same room:
 * Anton for the page title with one word in terracotta, the section container
 * and rhythm of every home section, the specialty tabs from the programs rail
 * (cyan when chosen), and the rail's own portrait card — 306×482, flat ink
 * ground, bottom scrim, serif name over a hairline.
 */

/* ─────────────────────────── masthead ─────────────────────────── */

export interface CatalogStat {
  value: string | number;
  label: string;
}

/**
 * Page masthead, built like the hero rather than like a document heading:
 * Anton, uppercase, one word carrying the terracotta, centred over the
 * terracotta wash the hero and FAQ already sit on.
 */
export function CatalogHero({
  titleLead,
  titleAccent,
  subtitle,
  stats = [],
}: {
  titleLead: string;
  titleAccent: string;
  subtitle: string;
  stats?: CatalogStat[];
}) {
  return (
    <section className="relative isolate overflow-hidden bg-black">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-32 h-[440px] bg-radial-fade"
      />

      <div className="relative mx-auto max-w-[1440px] px-5 pb-10 pt-12 text-center sm:px-10 sm:pb-12 sm:pt-16 lg:px-[120px]">
        <h1 className="animate-fadeUp font-display text-[clamp(2.25rem,5vw,4rem)] uppercase leading-[0.98] tracking-[-0.01em] text-white">
          {titleLead} <span className="text-accent">{titleAccent}</span>
        </h1>

        <p className="animate-fadeUp mx-auto mt-5 max-w-[46rem] text-sm leading-relaxed text-white/45 [animation-delay:120ms] sm:text-[15px]">
          {subtitle}
        </p>

        {stats.length > 0 && (
          <dl className="animate-fadeUp mt-9 flex flex-wrap items-center justify-center gap-x-10 gap-y-5 [animation-delay:200ms] sm:gap-x-16">
            {stats.map((s) => (
              <div key={s.label} className="flex flex-col items-center gap-1.5">
                <dd className="font-display text-[28px] leading-none text-white">
                  {s.value}
                </dd>
                <dt className="text-[11px] uppercase tracking-[0.18em] text-white/35">
                  {s.label}
                </dt>
              </div>
            ))}
          </dl>
        )}
      </div>
    </section>
  );
}

/* ─────────────────────────── filters ─────────────────────────── */

/**
 * One filter tab, exactly the programs rail's: flat ink when idle, cyan
 * outline when chosen. Cyan is this site's "you picked this" colour and is
 * used for nothing else, so a filtered list is legible at a glance.
 */
export function FilterChip({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      onClick={onClick}
      className={cn(
        "inline-flex items-center rounded-[10px] border px-5 py-3 text-[15px] leading-none transition",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-spark/50",
        selected
          ? "border-spark bg-transparent font-medium text-spark"
          : "border-transparent bg-ink-800 text-white/70 hover:bg-ink-700 hover:text-white",
      )}
    >
      {children}
    </button>
  );
}

/** Search field on the same ink ground as the tabs beside it. */
export function SearchField({
  id,
  value,
  onChange,
  placeholder,
  label,
  className,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  label: string;
  className?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <Search
        aria-hidden
        className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-white/35"
      />
      <input
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-[46px] w-full rounded-[10px] border border-transparent bg-ink-800 pl-11 pr-10 text-[15px] text-white placeholder-white/35 transition hover:bg-ink-700 focus:border-accent focus:bg-ink-800 focus:outline-none"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Clear search"
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-white/40 transition hover:bg-white/10 hover:text-white"
        >
          <X className="h-3.5 w-3.5" aria-hidden />
        </button>
      )}
    </div>
  );
}

/** The count line, and the way back out of a filtered list. */
export function ResultCount({
  shown,
  total,
  noun,
  onReset,
  filtered,
}: {
  shown: number;
  total: number;
  noun: string;
  onReset: () => void;
  filtered: boolean;
}) {
  return (
    <div className="flex items-center gap-4 text-[13px] text-white/40">
      <span>
        <span className="font-semibold text-white">{shown}</span>
        {filtered ? ` of ${total}` : ""} {noun}
      </span>
      {filtered && (
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-1.5 text-[13px] text-white/50 underline-offset-4 transition hover:text-accent-soft hover:underline"
        >
          <X className="h-3 w-3" aria-hidden />
          Clear
        </button>
      )}
    </div>
  );
}

/* ─────────────────────────── card ─────────────────────────── */

export interface CatalogCardProps {
  href: string;
  imageUrl?: string | null;
  imageAlt: string;
  title: string;
  /** The credit under the hairline — "with Dr …", or a mentor's own title. */
  credit?: string | null;
  /** Dot-separated facts under the credit. */
  meta?: (string | null | undefined)[];
  isNew?: boolean;
  /** Top-right pill — a launch month, years of experience, anything short. */
  tag?: string | null;
  cta: string;
  /** Programs carry arbitrary CMS image hosts, so they opt out of next/image. */
  rawImage?: boolean;
  priority?: boolean;
}

/**
 * One catalogue card — the home rail's card, standing still in a grid.
 *
 * The rail already solved this: one portrait, everything printed over the foot
 * of it, nothing stacked underneath. Keeping that means a reader who taps
 * "Explore Programs" on the home page lands among the same objects they were
 * just scrolling, and the grid stays flush because the card's height is the
 * portrait's, not the text's.
 */
export function CatalogCard({
  href,
  imageUrl,
  imageAlt,
  title,
  credit,
  meta = [],
  isNew,
  tag,
  cta,
  rawImage = false,
  priority = false,
}: CatalogCardProps) {
  const metaLine = meta.filter(Boolean).join(" · ");

  return (
    <Link
      href={href}
      className="group relative aspect-[306/482] overflow-hidden rounded-xl border border-white/15 bg-ink-850 transition duration-300 hover:-translate-y-1 hover:border-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-black"
    >
      {imageUrl ? (
        rawImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={imageAlt}
            loading={priority ? "eager" : "lazy"}
            className="absolute inset-0 h-full w-full object-cover object-top transition duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <Image
            src={imageUrl}
            alt={imageAlt}
            fill
            priority={priority}
            sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, (max-width: 1280px) 30vw, 23vw"
            className="object-cover object-top transition duration-500 group-hover:scale-[1.04]"
          />
        )
      ) : (
        /* No portrait: the initial, cut large and nearly out of sight, so the
           gap reads as a designed panel rather than a broken image. */
        <div
          aria-hidden
          className="absolute inset-0 flex items-center justify-center bg-[linear-gradient(160deg,#2A2A2A_0%,#000000_100%)]"
        >
          <span className="font-display text-[8rem] leading-none text-white/[0.06]">
            {title.trim().charAt(0).toUpperCase()}
          </span>
        </div>
      )}

      {/* Bottom-up scrim, so the title holds over any portrait. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-3/5 bg-[linear-gradient(to_top,rgba(0,0,0,0.95)_0%,rgba(0,0,0,0.72)_38%,rgba(0,0,0,0)_100%)]"
      />

      {isNew && (
        <span className="absolute left-3 top-3 z-10 rounded-full bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-black">
          New
        </span>
      )}
      {tag && (
        <span className="absolute right-3 top-3 z-10 rounded-full bg-black/55 px-3 py-1 text-[11px] font-medium text-white/85 backdrop-blur-md">
          {tag}
        </span>
      )}

      <div className="absolute inset-x-0 bottom-0 px-5 pb-6 pt-12 text-center">
        <p className="line-clamp-2 font-serif text-[24px] font-medium leading-[1.12] text-white">
          {title}
        </p>
        <span
          aria-hidden
          className="mx-auto mt-3 block h-px w-5 bg-white/70 transition-all duration-300 group-hover:w-10"
        />
        {credit && (
          <p className="mt-3 line-clamp-1 text-[13px] text-white/70">{credit}</p>
        )}
        {metaLine && (
          <p className="mt-1.5 line-clamp-1 text-[12px] text-white/45">{metaLine}</p>
        )}
        <span className="mt-4 inline-flex items-center gap-1.5 text-[12px] font-semibold text-accent-soft">
          {cta}
          <ArrowRight
            aria-hidden
            className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1"
          />
        </span>
      </div>
    </Link>
  );
}

/* ─────────────────────────── empty ─────────────────────────── */

export function CatalogEmpty({
  title,
  body,
  actionLabel,
  onAction,
}: {
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="rounded-xl border border-dashed border-white/15 bg-ink-850 px-6 py-16 text-center">
      <p className="font-serif text-[22px] text-white">{title}</p>
      <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-white/45">{body}</p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-7 rounded-[10px] bg-accent px-7 py-3.5 text-[15px] font-semibold text-white transition hover:bg-accent-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-black"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

/** The grid both pages hang their cards in — the rail's card width, wrapped. */
export function CatalogGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {children}
    </div>
  );
}
