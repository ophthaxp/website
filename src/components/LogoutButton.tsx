"use client";

import { useState } from "react";

/**
 * Sign out.
 *
 * Nothing is thrown away — the application stays exactly as it was, which is
 * the whole promise of the flow. Only the cookie goes.
 */
export function LogoutButton() {
  const [busy, setBusy] = useState(false);

  const handleClick = async () => {
    setBusy(true);
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    // A full navigation rather than a router push: every server component on
    // the next page has to be rendered without the cookie.
    window.location.href = "/";
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy}
      className="rounded-md border border-white/15 px-4 py-2 text-sm font-medium text-white/70 transition hover:border-white/25 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
    >
      {busy ? "Signing out…" : "Log out"}
    </button>
  );
}
