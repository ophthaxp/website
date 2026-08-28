"use client";

import { useEffect } from "react";

/**
 * Reopen the apply form when somebody arrives from a sign-in link.
 *
 * `/auth/continue` sends them back to the page they started on with `?apply=1`,
 * and the form is a modal, so something on that page has to open it again.
 *
 * A course page renders several Apply Now buttons — hero, pricing, footer — and
 * all of them would answer this at once. The first one to see the flag claims
 * it, and the rest stand down.
 */
let claimedHref: string | null = null;

export function useApplyAutoOpen(open: () => void) {
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Keyed on the URL rather than a plain "have we done this yet" flag. This
    // module is not remounted between client-side navigations, so a boolean
    // stays true forever — and the second time somebody came back from the
    // account page the form quietly refused to open.
    if (claimedHref === window.location.href) return;

    const params = new URLSearchParams(window.location.search);
    if (params.get("apply") !== "1") return;

    claimedHref = window.location.href;
    open();

    // Drop the flag from the URL so a refresh, or the back button, does not
    // pop the form open again.
    params.delete("apply");
    const query = params.toString();
    window.history.replaceState(
      {},
      "",
      window.location.pathname + (query ? `?${query}` : "") + window.location.hash,
    );
    // Deliberately once per page load: `open` is a fresh closure on every
    // render, and re-running this would fight the history rewrite above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
