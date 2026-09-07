"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AccountChip } from "@/components/AccountChip";

/**
 * The dashboard's own header.
 *
 * The marketing `Navbar` is not reused here on purpose. That header sells the
 * place — Legends, Programmes, Future, and a login icon — and none of those are
 * what somebody already signed in is looking for. This one is a workspace bar:
 * where you are, and who you are signed in as.
 *
 * The three tabs are **sections of one page**, not routes. Everything a doctor
 * has here fits on a single scroll, and splitting it across three URLs meant a
 * page load to answer "what else is there" — so a tab jumps you down and the
 * scroll position moves the marker back. Smooth scrolling comes from CSS (see
 * `.dash-shell` in globals.css), so a plain anchor does the whole job and this
 * file only has to work out which tab to light.
 *
 * Not every page under `/account` is that page, though. A tool that needs a
 * whole screen gets its own route — `/account/horizon` — and there a bare
 * `#growth-lab` points at nothing. So off `/account` the tabs carry the path
 * with them, and none of them lights: the reader is not in any of the three.
 *
 * The line along the bottom of the bar is how far down the page the reader is.
 * Three tabs say which of three sections they are in; the line says how much of
 * the whole thing is left — the question a single long scroll actually raises.
 */

const SECTIONS = [
  { id: "your-space", label: "Your Space" },
  { id: "growth-lab", label: "Growth Lab" },
  { id: "pathways", label: "Pathways" },
];

export function DashboardNav({ name, email }: { name: string; email: string }) {
  const onDashboard = usePathname() === "/account";
  const scrolledTo = useActiveSection();
  const active = onDashboard ? scrolledTo : null;
  const progress = useScrollProgress();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/[0.07] bg-black/85 backdrop-blur-md">
      <nav
        aria-label="Your dashboard"
        className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-5 py-3 sm:px-8 lg:px-12"
      >
        <Link href="/" aria-label="Legends of Medicine — home" className="shrink-0">
          <Image
            src="/brand/lom-logo-full.png"
            alt="Legends of Medicine"
            width={623}
            height={290}
            priority
            className="h-11 w-auto sm:h-14"
          />
        </Link>

        {/* Desktop tabs. The underline is the active marker, as in the reference —
            a filled pill would compete with the terracotta CTAs below it. */}
        <ul className="hidden items-center gap-10 md:flex lg:gap-16">
          {SECTIONS.map((section) => (
            <li key={section.id}>
              <Tab
                section={section}
                active={active === section.id}
                onDashboard={onDashboard}
              />
            </li>
          ))}
        </ul>

        <AccountChip
          name={name}
          email={email}
          /* Both of these used to leave: "Back to the site" and "Browse
             programmes". The logo above already does the first and the
             Pathways section does the second, and a signed-in doctor is meant
             to have exactly those two ways out — not four. What is left points
             further into their own space. */
          links={[{ href: "/account#applications", label: "Your applications" }]}
        />
      </nav>

      {/* Below the logo on a phone, where three tabs will not fit beside it. */}
      <ul className="flex items-center gap-6 overflow-x-auto border-t border-white/[0.07] px-5 py-2.5 md:hidden">
        {SECTIONS.map((section) => (
          <li key={section.id} className="shrink-0">
            <Tab
              section={section}
              active={active === section.id}
              onDashboard={onDashboard}
              compact
            />
          </li>
        ))}
      </ul>

      {/* The scroll indicator, laid over the bar's own bottom border so it reads
          as that line filling in rather than as a second rule below it. It is
          scaled rather than resized: width would relayout on every frame of a
          scroll, and a transform does not. No transition — the bar is meant to
          be pinned to the reader's finger, and easing it makes it float behind.
          Decorative, so it is hidden from screen readers, which have their own
          sense of position in a document.

          At the top of the page it is nothing at all. A stub sitting there
          before anybody has scrolled reads as progress already made, and the
          one thing this line has to be honest about is how far down the page
          the reader actually is. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -bottom-px h-0.5 origin-left rounded-r-full bg-accent"
        style={{
          transform: `scaleX(${progress})`,
          boxShadow: "0 0 10px rgba(183,90,68,0.7)",
        }}
      />
    </header>
  );
}

function Tab({
  section,
  active,
  onDashboard,
  compact = false,
}: {
  section: (typeof SECTIONS)[number];
  active: boolean;
  /** On `/account` the tabs are in-page jumps; anywhere else they navigate. */
  onDashboard: boolean;
  compact?: boolean;
}) {
  return (
    <a
      href={onDashboard ? `#${section.id}` : `/account#${section.id}`}
      aria-current={active ? "true" : undefined}
      /* The hover is the marketing header's, so the two bars feel like one
         site: the label warms to terracotta rather than just brightening. The
         underline stays the dashboard's own — it marks which section you are
         reading, which is a thing the landing page has no equivalent of. */
      className={`group/tab relative block transition hover:text-accent-soft ${
        compact ? "py-1 text-sm" : "py-1.5 text-[15px]"
      } ${active ? "text-white" : "text-white/55"}`}
    >
      {section.label}
      <span
        aria-hidden
        className={`absolute -bottom-0.5 left-0 h-px w-full rounded-full transition ${
          active ? "bg-accent group-hover/tab:bg-accent-soft" : "bg-transparent"
        }`}
      />
    </a>
  );
}

