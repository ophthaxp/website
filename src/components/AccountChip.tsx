"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

/**
 * Who you are signed in as, as a chip with a menu behind it.
 *
 * Lives on its own because two headers need it — the dashboard's, and the slim
 * one over the application flow — and a second copy is a second thing to keep
 * in step. The menu items differ between them, so they are passed in rather
 * than baked here.
 */
export function AccountChip({
  name,
  email,
  links,
}: {
  name: string;
  email: string;
  links: { href: string; label: string }[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    window.location.href = "/";
  };

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.03] py-1.5 pl-1.5 pr-2.5 text-left transition hover:border-white/20 hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 sm:gap-3 sm:pr-3.5"
      >
        <span
          aria-hidden
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/20 text-[11px] font-semibold uppercase tracking-[0.06em] text-accent-tint ring-1 ring-accent/30"
        >
          {initials(name)}
        </span>
        <span className="hidden max-w-[16ch] truncate text-sm text-white/90 sm:block">{name}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-white/40 transition ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
        <span className="sr-only">Your account</span>
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+8px)] z-50 w-64 overflow-hidden rounded-xl bg-ink-850 py-1.5 shadow-xl shadow-black/60 ring-1 ring-white/15"
        >
          <p className="truncate px-4 py-2 text-xs text-white/45">{email}</p>
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="block px-4 py-2.5 text-sm text-white/85 transition hover:bg-white/5 hover:text-white"
            >
              {link.label}
            </Link>
          ))}
          <button
            type="button"
            role="menuitem"
            onClick={handleLogout}
            className="block w-full px-4 py-2.5 text-left text-sm text-white/60 transition hover:bg-white/5 hover:text-white"
          >
            Log out
          </button>
        </div>
      ) : null}
    </div>
  );
}

/** "Dr. Brovin Roy W" reduces to BR — first and last word, initial of each. */
function initials(name: string): string {
  const words = name
    .replace(/^dr\.?\s+/i, "")
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return "?";
  const first = words[0][0];
  const last = words.length > 1 ? words[words.length - 1][0] : "";
  return (first + last).toUpperCase();
}
