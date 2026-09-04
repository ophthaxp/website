"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AccountChip } from "@/components/AccountChip";

/**
 * The dashboard's own header.
 *
 * The marketing `Navbar` is not reused here on purpose. That header sells the
 * place — Legends, Programs, Future, and a login icon — and none of those are
 * what somebody already signed in is looking for. This one is a workspace bar:
 * where you are, and who you are signed in as.
 *
 * The three tabs are **sections of one page**, not routes. Everything a doctor
 * has here fits on a single scroll, and splitting it across three URLs meant a
 * page load to answer "what else is there" — so a tab jumps you down and the
 * scroll position moves the marker back. Smooth scrolling comes from CSS (see
 * `.dash-shell` in globals.css), so a plain anchor does the whole job and this
 * file only has to work out which tab to light.
 */

const SECTIONS = [
  { id: "your-space", label: "Your Space" },
  { id: "growth-lab", label: "Growth Lab" },
  { id: "pathways", label: "Pathways" },
];

export function DashboardNav({ name, email }: { name: string; email: string }) {
  const active = useActiveSection();

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
              <Tab section={section} active={active === section.id} />
            </li>
          ))}
        </ul>

        <AccountChip
          name={name}
          email={email}
          links={[
            { href: "/", label: "Back to the site" },
            { href: "/programs", label: "Browse programmes" },
          ]}
        />
      </nav>

      {/* Below the logo on a phone, where three tabs will not fit beside it. */}
      <ul className="flex items-center gap-6 overflow-x-auto border-t border-white/[0.07] px-5 py-2.5 md:hidden">
        {SECTIONS.map((section) => (
          <li key={section.id} className="shrink-0">
            <Tab section={section} active={active === section.id} compact />
          </li>
        ))}
      </ul>
    </header>
  );
}

function Tab({
  section,
  active,
  compact = false,
}: {
  section: (typeof SECTIONS)[number];
  active: boolean;
  compact?: boolean;
}) {
  return (
    <a
      href={`#${section.id}`}
      aria-current={active ? "true" : undefined}
      className={`relative block transition ${compact ? "py-1 text-sm" : "py-1.5 text-[15px]"} ${
        active ? "text-white" : "text-white/55 hover:text-white/90"
      }`}
    >
      {section.label}
      <span
        aria-hidden
        className={`absolute -bottom-0.5 left-0 h-px w-full rounded-full transition ${
          active ? "bg-accent" : "bg-transparent"
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
