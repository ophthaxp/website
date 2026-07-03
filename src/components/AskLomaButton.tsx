"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback } from "react";
import { LoMaIcon } from "./LoMaIcon";

export function AskLomaButton() {
  const pathname = usePathname();
  const router = useRouter();

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      e.preventDefault();
      const scrollToSection = () => {
        const el = document.getElementById("smart-assist");
        if (el) {
          el.scrollIntoView({ behavior: "instant", block: "start" });
          window.history.replaceState(null, "", "/#smart-assist");
          return true;
        }
        return false;
      };
      if (pathname === "/") {
        scrollToSection();
        return;
      }
      // Cross-page navigation: push to home first, then poll for the section
      // to mount before scrolling. `router.push('/#hash')` is treated as a
      // hash-only change on the current route and doesn't trigger a route
      // transition, so we push the plain pathname instead. `scroll: false`
      // prevents Next.js from resetting scroll to top after the transition
      // and overriding our scrollIntoView.
      router.push("/", { scroll: false });
      const start = Date.now();
      const poll = () => {
        if (scrollToSection()) return;
        if (Date.now() - start > 5000) return;
        window.setTimeout(poll, 100);
      };
      window.setTimeout(poll, 300);
    },
    [pathname, router],
  );

  return (
    <a
      href="/#smart-assist"
      onClick={handleClick}
      aria-label="Ask OphthaXP"
      className="inline-flex items-center gap-1.5 rounded-[12px] border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-medium text-white/85 transition hover:border-white/20 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 sm:px-3.5"
    >
      <LoMaIcon className="h-4 w-4" />
      <span className="hidden sm:inline">Ask LoMa</span>
    </a>
  );
}
