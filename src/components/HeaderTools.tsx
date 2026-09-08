"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback } from "react";
import { Crosshair, ScanSearch } from "lucide-react";
import { LoMaIcon } from "./LoMaIcon";

/**
 * The three tools, as icons in the marketing header.
 *
 * This replaces the single "Ask LoMa" button. That button said what the site
 * could do for you in one place; these say it in three, and they are the same
 * three a signed-in doctor has in their Growth Lab — so the header stops being
 * a way to reach the chat and starts being a way to reach the product.
 *
 * Icons rather than labels because three labels do not fit beside the logo and
 * the nav on anything narrower than a laptop, and a row that collapses to
 * nothing on a phone is worse than one that is always there. Each carries its
 * name in `title` and `aria-label`, so hovering says it and a screen reader
 * reads it.
 */

type Tool = {
  key: string;
  label: string;
  href: string;
  /** Set where the destination is a section of the home page, not a route. */
  section?: string;
  /** Nothing to open yet: shown, not linked, and it says so on hover. */
  comingSoon?: boolean;
  icon: (props: { className?: string }) => React.ReactNode;
};

const TOOLS: Tool[] = [
  {
    key: "loma",
    label: "LoMa — ask a medical question",
    href: "/#smart-assist",
    section: "smart-assist",
    icon: (props) => <LoMaIcon {...props} />,
  },
  {
    // Caseroom lives inside the dashboard, so this leads somewhere that needs
    // signing in. That is the right destination rather than a marketing
    // section: it is a tool a doctor uses, not a thing to read about, and the
    // login page carries them back here afterwards.
    key: "caseroom",
    label: "Caseroom — practise on a live case",
    href: "/account/caseroom",
    icon: (props) => <ScanSearch strokeWidth={1.6} {...props} />,
  },
  {
    key: "horizon",
    label: "Visualise your future — size your practice",
    href: "/#roi",
    section: "roi",
    icon: (props) => <Crosshair strokeWidth={1.6} {...props} />,
  },
];

/* Shape and size only. The colours are split out per state rather than
   overridden on top of a default: two `text-white/*` utilities on one element
   have equal specificity, so which one wins is decided by their order in the
   generated stylesheet, not by the order they are written here — and the dim
   one silently loses. */
const CHIP_BASE =
  "inline-flex h-9 w-9 items-center justify-center rounded-[12px] border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60";

/* The hover is terracotta rather than a brighter grey: the tabs beside these
   already warm to the accent, and a header where one control lights up in the
   brand colour and the next in white reads as two headers. */
const CHIP_LIVE =
  "border-white/10 bg-white/5 text-white/85 hover:border-accent/50 hover:bg-accent/15 hover:text-accent-soft";

const CHIP_SOON = "cursor-default border-white/[0.06] bg-white/[0.03] text-white/30";

export function HeaderTools() {
  const pathname = usePathname();
  const router = useRouter();

  /**
   * Jump to a section of the home page from wherever the reader is.
   *
   * `router.push('/#hash')` is treated as a hash-only change on the current
   * route and does not trigger a route transition, so the plain pathname is
   * pushed instead and the section is polled for until it mounts. `scroll:
   * false` stops Next resetting to the top afterwards and undoing the jump.
   */
  const jumpTo = useCallback(
    (section: string, href: string) => (event: React.MouseEvent<HTMLAnchorElement>) => {
      event.preventDefault();

      const scrollToSection = () => {
        const el = document.getElementById(section);
        if (!el) return false;
        el.scrollIntoView({ behavior: "instant", block: "start" });
        window.history.replaceState(null, "", href);
        return true;
      };

      if (pathname === "/") {
        scrollToSection();
        return;
      }

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
    <ul className="flex items-center gap-1.5 sm:gap-2">
      {TOOLS.map((tool) => (
        <li key={tool.key} className="relative">
          {tool.comingSoon ? (
            /* Not a link and not a button: there is nothing to activate. It is
               dimmer than the two beside it so the difference is visible before
               anybody hovers, and the label underneath says why. */
            <span
              aria-label={`${tool.label} — coming soon`}
              className={`group/soon ${CHIP_BASE} ${CHIP_SOON}`}
            >
              {tool.icon({ className: "h-4 w-4" })}
              <span
                aria-hidden
                className="pointer-events-none absolute left-1/2 top-full z-50 mt-2 -translate-x-1/2 whitespace-nowrap rounded-full border border-white/10 bg-black/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/60 opacity-0 shadow-lg backdrop-blur transition duration-200 group-hover/soon:opacity-100"
              >
                {tool.label} · Coming soon
              </span>
            </span>
          ) : tool.section ? (
            <a
              href={tool.href}
              onClick={jumpTo(tool.section, tool.href)}
              aria-label={tool.label}
              title={tool.label}
              className={`${CHIP_BASE} ${CHIP_LIVE}`}
            >
              {tool.icon({ className: "h-4 w-4" })}
            </a>
          ) : (
            <Link
              href={tool.href}
              aria-label={tool.label}
              title={tool.label}
              className={`${CHIP_BASE} ${CHIP_LIVE}`}
            >
              {tool.icon({ className: "h-4 w-4" })}
            </Link>
          )}
        </li>
      ))}
    </ul>
  );
}
