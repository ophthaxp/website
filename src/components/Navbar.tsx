"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { AccountMenu } from "./AccountMenu";
import { AskLomaButton } from "./AskLomaButton";

/** Centre nav — the three destinations shown in the Figma header. */
const LINKS: { label: string; href: string }[] = [
  { label: "Legends", href: "/doctors" },
  { label: "Programs", href: "/programs" },
  { label: "Future", href: "/#roi" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full bg-black">
      <nav
        aria-label="Primary"
        className="mx-auto flex max-w-[1440px] items-center justify-between px-5 py-3 sm:px-10 lg:px-14"
      >
        <Link href="/" aria-label="Legends of Medicine — home" className="inline-flex shrink-0 items-center">
          <Image
            src="/brand/lom-logo-full.png"
            alt="Legends of Medicine"
            width={623}
            height={290}
            priority
            className="h-14 w-auto sm:h-[62px]"
          />
        </Link>

        {/* Centre links — uppercase, wide-tracked, evenly spaced. */}
        <ul className="hidden items-center gap-12 lg:flex xl:gap-20">
          {LINKS.map((l) => (
            <li key={l.label}>
              <Link
                href={l.href}
                className="text-[15px] font-medium uppercase tracking-[0.08em] text-white/90 transition hover:text-accent-soft"
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-3 sm:gap-5">
          <AskLomaButton />
          <AccountMenu />
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "Close menu" : "Open menu"}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-white/90 lg:hidden"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </nav>

      {open && (
        <ul
          id="mobile-nav"
          className="border-t border-white/10 px-5 pb-4 pt-2 lg:hidden"
        >
          {LINKS.map((l) => (
            <li key={l.label}>
              <Link
                href={l.href}
                onClick={() => setOpen(false)}
                className="block py-2.5 text-sm font-medium uppercase tracking-[0.08em] text-white/85"
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </header>
  );
}
