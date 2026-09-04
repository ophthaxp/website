"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { User } from "lucide-react";

/**
 * The person icon in the header.
 *
 * Signed out it is simply the login link — a menu holding a single item is just
 * a click in the way. Signed in it opens the account menu.
 *
 * The link to the student LMS used to live here and has been taken out for now.
 */

interface Account {
  user: { email: string; firstName: string } | null;
  application: { return_path?: string; current_step?: number } | null;
}

export function AccountMenu() {
  const [open, setOpen] = useState(false);
  const [account, setAccount] = useState<Account | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  // One request, and it costs nothing when logged out: the route answers from
  // the cookie and only reaches the platform if there is a session.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/applications", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => {
        if (!cancelled && body) setAccount(body as Account);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

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

  const signedIn = Boolean(account?.user);

  // The application is a page now. Rows from the popup era point at
  // /programs/[slug]; both routes share the slug, so they map straight across.
  const resumeHref = (() => {
    const path = account?.application?.return_path;
    if (!path || !path.startsWith("/") || path.startsWith("//")) return "/programs";

    const base = path.split("?")[0];
    const target = base.startsWith("/apply/")
      ? base
      : base.startsWith("/programs/")
        ? base.replace("/programs/", "/apply/")
        : "";

    if (!target) return "/programs";
    return `${target}?step=${Number(account?.application?.current_step) || 1}`;
  })();

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    window.location.href = "/";
  };

  const iconCls =
    "inline-flex h-9 w-9 items-center justify-center rounded-full text-white/90 transition hover:text-accent-soft";

  // Nobody signed in — the icon is the login link itself.
  if (!signedIn) {
    return (
      <Link href="/login" aria-label="Log in or create an account" className={iconCls}>
        <User className="h-[22px] w-[22px]" strokeWidth={1.6} aria-hidden />
      </Link>
    );
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Your account"
        className={`relative ${iconCls}`}
      >
        <User className="h-[22px] w-[22px]" strokeWidth={1.6} aria-hidden />
        <span
          aria-hidden
          className="absolute right-1 top-1 h-2 w-2 rounded-full bg-accent ring-2 ring-black"
        />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-11 z-50 w-60 overflow-hidden rounded-xl bg-ink-850 py-1.5 ring-1 ring-white/15 shadow-xl shadow-black/50"
        >
          <p className="truncate px-4 py-2 text-xs text-white/45">
            {account?.user?.email}
          </p>

          <Link
            href="/account"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="block px-4 py-2.5 text-sm text-white/85 transition hover:bg-white/5 hover:text-white"
          >
            Your space
          </Link>

          {account?.application ? (
            <Link
              href={resumeHref}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="block px-4 py-2.5 text-sm text-white/85 transition hover:bg-white/5 hover:text-white"
            >
              Continue where you left off
            </Link>
          ) : null}

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