/**
 * Which section the reader is looking at.
 *
 * A section counts as current once its top has crossed a line near the top of
 * the viewport, and the last one to cross wins — which is what makes the marker
 * move forward as you scroll down and back as you scroll up, without the
 * flicker you get from picking whichever section covers the most pixels.
 *
 * The bottom of the document is special-cased. The last section is often
 * shorter than the viewport, so its top may never reach the line however far
 * you scroll; without this the marker would stick on the middle tab at the very
 * moment the reader can plainly see they are at the end.
 */
function useActiveSection(): string {
  const [active, setActive] = useState(SECTIONS[0].id);

  useEffect(() => {
    let frame = 0;

    const measure = () => {
      frame = 0;

      const atBottom =
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
      if (atBottom) {
        setActive(SECTIONS[SECTIONS.length - 1].id);
        return;
      }

      const line = window.innerHeight * 0.3;
      let current = SECTIONS[0].id;
      for (const section of SECTIONS) {
        const node = document.getElementById(section.id);
        if (node && node.getBoundingClientRect().top <= line) current = section.id;
      }
      setActive(current);
    };

    // Scroll fires far more often than the screen repaints, so the reads are
    // deferred to the next frame rather than run on every event.
    const schedule = () => {
      if (frame === 0) frame = window.requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, []);

  return active;
}

/**
 * How far down the page the reader is, as 0 to 1.
 *
 * The denominator is the scrollable distance, not the document height — a page
 * one viewport tall has nowhere to scroll, and dividing by its height would
 * leave the line stuck at zero on a page that is already fully read. Those
 * pages report 1 instead, so the bar sits full rather than empty on a short
 * route like `/account/horizon` before anybody touches the wheel.
 *
 * Reads are deferred to the next frame for the same reason as the section
 * marker above: scroll fires far more often than the screen repaints. The value
 * is rounded to three places so a hundred imperceptible frames do not each cost
 * a React render.
 */
function useScrollProgress(): number {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let frame = 0;

    const measure = () => {
      frame = 0;
      const doc = document.documentElement;
      const scrollable = doc.scrollHeight - window.innerHeight;
      const ratio = scrollable > 0 ? window.scrollY / scrollable : 1;
      setProgress(Math.round(Math.min(Math.max(ratio, 0), 1) * 1000) / 1000);
    };

    const schedule = () => {
      if (frame === 0) frame = window.requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);

    // The page grows and shrinks under the reader — panes load, the outlook
    // pane fills in — and each of those changes the distance the bar is a
    // fraction of. Without this the line would be measured against a page
    // length that no longer exists until the next scroll event corrected it.
    const observer = new ResizeObserver(schedule);
    observer.observe(document.body);

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, []);

  return progress;
}
