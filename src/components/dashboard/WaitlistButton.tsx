"use client";

import { useState } from "react";
import { Check, Loader2 } from "lucide-react";

/**
 * "Count me in" — the one thing a doctor can do with a tool that is not built.
 *
 * LoMa and Caseroom have been on the thread since the dashboard existed, as
 * cards you could read and nothing else. That is honest but inert: it tells a
 * doctor something is coming and gives them no way to care about it. This is
 * the way to care about it.
 *
 * The address is not here and never passes through the browser. The button
 * sends a tool name; the session on the server decides whose name goes on the
 * list. See `app/api/waitlist/route.ts`.
 *
 * `joined` arrives from the server, already read from the list, so somebody who
 * signed up last week sees "You're on the list" in the first paint rather than
 * watching the button correct itself.
 */
export function WaitlistButton({
  tool,
  label,
  joined: initiallyJoined,
}: {
  tool: string;
  /** The tool's name, for the screen-reader label — three identical buttons otherwise. */
  label: string;
  joined: boolean;
}) {
  const [joined, setJoined] = useState(initiallyJoined);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);

  /* Not optimistic. An optimistic "You're on the list" that turns out to be
     false is worse than a moment's spinner — the doctor stops thinking about
     it, and finds out months later by never being told. */
  const join = async () => {
    if (joined || saving) return;
    setSaving(true);
    setFailed(false);
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tool }),
      });
      const body = await res.json().catch(() => null);
      if (res.ok && body?.success) setJoined(true);
      else setFailed(true);
    } catch {
      setFailed(true);
    } finally {
      setSaving(false);
    }
  };

  if (joined) {
    return (
      <div>
        <p className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-300/90">
          <Check className="h-4 w-4" strokeWidth={2.2} aria-hidden />
          You&apos;re on the list
        </p>
        <p className="mt-1 text-xs text-white/45">We&apos;ll notify you when access opens.</p>
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={join}
        disabled={saving}
        className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:opacity-70"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
        Count me in
        <span className="sr-only"> — {label}</span>
      </button>
      {/* Polite rather than assertive: it is a retry prompt, not an alarm. */}
      {failed ? (
        <p role="status" className="mt-2 text-xs text-amber-200/80">
          That didn&apos;t save. Try once more.
        </p>
      ) : null}
    </div>
  );
}
